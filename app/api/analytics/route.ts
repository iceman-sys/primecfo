import { NextRequest, NextResponse } from 'next/server';
import { guardClientAccess } from '@/lib/auth/clientAccess';
import { loadClientMetrics } from '@/lib/metrics/loadClientMetrics';
import { computeAnalyticsKpis } from '@/lib/metrics/ratios';
import { validatePeriodTotals } from '@/lib/metrics/validateTrends';
import { parseArAgingBuckets } from '@/lib/reporting/parseArAging';
import { loadClientBasisSettings } from '@/lib/qbo/clientBasis';
import { supabaseAdmin } from '@/lib/qbo/supabaseAdmin';
import type { ReportRange } from '@/lib/qbo/reports';

/**
 * GET /api/analytics?clientId=xxx&range=3m
 * Live KPIs + monthly revenue/cost trends from synced QBO metrics.
 */
export async function GET(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get('clientId');
  const range = (request.nextUrl.searchParams.get('range') ?? '3m') as ReportRange;
  const access = await guardClientAccess(clientId);
  if (!access.ok) return access.response;

  const bundle = await loadClientMetrics(access.clientId, range);
  if (!bundle.hasData) {
    return NextResponse.json({
      hasData: false,
      error: 'No analytics data. Connect QuickBooks and run Sync.',
      kpis: null,
      trends: [],
      periodTotals: null,
      validation: null,
    });
  }

  const sb = supabaseAdmin();
  const [{ data: arReport }, { data: apReport }, basis] = await Promise.all([
    sb
      .from('financial_reports')
      .select('raw_json')
      .eq('client_id', access.clientId)
      .eq('report_type', 'ar_aging')
      .order('synced_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    sb
      .from('financial_reports')
      .select('raw_json')
      .eq('client_id', access.clientId)
      .eq('report_type', 'ap_aging')
      .order('synced_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    loadClientBasisSettings(access.clientId),
  ]);

  const arBuckets = arReport?.raw_json ? parseArAgingBuckets(arReport.raw_json) : null;
  const apBuckets = apReport?.raw_json ? parseArAgingBuckets(apReport.raw_json) : null;
  const useAging = basis.hasInvoicingActivity !== false;

  const windowTrends = bundle.windowTrends;
  const kpis = computeAnalyticsKpis(
    bundle.summary,
    windowTrends,
    bundle.runway.runwayMonths,
    range,
    useAging
      ? {
          openArFromAging: arBuckets && arBuckets.total > 0 ? arBuckets.total : null,
          openApFromAging: apBuckets && apBuckets.total > 0 ? apBuckets.total : null,
        }
      : undefined
  );

  // Incomplete period: do not show alarming margins/ratios as if $0 revenue were real.
  const gatedKpis = bundle.currentPeriodIncomplete
    ? {
        ...kpis,
        grossMargin: null,
        netMargin: null,
        currentRatio: null,
        quickRatio: null,
        dso: null,
        dpo: null,
        dsoNote: 'Pending reconciliation — sync your books to see this metric',
        dpoNote: 'Pending reconciliation — sync your books to see this metric',
      }
    : kpis;

  const chartTrends = windowTrends
    .filter((t) => t.revenue > 0 || t.expenses > 0)
    .map((t) => ({
      month: formatMonthLabel(t.periodLabel),
      revenue: t.revenue,
      expenses: t.expenses,
      netIncome: t.profit,
    }));

  const totalRevenue = windowTrends.reduce((s, t) => s + t.revenue, 0);
  const totalCosts = windowTrends.reduce((s, t) => s + t.expenses, 0);
  const totalNetIncome = windowTrends.reduce((s, t) => s + t.profit, 0);
  const validation = validatePeriodTotals(windowTrends);

  return NextResponse.json({
    hasData: true,
    kpis: gatedKpis,
    trends: chartTrends,
    periodTotals: {
      totalRevenue,
      totalCosts,
      totalNetIncome,
      periodCount: validation.periodCount,
    },
    validation,
    dataError: bundle.summary?.data_error ?? false,
    currentPeriodIncomplete: bundle.currentPeriodIncomplete,
    displayBasis: basis.displayBasis,
  });
}

function formatMonthLabel(label: string): string {
  const m = label.match(/^(\d{4})-(\d{2})$/);
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, 1);
    return d.toLocaleDateString('en-US', { month: 'short' });
  }
  return label;
}
