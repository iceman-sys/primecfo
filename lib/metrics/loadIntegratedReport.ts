import { supabaseAdmin } from '@/lib/qbo/supabaseAdmin';
import { getIntegratedPeriodLabel } from '@/lib/metrics/loadClientMetrics';
import type { ReportRange } from '@/lib/qbo/reports';

export type IntegratedReportType = 'pnl' | 'balance_sheet' | 'cash_flow';

/**
 * Load the integrated multi-column report for a dashboard range
 * (e.g. "Last 3 Months" spanning the full window).
 */
export async function loadIntegratedReportRaw(
  clientId: string,
  range: ReportRange,
  reportType: IntegratedReportType
): Promise<unknown | null> {
  const label = getIntegratedPeriodLabel(range);
  const sb = supabaseAdmin();

  const { data: periods } = await sb
    .from('financial_report_periods')
    .select('id')
    .eq('client_id', clientId)
    .eq('label', label)
    .order('end_date', { ascending: false })
    .limit(1);

  const periodId = periods?.[0]?.id;
  if (!periodId) return null;

  const { data: report } = await sb
    .from('financial_reports')
    .select('raw_json')
    .eq('client_id', clientId)
    .eq('period_id', periodId)
    .eq('report_type', reportType)
    .order('synced_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return report?.raw_json ?? null;
}

/** Latest synced report of a type when integrated period is missing. */
export async function loadLatestReportRaw(
  clientId: string,
  reportType: IntegratedReportType
): Promise<unknown | null> {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from('financial_reports')
    .select('raw_json')
    .eq('client_id', clientId)
    .eq('report_type', reportType)
    .order('synced_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.raw_json ?? null;
}
