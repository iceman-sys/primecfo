import { getMonthlyNetCashFromReport } from '@/lib/metrics/monthlyNetCash';
import { loadIntegratedReportRaw, loadLatestReportRaw } from '@/lib/metrics/loadIntegratedReport';
import type { ReportRange } from '@/lib/qbo/reports';

/** @deprecated Prefer getMonthlyNetCashFromReport — kept for existing imports. */
export function trailingAverageNetCashFromReport(
  raw: unknown,
  trailingMonths = 3
): number | null {
  return getMonthlyNetCashFromReport(raw, trailingMonths);
}

/** Same trailing CF net used by breakeven insight and cash forecast. */
export { getMonthlyNetCashFromReport };

export async function loadTrailingNetCashFlow(
  clientId: string,
  range: ReportRange,
  trailingMonths = 3
): Promise<number | null> {
  let cfRaw = await loadIntegratedReportRaw(clientId, range, 'cash_flow');
  if (!cfRaw) cfRaw = await loadLatestReportRaw(clientId, 'cash_flow');
  if (!cfRaw) return null;
  return trailingAverageNetCashFromReport(cfRaw, trailingMonths);
}
