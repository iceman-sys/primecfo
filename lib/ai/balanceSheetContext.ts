import type { ReportRange } from '@/lib/qbo/reports';
import type { BalanceSheetSnapshot } from '@/lib/ai/extractBalanceSheet';
import type { BalanceSheetInsightInput } from '@/lib/ai/balanceSheetInsights';
import { computeDebtToEbitda } from '@/lib/metrics/ebitda';
import { periodMonthsForRange } from '@/lib/metrics/periodMonths';

export type BalanceSheetContext = {
  snapshot: BalanceSheetSnapshot;
  periodMonths: number;
  interestExpenseTotal: number | null;
  financingPrincipalTotal: number | null;
  monthlyOperatingCash: number | null;
  netOperatingIncome: number | null;
  operatingCashFlow: number | null;
  periodEbitda: number | null;
  annualizedEbitda: number | null;
  debtToEbitda: number | null;
};

export function buildBalanceSheetInsightInput(
  range: ReportRange,
  snapshot: BalanceSheetSnapshot | null,
  interestExpenseTotal: number | null,
  financingPrincipalTotal: number | null,
  monthlyOperatingCash: number | null,
  periodEbitda: number | null,
  annualizedEbitda: number | null,
  netOperatingIncome: number | null,
  operatingCashFlow: number | null
): BalanceSheetInsightInput | null {
  if (!snapshot) return null;

  const debtToEbitda = computeDebtToEbitda(snapshot.totalDebt, annualizedEbitda);

  return {
    balanceSheet: snapshot,
    periodMonths: periodMonthsForRange(range),
    interestExpenseTotal,
    financingPrincipalTotal,
    monthlyOperatingCash,
    netOperatingIncome,
    operatingCashFlow,
    periodEbitda,
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
  if (bs.lineOfCredit != null) lines.push(`  Lines of Credit: ${fmt(bs.lineOfCredit)}`);
  if (bs.creditCardBalances != null) lines.push(`  Credit Card Balances: ${fmt(bs.creditCardBalances)}`);
  if (bs.shareholderDraws != null) lines.push(`  Shareholder Draws: ${fmt(bs.shareholderDraws)}`);
  if (bs.currentRatio != null) lines.push(`  Current Ratio: ${bs.currentRatio.toFixed(2)}`);
  if (bs.quickRatio != null) lines.push(`  Quick Ratio: ${bs.quickRatio.toFixed(2)}`);
  if (ctx.debtToEbitda != null) lines.push(`  Debt-to-EBITDA: ${ctx.debtToEbitda.toFixed(2)}x`);
  if (ctx.periodEbitda != null) lines.push(`  Period EBITDA: ${fmt(ctx.periodEbitda)}`);
  else if (bs.debtToAssets != null) lines.push(`  Debt-to-Assets: ${bs.debtToAssets.toFixed(2)}x`);
  if (bs.retainedEarnings != null) lines.push(`  Retained Earnings: ${fmt(bs.retainedEarnings)}`);

  if (ctx.interestExpenseTotal != null) {
    lines.push(`  Interest Expense (${ctx.periodMonths} mo): $${ctx.interestExpenseTotal.toFixed(0)}`);
  }
  if (ctx.operatingCashFlow != null) {
    lines.push(`  Operating Cash Flow (${ctx.periodMonths} mo, before draws): $${ctx.operatingCashFlow.toFixed(0)}`);
  }
  if (ctx.monthlyOperatingCash != null) {
    lines.push(`  Net Change in Cash (after owner draws): $${ctx.monthlyOperatingCash.toFixed(0)}/mo`);
  }

  lines.push(
    '  Judgment: Use debt-to-EBITDA (not debt-to-equity) when equity is negative due to shareholder draws. ' +
      'Interest/debt-service coverage uses EBIT/EBITDA/operating cash flow — never net change in cash after draws. ' +
      'Lead with retained earnings, not total equity.'
  );

  return lines;
}
