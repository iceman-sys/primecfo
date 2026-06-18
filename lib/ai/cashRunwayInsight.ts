import type { InsightSeverity } from '@/lib/financialData';

export type CashRunwayEvaluation = {
  severity: InsightSeverity;
  title: string;
  message: string;
  showRunway: boolean;
  runwayMonths: number | null;
  metricValue: string;
};

function formatMoney(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

/**
 * Runway is only alarm-worthy when net cash flow is negative.
 * Uses trailing net cash from the Cash Flow Statement (not gross burn).
 */
export function evaluateCashRunway(input: {
  trailingNetCashFlow: number | null;
  cashBalance: number;
  grossRunwayMonths: number | null;
}): CashRunwayEvaluation {
  const { trailingNetCashFlow, cashBalance, grossRunwayMonths } = input;

  if (trailingNetCashFlow == null) {
    if (grossRunwayMonths != null && grossRunwayMonths <= 3) {
      return {
        severity: 'watch',
        title: 'Cash Runway',
        message:
          'Cash runway appears limited, but net cash flow data is unavailable. Sync your Cash Flow Statement to confirm whether operations are self-sustaining.',
        showRunway: true,
        runwayMonths: grossRunwayMonths,
        metricValue: `${grossRunwayMonths.toFixed(1)} mo`,
      };
    }
    return {
      severity: 'info',
      title: 'Cash Flow Data Needed',
      message:
        'Connect QuickBooks and sync Cash Flow reports to evaluate whether operations are cash-flow positive.',
      showRunway: false,
      runwayMonths: null,
      metricValue: 'N/A',
    };
  }

  if (trailingNetCashFlow >= 0) {
    return {
      severity: 'positive',
      title: 'Cash Flow Positive',
      message: `Operations are self-sustaining. Net cash flow is positive at ~${formatMoney(
        trailingNetCashFlow
      )}/mo over the trailing period. Cash position is stable — runway countdown is not applicable for a cash-flow-positive business.`,
      showRunway: false,
      runwayMonths: null,
      metricValue: `${formatMoney(trailingNetCashFlow)}/mo`,
    };
  }

  const netMonthlyBurn = Math.abs(trailingNetCashFlow);
  const runwayMonths = cashBalance > 0 ? cashBalance / netMonthlyBurn : 0;

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
