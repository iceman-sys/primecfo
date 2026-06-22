import type { ReportRange } from '@/lib/qbo/reports';
import type { BalanceSheetSnapshot } from '@/lib/ai/extractBalanceSheet';
import type { BalanceSheetInsightInput } from '@/lib/ai/balanceSheetInsights';

export type BalanceSheetContext = {
  snapshot: BalanceSheetSnapshot;
  periodMonths: number;
  interestExpenseTotal: number | null;
  financingPrincipalTotal: number | null;
  monthlyOperatingCash: number | null;
  annualizedEbitda: number | null;
  debtToEbitda: number | null;
};

function periodMonthsForRange(range: ReportRange): number {
  if (range === '3m') return 3;
  if (range === '6m') return 6;
  if (range === '12m') return 12;
  return 12;
}

export function buildBalanceSheetInsightInput(
  range: ReportRange,
  snapshot: BalanceSheetSnapshot | null,
  interestExpenseTotal: number | null,
  financingPrincipalTotal: number | null,
  monthlyOperatingCash: number | null,
  annualizedEbitda: number | null
): BalanceSheetInsightInput | null {
  if (!snapshot) return null;

  const debtToEbitda =
    snapshot.totalDebt != null && annualizedEbitda != null && annualizedEbitda > 0
      ? Math.round((snapshot.totalDebt / annualizedEbitda) * 100) / 100
      : null;

  return {
    balanceSheet: snapshot,
    periodMonths: periodMonthsForRange(range),
    interestExpenseTotal,
    financingPrincipalTotal,
    monthlyOperatingCash,
    annualizedEbitda,
    debtToEbitda,
  };
}

export function formatBalanceSheetForPrompt(ctx: BalanceSheetContext): string[] {
  const { snapshot: bs } = ctx;
  const lines: string[] = ['Balance Sheet (latest integrated snapshot):'];

  const fmt = (n: number | null) => (n == null ? 'N/A' : `$${n.toFixed(0)}`);

  lines.push(`  Total Assets: ${fmt(bs.totalAssets)}`);
  lines.push(`  Total Liabilities: ${fmt(bs.totalLiabilities)}`);
  lines.push(`  Total Equity: ${fmt(bs.totalEquity)}`);
  if (bs.longTermDebt != null) lines.push(`  Long-term Debt: ${fmt(bs.longTermDebt)}`);
  if (bs.creditCardBalances != null) lines.push(`  Credit Card Balances: ${fmt(bs.creditCardBalances)}`);
  if (bs.shareholderDraws != null) lines.push(`  Shareholder Draws: ${fmt(bs.shareholderDraws)}`);
  if (bs.currentRatio != null) lines.push(`  Current Ratio: ${bs.currentRatio.toFixed(2)}`);
  if (bs.quickRatio != null) lines.push(`  Quick Ratio: ${bs.quickRatio.toFixed(2)}`);
  if (ctx.debtToEbitda != null) lines.push(`  Debt-to-EBITDA: ${ctx.debtToEbitda.toFixed(2)}x`);
  else if (bs.debtToAssets != null) lines.push(`  Debt-to-Assets: ${bs.debtToAssets.toFixed(2)}x`);
  if (bs.retainedEarnings != null) lines.push(`  Retained Earnings: ${fmt(bs.retainedEarnings)}`);

  if (ctx.interestExpenseTotal != null) {
    lines.push(`  Interest Expense (${ctx.periodMonths} mo): $${ctx.interestExpenseTotal.toFixed(0)}`);
  }
  if (ctx.monthlyOperatingCash != null) {
    lines.push(`  Est. Monthly Operating Cash: $${ctx.monthlyOperatingCash.toFixed(0)}`);
  }

  lines.push(
    '  Judgment: Use debt-to-EBITDA (not debt-to-equity) when equity is negative due to shareholder draws. Lead with retained earnings, not total equity.'
  );

  return lines;
}
