import { NextRequest, NextResponse } from 'next/server';
import { guardClientAccess } from '@/lib/auth/clientAccess';
import { loadClientMetrics } from '@/lib/metrics/loadClientMetrics';
import { fetchBankAccounts } from '@/lib/qbo/queryRunner';
import { getValidQuickBooksAccessToken } from '@/lib/qbo/tokens';
import { supabaseAdmin } from '@/lib/qbo/supabaseAdmin';
import { extractPnlTotals } from '@/lib/metrics/parseQboReport';
import type { ReportRange } from '@/lib/qbo/reports';

/**
 * GET /api/treasury?clientId=xxx&range=12m
 */
export async function GET(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get('clientId');
  const range = (request.nextUrl.searchParams.get('range') ?? '12m') as ReportRange;
  const access = await guardClientAccess(clientId);
  if (!access.ok) return access.response;

  try {
    await getValidQuickBooksAccessToken(access.clientId);
  } catch {
    return NextResponse.json({
      hasData: false,
      error: 'QuickBooks is not connected. Connect QuickBooks to view treasury data.',
    });
  }

  const bundle = await loadClientMetrics(access.clientId, range);
  let bankAccounts: Awaited<ReturnType<typeof fetchBankAccounts>> = [];
  try {
    bankAccounts = await fetchBankAccounts(access.clientId);
  } catch (e) {
    console.warn('[treasury] bank accounts fetch failed', e);
  }

  const liveCash = bankAccounts.reduce((s, a) => s + a.balance, 0);
  const cashBalance = liveCash > 0 ? liveCash : (bundle.summary?.cash ?? 0);

  const last3 = bundle.trends.slice(-3);
  const avgInflow =
    last3.length > 0 ? last3.reduce((s, t) => s + t.revenue, 0) / last3.length : 0;
  const avgOutflow =
    last3.length > 0 ? last3.reduce((s, t) => s + t.expenses, 0) / last3.length : 0;

  const netCashFlow = bundle.summary
    ? bundle.summary.revenue - bundle.summary.expenses
    : avgInflow - avgOutflow;

  const runway = bundle.runway;
  const forecast30Day = cashBalance + (avgInflow - avgOutflow);

  const sb = supabaseAdmin();
  const { data: cfReport } = await sb
    .from('financial_reports')
    .select('raw_json')
    .eq('client_id', access.clientId)
    .eq('report_type', 'cash_flow')
    .order('synced_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let cashFlowFromReport: number | null = null;
  if (cfReport?.raw_json) {
    const pnlProxy = extractPnlTotals(cfReport.raw_json);
    if (pnlProxy.net_income !== 0) cashFlowFromReport = pnlProxy.net_income;
  }

  if (!bundle.hasData && bankAccounts.length === 0) {
    return NextResponse.json({
      hasData: false,
      error: 'No treasury data available. Run Sync from Dashboard or Connect.',
    });
  }

  return NextResponse.json({
    hasData: true,
    totalCash: cashBalance,
    netCashFlow: cashFlowFromReport ?? netCashFlow,
    monthlyBurn: runway.monthlyBurn,
    daysCashOnHand: runway.daysCashOnHand,
    runwayMonths: runway.runwayMonths,
    forecast30Day: Math.round(forecast30Day * 100) / 100,
    bankAccounts: bankAccounts.map((a) => ({
      name: a.name,
      balance: a.balance,
      subType: a.accountSubType,
      active: a.active,
    })),
    dataError: bundle.summary?.data_error ?? false,
  });
}
