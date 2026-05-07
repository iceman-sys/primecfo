import { NextRequest, NextResponse } from 'next/server';
import { getTierCapabilitiesForSession } from '@/lib/billing/userTier';
import { evaluateFinancialAlerts } from '@/lib/alerts/evaluate';
import { persistFinancialAlerts } from '@/lib/alerts/persist';
import { computeCashForecast } from '@/lib/forecast/engine';
import { loadForecastInputs } from '@/lib/forecast/inputs';
import { supabaseAdmin } from '@/lib/qbo/supabaseAdmin';

/**
 * GET /api/alerts?clientId=&evaluate=1
 * Act tier: rule-based alerts (spec §4). With evaluate=1, refreshes from QuickBooks and persists.
 */
export async function GET(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get('clientId');
  const shouldEval = request.nextUrl.searchParams.get('evaluate') === '1';

  if (!clientId) {
    return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
  }

  const session = await getTierCapabilitiesForSession();
  if (!session.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!session.capabilities.customAlerts) {
    return NextResponse.json({ alerts: [], tier: session.capabilities.tier, notice: 'Alerts require Act tier' });
  }

  if (!shouldEval) {
    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from('financial_alert_events')
      .select('id, alert_kind, state, title, body, severity_key, updated_at')
      .eq('client_id', clientId)
      .in('state', ['active', 'acknowledged', 'snoozed'])
      .order('updated_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ alerts: data ?? [], tier: session.capabilities.tier });
  }

  try {
    const inputs = await loadForecastInputs(clientId, session.capabilities);
    const forecast = computeCashForecast(inputs, session.capabilities);
    const evaluated = evaluateFinancialAlerts(inputs, forecast);
    await persistFinancialAlerts(clientId, evaluated);
    return NextResponse.json({
      alerts: evaluated.map((a) => ({
        alert_kind: a.alert_kind,
        title: a.title,
        body: a.body,
        severity_key: a.severity_key,
        state: 'active',
      })),
      tier: session.capabilities.tier,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Alert evaluation failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
