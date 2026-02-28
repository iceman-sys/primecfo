/**
 * Persist AI insights to ai_insights table.
 * Replaces existing insights for the same client + report_range.
 */

import { supabaseAdmin } from '@/lib/qbo/supabaseAdmin';
import type { AIInsight } from '@/lib/financialData';

export type SaveInsightsParams = {
  clientId: string;
  reportRange: string;
  periodId?: string | null;
  insights: AIInsight[];
};

export async function saveInsights(params: SaveInsightsParams): Promise<void> {
  const { clientId, reportRange, periodId, insights } = params;
  const sb = supabaseAdmin();

  await sb
    .from('ai_insights')
    .delete()
    .eq('client_id', clientId)
    .eq('report_range', reportRange);

  if (insights.length === 0) return;

  const rows = insights.map((i) => ({
    client_id: clientId,
    period_id: periodId ?? null,
    report_range: reportRange,
    title: i.title,
    description: i.description,
    urgency: i.urgency,
    category: i.category,
    metric: i.metric ?? null,
    metric_value: i.metricValue ?? null,
  }));

  const { error } = await sb.from('ai_insights').insert(rows);
  if (error) throw new Error(error.message);
}
