import type { RiskPosture } from '@/lib/financialData';
import type { FinancialContext } from '@/lib/ai/getFinancialContext';
import type { AIInsight } from '@/lib/financialData';

export type RiskSignals = {
  cashFlowPositive: boolean;
  profitable: boolean;
  revenueGrowing: boolean;
  debtServiceAdequate: boolean | null;
  leverageElevated: boolean;
  liquidityThin: boolean;
};

export function deriveRiskSignals(context: FinancialContext): RiskSignals {
  const { summary, derived } = context;
  const bs = context.balanceSheet?.balanceSheet;

  const cashFlowPositive = (derived.trailingNetCashFlow ?? 0) >= 0;
  const profitable = summary.net_income > 0 && !summary.data_error;
  const revenueGrowing =
    (derived.recurringRevenueChangePct ?? derived.revenueGrowthPct ?? 0) > 0;

  const debtToEbitda = derived.debtToEbitda;
  const leverageElevated = debtToEbitda != null ? debtToEbitda > 4.0 : (bs?.debtToAssets ?? 0) > 1.5;

  const liquidityThin = bs?.quickRatio != null && bs.quickRatio < 0.5;

  let debtServiceAdequate: boolean | null = null;
  if (derived.debtServiceCoverage != null) {
    debtServiceAdequate = derived.debtServiceCoverage >= 1.0;
  }

  return {
    cashFlowPositive,
    profitable,
    revenueGrowing,
    debtServiceAdequate,
    leverageElevated,
    liquidityThin,
  };
}

/**
 * Composite risk posture — never HIGH from runway alone on a cash-flow-positive business.
 * HIGH requires genuine distress: negative cash flow, operating losses, or missed debt coverage.
 */
export function computeRiskPosture(
  context: FinancialContext,
  insights: AIInsight[]
): RiskPosture {
  const signals = deriveRiskSignals(context);
  const { summary, derived } = context;

  const genuineDistress =
    !signals.cashFlowPositive ||
    !signals.profitable ||
    signals.debtServiceAdequate === false;

  const watchCount = insights.filter((i) => i.urgency === 'watch' || i.urgency === 'warning').length;
  const criticalCount = insights.filter((i) => i.urgency === 'critical').length;

  let rating: RiskPosture['rating'];
  let summaryText: string;
  let topAction: string;

  if (genuineDistress && criticalCount > 0) {
    rating = 'HIGH';
    summaryText =
      !signals.cashFlowPositive
        ? 'Net cash flow is negative — operations are not self-sustaining without intervention.'
        : !signals.profitable
          ? 'The business is operating at a loss. Address profitability and cash flow together.'
          : 'Operating cash flow is not covering actual debt service. Review loan payments and collection timing.';
    topAction = insights.find((i) => i.urgency === 'critical')?.recommendations?.[0]?.action
      ?? 'Review cash flow drivers and debt payment schedule with your advisor.';
  } else if (genuineDistress) {
    rating = 'ELEVATED';
    summaryText =
      signals.debtServiceAdequate === false
        ? 'Debt service coverage is tight relative to operating cash. Monitor payables and collections closely.'
        : 'One or more core health signals (cash flow or profitability) need attention.';
    topAction = 'Prioritize stabilizing operating cash flow before taking on new obligations.';
  } else if (signals.leverageElevated || signals.liquidityThin || watchCount >= 2) {
    rating = 'MODERATE';
    const parts: string[] = [];
    if (signals.cashFlowPositive && signals.profitable) {
      parts.push('Operations are profitable and cash-flow positive');
    }
    if (signals.leverageElevated) parts.push('balance-sheet leverage warrants a deleveraging plan');
    if (signals.liquidityThin) parts.push('quick liquidity is thin relative to current liabilities');
    summaryText =
      parts.length > 0
        ? `${parts.join('; ')}. Overall position is stable with items to monitor — not in distress.`
        : 'Stable operations with a few areas to watch. No immediate distress signals.';
    topAction =
      signals.leverageElevated
        ? 'Build debt paydown into the cash flow plan — start with high-interest revolving balances.'
        : 'Maintain collections discipline and track payables timing against cash on hand.';
  } else {
    rating = 'LOW';
    summaryText =
      signals.revenueGrowing
        ? 'Profitable, cash-flow positive, and growing. Balance sheet watch items are manageable.'
        : 'Profitable and cash-flow positive with manageable leverage and liquidity.';
    topAction = 'Continue monitoring recurring revenue and debt service coverage each quarter.';
  }

  if (signals.cashFlowPositive && signals.profitable && rating === 'HIGH') {
    rating = 'MODERATE';
    summaryText =
      `Operations are profitable with positive net cash flow (~$${Math.round(
        derived.trailingNetCashFlow ?? 0
      ).toLocaleString()}/mo). ` +
      (signals.leverageElevated
        ? 'Elevated leverage is a strategic concern, not an immediate solvency crisis.'
        : 'Review individual watch items — overall posture is stable.');
    topAction = 'Focus on balance-sheet deleveraging and liquidity, not emergency cash conservation.';
  }

  void summary;

  return { rating, summary: summaryText, topAction };
}
