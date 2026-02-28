import { NextRequest, NextResponse } from 'next/server';
import {
  QuickBooksApiError,
  QuickBooksNeedsReauthError,
} from '@/lib/qbo/api';
import {
  type ReportRange,
  type PeriodType,
  syncReportsForClient,
} from '@/lib/qbo/reports';
import { getFinancialContext } from '@/lib/ai/getFinancialContext';
import { generateInsightsFromContext } from '@/lib/ai/generateInsights';
import { saveInsights } from '@/lib/ai/saveInsights';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const clientId = (body.clientId ?? request.nextUrl.searchParams.get('clientId')) as string | null;
  const range = (body.range ?? request.nextUrl.searchParams.get('range') ?? '3m') as ReportRange;
  const periodType = (body.periodType ?? request.nextUrl.searchParams.get('periodType') ?? 'month') as PeriodType;
  // Default: sync only 3 required reports (Profit & Loss, Balance Sheet, Cash Flow). Set includeOptional: true to also sync AR/AP aging and Account List.
  const includeOptional = body.includeOptional === true;

  if (!clientId) {
    return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
  }
  const validRanges: ReportRange[] = ['3m', '6m', '12m', '4q'];
  if (!validRanges.includes(range)) {
    return NextResponse.json(
      { error: `range must be one of: ${validRanges.join(', ')}` },
      { status: 400 }
    );
  }
  if (periodType !== 'month' && periodType !== 'quarter') {
    return NextResponse.json(
      { error: 'periodType must be month or quarter' },
      { status: 400 }
    );
  }

  try {
    const result = await syncReportsForClient(clientId, range, periodType, includeOptional);
    // Trigger AI insights generation in background (fire-and-forget)
    if (result.reportsSaved > 0) {
      void (async () => {
        try {
          const context = await getFinancialContext(clientId, range);
          if (context) {
            const insights = await generateInsightsFromContext(context);
            await saveInsights({ clientId, reportRange: range, insights });
          }
        } catch (e) {
          console.error('[Insights] Post-sync generation failed:', e);
        }
      })();
    }
    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    if (error instanceof QuickBooksNeedsReauthError) {
      return NextResponse.json(
        { error: 'QuickBooks connection needs re-authorization', code: 'needs_reauth' },
        { status: 401 }
      );
    }
    if (error instanceof QuickBooksApiError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }
    const message = error instanceof Error ? error.message : 'Sync failed';
    if (
      message.includes('No QuickBooks connection') ||
      message.includes('Please connect QuickBooks first')
    ) {
      return NextResponse.json(
        {
          error: 'QuickBooks is not connected for this client. Please connect QuickBooks first to sync.',
          code: 'no_connection',
        },
        { status: 403 }
      );
    }
    // Treat refresh-token-invalid / re-auth errors so frontend can show "Connect QuickBooks"
    if (/refresh token|invalid|authorize again|token expired|needs_reauth/i.test(message)) {
      return NextResponse.json(
        { error: 'QuickBooks connection needs re-authorization', code: 'needs_reauth' },
        { status: 401 }
      );
    }
    console.error('Reports sync error:', error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
