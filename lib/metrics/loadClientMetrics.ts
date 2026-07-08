import { supabaseAdmin } from '@/lib/qbo/supabaseAdmin';
import { getDateRanges, getSingleDateRange, type ReportRange, type PeriodType } from '@/lib/qbo/reports';
import { computeRunway, type TrendPoint } from '@/lib/metrics/runway';
import { totalCosts } from '@/lib/metrics/costs';
import { fetchLastReconciledDate } from '@/lib/qbo/reconciliation';
import { capReconciliationDate, splitPeriodsExcludingPartial } from '@/lib/metrics/partialMonth';
import { loadTrailingNetCashFlow } from '@/lib/metrics/cashFlowMetrics';

export type PeriodRow = {
  id: string;
  period_type: string;
  start_date: string;
  end_date: string;
  label: string;
};

export type SummaryMetrics = {
  revenue: number;
  /** Operating expenses only (excludes COGS). */
  expenses: number;
  /** COGS + operating expenses. */
  total_costs: number;
  net_income: number;
  profit_margin_pct: number;
  cash: number;
  accounts_receivable: number;
  accounts_payable: number;
  cogs: number;
  gross_profit: number;
  current_assets: number;
  current_liabilities: number;
  inventory: number;
  quick_assets: number;
  data_error: boolean;
};

export type ClientMetricsBundle = {
  range: ReportRange;
  periods: PeriodRow[];
  trends: TrendPoint[];
  /** Trends limited to the selected range window (for charts / period totals). */
  windowTrends: TrendPoint[];
  summary: SummaryMetrics | null;
  previousSummary: SummaryMetrics | null;
  runway: ReturnType<typeof computeRunway>;
  hasData: boolean;
  lastReconciledDate: Date | null;
  excludedPartialMonth: boolean;
};

function getStartDateCutoff(monthsBack: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsBack);
  return d.toISOString().slice(0, 10);
}

function aggregatePeriods(
  periodList: PeriodRow[],
  metricsByPeriod: Map<string, Record<string, number>>
): SummaryMetrics | null {
  if (periodList.length === 0) return null;
  let revenue = 0;
  let expenses = 0;
  let net_income = 0;
  let cogs = 0;
  let gross_profit = 0;
  let cash = 0;
  let ar = 0;
  let ap = 0;
  let current_assets = 0;
  let current_liabilities = 0;
  let inventory = 0;
  let quick_assets = 0;
  let data_error = false;
  let hasAny = false;

  for (const p of periodList) {
    const m = metricsByPeriod.get(p.id);
    if (!m) continue;
    hasAny = true;
    revenue += m.revenue ?? 0;
    expenses += m.expenses ?? 0;
    net_income += m.net_income ?? 0;
    cogs += m.cogs ?? 0;
    gross_profit += m.gross_profit ?? 0;
    cash = m.cash ?? cash;
    ar = m.accounts_receivable ?? ar;
    ap = m.accounts_payable ?? ap;
    current_assets = m.current_assets ?? current_assets;
    current_liabilities = m.current_liabilities ?? current_liabilities;
    inventory = m.inventory ?? inventory;
    quick_assets = m.quick_assets ?? quick_assets;
    if (m.data_error) data_error = true;
  }

  if (!hasAny) return null;

  const total_costs = totalCosts(cogs, expenses);

  let profit_margin_pct = 0;
  if (Math.abs(revenue) > 0) {
    profit_margin_pct = Math.round((net_income / Math.abs(revenue)) * 1000) / 10;
    if (Math.abs(profit_margin_pct) > 100) data_error = true;
  }

  return {
    revenue,
    expenses,
    total_costs,
    net_income,
    profit_margin_pct: data_error ? 0 : profit_margin_pct,
    cash,
    accounts_receivable: ar,
    accounts_payable: ap,
    cogs,
    gross_profit,
    current_assets,
    current_liabilities,
    inventory,
    quick_assets: quick_assets || cash + ar,
    data_error,
  };
}

/**
 * Load per-period metrics + trends for a client. Excludes integrated range labels (e.g. "Last 12 Months").
 */
export async function loadClientMetrics(
  clientId: string,
  range: ReportRange = '12m'
): Promise<ClientMetricsBundle> {
  const periodType: PeriodType = range === '4q' ? 'quarter' : 'month';
  const sb = supabaseAdmin();
  const cutoff = getStartDateCutoff(24);

  const [periodsResult, lastReconciledRaw, trailingNetCashFlow] = await Promise.all([
    sb
      .from('financial_report_periods')
      .select('id, period_type, start_date, end_date, label')
      .eq('client_id', clientId)
      .eq('period_type', periodType)
      .gte('start_date', cutoff)
      .order('start_date', { ascending: true }),
    fetchLastReconciledDate(clientId).catch(() => null),
    loadTrailingNetCashFlow(clientId, range).catch(() => null),
  ]);

  const lastReconciledDate = capReconciliationDate(lastReconciledRaw);
  const { data: periods } = periodsResult;

  const periodList = ((periods ?? []) as PeriodRow[]).filter(
    (p) => !p.label.toLowerCase().startsWith('last ')
  );

  const periodIds = periodList.map((p) => p.id);
  const metricsByPeriod = new Map<string, Record<string, number>>();

  if (periodIds.length > 0) {
    const { data: metricsRows } = await sb
      .from('financial_metrics')
      .select('period_id, metric_key, value')
      .eq('client_id', clientId)
      .in('period_id', periodIds);

    for (const row of metricsRows ?? []) {
      let map = metricsByPeriod.get(row.period_id as string);
      if (!map) {
        map = {};
        metricsByPeriod.set(row.period_id as string, map);
      }
      map[row.metric_key as string] = Number(row.value);
    }
  }

  const rangeInfos = getDateRanges(range, periodType);
  const rangeStartDates = new Set(rangeInfos.map((r) => r.start_date));
  const windowPeriods = periodList.filter((p) => rangeStartDates.has(p.start_date));
  const periodCount = range === '3m' ? 3 : range === '6m' ? 6 : range === '12m' ? 12 : 4;
  const effectiveWindow =
    windowPeriods.length > 0 ? windowPeriods : periodList.slice(-periodCount);

  const firstIdx = effectiveWindow.length
    ? periodList.findIndex((p) => p.id === effectiveWindow[0].id)
    : -1;
  const previousPeriodsRaw =
    firstIdx > 0 ? periodList.slice(Math.max(0, firstIdx - effectiveWindow.length), firstIdx) : [];

  const { current: currentWindow, previous: previousWindow, excludedPartial } =
    splitPeriodsExcludingPartial(effectiveWindow, previousPeriodsRaw, lastReconciledDate);

  const trends: TrendPoint[] = periodList.map((p) => {
    const m = metricsByPeriod.get(p.id) ?? {};
    const opex = Math.abs(m.expenses ?? 0);
    const cogsVal = Math.abs(m.cogs ?? 0);
    const costs = totalCosts(cogsVal, opex);
    return {
      periodLabel: p.label,
      start_date: p.start_date,
      end_date: p.end_date,
      revenue: m.revenue ?? 0,
      expenses: costs,
      cogs: cogsVal,
      operatingExpenses: opex,
      profit: m.net_income ?? 0,
      cash: m.cash ?? 0,
    };
  });

  const summary = aggregatePeriods(currentWindow, metricsByPeriod);
  const previousSummary = aggregatePeriods(previousWindow, metricsByPeriod);

  const trendWindow = trends.filter((t) => currentWindow.some((p) => p.label === t.periodLabel));

  const cashForRunway = summary?.cash ?? (trends.length ? trends[trends.length - 1].cash : 0);
  const runway = computeRunway(
    trendWindow.length ? trendWindow : trends,
    cashForRunway,
    trailingNetCashFlow
  );

  return {
    range,
    periods: periodList,
    trends,
    windowTrends: trendWindow.length ? trendWindow : trends.slice(-periodCount),
    summary,
    previousSummary,
    runway,
    hasData: periodList.length > 0 && metricsByPeriod.size > 0,
    lastReconciledDate,
    excludedPartialMonth: excludedPartial,
  };
}

/** Integrated period key used by Financial Reports viewer. */
export function getIntegratedPeriodLabel(range: ReportRange): string {
  return getSingleDateRange(range, range === '4q' ? 'quarter' : 'month').label;
}
