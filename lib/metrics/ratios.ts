import type { SummaryMetrics } from '@/lib/metrics/loadClientMetrics';
import type { TrendPoint } from '@/lib/metrics/runway';

export type AnalyticsKpis = {
  grossMargin: number | null;
  netMargin: number | null;
  currentRatio: number | null;
  quickRatio: number | null;
  dso: number | null;
  dpo: number | null;
  dsoNote: string | null;
  dpoNote: string | null;
  burnRate: number | null;
  runway: number | null;
};

/** Percentage KPIs (margins): returns value 0–100 with one decimal. */
function percentValue(numerator: number, denominator: number): number | null {
  if (!denominator || !Number.isFinite(denominator) || !Number.isFinite(numerator)) return null;
  return Math.round((numerator / denominator) * 1000) / 10;
}

/** Financial ratios (current/quick): NOT multiplied by 100. Negative = bad BS inputs → withhold. */
function ratioValue(numerator: number, denominator: number): number | null {
  if (!denominator || !Number.isFinite(denominator) || !Number.isFinite(numerator)) return null;
  if (numerator < 0 || denominator < 0) return null;
  return Math.round((numerator / denominator) * 100) / 100;
}

/** Days metrics (DSO/DPO): days in period × (numerator / denominator). */
function daysValue(numerator: number, denominator: number, days: number): number | null {
  if (!denominator || !Number.isFinite(denominator) || !Number.isFinite(numerator)) return null;
  return Math.round((numerator / denominator) * days);
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
      dsoNote: null,
      dpoNote: null,
      burnRate: null,
      runway: runwayMonths,
    };
  }

  const revenue = summary.revenue;
  const grossProfit =
    summary.gross_profit !== 0
      ? summary.gross_profit
      : revenue - Math.abs(summary.cogs);

  const grossMargin = percentValue(grossProfit, revenue);
  const netMargin = summary.data_error ? null : percentValue(summary.net_income, revenue);

  const currentRatio = ratioValue(summary.current_assets, summary.current_liabilities);

  // Quick ratio = (cash + AR) / current liabilities — same balance-sheet cash basis as current ratio
  const quickAssets = summary.cash + summary.accounts_receivable;
  const quickRatio = ratioValue(quickAssets, summary.current_liabilities);

  const days = periodDays(range);
  const dso = daysValue(summary.accounts_receivable, revenue, days);
  const cogs = Math.abs(summary.cogs) || null;
  const dpo = cogs ? daysValue(summary.accounts_payable, cogs, days) : null;

  const dsoNote =
    dso === 0 && summary.accounts_receivable === 0
      ? 'No outstanding receivables at period end'
      : null;
  const dpoNote =
    dpo === 0 && summary.accounts_payable === 0
      ? 'No outstanding payables at period end'
      : null;

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
      quick_assets: quickAssets,
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
    dsoNote,
    dpoNote,
    burnRate,
    runway: runwayMonths,
  };
}
