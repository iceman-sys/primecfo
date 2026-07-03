import { loadClientMetrics } from '@/lib/metrics/loadClientMetrics';
import { loadIntegratedReportRaw, loadLatestReportRaw } from '@/lib/metrics/loadIntegratedReport';
import { parseArAgingBuckets } from '@/lib/reporting/parseArAging';
import { extractBalanceSheetSnapshot } from '@/lib/ai/extractBalanceSheet';
import { supabaseAdmin } from '@/lib/qbo/supabaseAdmin';
import type { ReportRange } from '@/lib/qbo/reports';
import type { DataQualityInput } from './types';
import { extractAccountBalancesFromReport } from './extractAccounts';
import { median } from './utils';

function activityScore(revenue: number, expenses: number): number {
  return revenue + expenses;
}

export async function buildDataQualityInput(
  clientId: string,
  range: ReportRange
): Promise<DataQualityInput | null> {
  const bundle = await loadClientMetrics(clientId, range);
  if (!bundle.hasData || !bundle.summary) return null;

  const summary = bundle.summary;
  const prev = bundle.previousSummary;

  const sb = supabaseAdmin();
  const { data: arReport } = await sb
    .from('financial_reports')
    .select('raw_json')
    .eq('client_id', clientId)
    .eq('report_type', 'ar_aging')
    .order('synced_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const arBuckets = parseArAgingBuckets(arReport?.raw_json ?? {});

  let bsRaw =
    (await loadIntegratedReportRaw(clientId, range, 'balance_sheet')) ??
    (await loadLatestReportRaw(clientId, 'balance_sheet'));
  const bsSnapshot = bsRaw ? extractBalanceSheetSnapshot(bsRaw) : null;
  const accounts = bsRaw ? extractAccountBalancesFromReport(bsRaw) : [];

  const windowTrends = bundle.windowTrends.length > 0 ? bundle.windowTrends : bundle.trends;
  const monthCount = Math.max(windowTrends.length, 1);
  const avgMonthlyRevenue = summary.revenue / monthCount;

  const activityByMonth = windowTrends.map((t) => activityScore(t.revenue, t.expenses));
  const currentMonthTxnCount = activityByMonth.length > 0 ? activityByMonth[activityByMonth.length - 1] : 0;
  const priorActivities = activityByMonth.slice(0, -1);
  const trailingMedianMonthlyTxnCount = median(priorActivities);

  const latestPeriod = bundle.periods[bundle.periods.length - 1];
  const lastReconciledMonthEnd = latestPeriod?.end_date
    ? new Date(latestPeriod.end_date + 'T12:00:00')
    : windowTrends.length > 0 && windowTrends[windowTrends.length - 1].end_date
      ? new Date(windowTrends[windowTrends.length - 1].end_date! + 'T12:00:00')
      : null;

  const grossMargin =
    summary.revenue !== 0 ? (summary.gross_profit / Math.abs(summary.revenue)) * 100 : null;
  const netMargin = summary.data_error ? null : summary.profit_margin_pct;

  return {
    lastReconciledMonthEnd,
    currentMonthTxnCount,
    trailingMedianMonthlyTxnCount,
    accountsReceivable: summary.accounts_receivable,
    avgMonthlyRevenue,
    arOver90Days: arBuckets.days91_plus,
    totalEquity: bsSnapshot?.totalEquity ?? null,
    accumulatedDraws: bsSnapshot?.shareholderDraws ?? null,
    netMargin,
    grossMargin,
    priorRevenue: prev?.revenue ?? 0,
    currentRevenue: summary.revenue,
    priorExpenses: prev?.total_costs ?? prev?.expenses ?? 0,
    currentExpenses: summary.total_costs,
    priorNetIncome: prev?.net_income ?? 0,
    currentNetIncome: summary.net_income,
    accounts,
  };
}
