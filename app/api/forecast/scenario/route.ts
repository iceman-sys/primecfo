import { NextRequest, NextResponse } from 'next/server';
import { guardClientAccess } from '@/lib/auth/clientAccess';
import { getTierCapabilitiesForSession } from '@/lib/billing/userTier';
import { computeCashForecast } from '@/lib/forecast/engine';
import { loadForecastInputs } from '@/lib/forecast/inputs';
import {
  applyScenario,
  type MajorPurchaseParams,
  type NewHireParams,
  type RevenueDropParams,
} from '@/lib/forecast/scenarios';
import type { ScenarioKind } from '@/lib/forecast/types';

type Body = {
  clientId: string;
  kind: ScenarioKind;
  params: NewHireParams | RevenueDropParams | MajorPurchaseParams;
};

/**
 * POST /api/forecast/scenario
 * Act tier: overlay a built-in scenario on the baseline forecast.
 */
export async function POST(request: NextRequest) {
  const session = await getTierCapabilitiesForSession();
  if (!session.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!session.capabilities.scenarios) {
    return NextResponse.json({ error: 'Scenarios require Act tier' }, { status: 403 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body?.clientId || !body?.kind) {
    return NextResponse.json({ error: 'clientId and kind are required' }, { status: 400 });
  }

  const access = await guardClientAccess(body.clientId);
  if (!access.ok) return access.response;

  try {
    const inputs = await loadForecastInputs(access.clientId, session.capabilities);
    const baseline = computeCashForecast(inputs, session.capabilities);
    const scenario = applyScenario(baseline, body.kind, body.params, inputs.asOf);
    return NextResponse.json({ baseline, scenario });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Scenario failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
