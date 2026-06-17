import { NextRequest, NextResponse } from 'next/server';
import { guardClientAccess } from '@/lib/auth/clientAccess';
import { supabaseAdmin } from '@/lib/qbo/supabaseAdmin';
import { loadClientMetrics } from '@/lib/metrics/loadClientMetrics';
import { applyInsightSeverityRules } from '@/lib/ai/severityRules';
import { SEVERITY_ORDER } from '@/lib/ai/generateInsights';
import type { ReportRange } from '@/lib/qbo/reports';
import type { InsightSeverity, Recommendation, RiskPosture } from '@/lib/financialData';

type DbRow = {
  id: string;
  client_id: string;
  report_range: string | null;
  title: string;
  description: string;
  urgency: string;
  category: string;
  metric: string | null;
  metric_value: string | null;
  recommendations: Recommendation[] | null;
  talking_points: string[] | null;
  severity_order: number;
  created_at: string;
};

type RiskPostureRow = {
  rating: string;
  summary: string;
  top_action: string | null;
};

/**
 * GET /api/insights?clientId=xxx&range=3m|6m|12m|4q
 * Returns stored AI insights + risk posture for the client and range.
 */
export async function GET(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get('clientId');
  const range = request.nextUrl.searchParams.get('range') ?? '12m';

  const access = await guardClientAccess(clientId);
  if (!access.ok) return access.response;

  const sb = supabaseAdmin();

  // Fetch insights sorted by severity
  const { data, error } = await sb
    .from('ai_insights')
    .select('id, client_id, report_range, title, description, urgency, category, metric, metric_value, recommendations, talking_points, severity_order, created_at')
    .eq('client_id', clientId)
    .eq('report_range', range)
    .order('severity_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as DbRow[];

  const bundle = await loadClientMetrics(access.clientId, range as ReportRange);
  const severityContext = {
    runwayMonths: bundle.runway.runwayMonths,
    revenueGrowthPct:
      bundle.previousSummary && bundle.previousSummary.revenue !== 0 && bundle.summary
        ? ((bundle.summary.revenue - bundle.previousSummary.revenue) / Math.abs(bundle.previousSummary.revenue)) * 100
        : null,
    profitMarginPct: bundle.summary?.data_error ? null : bundle.summary?.profit_margin_pct ?? null,
    expenseGrowthPct:
      bundle.previousSummary && bundle.previousSummary.expenses !== 0 && bundle.summary
        ? ((bundle.summary.expenses - bundle.previousSummary.expenses) / Math.abs(bundle.previousSummary.expenses)) * 100
        : null,
  };

  const insights = rows.map((r) => {
    const urgency = applyInsightSeverityRules(
      {
        title: r.title,
        description: r.description,
        urgency: r.urgency as InsightSeverity,
        category: r.category,
        metric: r.metric ?? undefined,
        metricValue: r.metric_value ?? undefined,
      },
      severityContext
    );

    return {
      id: r.id,
      title: r.title,
      description: r.description,
      urgency,
      category: r.category,
      metric: r.metric ?? undefined,
      metricValue: r.metric_value ?? undefined,
      recommendations: r.recommendations ?? undefined,
      talkingPoints: r.talking_points ?? undefined,
      createdAt: r.created_at,
    };
  });

  insights.sort((a, b) => (SEVERITY_ORDER[a.urgency] ?? 4) - (SEVERITY_ORDER[b.urgency] ?? 4));

  // Fetch risk posture
  const { data: rpData } = await sb
    .from('ai_risk_posture')
    .select('rating, summary, top_action')
    .eq('client_id', clientId)
    .eq('report_range', range)
    .maybeSingle();

  let riskPosture: RiskPosture | null = null;
  if (rpData) {
    const rp = rpData as RiskPostureRow;
    riskPosture = {
      rating: rp.rating as RiskPosture['rating'],
      summary: rp.summary,
      topAction: rp.top_action ?? '',
    };
  }

  return NextResponse.json({ insights, riskPosture });
}
