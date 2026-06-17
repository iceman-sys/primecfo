import { NextRequest, NextResponse } from 'next/server';
import { guardClientAccess } from '@/lib/auth/clientAccess';
import { loadClientMetrics } from '@/lib/metrics/loadClientMetrics';
import { fetchBankAccounts } from '@/lib/qbo/queryRunner';
import { getValidQuickBooksAccessToken } from '@/lib/qbo/tokens';
import { supabaseAdmin } from '@/lib/qbo/supabaseAdmin';
import {
  extractCashFlowNetByPeriod,
  extractCashFlowNetIncreaseTotal,
} from '@/lib/metrics/parseQboReport';
import { getIntegratedPeriodLabel } from '@/lib/metrics/loadClientMetrics';
import type { ReportRange } from '@/lib/qbo/reports';

const RANGE_LABELS: Record<ReportRange, string> = {
  '3m': 'Last 3 Months',
  '6m': 'Last 6 Months',
  '12m': 'Last 12 Months',
  '4q': 'Last 4 Quarters',
};

/**
 * GET /api/treasury?clientId=xxx&range=3m
 */
export async function GET(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get('clientId');
  const range = (request.nextUrl.searchParams.get('range') ?? '3m') as ReportRange;
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

  const sb = supabaseAdmin();
  const integratedLabel = getIntegratedPeriodLabel(range);
  const { data: cfReport } = await sb
    .from('financial_reports')
    .select('raw_json, period_label')
    .eq('client_id', access.clientId)
    .eq('report_type', 'cash_flow')
    .eq('period_label', integratedLabel)
    .order('synced_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let cfRaw = cfReport?.raw_json;
  if (!cfRaw) {
    const { data: cfFallback } = await sb
      .from('financial_reports')
      .select('raw_json')
      .eq('client_id', access.clientId)
      .eq('report_type', 'cash_flow')
      .order('synced_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    cfRaw = cfFallback?.raw_json;
  }

  const netByPeriod = cfRaw ? extractCashFlowNetByPeriod(cfRaw) : [];
  const periodCount = range === '3m' ? 3 : range === '6m' ? 6 : range === '12m' ? 12 : 4;
  const windowNet = netByPeriod.slice(-periodCount);
  const netCashFlow =
    windowNet.length > 0
      ? windowNet.reduce((s, v) => s + v, 0)
      : cfRaw
        ? extractCashFlowNetIncreaseTotal(cfRaw)
        : null;

  const last3Net = (windowNet.length ? windowNet : netByPeriod).slice(-3);
  const avgMonthlyNet =
    last3Net.length > 0 ? last3Net.reduce((s, v) => s + v, 0) / last3Net.length : null;

  const last3Trends = bundle.trends.slice(-3);
  const pnlProxyMonthlyNet =
    last3Trends.length > 0
      ? last3Trends.reduce((s, t) => s + (t.revenue - t.expenses), 0) / last3Trends.length
      : null;

  const projectedNet = avgMonthlyNet ?? pnlProxyMonthlyNet ?? 0;
  const forecast30Day = cashBalance + projectedNet;

  const runway = bundle.runway;

  if (!bundle.hasData && bankAccounts.length === 0) {
    return NextResponse.json({
      hasData: false,
      error: 'No treasury data available. Run Sync from Dashboard or Connect.',
    });
  }

  return NextResponse.json({
    hasData: true,
    periodLabel: RANGE_LABELS[range] ?? range,
    totalCash: cashBalance,
    netCashFlow: netCashFlow ?? null,
    monthlyBurn: runway.monthlyBurn,
    daysCashOnHand: runway.daysCashOnHand,
    runwayMonths: runway.runwayMonths,
    forecast30Day: Math.round(forecast30Day * 100) / 100,
    forecastBreakdown: {
      currentCash: cashBalance,
      projectedNet: Math.round(projectedNet * 100) / 100,
      projectedBalance: Math.round(forecast30Day * 100) / 100,
      basis: avgMonthlyNet != null ? 'cash_flow_statement' : 'pnl_proxy',
    },
    bankAccounts: bankAccounts.map((a) => ({
      name: a.name,
      balance: a.balance,
      subType: a.accountSubType,
      active: a.active,
    })),
    dataError: bundle.summary?.data_error ?? false,
  });
}
