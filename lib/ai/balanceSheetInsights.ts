import type { AIInsight, InsightSeverity } from '@/lib/financialData';
import type { BalanceSheetSnapshot } from '@/lib/ai/extractBalanceSheet';
import { SEVERITY_ORDER } from '@/lib/ai/generateInsights';

export type BalanceSheetInsightInput = {
  balanceSheet: BalanceSheetSnapshot;
  periodMonths: number;
  interestExpenseTotal: number | null;
  financingPrincipalTotal: number | null;
  monthlyOperatingCash: number | null;
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

/** Insight 4: Negative equity with shareholder-draw context — not naive insolvency alarm. */
export function evaluateEquityStructure(input: BalanceSheetInsightInput): BalanceSheetEvaluation | null {
  const { balanceSheet: bs } = input;
  if (bs.totalEquity == null) return null;

  if (isDrawDrivenNegativeEquity(bs)) {
    return {
      severity: 'info',
      category: 'Equity Structure',
      title: 'Negative Equity — Distribution Pattern',
      metric: 'Total Equity',
      metricValue: fmtMoney(bs.totalEquity),
      message:
        `Reported equity is ${fmtMoney(bs.totalEquity)}, but accumulated shareholder draws ` +
        `(${fmtMoney(bs.shareholderDraws!)}) exceed the equity deficit. This reflects how the owner ` +
        `takes compensation (distributions vs. W-2 salary), not necessarily insolvency. ` +
        `Evaluate leverage via debt-to-assets and debt service coverage instead of raw negative equity.`,
    };
  }

  if (bs.totalEquity < 0) {
    return {
      severity: 'watch',
      category: 'Equity Structure',
      title: 'Negative Book Equity',
      metric: 'Total Equity',
      metricValue: fmtMoney(bs.totalEquity),
      message:
        `Total equity is ${fmtMoney(bs.totalEquity)}. Review whether this stems from accumulated distributions ` +
        `or genuine losses — debt-to-assets and operating cash flow provide the clearer solvency picture.`,
    };
  }

  return null;
}

/** Insight 1: Leverage / solvency — debt-to-assets, not debt-to-equity when equity is negative. */
export function evaluateLeverage(input: BalanceSheetInsightInput): BalanceSheetEvaluation | null {
  const { balanceSheet: bs } = input;
  if (bs.debtToAssets == null || bs.totalLiabilities == null || bs.totalAssets == null) return null;

  const equityNote = isDrawDrivenNegativeEquity(bs)
    ? ' Negative equity is primarily a distribution pattern, not a going-concern signal on its own.'
    : '';
  const ltd = bs.longTermDebt ?? 0;
  const cc = bs.creditCardBalances ?? 0;

  if (bs.debtToAssets > 1.5) {
    return {
      severity: 'warning',
      category: 'Leverage',
      title: 'High Leverage Position',
      metric: 'Debt-to-Assets',
      metricValue: `${bs.debtToAssets.toFixed(2)}x`,
      message:
        `Total liabilities (${fmtMoney(bs.totalLiabilities)}) are ${bs.debtToAssets.toFixed(1)}x ` +
        `total assets (${fmtMoney(bs.totalAssets)}). The business carries significant debt` +
        (ltd > 0 || cc > 0
          ? ` — primarily ${ltd > 0 ? `${fmtMoney(ltd)} in long-term loans` : ''}` +
            `${ltd > 0 && cc > 0 ? ' and ' : ''}` +
            `${cc > 0 ? `${fmtMoney(cc)} in revolving credit` : ''}.`
          : '.') +
        ` A deleveraging plan should be part of financial strategy.${equityNote}`,
      recommendations: [
        'Prioritize paydown of high-interest revolving credit card balances.',
        'Evaluate refinancing options on higher-rate loans.',
        'Build debt paydown into the cash flow plan given positive operating cash.',
      ],
    };
  }

  if (bs.debtToAssets > 1.0) {
    return {
      severity: 'watch',
      category: 'Leverage',
      title: 'Elevated Leverage',
      metric: 'Debt-to-Assets',
      metricValue: `${bs.debtToAssets.toFixed(2)}x`,
      message:
        `Liabilities exceed assets at ${bs.debtToAssets.toFixed(2)}x debt-to-assets. ` +
        `Monitor debt service coverage and liquidity as revenue seasons.${equityNote}`,
    };
  }

  return {
    severity: 'positive',
    category: 'Leverage',
    title: 'Balanced Leverage',
    metric: 'Debt-to-Assets',
    metricValue: `${bs.debtToAssets.toFixed(2)}x`,
    message: `Debt-to-assets is ${bs.debtToAssets.toFixed(2)}x — liabilities are proportionate to the asset base.`,
  };
}

/** Insight 2: Debt service coverage — operating cash vs principal + interest. */
export function evaluateDebtService(input: BalanceSheetInsightInput): BalanceSheetEvaluation | null {
  const { periodMonths, interestExpenseTotal, financingPrincipalTotal, monthlyOperatingCash } = input;

  if (monthlyOperatingCash == null) return null;

  const months = Math.max(periodMonths, 1);
  const monthlyInterest = (interestExpenseTotal ?? 0) / months;
  const monthlyPrincipal = (financingPrincipalTotal ?? 0) / months;
  const monthlyDebtService = monthlyInterest + monthlyPrincipal;

  if (monthlyDebtService <= 0) {
    if (monthlyInterest > 0) {
      const coverage = monthlyOperatingCash / monthlyInterest;
      return {
        severity: coverage >= 1.25 ? 'positive' : 'watch',
        category: 'Debt Service',
        title: coverage >= 1.25 ? 'Adequate Interest Coverage' : 'Tight Interest Coverage',
        metric: 'Interest Coverage',
        metricValue: `${coverage.toFixed(2)}x`,
        message:
          `Operating cash flow (~${fmtMoney(monthlyOperatingCash)}/mo) covers interest expense ` +
          `(~${fmtMoney(monthlyInterest)}/mo) at ${coverage.toFixed(2)}x. ` +
          `Principal payment detail was not available in the Cash Flow Statement.`,
      };
    }
    return null;
  }

  const coverage = monthlyOperatingCash / monthlyDebtService;

  if (coverage < 1.0) {
    return {
      severity: 'critical',
      category: 'Debt Service',
      title: 'Insufficient Debt Service Coverage',
      metric: 'Debt Service Coverage',
      metricValue: `${coverage.toFixed(2)}x`,
      message:
        `Operating cash flow (~${fmtMoney(monthlyOperatingCash)}/mo) does not fully cover ` +
        `estimated debt service (~${fmtMoney(monthlyDebtService)}/mo including interest and principal). ` +
        `This is a genuine cash-flow risk — review loan terms and payment timing.`,
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
        `Operating cash flow covers debt service ${coverage.toFixed(2)}x ` +
        `(~${fmtMoney(monthlyOperatingCash)}/mo vs ~${fmtMoney(monthlyDebtService)}/mo). ` +
        `This is positive but leaves limited cushion. Monitor closely if revenue softens.`,
    };
  }

  return {
    severity: 'positive',
    category: 'Debt Service',
    title: 'Healthy Debt Service Coverage',
    metric: 'Debt Service Coverage',
    metricValue: `${coverage.toFixed(2)}x`,
    message:
      `Operating cash flow comfortably covers debt service at ${coverage.toFixed(2)}x ` +
      `(~${fmtMoney(monthlyOperatingCash)}/mo vs ~${fmtMoney(monthlyDebtService)}/mo).`,
  };
}

/** Insight 3: Liquidity — quick ratio vs current ratio with CFO judgment. */
export function evaluateLiquidity(input: BalanceSheetInsightInput): BalanceSheetEvaluation | null {
  const { balanceSheet: bs } = input;
  if (bs.quickRatio == null || bs.currentRatio == null) return null;

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
        `less-liquid current assets. Worth monitoring payables timing against cash on hand.`,
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
    c.includes('balance sheet')
  );
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
    evaluateEquityStructure,
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
