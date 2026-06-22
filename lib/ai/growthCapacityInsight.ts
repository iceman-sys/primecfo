import type { InsightSeverity } from '@/lib/financialData';

export type IncrementalMarginEvaluation = {
  severity: InsightSeverity;
  title: string;
  message: string;
  metricValue: string;
  incrementalMarginPct: number | null;
};

function fmtPct(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
}

/**
 * Incremental margin = Δ net income ÷ Δ revenue — scalability signal from P&L.
 */
export function evaluateIncrementalMargin(input: {
  revenueCurrent: number;
  revenuePrevious: number;
  netIncomeCurrent: number;
  netIncomePrevious: number;
}): IncrementalMarginEvaluation | null {
  const deltaRev = input.revenueCurrent - input.revenuePrevious;
  const deltaNi = input.netIncomeCurrent - input.netIncomePrevious;

  if (Math.abs(deltaRev) < 1) return null;

  const incrementalMargin = (deltaNi / deltaRev) * 100;

  if (incrementalMargin >= 30) {
    return {
      severity: 'positive',
      title: 'Strong Incremental Margin',
      message: `Each additional dollar of revenue added ~${fmtPct(incrementalMargin)} to net income period-over-period — strong operating leverage for growth.`,
      metricValue: fmtPct(incrementalMargin),
      incrementalMarginPct: incrementalMargin,
    };
  }

  if (incrementalMargin >= 10) {
    return {
      severity: 'positive',
      title: 'Healthy Scalability',
      message: `Incremental margin is ${fmtPct(incrementalMargin)} — growth is translating into profit at a healthy rate.`,
      metricValue: fmtPct(incrementalMargin),
      incrementalMarginPct: incrementalMargin,
    };
  }

  if (incrementalMargin >= 0) {
    return {
      severity: 'info',
      title: 'Moderate Incremental Margin',
      message: `Incremental margin is ${fmtPct(incrementalMargin)}. Revenue growth is profitable but margins on new revenue are modest — review variable costs before scaling.`,
      metricValue: fmtPct(incrementalMargin),
      incrementalMarginPct: incrementalMargin,
    };
  }

  return {
    severity: 'watch',
    title: 'Growth Outpacing Profit',
    message: `Incremental margin is ${fmtPct(incrementalMargin)} — revenue grew but profit did not keep pace. Review whether new revenue is lower-margin or costs scaled with growth.`,
    metricValue: fmtPct(incrementalMargin),
    incrementalMarginPct: incrementalMargin,
  };
}
