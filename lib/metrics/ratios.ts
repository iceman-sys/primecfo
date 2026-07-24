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
  range: '3m' | '6m' | '12m' | '4q' = '12m',
  opts?: {
    /** Open AR from aging report — preferred over BS AR (cash-basis BS AR is often $0). */
    openArFromAging?: number | null;
    /** Open AP from aging report. */
    openApFromAging?: number | null;
  }
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

  const openAr =
    opts?.openArFromAging != null && Number.isFinite(opts.openArFromAging)
      ? Math.max(0, opts.openArFromAging)
      : summary.accounts_receivable;
  const openAp =
    opts?.openApFromAging != null && Number.isFinite(opts.openApFromAging)
      ? Math.max(0, opts.openApFromAging)
      : summary.accounts_payable;

  // Liquidity: prefer aging overlay for AR/AP when available (cash-basis BS may exclude them).
  const currentAssetsForRatio =
    opts?.openArFromAging != null
      ? summary.cash + openAr + Math.max(0, summary.current_assets - summary.cash - summary.accounts_receivable)
      : summary.current_assets;
  const currentLiabForRatio =
    opts?.openApFromAging != null
      ? openAp + Math.max(0, summary.current_liabilities - summary.accounts_payable)
      : summary.current_liabilities;

  const currentRatio = ratioValue(currentAssetsForRatio, currentLiabForRatio);
  const quickAssets = summary.cash + openAr;
  const quickRatio = ratioValue(quickAssets, currentLiabForRatio);

  const days = periodDays(range);
  const dso = daysValue(openAr, revenue, days);
  const cogs = Math.abs(summary.cogs) || null;
  const dpo = cogs ? daysValue(openAp, cogs, days) : null;

  const dsoNote =
    dso === 0 && openAr === 0
      ? 'No outstanding receivables at period end'
      : opts?.openArFromAging != null
        ? 'DSO from A/R aging (open invoices)'
        : null;
  const dpoNote =
    dpo === 0 && openAp === 0
      ? 'No outstanding payables at period end'
      : opts?.openApFromAging != null
        ? 'DPO from A/P aging (open bills)'
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
      current_assets: currentAssetsForRatio,
      current_liabilities: currentLiabForRatio,
      quick_assets: quickAssets,
      ar: openAr,
      ap: openAp,
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
