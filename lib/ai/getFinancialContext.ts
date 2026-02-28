/**
 * Pull stored financial data for a client + range and compute derived metrics.
 * Used by AI analysis to build context for plain-English insights.
 */

import { supabaseAdmin } from '@/lib/qbo/supabaseAdmin';
import { getSingleDateRange, type ReportRange, type PeriodType } from '@/lib/qbo/reports';

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

  const singleRange = getSingleDateRange(range, periodType);
  const matchingPeriod =
    periodList.find(
      (p) => p.start_date === singleRange.start_date && p.end_date === singleRange.end_date
    ) ?? periodList[periodList.length - 1];
  const currentIndex = periodList.findIndex((p) => p.id === matchingPeriod.id);
  const previousPeriod = currentIndex > 0 ? periodList[currentIndex - 1] : null;

  const toSummary = (p: PeriodRow | null): SummaryShape | null => {
    if (!p) return null;
    const m = metricsByPeriod.get(p.id);
    if (!m) return null;
    return {
      revenue: m.revenue ?? 0,
      expenses: m.expenses ?? 0,
      net_income: m.net_income ?? 0,
      profit_margin_pct: m.profit_margin_pct ?? 0,
      cash: m.cash ?? 0,
      accounts_receivable: m.accounts_receivable ?? 0,
      accounts_payable: m.accounts_payable ?? 0,
    };
  };

  const summary = toSummary(matchingPeriod);
  const previousSummary = toSummary(previousPeriod);
  if (!summary) return null;

  const trends: TrendPoint[] = periodList.map((p) => {
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

  return {
    periodLabel: singleRange.label,
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
