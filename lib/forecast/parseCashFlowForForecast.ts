import { getMonthlyNetCashFromReport } from '@/lib/metrics/monthlyNetCash';
import { extractCashFlowNetByPeriod } from '@/lib/metrics/parseQboReport';

export type MonthlyNetCashSeries = {
  monthLabels: string[];
  netCashIncrease: number[];
};

/**
 * Parse per-month "Net cash increase for period" from a multi-column QBO Cash Flow report.
 */
export function parseMonthlyNetCashIncrease(raw: unknown): MonthlyNetCashSeries {
  const empty: MonthlyNetCashSeries = { monthLabels: [], netCashIncrease: [] };
  const doc = raw as {
    Columns?: { Column?: Array<Record<string, unknown>> };
  };
  const cols = doc.Columns?.Column;
  if (!Array.isArray(cols) || cols.length < 2) return empty;

  const monthLabels = cols.slice(1).map((c) => {
    const title = c.ColTitle as { value?: string } | undefined;
    return (title?.value ?? '').trim() || '—';
  });

  const netCashIncrease = extractCashFlowNetByPeriod(raw);
  if (netCashIncrease.length === 0) return empty;

  const n = Math.min(monthLabels.length, netCashIncrease.length);
  return {
    monthLabels: monthLabels.slice(0, n),
    netCashIncrease: netCashIncrease.slice(0, n),
  };
}

/**
 * Trailing average of monthly net cash increase (excludes current partial month).
 * Primary input for cash forecasts — includes owner draws, loan payments, COGS, etc.
 */
export function trailingAverageNetCashIncrease(
  raw: unknown,
  periodMonths = 3
): number | null {
  return getMonthlyNetCashFromReport(raw, periodMonths);
}

/** @deprecated Use trailingAverageNetCashIncrease — operating-only net misses financing outflows. */
export function averageMonthlyOperatingNetCash(raw: unknown): number | null {
  return trailingAverageNetCashIncrease(raw, 3);
}
