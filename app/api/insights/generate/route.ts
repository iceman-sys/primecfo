import { NextRequest, NextResponse } from 'next/server';
import { getFinancialContext } from '@/lib/ai/getFinancialContext';
import { generateInsightsFromContext } from '@/lib/ai/generateInsights';
import { saveInsights } from '@/lib/ai/saveInsights';
import type { ReportRange } from '@/lib/qbo/reports';

/**
 * POST /api/insights/generate
 * Body: { clientId: string, range?: '3m'|'6m'|'12m'|'4q' }
 * Pulls financial data, generates AI insights, stores them, returns the list.
 */
export async function POST(request: NextRequest) {
  let clientId: string | null = null;
  let range: ReportRange = '12m';

  try {
    const body = await request.json().catch(() => ({}));
    clientId = typeof body.clientId === 'string' ? body.clientId.trim() : null;
    if (body.range && ['3m', '6m', '12m', '4q'].includes(body.range)) range = body.range;
  } catch {
    // leave defaults
  }

  if (!clientId) {
    return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
  }

  const context = await getFinancialContext(clientId, range);
  if (!context) {
    return NextResponse.json({
      insights: [],
      message: 'No financial data for this client and range. Sync QuickBooks first.',
    });
  }

  try {
    const insights = await generateInsightsFromContext(context);
    const periodId = null; // optional: pass from context if we add period_id to getFinancialContext later
    await saveInsights({
      clientId,
      reportRange: range,
      periodId,
      insights,
    });
    return NextResponse.json({ insights });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to generate insights';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
