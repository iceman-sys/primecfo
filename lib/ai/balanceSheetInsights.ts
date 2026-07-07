import type { AIInsight, InsightSeverity } from '@/lib/financialData';
import type { BalanceSheetSnapshot } from '@/lib/ai/extractBalanceSheet';
import { SEVERITY_ORDER } from '@/lib/ai/generateInsights';

import type { OwnerDrawsSnapshot } from '@/lib/ai/extractReportExtras';

export type BalanceSheetInsightInput = {
  balanceSheet: BalanceSheetSnapshot;
  periodMonths: number;
  interestExpenseTotal: number | null;
  financingPrincipalTotal: number | null;
  /** Net change in cash (after owner draws). Display/context only — NEVER a coverage numerator. */
  monthlyOperatingCash: number | null;
  /** Net operating income (EBIT) for the period — earnings basis for coverage ratios. */
  netOperatingIncome: number | null;
  /** True operating cash flow from the CF statement (before financing/draws). */
  operatingCashFlow: number | null;
  periodEbitda: number | null;
  annualizedEbitda: number | null;
  debtToEbitda: number | null;
  ownerDraws: OwnerDrawsSnapshot | null;
  accountsReceivable: number | null;
};

export type BalanceSheetEvaluation = {
  severity: InsightSeverity;
  title: string;
  message: string;
  category: string;
  metric: string;
  metricValue: string;
  recommendations?: string[];
};

function fmtMoney(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

function isDrawDrivenNegativeEquity(bs: BalanceSheetSnapshot): boolean {
  return (
    bs.totalEquity != null &&
    bs.totalEquity < 0 &&
    bs.shareholderDraws != null &&
    bs.shareholderDraws > Math.abs(bs.totalEquity)
  );
}

/** Owner draws (YTD) from Cash Flow financing activities — actionable for owners. */
export function evaluateOwnerDraws(input: BalanceSheetInsightInput): BalanceSheetEvaluation | null {
  const { ownerDraws, periodMonths } = input;
  if (!ownerDraws || ownerDraws.totalYtd <= 0) return null;

  const months = Math.max(periodMonths, 1);
  const annualPace = ownerDraws.totalYtd * (12 / months);

  let detail = '';
  if (ownerDraws.ownerDistributions > 0 && ownerDraws.taxDraws > 0) {
    detail = ` (${fmtMoney(ownerDraws.ownerDistributions)} owner distributions + ${fmtMoney(ownerDraws.taxDraws)} tax draws)`;
  } else if (ownerDraws.ownerDistributions > 0) {
    detail = ` (${fmtMoney(ownerDraws.ownerDistributions)} in owner distributions)`;
  }

  return {
    severity: 'info',
    category: 'Owner & Tax Draws',
    title: 'Owner Draws (YTD)',
    metric: 'Owner Draws (YTD)',
    metricValue: fmtMoney(ownerDraws.totalYtd),
    message:
      `Owner Draws (YTD): ${fmtMoney(ownerDraws.totalYtd)} drawn year-to-date${detail}. ` +
      `At this pace, annual draws will reach approximately ${fmtMoney(annualPace)}.`,
  };
}

/** Insight 1: Leverage — Debt-to-EBITDA (lender standard; no loan schedule required). */
export function evaluateLeverage(input: BalanceSheetInsightInput): BalanceSheetEvaluation | null {
  const { balanceSheet: bs, debtToEbitda, periodEbitda } = input;
  if (debtToEbitda == null || bs.totalDebt == null) {
    if (bs.debtToAssets == null || bs.totalLiabilities == null || bs.totalAssets == null) return null;
    return evaluateLeverageDebtToAssets(input);
  }

  const equityNote = isDrawDrivenNegativeEquity(bs)
    ? ' Negative book equity reflects owner draws, not operating distress.'
    : '';
  const ltd = bs.longTermDebt ?? 0;
  const loc = bs.lineOfCredit ?? 0;
  const cc = bs.creditCardBalances ?? 0;

  let severity: InsightSeverity;
  let title: string;
  if (debtToEbitda > 5.0) {
    severity = 'warning';
    title = 'High Leverage (Debt-to-EBITDA)';
  } else if (debtToEbitda > 4.0) {
    severity = 'watch';
    title = 'Elevated Leverage (Debt-to-EBITDA)';
  } else if (debtToEbitda > 2.0) {
    severity = 'info';
    title = 'Moderate Leverage (Debt-to-EBITDA)';
  } else {
    severity = 'positive';
    title = 'Healthy Leverage (Debt-to-EBITDA)';
  }

  const debtParts: string[] = [];
  if (ltd > 0) debtParts.push(`${fmtMoney(ltd)} long-term loans`);
  if (loc > 0) debtParts.push(`${fmtMoney(loc)} lines of credit`);
  if (cc > 0) debtParts.push(`${fmtMoney(cc)} credit cards`);
  const debtDetail =
    debtParts.length > 0
      ? ` Total debt of ${fmtMoney(bs.totalDebt)} includes ${debtParts.join(', ')}.`
      : '';

  const ebitdaNote =
    periodEbitda != null ? ` EBITDA ${fmtMoney(periodEbitda)},` : '';

  return {
    severity,
    category: 'Leverage',
    title,
    metric: 'Debt-to-EBITDA',
    metricValue: `${debtToEbitda.toFixed(2)}x`,
    message:
      `Debt-to-EBITDA is ${debtToEbitda.toFixed(1)}x —${ebitdaNote} total debt ${fmtMoney(bs.totalDebt)}.` +
      (debtDetail ? debtDetail : '') +
      (debtToEbitda > 4.0
        ? ' A deleveraging plan should be part of financial strategy.'
        : debtToEbitda <= 2.0
          ? ' Leverage is within a healthy range for most lenders.'
          : '') +
      equityNote,
    recommendations:
      debtToEbitda > 4.0
        ? [
            'Prioritize paydown of high-interest revolving credit card balances.',
            'Evaluate refinancing options on higher-rate loans.',
            'Build debt paydown into the cash flow plan given positive operating cash.',
          ]
        : undefined,
  };
}

function evaluateLeverageDebtToAssets(input: BalanceSheetInsightInput): BalanceSheetEvaluation | null {
  const { balanceSheet: bs } = input;
  if (bs.debtToAssets == null) return null;
  const severity: InsightSeverity = bs.debtToAssets > 1.5 ? 'warning' : bs.debtToAssets > 1.0 ? 'watch' : 'positive';
  return {
    severity,
    category: 'Leverage',
    title: 'Leverage Position',
    metric: 'Debt-to-Assets',
    metricValue: `${bs.debtToAssets.toFixed(2)}x`,
    message: `Debt-to-assets is ${bs.debtToAssets.toFixed(2)}x (EBITDA unavailable for debt-to-EBITDA).`,
  };
}

/**
 * Earnings basis for coverage ratios. Interest coverage = earnings ÷ interest (times interest
 * earned). Prefers EBIT (net operating income), then EBITDA, then true operating cash flow.
 * NEVER uses net change in cash / net income after owner draws.
 */
function coverageEarnings(
  input: BalanceSheetInsightInput
): { annual: number; label: string } | null {
  if (input.netOperatingIncome != null && input.netOperatingIncome > 0) {
    return { annual: input.netOperatingIncome, label: 'Operating income (EBIT)' };
  }
  if (input.periodEbitda != null && input.periodEbitda > 0) {
    return { annual: input.periodEbitda, label: 'EBITDA' };
  }
  if (input.operatingCashFlow != null && input.operatingCashFlow > 0) {
    return { annual: input.operatingCashFlow, label: 'Operating cash flow' };
  }
  return null;
}

/**
 * Insight 2: Debt service — earnings ÷ (P&L interest + CF principal).
 * Uses an earnings numerator (EBIT/EBITDA/OCF), never owner-draw-inclusive cash.
 */
export function evaluateDebtService(input: BalanceSheetInsightInput): BalanceSheetEvaluation | null {
  const { periodMonths, interestExpenseTotal, financingPrincipalTotal } = input;

  const earnings = coverageEarnings(input);
  if (earnings == null) return null;

  const months = Math.max(periodMonths, 1);
  const monthlyInterest = (interestExpenseTotal ?? 0) / months;
  if (monthlyInterest <= 0) return null;

  const monthlyEarnings = earnings.annual / months;
  const monthlyPrincipal =
    financingPrincipalTotal != null && financingPrincipalTotal > 0
      ? financingPrincipalTotal / months
      : 0;
  const hasActualPrincipal = monthlyPrincipal > 0;

  const gradeSeverity = (c: number): InsightSeverity =>
    c >= 2.0 ? 'positive' : c >= 1.25 ? 'watch' : 'critical';

  if (!hasActualPrincipal) {
    const coverage = monthlyEarnings / monthlyInterest;
    return {
      severity: gradeSeverity(coverage),
      category: 'Debt Service',
      title:
        coverage >= 2.0
          ? 'Healthy Interest Coverage'
          : coverage >= 1.25
            ? 'Adequate Interest Coverage'
            : 'Tight Interest Coverage',
      metric: 'Interest Coverage',
      metricValue: `${coverage.toFixed(1)}x`,
      message:
        `${earnings.label} (~${fmtMoney(monthlyEarnings)}/mo) covers interest expense ` +
        `(~${fmtMoney(monthlyInterest)}/mo) ${coverage.toFixed(1)}x. ` +
        `Principal was not itemized in the Cash Flow Statement, so this is times-interest-earned on interest only.`,
    };
  }

  const monthlyDebtService = monthlyInterest + monthlyPrincipal;
  const coverage = monthlyEarnings / monthlyDebtService;

  if (coverage < 1.0) {
    return {
      severity: 'critical',
      category: 'Debt Service',
      title: 'Insufficient Debt Service Coverage',
      metric: 'Debt Service Coverage',
      metricValue: `${coverage.toFixed(2)}x`,
      message:
        `${earnings.label} (~${fmtMoney(monthlyEarnings)}/mo) does not cover total debt service ` +
        `(~${fmtMoney(monthlyDebtService)}/mo: ${fmtMoney(monthlyInterest)} interest + ` +
        `${fmtMoney(monthlyPrincipal)} principal from the Cash Flow Statement).`,
      recommendations: [
        'Map all loan payment due dates against cash collection cycles.',
        'Prioritize high-interest revolving balances for paydown.',
        'Discuss refinancing or covenant relief with lenders if coverage stays below 1.0x.',
      ],
    };
  }

  if (coverage < 1.25) {
    return {
      severity: 'watch',
      category: 'Debt Service',
      title: 'Tight Debt Service Coverage',
      metric: 'Debt Service Coverage',
      metricValue: `${coverage.toFixed(2)}x`,
      message:
        `${earnings.label} covers total debt service ${coverage.toFixed(2)}x ` +
        `(~${fmtMoney(monthlyEarnings)}/mo vs ~${fmtMoney(monthlyDebtService)}/mo). ` +
        `Positive but limited cushion — monitor if revenue softens.`,
    };
  }

  return {
    severity: 'positive',
    category: 'Debt Service',
    title: 'Healthy Debt Service Coverage',
    metric: 'Debt Service Coverage',
    metricValue: `${coverage.toFixed(2)}x`,
    message:
      `${earnings.label} comfortably covers total debt service at ${coverage.toFixed(2)}x ` +
      `(~${fmtMoney(monthlyEarnings)}/mo vs ~${fmtMoney(monthlyDebtService)}/mo from P&L interest + CF principal).`,
  };
}

/** Insight 3: Liquidity — quick ratio vs current ratio with CFO judgment. */
export function evaluateLiquidity(input: BalanceSheetInsightInput): BalanceSheetEvaluation | null {
  const { balanceSheet: bs, accountsReceivable } = input;
  if (bs.quickRatio == null || bs.currentRatio == null) return null;

  const arNote =
    (accountsReceivable ?? bs.accountsReceivable ?? 0) === 0
      ? ' Note: Receivables are showing $0 — if your business invoices clients, confirm AR is syncing correctly from QuickBooks. A $0 AR balance is normal for cash-based businesses (retail, subscriptions).'
      : '';

  if (bs.quickRatio < 0.5) {
    return {
      severity: 'watch',
      category: 'Liquidity',
      title: 'Thin Quick Liquidity',
      metric: 'Quick Ratio',
      metricValue: bs.quickRatio.toFixed(2),
      message:
        `Your quick ratio is ${bs.quickRatio.toFixed(2)} — about ${(bs.quickRatio * 100).toFixed(0)} cents ` +
        `of liquid assets (cash + receivables) per dollar of current liabilities. ` +
        `The current ratio (${bs.currentRatio.toFixed(2)}) looks healthier because it includes ` +
        `less-liquid current assets. Worth monitoring payables timing against cash on hand.${arNote}`,
    };
  }

  if (bs.quickRatio < 1.0) {
    return {
      severity: 'info',
      category: 'Liquidity',
      title: 'Moderate Quick Liquidity',
      metric: 'Quick Ratio',
      metricValue: bs.quickRatio.toFixed(2),
      message:
        `Quick ratio is ${bs.quickRatio.toFixed(2)} (current ratio ${bs.currentRatio.toFixed(2)}). ` +
        `Liquid assets cover most near-term obligations — track collection and payables timing.`,
    };
  }

  return {
    severity: 'positive',
    category: 'Liquidity',
    title: 'Strong Quick Liquidity',
    metric: 'Quick Ratio',
    metricValue: bs.quickRatio.toFixed(2),
    message:
      `Quick ratio of ${bs.quickRatio.toFixed(2)} indicates solid liquid coverage of current liabilities ` +
      `(current ratio ${bs.currentRatio.toFixed(2)}).`,
  };
}

function evaluationToInsight(evalResult: BalanceSheetEvaluation, suffix: string): AIInsight {
  const recommendations = evalResult.recommendations?.map((action) => ({
    action,
    expectedImpact: 'Improves balance-sheet risk profile and cash flexibility.',
  }));

  return {
    id: `bs-insight-${suffix}-${Date.now()}`,
    title: evalResult.title,
    description: evalResult.message,
    urgency: evalResult.severity,
    category: evalResult.category,
    metric: evalResult.metric,
    metricValue: evalResult.metricValue,
    recommendations: recommendations?.length ? recommendations : undefined,
    talkingPoints: [evalResult.message],
    createdAt: new Date().toISOString(),
  };
}

function isBalanceSheetCategory(category: string): boolean {
  const c = category.toLowerCase();
  return (
    c.includes('leverage') ||
    c.includes('debt service') ||
    c.includes('liquidity') ||
    c.includes('solvency') ||
    c.includes('equity structure') ||
    c.includes('owner') ||
    c.includes('draw') ||
    c.includes('balance sheet')
  );
}

export function computeDebtServiceCoverage(input: BalanceSheetInsightInput): number | null {
  const { periodMonths, interestExpenseTotal, financingPrincipalTotal } = input;
  const earnings = coverageEarnings(input);
  if (earnings == null) return null;
  const months = Math.max(periodMonths, 1);
  const monthlyInterest = (interestExpenseTotal ?? 0) / months;
  if (monthlyInterest <= 0) return null;
  const monthlyEarnings = earnings.annual / months;
  const monthlyPrincipal =
    financingPrincipalTotal != null && financingPrincipalTotal > 0
      ? financingPrincipalTotal / months
      : 0;
  const service = monthlyInterest + monthlyPrincipal;
  return service > 0 ? monthlyEarnings / service : monthlyEarnings / monthlyInterest;
}

/** Build deterministic balance-sheet insights and merge with LLM output. */
export function applyBalanceSheetInsights(
  insights: AIInsight[],
  input: BalanceSheetInsightInput | null
): AIInsight[] {
  if (!input) return insights;

  const evaluators = [
    evaluateLeverage,
    evaluateDebtService,
    evaluateLiquidity,
    evaluateOwnerDraws,
  ];

  const deterministic = evaluators
    .map((fn) => fn(input))
    .filter((e): e is BalanceSheetEvaluation => e != null)
    .map((e, i) => evaluationToInsight(e, String(i)));

  const filtered = insights.filter((i) => !isBalanceSheetCategory(i.category));
  const merged = [...deterministic, ...filtered];
  merged.sort((a, b) => (SEVERITY_ORDER[a.urgency] ?? 4) - (SEVERITY_ORDER[b.urgency] ?? 4));
  return merged;
}
