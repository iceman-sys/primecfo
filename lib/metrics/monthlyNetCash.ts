import { extractNetCashIncreaseTotal } from '@/lib/ai/extractReportExtras';
import { extractCashFlowNetByPeriod } from '@/lib/metrics/parseQboReport';
import { periodMonthsForRange } from '@/lib/metrics/periodMonths';
import type { ReportRange } from '@/lib/qbo/reports';

export type MonthlyNetCashBasis = 'cash_flow_statement' | 'pnl_net_income_fallback';

/**
 * Single source of truth: average monthly net cash change for a report window.
 * Uses CF statement "Net cash increase for period" (operating + investing + financing).
 * Prefers the report total column divided by period months; falls back to summing period columns.
 */
export function getMonthlyNetCashFromReport(
  cashFlowReportRaw: unknown,
  periodMonths: number
): number | null {
  if (periodMonths <= 0) return null;

  const totalNet = extractNetCashIncreaseTotal(cashFlowReportRaw);
  if (totalNet != null && Number.isFinite(totalNet)) {
    return totalNet / periodMonths;
  }

  const netByPeriod = extractCashFlowNetByPeriod(cashFlowReportRaw);
  if (netByPeriod.length === 0) return null;

  const withoutCurrent = netByPeriod.length > 1 ? netByPeriod.slice(0, -1) : netByPeriod;
  const periods = withoutCurrent.filter((v) => Number.isFinite(v));
  if (periods.length === 0) return null;

  const totalFromColumns = periods.reduce((a, b) => a + b, 0);
  return totalFromColumns / periodMonths;
}

export function getMonthlyNetCashForRange(
  cashFlowReportRaw: unknown,
  range: ReportRange
): number | null {
  return getMonthlyNetCashFromReport(cashFlowReportRaw, periodMonthsForRange(range));
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
