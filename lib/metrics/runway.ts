export type TrendPoint = {
  periodLabel: string;
  start_date?: string;
  end_date?: string;
  revenue: number;
  /** Total costs (COGS + operating expenses) for charting and burn. */
  expenses: number;
  cogs?: number;
  operatingExpenses?: number;
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
  /** Trailing net cash flow from Cash Flow Statement (negative = net burn). */
  trailingNetCashFlow?: number | null;
  /** When true, runway countdown is not meaningful — operations are self-sustaining. */
  cashFlowPositive?: boolean;
};

const RUNWAY_CAP_MONTHS = 120;

/**
 * Gross runway (legacy): Total Cash / average monthly total costs.
 * Prefer {@link computeRunway} with trailing net cash flow for dashboard display.
 */
export function computeGrossRunway(trends: TrendPoint[], cashBalance: number): RunwayResult {
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

/**
 * Authoritative runway for the product UI.
 * Uses trailing NET cash flow from the Cash Flow Statement when available.
 * When net cash flow is positive, runway is not shown (cash-flow positive).
 */
export function computeRunway(
  trends: TrendPoint[],
  cashBalance: number,
  trailingNetCashFlow?: number | null
): RunwayResult {
  const gross = computeGrossRunway(trends, cashBalance);

  if (trailingNetCashFlow != null && Number.isFinite(trailingNetCashFlow)) {
    if (trailingNetCashFlow >= 0) {
      return {
        ...gross,
        trailingNetCashFlow,
        cashFlowPositive: true,
        monthlyBurn: 0,
        runwayMonths: null,
        daysCashOnHand: null,
      };
    }

    const netBurn = Math.abs(trailingNetCashFlow);
    const runwayMonths =
      netBurn > 0 && cashBalance >= 0
        ? Math.min(RUNWAY_CAP_MONTHS, Math.round((cashBalance / netBurn) * 10) / 10)
        : null;
    const daysCashOnHand =
      netBurn > 0 && cashBalance >= 0
        ? Math.round((cashBalance / netBurn) * 30 * 10) / 10
        : null;

    return {
      cashBalance,
      monthlyBurn: Math.round(netBurn * 100) / 100,
      runwayMonths,
      daysCashOnHand,
      trailingNetCashFlow,
      cashFlowPositive: false,
    };
  }

  return gross;
}
