import type { DataQualityAdvisory, DataQualityInput } from './types';
import { daysBetween, fmtMoney, formatAdvisoryDate, formatGapSinceReconciliation, pctChange } from './utils';

const HEADLINE = 'Worth a professional look';

const SUSPENSE_PATTERNS = [
  'Need Info',
  'Unapplied Cash',
  'Ask My Accountant',
  'Uncategorized',
  'Clearing',
  'Suspense',
];

export function detectStaleBooks(data: DataQualityInput, today = new Date()): DataQualityAdvisory | null {
  const lastReconciled = data.lastReconciledDate;
  const daysBehind = lastReconciled ? daysBetween(lastReconciled, today) : 999;

  const baseline = data.trailingMedianMonthlyTxnCount;
  const volumeDrop =
    baseline > 0 && data.currentMonthTxnCount < baseline * 0.5;

  // Books current (< 30 days) and no volume drop → no advisory
  if (daysBehind < 30 && !volumeDrop) return null;

  const severity = daysBehind >= 60 ? 'red' : 'amber';

  let message: string;
  if (lastReconciled) {
    const gapLabel = formatGapSinceReconciliation(daysBehind);
    const urgentNote =
      daysBehind >= 60
        ? ' Figures may be significantly off until books are brought current.'
        : ' Recent activity may not be fully captured yet, which can affect the figures shown.';
    message =
      `Your books were last reconciled through ${formatAdvisoryDate(lastReconciled)} — ${gapLabel}.` +
      urgentNote +
      ' Bringing your books current will sharpen these insights.';
  } else if (volumeDrop) {
    message =
      'Recent activity appears lower than usual, which may mean your books are not fully current. ' +
      'Bringing your books up to date will sharpen these insights.';
  } else {
    message =
      'We could not confirm your last reconciliation date from QuickBooks. ' +
      'If your books are more than a month behind, figures shown may not reflect recent activity.';
  }

  return {
    rule: 'stale_books',
    priority: 1,
    affectedMetrics: ['ALL'],
    headline: HEADLINE,
    message,
    severity,
  };
}

export function detectARIssue(data: DataQualityInput): DataQualityAdvisory | null {
  const ar = data.accountsReceivable;
  const monthlyRevenue = data.avgMonthlyRevenue;
  if (ar <= 0 || monthlyRevenue <= 0) return null;

  const arMonths = ar / monthlyRevenue;
  const heavyAging = ar > 0 && data.arOver90Days / ar > 0.25;

  if (arMonths <= 2 && !heavyAging) return null;

  return {
    rule: 'high_ar',
    priority: 3,
    affectedMetrics: ['Current Ratio', 'Quick Ratio', 'DSO', 'Cash Forecast', 'Accounts Receivable'],
    headline: HEADLINE,
    message:
      'Your accounts receivable is unusually high relative to revenue. This can affect ' +
      'liquidity and cash-flow figures. It may reflect uncollected invoices or invoices ' +
      'left open in QuickBooks. A review can clarify your true cash position.',
    severity: 'red',
  };
}

export function detectStructuralNegatives(data: DataQualityInput): DataQualityAdvisory | null {
  const negativeEquityFromDraws =
    data.totalEquity != null &&
    data.accumulatedDraws != null &&
    data.totalEquity < 0 &&
    data.accumulatedDraws > Math.abs(data.totalEquity);

  const possibleMiscategorization =
    data.netMargin != null &&
    data.grossMargin != null &&
    data.netMargin < 0 &&
    data.grossMargin > 0;

  if (!negativeEquityFromDraws && !possibleMiscategorization) return null;

  return {
    rule: 'structural_negative',
    priority: 2,
    affectedMetrics: ['Retained Earnings', 'Total Equity', 'Net Margin', 'Net Profit', 'Profit Margin'],
    headline: HEADLINE,
    message:
      'Some equity or margin figures appear negative. This often reflects owner ' +
      'distributions or how certain items are categorized in QuickBooks — not ' +
      'necessarily a business loss. A professional review can confirm the true picture.',
    severity: 'red',
  };
}

export function detectLargeSwings(data: DataQualityInput): DataQualityAdvisory | null {
  const swings = [
    { name: 'Revenue', pct: pctChange(data.priorRevenue, data.currentRevenue), metric: 'Total Revenue' },
    { name: 'Expenses', pct: pctChange(data.priorExpenses, data.currentExpenses), metric: 'Total Costs' },
    { name: 'Net Income', pct: pctChange(data.priorNetIncome, data.currentNetIncome), metric: 'Net Profit' },
  ];

  const bigSwing = swings.find((s) => Math.abs(s.pct) > 40);
  if (!bigSwing) return null;

  return {
    rule: 'large_swing',
    priority: 4,
    affectedMetrics: ['Trend insights', 'Forecasts', 'Growth metrics', bigSwing.metric],
    headline: HEADLINE,
    message:
      `Your ${bigSwing.name.toLowerCase()} changed sharply (${bigSwing.pct > 0 ? '+' : ''}${bigSwing.pct.toFixed(0)}%) ` +
      'versus the prior period. Large swings often reflect one-time entries, seasonality, or a categorization issue ' +
      'rather than a lasting trend. Worth a closer look before acting on these figures.',
    severity: 'amber',
  };
}

export function detectSuspenseBalances(data: DataQualityInput): DataQualityAdvisory | null {
  const suspenseTotal = data.accounts
    .filter((a) => SUSPENSE_PATTERNS.some((p) => a.name.includes(p)))
    .reduce((sum, a) => sum + Math.abs(a.balance), 0);

  const threshold = Math.max(data.avgMonthlyRevenue * 0.01, 1000);
  if (suspenseTotal <= threshold) return null;

  return {
    rule: 'suspense_balances',
    priority: 3,
    affectedMetrics: ['Net Income', 'Cash Flow', 'Various'],
    headline: HEADLINE,
    message:
      `Some transactions are sitting in uncategorized or clearing accounts (about ${fmtMoney(suspenseTotal)}). ` +
      'Until these are classified, some figures are provisional. We can help finalize these for accurate reporting.',
    severity: 'red',
  };
}

export function getDataQualityAdvisory(data: DataQualityInput): DataQualityAdvisory | null {
  const rules = [
    detectStaleBooks(data),
    detectStructuralNegatives(data),
    detectARIssue(data),
    detectSuspenseBalances(data),
    detectLargeSwings(data),
  ].filter((r): r is DataQualityAdvisory => r != null);

  if (rules.length === 0) return null;
  return rules.sort((a, b) => a.priority - b.priority)[0];
}
