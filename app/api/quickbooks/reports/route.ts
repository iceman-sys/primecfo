import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/qbo/supabaseAdmin';
import { getSingleDateRange, type ReportRange, type PeriodType } from '@/lib/qbo/reports';

/**
 * GET /api/quickbooks/reports?clientId=xxx&range=3m|6m|12m|4q&periodType=month|quarter
 * Returns the single integrated period and its stored reports for the requested range.
 */
export async function GET(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get('clientId');
  const range = (request.nextUrl.searchParams.get('range') ?? '3m') as ReportRange;
  const periodType = (request.nextUrl.searchParams.get('periodType') ?? 'month') as PeriodType;

  if (!clientId) {
    return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
  }

  const singlePeriod = getSingleDateRange(range, periodType);
  const effectivePeriodType: PeriodType = range === '4q' ? 'quarter' : 'month';

  const sb = supabaseAdmin();

  const { data: periodRow, error: periodError } = await sb
    .from('financial_report_periods')
    .select('id, period_type, start_date, end_date, label')
    .eq('client_id', clientId)
    .eq('period_type', effectivePeriodType)
    .eq('start_date', singlePeriod.start_date)
    .eq('end_date', singlePeriod.end_date)
    .maybeSingle();

  if (periodError) {
    return NextResponse.json(
      { error: periodError.message },
      { status: 500 }
    );
  }

  if (!periodRow?.id) {
    return NextResponse.json({
      periods: [],
      reports: [],
      range,
      periodType,
    });
  }

  const { data: reports, error: reportsError } = await sb
    .from('financial_reports')
    .select('id, report_type, period_id, raw_json, synced_at')
    .eq('client_id', clientId)
    .eq('period_id', periodRow.id)
    .order('report_type');

  if (reportsError) {
    return NextResponse.json(
      { error: reportsError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    periods: [periodRow],
    reports: (reports ?? []).map((r: { period_id: string; report_type: string; raw_json: unknown; synced_at: string }) => ({
      ...r,
      period: periodRow,
    })),
    range,
    periodType,
  });
}
