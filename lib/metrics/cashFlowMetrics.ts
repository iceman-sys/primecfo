import { getMonthlyNetCashFromReport } from '@/lib/metrics/monthlyNetCash';
import { periodMonthsForRange } from '@/lib/metrics/periodMonths';
import { loadIntegratedReportRaw, loadLatestReportRaw } from '@/lib/metrics/loadIntegratedReport';
import type { ReportRange } from '@/lib/qbo/reports';

export { getMonthlyNetCashFromReport, getMonthlyNetCashForRange } from '@/lib/metrics/monthlyNetCash';

/** @deprecated Use getMonthlyNetCashFromReport — kept for existing imports. */
export function trailingAverageNetCashFromReport(
  raw: unknown,
  periodMonths = 3
): number | null {
  return getMonthlyNetCashFromReport(raw, periodMonths);
}

/** Monthly net cash from integrated CF statement — same source as forecast and breakeven insight. */
export async function loadTrailingNetCashFlow(
  clientId: string,
  range: ReportRange
): Promise<number | null> {
  let cfRaw = await loadIntegratedReportRaw(clientId, range, 'cash_flow');
  if (!cfRaw) cfRaw = await loadLatestReportRaw(clientId, 'cash_flow');
  if (!cfRaw) return null;
  return getMonthlyNetCashFromReport(cfRaw, periodMonthsForRange(range));
}
