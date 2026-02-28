import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/qbo/supabaseAdmin';

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
  created_at: string;
};

/**
 * GET /api/insights?clientId=xxx&range=3m|6m|12m|4q
 * Returns stored AI insights for the client and optional range (latest for that range).
 */
export async function GET(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get('clientId');
  const range = request.nextUrl.searchParams.get('range') ?? '12m';

  if (!clientId) {
    return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from('ai_insights')
    .select('id, client_id, report_range, title, description, urgency, category, metric, metric_value, created_at')
    .eq('client_id', clientId)
    .eq('report_range', range)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as DbRow[];
  const insights = rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    urgency: r.urgency as 'action_required' | 'watch' | 'positive' | 'info',
    category: r.category,
    metric: r.metric ?? undefined,
    metricValue: r.metric_value ?? undefined,
    createdAt: r.created_at,
  }));

  return NextResponse.json({ insights });
}
