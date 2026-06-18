import { extractCashFlowNetByPeriod } from '@/lib/metrics/parseQboReport';
import { loadIntegratedReportRaw, loadLatestReportRaw } from '@/lib/metrics/loadIntegratedReport';
import type { ReportRange } from '@/lib/qbo/reports';

/**
 * Trailing average monthly net cash increase from a Cash Flow Statement.
 * Excludes the current partial month when multiple columns are present.
 */
export function trailingAverageNetCashFromReport(
  raw: unknown,
  trailingMonths = 3
): number | null {
  const netByPeriod = extractCashFlowNetByPeriod(raw);
  if (netByPeriod.length === 0) return null;

  const withoutCurrent = netByPeriod.length > 1 ? netByPeriod.slice(0, -1) : netByPeriod;
  const meaningful = withoutCurrent.filter((v) => Number.isFinite(v));
  const trailing = (meaningful.length > 0 ? meaningful : withoutCurrent).slice(-trailingMonths);
  if (trailing.length === 0) return null;

  return trailing.reduce((a, b) => a + b, 0) / trailing.length;
}

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
