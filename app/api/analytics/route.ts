import { NextRequest, NextResponse } from 'next/server';
import { guardClientAccess } from '@/lib/auth/clientAccess';
import { loadClientMetrics } from '@/lib/metrics/loadClientMetrics';
import { computeAnalyticsKpis } from '@/lib/metrics/ratios';
import type { ReportRange } from '@/lib/qbo/reports';

/**
 * GET /api/analytics?clientId=xxx&range=12m
 * Live KPIs + monthly revenue/expense trends from synced QBO metrics.
 */
export async function GET(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get('clientId');
  const range = (request.nextUrl.searchParams.get('range') ?? '12m') as ReportRange;
  const access = await guardClientAccess(clientId);
  if (!access.ok) return access.response;

  const bundle = await loadClientMetrics(access.clientId, range);
  if (!bundle.hasData) {
    return NextResponse.json({
      hasData: false,
      error: 'No analytics data. Connect QuickBooks and run Sync.',
      kpis: null,
      trends: [],
    });
  }

  const kpis = computeAnalyticsKpis(
    bundle.summary,
    bundle.trends,
    bundle.runway.runwayMonths,
    range
  );

  const chartTrends = bundle.trends
    .filter((t) => t.revenue > 0 || t.expenses > 0)
    .slice(-12)
    .map((t) => ({
      month: formatMonthLabel(t.periodLabel),
      revenue: t.revenue,
      expenses: t.expenses,
    }));

  return NextResponse.json({
    hasData: true,
    kpis,
    trends: chartTrends,
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
