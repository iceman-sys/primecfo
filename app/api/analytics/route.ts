import { NextRequest, NextResponse } from 'next/server';
import { guardClientAccess } from '@/lib/auth/clientAccess';
import { loadClientMetrics } from '@/lib/metrics/loadClientMetrics';
import { computeAnalyticsKpis } from '@/lib/metrics/ratios';
import { validatePeriodTotals } from '@/lib/metrics/validateTrends';
import type { ReportRange } from '@/lib/qbo/reports';

/**
 * GET /api/analytics?clientId=xxx&range=3m
 * Live KPIs + monthly revenue/cost trends from synced QBO metrics.
 */
export async function GET(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get('clientId');
  const range = (request.nextUrl.searchParams.get('range') ?? '3m') as ReportRange;
  const access = await guardClientAccess(clientId);
  if (!access.ok) return access.response;

  const bundle = await loadClientMetrics(access.clientId, range);
  if (!bundle.hasData) {
    return NextResponse.json({
      hasData: false,
      error: 'No analytics data. Connect QuickBooks and run Sync.',
      kpis: null,
      trends: [],
      periodTotals: null,
      validation: null,
    });
  }

  const windowTrends = bundle.windowTrends;

  const kpis = computeAnalyticsKpis(
    bundle.summary,
    windowTrends,
    bundle.runway.runwayMonths,
    range
  );

  const chartTrends = windowTrends
    .filter((t) => t.revenue > 0 || t.expenses > 0)
    .map((t) => ({
      month: formatMonthLabel(t.periodLabel),
      revenue: t.revenue,
      expenses: t.expenses,
      netIncome: t.profit,
    }));

  const totalRevenue = windowTrends.reduce((s, t) => s + t.revenue, 0);
  const totalCosts = windowTrends.reduce((s, t) => s + t.expenses, 0);
  const totalNetIncome = windowTrends.reduce((s, t) => s + t.profit, 0);

  const validation = validatePeriodTotals(windowTrends);

  return NextResponse.json({
    hasData: true,
    kpis,
    trends: chartTrends,
    periodTotals: {
      totalRevenue,
      totalCosts,
      totalNetIncome,
      periodCount: validation.periodCount,
    },
    validation,
    dataError: bundle.summary?.data_error ?? false,
  });
}

function formatMonthLabel(label: string): string {
  const m = label.match(/^(\d{4})-(\d{2})$/);
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, 1);
    return d.toLocaleDateString('en-US', { month: 'short' });
  }
  return label;
}
