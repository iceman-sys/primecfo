import type { SummaryMetrics } from '@/lib/metrics/loadClientMetrics';
import type { TrendPoint } from '@/lib/metrics/runway';

export type AnalyticsKpis = {
  grossMargin: number | null;
  netMargin: number | null;
  currentRatio: number | null;
  quickRatio: number | null;
  dso: number | null;
  dpo: number | null;
  burnRate: number | null;
  runway: number | null;
};

function safeRatio(numerator: number, denominator: number): number | null {
  if (!denominator || !Number.isFinite(denominator) || !Number.isFinite(numerator)) return null;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function periodDays(range: '3m' | '6m' | '12m' | '4q'): number {
  if (range === '3m') return 90;
  if (range === '6m') return 180;
  if (range === '4q') return 365;
  return 365;
}

export function computeAnalyticsKpis(
  summary: SummaryMetrics | null,
  trends: TrendPoint[],
  runwayMonths: number | null,
  range: '3m' | '6m' | '12m' | '4q' = '12m'
): AnalyticsKpis {
  if (!summary) {
    return {
      grossMargin: null,
      netMargin: null,
      currentRatio: null,
      quickRatio: null,
      dso: null,
      dpo: null,
      burnRate: null,
      runway: runwayMonths,
    };
  }

  const revenue = summary.revenue;
  const grossProfit =
    summary.gross_profit !== 0
      ? summary.gross_profit
      : revenue - Math.abs(summary.cogs);

  const grossMargin = safeRatio(grossProfit, revenue);
  const netMargin = summary.data_error ? null : safeRatio(summary.net_income, revenue);

  const currentRatio = safeRatio(summary.current_assets, summary.current_liabilities);
  const quickAssets = summary.current_assets - summary.inventory;
  const quickRatio = safeRatio(quickAssets, summary.current_liabilities);

  const days = periodDays(range);
  const dso = safeRatio(summary.accounts_receivable * days, revenue);
  const cogs = Math.abs(summary.cogs) || null;
  const dpo = cogs ? safeRatio(summary.accounts_payable * days, cogs) : null;

  const last3 = trends
    .map((t) => t.expenses)
    .filter((e) => e > 0)
    .slice(-3);
  const burnRate =
    last3.length > 0 ? Math.round(last3.reduce((a, b) => a + b, 0) / last3.length) : null;

  if (process.env.NODE_ENV !== 'production' && summary) {
    console.info('[analytics] KPI inputs', {
      revenue,
      net_income: summary.net_income,
      grossProfit,
      current_assets: summary.current_assets,
      current_liabilities: summary.current_liabilities,
      ar: summary.accounts_receivable,
      ap: summary.accounts_payable,
      cogs: summary.cogs,
      grossMargin,
      netMargin,
      currentRatio,
      quickRatio,
      dso,
      dpo,
      burnRate,
      runway: runwayMonths,
    });
  }

  return {
    grossMargin,
    netMargin,
    currentRatio,
    quickRatio,
    dso,
    dpo,
    burnRate,
    runway: runwayMonths,
  };
}
