import { extractCashFlowNetByPeriod } from '@/lib/metrics/parseQboReport';

export type MonthlyNetCashBasis = 'cash_flow_statement' | 'pnl_net_income_fallback';

/**
 * Single source of truth: trailing average monthly net cash increase from a Cash Flow Statement.
 * Uses the bottom-line "Net cash increase for period" (operating + investing + financing:
 * COGS, owner draws, loan principal, etc.).
 */
export function getMonthlyNetCashFromReport(
  cashFlowReportRaw: unknown,
  trailingMonths = 3
): number | null {
  const netByPeriod = extractCashFlowNetByPeriod(cashFlowReportRaw);
  if (netByPeriod.length === 0) return null;

  const withoutCurrent = netByPeriod.length > 1 ? netByPeriod.slice(0, -1) : netByPeriod;
  const meaningful = withoutCurrent.filter((v) => Number.isFinite(v));
  const trailing = (meaningful.length > 0 ? meaningful : withoutCurrent).slice(-trailingMonths);
  if (trailing.length === 0) return null;

  return trailing.reduce((a, b) => a + b, 0) / trailing.length;
}

/** Dev-only guard when two screens compute the same metric differently. */
export function assertMonthlyNetCashConsistency(
  labelA: string,
  valueA: number | null | undefined,
  labelB: string,
  valueB: number | null | undefined,
  tolerance = 1
): void {
  if (process.env.NODE_ENV === 'production') return;
  if (valueA == null || valueB == null) return;
  if (!Number.isFinite(valueA) || !Number.isFinite(valueB)) return;
  if (Math.abs(valueA - valueB) > tolerance) {
    console.error(
      `CONSISTENCY BUG: ${labelA} (${valueA}) and ${labelB} (${valueB}) disagree on monthly net cash`
    );
  }
}
