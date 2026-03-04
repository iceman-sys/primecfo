/**
 * Pull stored financial data for a client + range and compute derived metrics.
 * Used by AI analysis to build context for plain-English insights.
 */

import { supabaseAdmin } from '@/lib/qbo/supabaseAdmin';
import { getDateRanges, type ReportRange, type PeriodType } from '@/lib/qbo/reports';

type PeriodRow = { id: string; period_type: string; start_date: string; end_date: string; label: string };
type MetricRow = { period_id: string; metric_key: string; value: number; unit: string };

function getStartDateCutoff(monthsBack: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsBack);
  return d.toISOString().slice(0, 10);
}

export type SummaryShape = {
  revenue: number;
  expenses: number;
  net_income: number;
  profit_margin_pct: number;
  cash: number;
  accounts_receivable: number;
  accounts_payable: number;
};

export type TrendPoint = {
  periodLabel: string;
  start_date: string;
  end_date: string;
  revenue: number;
  expenses: number;
  profit: number;
  cash: number;
};

export type FinancialContext = {
  periodLabel: string;
  reportRange: ReportRange;
  summary: SummaryShape;
  previousSummary: SummaryShape | null;
  trends: TrendPoint[];
  derived: {
    revenueGrowthPct: number | null;
    expenseGrowthPct: number | null;
    profitMarginChangePct: number | null;
    runwayMonths: number | null;
  };
};

/**
 * Get financial context for a client and range (same data as dashboard).
 * Returns null if no periods/metrics exist.
 */
export async function getFinancialContext(
  clientId: string,
  range: ReportRange
): Promise<FinancialContext | null> {
  const periodType: PeriodType = range === '4q' ? 'quarter' : 'month';
  const sb = supabaseAdmin();
  const cutoff = getStartDateCutoff(24);

  const { data: periods, error: periodsError } = await sb
    .from('financial_report_periods')
    .select('id, period_type, start_date, end_date, label')
    .eq('client_id', clientId)
    .eq('period_type', periodType)
    .gte('start_date', cutoff)
    .order('start_date', { ascending: true });

  if (periodsError || !periods?.length) return null;

  const periodList = periods as PeriodRow[];
  const periodIds = periodList.map((p) => p.id);

  const { data: metricsRows, error: metricsError } = await sb
    .from('financial_metrics')
    .select('period_id, metric_key, value, unit')
    .eq('client_id', clientId)
    .in('period_id', periodIds);

  if (metricsError) return null;

  const metricsByPeriod = new Map<string, Record<string, number>>();
  for (const row of (metricsRows ?? []) as MetricRow[]) {
    let map = metricsByPeriod.get(row.period_id);
    if (!map) {
      map = {};
      metricsByPeriod.set(row.period_id, map);
    }
    map[row.metric_key] = Number(row.value);
  }

  // Determine which periods fall inside the selected range window
  const rangeInfos = getDateRanges(range, periodType);
  const rangeStartDates = new Set(rangeInfos.map((r) => r.start_date));
  const currentPeriods = periodList.filter((p) => rangeStartDates.has(p.start_date));

  // If no periods match the range window exactly, fall back to the latest N periods
  const periodCount = range === '3m' ? 3 : range === '6m' ? 6 : range === '12m' ? 12 : 4;
  const windowPeriods =
    currentPeriods.length > 0 ? currentPeriods : periodList.slice(-periodCount);

  if (windowPeriods.length === 0) return null;

  // Build the "previous" window: same number of periods immediately before
  const firstWindowIdx = periodList.findIndex((p) => p.id === windowPeriods[0].id);
  const prevStart = Math.max(0, firstWindowIdx - windowPeriods.length);
  const previousPeriods = periodList.slice(prevStart, firstWindowIdx);

  // Aggregate metrics across a set of periods
  const aggregate = (pds: PeriodRow[]): SummaryShape | null => {
    if (pds.length === 0) return null;
    let revenue = 0, expenses = 0, net_income = 0;
    let cash = 0, ar = 0, ap = 0;
    let hasAny = false;
    for (const p of pds) {
      const m = metricsByPeriod.get(p.id);
      if (!m) continue;
      hasAny = true;
      revenue += m.revenue ?? 0;
      expenses += m.expenses ?? 0;
      net_income += m.net_income ?? 0;
      // For balance-sheet items, use the latest period's snapshot
      cash = m.cash ?? cash;
      ar = m.accounts_receivable ?? ar;
      ap = m.accounts_payable ?? ap;
    }
    if (!hasAny) return null;
    const margin = revenue !== 0 ? (net_income / revenue) * 100 : 0;
    return {
      revenue,
      expenses,
      net_income,
      profit_margin_pct: Math.round(margin * 10) / 10,
      cash,
      accounts_receivable: ar,
      accounts_payable: ap,
    };
  };

  const summary = aggregate(windowPeriods);
  const previousSummary = aggregate(previousPeriods);
  if (!summary) return null;

  // Per-period trend points for the selected window
  const trends: TrendPoint[] = windowPeriods.map((p) => {
    const m = metricsByPeriod.get(p.id) ?? {};
    return {
      periodLabel: p.label,
      start_date: p.start_date,
      end_date: p.end_date,
      revenue: m.revenue ?? 0,
      expenses: m.expenses ?? 0,
      profit: m.net_income ?? 0,
      cash: m.cash ?? 0,
    };
  });

  const revenueGrowthPct =
    previousSummary && previousSummary.revenue !== 0
      ? ((summary.revenue - previousSummary.revenue) / Math.abs(previousSummary.revenue)) * 100
      : null;
  const expenseGrowthPct =
    previousSummary && previousSummary.expenses !== 0
      ? ((summary.expenses - previousSummary.expenses) / Math.abs(previousSummary.expenses)) * 100
      : null;
  const profitMarginChangePct =
    previousSummary != null
      ? summary.profit_margin_pct - previousSummary.profit_margin_pct
      : null;

  const monthlyBurn =
    trends.length > 0
      ? trends.reduce((acc, t) => acc + Math.abs(t.expenses), 0) / trends.length
      : summary.expenses;
  const runwayMonths =
    monthlyBurn > 0 && summary.cash >= 0
      ? Math.min(120, summary.cash / monthlyBurn)
      : null;

  const RANGE_LABELS: Record<ReportRange, string> = {
    '3m': 'Last 3 Months',
    '6m': 'Last 6 Months',
    '12m': 'Last 12 Months',
    '4q': 'Last 4 Quarters',
  };

  return {
    periodLabel: RANGE_LABELS[range],
    reportRange: range,
    summary,
    previousSummary,
    trends,
    derived: {
      revenueGrowthPct,
      expenseGrowthPct,
      profitMarginChangePct,
      runwayMonths,
    },
  };
}
