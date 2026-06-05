import { NextRequest, NextResponse } from 'next/server';
import { guardClientAccess } from '@/lib/auth/clientAccess';
import { getTierCapabilitiesForSession } from '@/lib/billing/userTier';
import { computeCashForecast } from '@/lib/forecast/engine';
import { loadForecastInputs } from '@/lib/forecast/inputs';
import { supabaseAdmin } from '@/lib/qbo/supabaseAdmin';
import type { CashFlowForecastResult } from '@/lib/forecast/types';

/**
 * GET /api/forecast?clientId=
 * Computes tier-gated cash flow forecast from live QuickBooks data (authenticated user).
 */
export async function GET(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get('clientId');
  const persist = request.nextUrl.searchParams.get('persist') === '1';

  const access = await guardClientAccess(clientId);
  if (!access.ok) return access.response;

  const session = await getTierCapabilitiesForSession();
  if (!session.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const inputs = await loadForecastInputs(access.clientId, session.capabilities);
    const forecast = computeCashForecast(inputs, session.capabilities);

    if (persist) {
      const sb = supabaseAdmin();
      await sb.from('cash_forecast_snapshots').insert({
        client_id: access.clientId,
        horizon_days: session.capabilities.forecastDays,
        tier: session.capabilities.tier,
        payload: forecast as unknown as Record<string, unknown>,
      });
    }

    const lean: CashFlowForecastResult = forecast;
    return NextResponse.json({
      forecast: lean,
      capabilities: {
        tier: session.capabilities.tier,
        forecastDays: session.capabilities.forecastDays,
        scenarios: session.capabilities.scenarios,
      },
      summary: {
        asOf: inputs.asOf,
        bankBalance: inputs.bankBalance,
        avgMonthlyRevenue: inputs.avgMonthlyRevenue,
        avgMonthlyExpense: inputs.avgMonthlyExpense,
        arTotal: inputs.arBuckets.total,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Forecast failed';
    const needsReauth = /re-?auth|401|QuickBooksNeedsReauth/i.test(msg);
    return NextResponse.json(
      { error: msg, code: needsReauth ? 'needs_reauth' : 'forecast_error' },
      { status: needsReauth ? 401 : 500 }
    );
  }
}
