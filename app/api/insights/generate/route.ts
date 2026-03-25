import { NextRequest, NextResponse } from 'next/server';
import { getFinancialContext } from '@/lib/ai/getFinancialContext';
import { generateInsightsFromContext } from '@/lib/ai/generateInsights';
import { saveInsights } from '@/lib/ai/saveInsights';
import type { ReportRange } from '@/lib/qbo/reports';

/**
 * POST /api/insights/generate
 * Body: { clientId: string, range?: '3m'|'6m'|'12m'|'4q' }
 * Pulls financial data, generates AI insights + risk posture, stores them, returns the result.
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
      riskPosture: null,
      message: 'No financial data for this client and range. Sync QuickBooks first.',
    });
  }

  try {
    const { insights, riskPosture } = await generateInsightsFromContext(context);
    await saveInsights({
      clientId,
      reportRange: range,
      periodId: null,
      insights,
      riskPosture,
    });
    return NextResponse.json({ insights, riskPosture });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to generate insights';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
