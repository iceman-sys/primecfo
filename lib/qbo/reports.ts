import { quickBooksRequest, QuickBooksApiError } from './api';
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
  /** Canonical Intuit Reports API name (CashFlowStatement is not always accepted). */
  cash_flow: 'CashFlow',
  ar_aging: 'ARAgingSummary',
  ap_aging: 'APAgingSummary',
  coa: 'AccountList',
};

/** Must succeed for core dashboard metrics / sync health. */
export const REQUIRED_REPORT_TYPES: ReportType[] = ['pnl', 'balance_sheet'];

/** May fail with Permission Denied (company role, simplified QBO, or oauth scope); sync still succeeds without them. */
export const OPTIONAL_REPORT_TYPES: ReportType[] = ['cash_flow', 'ar_aging', 'ap_aging', 'coa'];

/** Optional + permission/style failures logged at warn instead of error. */
function reportFailureIsLikelyEnvironmental(msg: string, status?: number): boolean {
  const m = msg.toLowerCase();
  return (
    m.includes('permission denied') ||
    m.includes('not authorized') ||
    m.includes('access denied') ||
    status === 403
  );
}

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
async function fetchReportByQboName(
  clientId: string,
  reportName: string,
  startDate: string,
  endDate: string,
  accountingMethod: 'Accrual' | 'Cash',
  extraParams?: Record<string, string | undefined>
): Promise<unknown> {
  const path = `/v3/company/{realmId}/reports/${reportName}`;
  const searchParams: Record<string, string> = {
    start_date: startDate,
    end_date: endDate,
    accounting_method: accountingMethod,
  };
  if (extraParams) {
    for (const [k, v] of Object.entries(extraParams)) {
      if (v !== undefined && v !== '') searchParams[k] = v;
    }
  }
  return quickBooksRequest<unknown>(clientId, {
    path,
    method: 'GET',
    searchParams,
  });
}

/** QB multi-period column grouping per Financial Reports developer spec */
function summarizeColumnByFor(reportType: ReportType, range: ReportRange): string | undefined {
  if (reportType !== 'pnl' && reportType !== 'balance_sheet' && reportType !== 'cash_flow') {
    return undefined;
  }
  if (reportType === 'balance_sheet') return 'Quarter';
  return range === '4q' ? 'Quarter' : 'Month';
}

export async function fetchReportFromQuickBooks(
  clientId: string,
  reportType: ReportType,
  startDate: string,
  endDate: string,
  accountingMethod: 'Accrual' | 'Cash' = 'Cash',
  range?: ReportRange
): Promise<unknown> {
  const summarize = range !== undefined ? summarizeColumnByFor(reportType, range) : undefined;

  const reportParams = summarize !== undefined ? { summarize_column_by: summarize } : undefined;

  if (reportType === 'cash_flow') {
    try {
      return await fetchReportByQboName(clientId, 'CashFlow', startDate, endDate, accountingMethod, reportParams);
    } catch (e) {
      if (e instanceof QuickBooksApiError && e.status === 404) {
        return fetchReportByQboName(
          clientId,
          'CashFlowStatement',
          startDate,
          endDate,
          accountingMethod,
          reportParams
        );
      }
      throw e;
    }
  }

  const reportName = QBO_REPORT_NAMES[reportType];
  return fetchReportByQboName(clientId, reportName, startDate, endDate, accountingMethod, reportParams);
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
 * Sync QuickBooks reports for a client.
 * - Per calendar period: P&L + Balance Sheet for metrics/trends (monthly or quarterly).
 * - Integrated span: multi-column reports for Financial Reports viewer + optional reports.
 */
export async function syncReportsForClient(
  clientId: string,
  range: ReportRange,
  periodType: PeriodType,
  includeOptional: boolean = true
): Promise<{ periods: number; reportsSaved: number; errors: string[] }> {
  const effectivePeriodType: PeriodType = range === '4q' ? 'quarter' : 'month';
  const granularPeriods = getDateRanges(range, effectivePeriodType);
  const integrated = getSingleDateRange(range, periodType);
  const reportTypes = includeOptional
    ? [...REQUIRED_REPORT_TYPES, ...OPTIONAL_REPORT_TYPES]
    : REQUIRED_REPORT_TYPES;
  const errors: string[] = [];
  let reportsSaved = 0;

  await getValidQuickBooksAccessToken(clientId);

  // ── Per-period sync (metrics + trend charts) ─────────────────────────────
  for (const period of granularPeriods) {
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
      errors.push(`${period.label}: ${e instanceof Error ? e.message : 'Unknown'}`);
      continue;
    }

    for (const reportType of REQUIRED_REPORT_TYPES) {
      try {
        const raw = await fetchReportFromQuickBooks(
          clientId,
          reportType,
          period.start_date,
          period.end_date,
          'Cash'
        );
        await saveReport(clientId, reportType, periodId, raw);
        reportsSaved++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e ?? 'Unknown');
        errors.push(`${period.label} ${reportType}: ${msg}`);
        console.error('[QuickBooks] Per-period report failed', { period: period.label, reportType, msg });
      }
    }

    try {
      await deriveAndSaveMetricsForPeriod(clientId, periodId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e ?? 'Unknown');
      errors.push(`${period.label} metrics: ${msg}`);
    }
  }

  // ── Integrated multi-column sync (Financial Reports tab) ─────────────────
  let integratedPeriodId: string;
  try {
    integratedPeriodId = await ensurePeriod(
      clientId,
      effectivePeriodType,
      integrated.start_date,
      integrated.end_date,
      integrated.label
    );
  } catch (e) {
    errors.push(`${integrated.label}: ${e instanceof Error ? e.message : 'Unknown'}`);
    return { periods: granularPeriods.length, reportsSaved, errors };
  }

  for (const reportType of reportTypes) {
    try {
      const raw = await fetchReportFromQuickBooks(
        clientId,
        reportType,
        integrated.start_date,
        integrated.end_date,
        'Cash',
        range
      );
      await saveReport(clientId, reportType, integratedPeriodId, raw);
      reportsSaved++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e ?? 'Unknown');
      const status = e instanceof QuickBooksApiError ? e.status : undefined;
      errors.push(`${integrated.label} ${reportType}: ${msg}`);
      const isOptional = OPTIONAL_REPORT_TYPES.includes(reportType);
      if (isOptional && reportFailureIsLikelyEnvironmental(msg, status)) {
        console.warn('[QuickBooks] Optional integrated report skipped', { reportType, msg });
      } else {
        console.error('[QuickBooks] Integrated report failed', { reportType, msg });
      }
    }
  }

  return { periods: granularPeriods.length + 1, reportsSaved, errors };
}
