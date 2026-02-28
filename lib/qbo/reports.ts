import { quickBooksRequest } from './api';
import { getValidQuickBooksAccessToken } from './tokens';
import { supabaseAdmin } from './supabaseAdmin';
import { deriveMetricsFromReports } from '@/lib/deriveMetrics';

/** Dashboard range presets: 3m, 6m, 12m (months), 4q (quarters). */
export type ReportRange = '3m' | '6m' | '12m' | '4q';

export type PeriodType = 'month' | 'quarter';

export type ReportType =
  | 'pnl'
  | 'balance_sheet'
  | 'cash_flow'
  | 'ar_aging'
  | 'ap_aging'
  | 'coa';

/** QuickBooks API report name per our report_type. */
const QBO_REPORT_NAMES: Record<ReportType, string> = {
  pnl: 'ProfitAndLoss',
  balance_sheet: 'BalanceSheet',
  cash_flow: 'CashFlowStatement',
  ar_aging: 'ARAgingSummary',
  ap_aging: 'APAgingSummary',
  coa: 'AccountList',
};

/** Required reports for sync (always allowed in QuickBooks). */
export const REQUIRED_REPORT_TYPES: ReportType[] = ['pnl', 'balance_sheet'];

/** Optional reports (may return Permission Denied on some plans/sandbox). */
export const OPTIONAL_REPORT_TYPES: ReportType[] = ['cash_flow', 'ar_aging', 'ap_aging', 'coa'];

export type PeriodInfo = {
  start_date: string; // YYYY-MM-DD
  end_date: string;
  label: string;
};

/**
 * Build period list for a range and period type.
 * - 3m: last 3 months (monthly)
 * - 6m: last 6 months (monthly)
 * - 12m: last 12 months (monthly)
 * - 4q: last 4 quarters (quarterly)
 */
export function getDateRanges(
  range: ReportRange,
  periodType: PeriodType
): PeriodInfo[] {
  const periods: PeriodInfo[] = [];
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (periodType === 'month' && range !== '4q') {
    const count = range === '3m' ? 3 : range === '6m' ? 6 : 12;
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(end);
      d.setMonth(d.getMonth() - i);
      const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      periods.push({
        start_date: startOfMonth.toISOString().slice(0, 10),
        end_date: endOfMonth.toISOString().slice(0, 10),
        label: `${startOfMonth.getFullYear()}-${String(startOfMonth.getMonth() + 1).padStart(2, '0')}`,
      });
    }
  } else {
    const count = 4; // 4q
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(end);
      d.setMonth(d.getMonth() - i * 3);
      const year = d.getFullYear();
      const quarter = Math.floor(d.getMonth() / 3) + 1;
      const startOfQ = new Date(year, (quarter - 1) * 3, 1);
      const endOfQ = new Date(year, quarter * 3, 0);
      periods.push({
        start_date: startOfQ.toISOString().slice(0, 10),
        end_date: endOfQ.toISOString().slice(0, 10),
        label: `Q${quarter} ${year}`,
      });
    }
  }

  return periods;
}

const RANGE_LABELS: Record<ReportRange, string> = {
  '3m': 'Last 3 Months',
  '6m': 'Last 6 Months',
  '12m': 'Last 12 Months',
  '4q': 'Last 4 Quarters',
};

/**
 * Return a single period spanning the full date range (one integrated report per range).
 * - 3m/6m/12m: one period from start of oldest month to end of latest month.
 * - 4q: one period from start of oldest quarter to end of latest quarter.
 */
export function getSingleDateRange(
  range: ReportRange,
  periodType: PeriodType
): PeriodInfo {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (range === '4q') {
    const startOfOldestQ = new Date(end);
    startOfOldestQ.setMonth(startOfOldestQ.getMonth() - 3 * 3); // ~4 quarters back
    const q = Math.floor(startOfOldestQ.getMonth() / 3);
    const startDate = new Date(startOfOldestQ.getFullYear(), q * 3, 1);
    const endQ = Math.floor(end.getMonth() / 3) + 1;
    const endOfLatestQ = new Date(end.getFullYear(), endQ * 3, 0);
    return {
      start_date: startDate.toISOString().slice(0, 10),
      end_date: endOfLatestQ.toISOString().slice(0, 10),
      label: RANGE_LABELS['4q'],
    };
  }

  const count = range === '3m' ? 3 : range === '6m' ? 6 : 12;
  const startOfOldest = new Date(end);
  startOfOldest.setMonth(startOfOldest.getMonth() - (count - 1));
  const startDate = new Date(
    startOfOldest.getFullYear(),
    startOfOldest.getMonth(),
    1
  );
  const endOfLatest = new Date(end.getFullYear(), end.getMonth() + 1, 0);
  return {
    start_date: startDate.toISOString().slice(0, 10),
    end_date: endOfLatest.toISOString().slice(0, 10),
    label: RANGE_LABELS[range],
  };
}

/**
 * Fetch a single report from QuickBooks.
 */
export async function fetchReportFromQuickBooks(
  clientId: string,
  reportType: ReportType,
  startDate: string,
  endDate: string,
  accountingMethod: 'Accrual' | 'Cash' = 'Cash'
): Promise<unknown> {
  const reportName = QBO_REPORT_NAMES[reportType];
  const path = `/v3/company/{realmId}/reports/${reportName}`;
  const searchParams: Record<string, string> = {
    start_date: startDate,
    end_date: endDate,
    accounting_method: accountingMethod,
  };
  return quickBooksRequest<unknown>(clientId, {
    path,
    method: 'GET',
    searchParams,
  });
}

/**
 * Ensure a period row exists in financial_report_periods; return period id.
 * Select-then-insert so it works with or without a unique constraint on (client_id, period_type, start_date, end_date).
 */
export async function ensurePeriod(
  clientId: string,
  periodType: PeriodType,
  startDate: string,
  endDate: string,
  label: string
): Promise<string> {
  const sb = supabaseAdmin();

  const { data: existing } = await sb
    .from('financial_report_periods')
    .select('id')
    .eq('client_id', clientId)
    .eq('period_type', periodType)
    .eq('start_date', startDate)
    .eq('end_date', endDate)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data: inserted, error: insertError } = await sb
    .from('financial_report_periods')
    .insert({
      client_id: clientId,
      period_type: periodType,
      start_date: startDate,
      end_date: endDate,
      label,
    })
    .select('id')
    .single();

  if (inserted?.id) return inserted.id;

  if (insertError?.code === '23505') {
    const { data: afterConflict } = await sb
      .from('financial_report_periods')
      .select('id')
      .eq('client_id', clientId)
      .eq('period_type', periodType)
      .eq('start_date', startDate)
      .eq('end_date', endDate)
      .maybeSingle();
    if (afterConflict?.id) return afterConflict.id;
  }

  throw new Error(`Failed to ensure period ${label}: ${insertError?.message ?? 'Unknown'}`);
}

/**
 * Normalize payload for jsonb: ensure JSON-serializable object for Postgres.
 */
function normalizeRawJson(raw: unknown): Record<string, unknown> {
  if (raw === null || raw === undefined) return {};
  try {
    const parsed = JSON.parse(JSON.stringify(raw));
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return { value: parsed };
  } catch {
    return { value: String(raw) };
  }
}

/**
 * Save or update a report in financial_reports.
 * Ensures raw_json is valid JSON and throws on Supabase error.
 */
export async function saveReport(
  clientId: string,
  reportType: ReportType,
  periodId: string,
  rawJson: unknown
): Promise<void> {
  const sb = supabaseAdmin();
  const safeJson = normalizeRawJson(rawJson);
  const { error } = await sb
    .from('financial_reports')
    .upsert(
      {
        client_id: clientId,
        report_type: reportType,
        period_id: periodId,
        source: 'quickbooks',
        raw_json: safeJson,
        synced_at: new Date().toISOString(),
      },
      { onConflict: 'client_id,report_type,period_id' }
    );

  if (error) {
    throw new Error(`Failed to save report ${reportType}: ${error.message}`);
  }
}

/**
 * Load P&L and Balance Sheet from DB for a period, derive metrics, and upsert into financial_metrics.
 */
export async function deriveAndSaveMetricsForPeriod(
  clientId: string,
  periodId: string
): Promise<void> {
  const sb = supabaseAdmin();
  const { data: reports } = await sb
    .from('financial_reports')
    .select('report_type, raw_json')
    .eq('client_id', clientId)
    .eq('period_id', periodId)
    .in('report_type', ['pnl', 'balance_sheet']);

  const byType = new Map<string, unknown>();
  for (const r of reports ?? []) {
    byType.set(r.report_type, r.raw_json);
  }
  const pnlRaw = byType.get('pnl') ?? {};
  const balanceSheetRaw = byType.get('balance_sheet') ?? {};

  const entries = deriveMetricsFromReports(pnlRaw, balanceSheetRaw);
  if (entries.length === 0) return;

  const rows = entries.map((e) => ({
    client_id: clientId,
    period_id: periodId,
    metric_key: e.metric_key,
    value: e.value,
    unit: e.unit,
  }));

  const { error } = await sb
    .from('financial_metrics')
    .upsert(rows, {
      onConflict: 'client_id,period_id,metric_key',
    });

  if (error) {
    throw new Error(`Failed to save metrics: ${error.message}`);
  }
}

/**
 * Sync QuickBooks reports for a client for the given range (single integrated period).
 * Fetches one report per report type for the full date range and saves to DB.
 */
export async function syncReportsForClient(
  clientId: string,
  range: ReportRange,
  periodType: PeriodType,
  includeOptional: boolean = true
): Promise<{ periods: number; reportsSaved: number; errors: string[] }> {
  const period = getSingleDateRange(range, periodType);
  const effectivePeriodType: PeriodType = range === '4q' ? 'quarter' : 'month';
  const reportTypes = includeOptional
    ? [...REQUIRED_REPORT_TYPES, ...OPTIONAL_REPORT_TYPES]
    : REQUIRED_REPORT_TYPES;
  const errors: string[] = [];
  let reportsSaved = 0;

  // Pre-flight: verify QuickBooks connection exists before doing any work.
  // If there's no connection/token, throw immediately so the API returns a clear error
  // instead of silently collecting per-report failures and returning ok:true with reportsSaved:0.
  await getValidQuickBooksAccessToken(clientId);

  let periodId: string;
  try {
    periodId = await ensurePeriod(
      clientId,
      effectivePeriodType,
      period.start_date,
      period.end_date,
      period.label
    );
  } catch (e) {
    return {
      periods: 0,
      reportsSaved: 0,
      errors: [period.label + ': ' + (e instanceof Error ? e.message : 'Unknown')],
    };
  }

  for (const reportType of reportTypes) {
    try {
      const raw = await fetchReportFromQuickBooks(
        clientId,
        reportType,
        period.start_date,
        period.end_date
      );
      console.log('[QuickBooks] Fetched report', {
        reportType,
        period: period.label,
        start_date: period.start_date,
        end_date: period.end_date,
      });
      await saveReport(clientId, reportType, periodId, raw);
      reportsSaved++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e ?? 'Unknown');
      errors.push(`${period.label} ${reportType}: ${msg}`);
      console.error('[QuickBooks] Report fetch/save failed', {
        reportType,
        period: period.label,
        start_date: period.start_date,
        end_date: period.end_date,
        errorMessage: msg,
        errorName: e instanceof Error ? e.name : undefined,
        errorStack: e instanceof Error ? e.stack : undefined,
        rawError: e instanceof Error ? undefined : (typeof e === 'object' && e !== null ? JSON.stringify(e) : String(e)),
      });
    }
  }

  try {
    await deriveAndSaveMetricsForPeriod(clientId, periodId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e ?? 'Unknown');
    errors.push(`Metrics: ${msg}`);
    console.error('[QuickBooks] Metrics derive/save failed', {
      periodId,
      errorMessage: msg,
      errorStack: e instanceof Error ? e.stack : undefined,
    });
  }

  return { periods: 1, reportsSaved, errors };
}
