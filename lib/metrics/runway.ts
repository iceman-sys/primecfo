export type TrendPoint = {
  periodLabel: string;
  start_date?: string;
  end_date?: string;
  revenue: number;
  expenses: number;
  profit: number;
  cash: number;
};

export type RunwayResult = {
  /** Cash balance used (from latest period with cash data). */
  cashBalance: number;
  /** Average monthly burn (positive number = outflow per month). */
  monthlyBurn: number;
  /** Cash / monthlyBurn when burn > 0. */
  runwayMonths: number | null;
  /** Days cash on hand using annualized operating expenses. */
  daysCashOnHand: number | null;
};

const RUNWAY_CAP_MONTHS = 120;

/**
 * Authoritative runway: Total Cash / Average Monthly Burn.
 * Burn = average of last 3 months expenses (net outflow proxy from P&L expenses).
 */
export function computeRunway(
  trends: TrendPoint[],
  cashBalance: number
): RunwayResult {
  const last3 = trends
    .map((t) => t.expenses)
    .filter((e) => e > 0)
    .slice(-3);

  const monthlyBurn =
    last3.length > 0
      ? last3.reduce((a, b) => a + b, 0) / last3.length
      : trends.length > 0
        ? trends[trends.length - 1].expenses
        : 0;

  const runwayMonths =
    monthlyBurn > 0 && cashBalance >= 0
      ? Math.min(RUNWAY_CAP_MONTHS, Math.round((cashBalance / monthlyBurn) * 10) / 10)
      : null;

  const annualizedExpenses = monthlyBurn * 12;
  const daysCashOnHand =
    annualizedExpenses > 0 && cashBalance >= 0
      ? Math.round((cashBalance / (annualizedExpenses / 365)) * 10) / 10
      : null;

  return {
    cashBalance,
    monthlyBurn: Math.round(monthlyBurn * 100) / 100,
    runwayMonths,
    daysCashOnHand,
  };
}
