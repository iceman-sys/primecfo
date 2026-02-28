import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/qbo/supabaseAdmin';
import { getSingleDateRange, type ReportRange, type PeriodType } from '@/lib/qbo/reports';

type PeriodRow = { id: string; period_type: string; start_date: string; end_date: string; label: string };
type MetricRow = { period_id: string; metric_key: string; value: number; unit: string };

function getStartDateCutoff(monthsBack: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsBack);
  return d.toISOString().slice(0, 10);
}

/**
 * GET /api/dashboard/data?clientId=xxx&range=3m|6m|12m|4q
 * Returns summary (current period metrics), previousSummary (for trend), and trends (per-period for charts).
 */
export async function GET(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get('clientId');
  const range = (request.nextUrl.searchParams.get('range') ?? '12m') as ReportRange;
  const periodType: PeriodType = range === '4q' ? 'quarter' : 'month';

  if (!clientId) {
    return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const cutoff = getStartDateCutoff(24);

  const { data: periods, error: periodsError } = await sb
    .from('financial_report_periods')
    .select('id, period_type, start_date, end_date, label')
    .eq('client_id', clientId)
    .gte('start_date', cutoff)
    .order('start_date', { ascending: true });

  if (periodsError) {
    return NextResponse.json({ error: periodsError.message }, { status: 500 });
  }

  const periodList = (periods ?? []) as PeriodRow[];
  if (periodList.length === 0) {
    return NextResponse.json({
      summary: null,
      previousSummary: null,
      period: null,
      trends: [],
      range,
    });
  }

  const periodIds = periodList.map((p) => p.id);
  const { data: metricsRows, error: metricsError } = await sb
    .from('financial_metrics')
    .select('period_id, metric_key, value, unit')
    .eq('client_id', clientId)
    .in('period_id', periodIds);

  if (metricsError) {
    return NextResponse.json({ error: metricsError.message }, { status: 500 });
  }

  const metricsByPeriod = new Map<string, Record<string, number>>();
  for (const row of (metricsRows ?? []) as MetricRow[]) {
    let map = metricsByPeriod.get(row.period_id);
    if (!map) {
      map = {};
      metricsByPeriod.set(row.period_id, map);
    }
    map[row.metric_key] = Number(row.value);
  }

  const singleRange = getSingleDateRange(range, periodType);
  const matchingPeriod =
    periodList.find(
      (p) => p.start_date === singleRange.start_date && p.end_date === singleRange.end_date
    ) ?? periodList[periodList.length - 1];

  const currentIndex = periodList.findIndex((p) => p.id === matchingPeriod.id);
  const previousPeriod = currentIndex > 0 ? periodList[currentIndex - 1] : null;

  const toSummary = (p: PeriodRow | null): Record<string, number> | null => {
    if (!p) return null;
    const m = metricsByPeriod.get(p.id);
    if (!m) return null;
    return {
      revenue: m.revenue ?? 0,
      expenses: m.expenses ?? 0,
      net_income: m.net_income ?? 0,
      profit_margin_pct: m.profit_margin_pct ?? 0,
      cash: m.cash ?? 0,
      accounts_receivable: m.accounts_receivable ?? 0,
      accounts_payable: m.accounts_payable ?? 0,
    };
  };

  const summary = toSummary(matchingPeriod);
  const previousSummary = toSummary(previousPeriod);

  const trends = periodList.map((p) => {
    const m = metricsByPeriod.get(p.id) ?? {};
    return {
      periodLabel: p.label,
      start_date: p.start_date,
      end_date: p.end_date,
      revenue: m.revenue ?? 0,
      expenses: m.expenses ?? 0,
      profit: m.net_income ?? 0,
      cash: m.cash ?? 0,
    };
  });

  return NextResponse.json({
    summary: summary ?? {
      revenue: 0,
      expenses: 0,
      net_income: 0,
      profit_margin_pct: 0,
      cash: 0,
      accounts_receivable: 0,
      accounts_payable: 0,
    },
    previousSummary: previousSummary ?? {
      revenue: 0,
      expenses: 0,
      net_income: 0,
      profit_margin_pct: 0,
      cash: 0,
      accounts_receivable: 0,
      accounts_payable: 0,
    },
    period: matchingPeriod
      ? { id: matchingPeriod.id, label: matchingPeriod.label, start_date: matchingPeriod.start_date, end_date: matchingPeriod.end_date }
      : null,
    trends,
    range,
  });
}
