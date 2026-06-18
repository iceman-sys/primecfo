import { loadIntegratedReportRaw, loadLatestReportRaw } from '@/lib/metrics/loadIntegratedReport';
import type { ReportRange } from '@/lib/qbo/reports';

/** @deprecated Use loadIntegratedReportRaw / loadTrailingNetCashFlow from cashFlowMetrics. */
export async function loadSyncedMonthlyCashFlow(
  clientId: string,
  _monthsBack = 18,
  range?: ReportRange
): Promise<unknown | null> {
  if (range) {
    const integrated = await loadIntegratedReportRaw(clientId, range, 'cash_flow');
    if (integrated) return integrated;
  }
  return loadLatestReportRaw(clientId, 'cash_flow');
}
