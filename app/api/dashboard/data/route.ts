import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/qbo/supabaseAdmin';
import { getSingleDateRange, type ReportRange, type PeriodType } from '@/lib/qbo/reports';
import { parseArAgingBuckets, arOver30Ratio } from '@/lib/reporting/parseArAging';
import { getPercentChange } from '@/lib/financialData';

type PeriodRow = { id: string; period_type: string; start_date: string; end_date: string; label: string };
type MetricRow = { period_id: string; metric_key: string; value: number; unit: string };

type CoreHealth = 'good' | 'warn' | 'bad';

function runwayHealth(months: number): CoreHealth {
  if (months < 2) return 'bad';
  if (months < 5) return 'warn';
  return 'good';
}

function arHealth(ratio: number): CoreHealth {
  if (ratio > 0.35) return 'bad';
  if (ratio > 0.25) return 'warn';
  return 'good';
}

function revenueHealth(pctChange: number): CoreHealth {
  if (pctChange < -15) return 'bad';
  if (pctChange < -5) return 'warn';
  return 'good';
}

function marginHealth(curr: number, prev: number): CoreHealth {
  const d = curr - prev;
  if (d < -5) return 'bad';
  if (d < -2) return 'warn';
  return 'good';
}

function cashHealth(cash: number, avgBurn: number): CoreHealth {
  if (avgBurn <= 0) return runwayHealth(cash > 0 ? 12 : 0);
  if (cash < avgBurn) return 'bad';
  if (cash < avgBurn * 2) return 'warn';
  return 'good';
}

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
      coreMetrics: null,
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

  const { data: arReport } = await sb
    .from('financial_reports')
    .select('raw_json')
    .eq('client_id', clientId)
    .eq('report_type', 'ar_aging')
    .order('synced_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const finSummary = summary ?? {
    revenue: 0,
    expenses: 0,
    net_income: 0,
    profit_margin_pct: 0,
    cash: 0,
    accounts_receivable: 0,
    accounts_payable: 0,
  };
  const finPrev = previousSummary ?? {
    revenue: 0,
    expenses: 0,
    net_income: 0,
    profit_margin_pct: 0,
    cash: 0,
    accounts_receivable: 0,
    accounts_payable: 0,
  };

  const arBuckets = parseArAgingBuckets(arReport?.raw_json ?? {});
  const last3Expenses = trends
    .map((t) => t.expenses)
    .slice(-3)
    .filter((x) => x > 0);
  const avgBurn =
    last3Expenses.length > 0
      ? last3Expenses.reduce((a, b) => a + b, 0) / last3Expenses.length
      : finSummary.expenses || 1;
  const runwayMonths = avgBurn > 0 ? finSummary.cash / avgBurn : 0;
  const revPctChange = getPercentChange(finSummary.revenue, finPrev.revenue);
  const arRatioPast30 = arOver30Ratio(arBuckets);

  const coreMetrics = {
    cashPosition: finSummary.cash,
    revenueChangePct: Math.round(revPctChange * 10) / 10,
    profitMarginPct: finSummary.profit_margin_pct,
    arAging: arBuckets,
    cashRunwayMonths: Math.round(runwayMonths * 10) / 10,
    health: {
      runway: runwayHealth(runwayMonths),
      ar: arHealth(arRatioPast30),
      revenue: revenueHealth(revPctChange),
      margin: marginHealth(finSummary.profit_margin_pct, finPrev.profit_margin_pct),
      cash: cashHealth(finSummary.cash, avgBurn),
    },
  };

  return NextResponse.json({
    summary: finSummary,
    previousSummary: finPrev,
    period: matchingPeriod
      ? { id: matchingPeriod.id, label: matchingPeriod.label, start_date: matchingPeriod.start_date, end_date: matchingPeriod.end_date }
      : null,
    trends,
    range,
    coreMetrics,
  });
}
