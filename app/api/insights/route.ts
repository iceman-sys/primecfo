import { NextRequest, NextResponse } from 'next/server';
import { guardClientAccess } from '@/lib/auth/clientAccess';
import { supabaseAdmin } from '@/lib/qbo/supabaseAdmin';
import { getFinancialContext } from '@/lib/ai/getFinancialContext';
import { applyTrendAwareInsightRules } from '@/lib/ai/trendAwareInsights';
import { computeRiskPosture } from '@/lib/ai/computeRiskPosture';
import type { ReportRange } from '@/lib/qbo/reports';
import type { AIInsight, Recommendation, RiskPosture } from '@/lib/financialData';

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

  const context = await getFinancialContext(access.clientId, range as ReportRange);

  const storedInsights: AIInsight[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    urgency: r.urgency as AIInsight['urgency'],
    category: r.category,
    metric: r.metric ?? undefined,
    metricValue: r.metric_value ?? undefined,
    recommendations: r.recommendations ?? undefined,
    talkingPoints: r.talking_points ?? undefined,
    createdAt: r.created_at,
  }));

  const insights = context
    ? applyTrendAwareInsightRules(storedInsights, context)
    : storedInsights;

  // Recompute risk posture from corrected signals (stored LLM posture may be stale/wrong)
  let riskPosture: RiskPosture | null = null;
  if (context) {
    riskPosture = computeRiskPosture(context, insights);
  } else {
    const { data: rpData } = await sb
      .from('ai_risk_posture')
      .select('rating, summary, top_action')
      .eq('client_id', clientId)
      .eq('report_range', range)
      .maybeSingle();
    if (rpData) {
      const rp = rpData as RiskPostureRow;
      riskPosture = {
        rating: rp.rating as RiskPosture['rating'],
        summary: rp.summary,
        topAction: rp.top_action ?? '',
      };
    }
  }

  return NextResponse.json({ insights, riskPosture });
}
