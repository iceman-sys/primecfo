import type { InsightSeverity } from '@/lib/financialData';

export type CashRunwayEvaluation = {
  severity: InsightSeverity;
  title: string;
  message: string;
  showRunway: boolean;
  runwayMonths: number | null;
  metricValue: string;
};

const BREAKEVEN_PCT = 0.02;
const RUNWAY_HORIZON_CAP = 36;

function formatMoney(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

/**
 * Runway is only meaningful when net burn is material relative to revenue.
 * Uses trailing net cash from the Cash Flow Statement (not gross burn).
 */
export function evaluateCashRunway(input: {
  trailingNetCashFlow: number | null;
  cashBalance: number;
  grossRunwayMonths: number | null;
  monthlyRevenue: number;
}): CashRunwayEvaluation {
  const { trailingNetCashFlow, cashBalance, monthlyRevenue } = input;

  if (trailingNetCashFlow == null) {
    return {
      severity: 'info',
      title: 'Cash Flow Analysis Pending',
      message:
        'Sync your Cash Flow Statement to enable runway and self-sustainability analysis. Runway countdown is not shown until net cash flow data is available.',
      showRunway: false,
      runwayMonths: null,
      metricValue: '',
    };
  }

  const breakevenThreshold =
    monthlyRevenue > 0 ? monthlyRevenue * BREAKEVEN_PCT : Math.abs(trailingNetCashFlow) + 1;

  if (trailingNetCashFlow >= breakevenThreshold) {
    return {
      severity: 'positive',
      title: 'Cash Flow Positive',
      message: `Operations are self-sustaining. Net cash flow is positive at ~${formatMoney(
        trailingNetCashFlow
      )}/mo. Cash position is stable.`,
      showRunway: false,
      runwayMonths: null,
      metricValue: `${formatMoney(trailingNetCashFlow)}/mo`,
    };
  }

  if (Math.abs(trailingNetCashFlow) < breakevenThreshold) {
    return {
      severity: 'info',
      title: 'Operating Near Breakeven',
      message: `The business is operating near breakeven — net cash flow is roughly flat (~${formatMoney(
        trailingNetCashFlow
      )}/mo relative to ~${formatMoney(monthlyRevenue)}/mo revenue). Cash position is stable. Runway is not a meaningful metric at this level of net cash flow.`,
      showRunway: false,
      runwayMonths: null,
      metricValue: `${formatMoney(trailingNetCashFlow)}/mo`,
    };
  }

  const netMonthlyBurn = Math.abs(trailingNetCashFlow);
  const runwayMonths = cashBalance > 0 ? cashBalance / netMonthlyBurn : 0;

  if (runwayMonths > RUNWAY_HORIZON_CAP) {
    return {
      severity: 'info',
      title: 'Cash Position Stable',
      message: `Cash flow is modestly negative (~${formatMoney(netMonthlyBurn)}/mo) but cash reserves comfortably cover well beyond the planning horizon. No near-term liquidity concern.`,
      showRunway: false,
      runwayMonths: null,
      metricValue: `${formatMoney(netMonthlyBurn)}/mo burn`,
    };
  }

  let severity: InsightSeverity;
  if (runwayMonths <= 3) severity = 'critical';
  else if (runwayMonths <= 6) severity = 'warning';
  else severity = 'info';

  return {
    severity,
    title: 'Cash Runway',
    message: `Net cash flow is negative at ~${formatMoney(netMonthlyBurn)}/mo. At this rate, current cash covers ~${runwayMonths.toFixed(
      1
    )} months. Review the drivers of negative cash flow (draws, loan payments, and operating outflows).`,
    showRunway: true,
    runwayMonths,
    metricValue: `${runwayMonths.toFixed(1)} mo`,
  };
}
