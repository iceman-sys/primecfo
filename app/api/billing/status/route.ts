import { NextResponse } from 'next/server';
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/qbo/supabaseAdmin';
import { PLANS } from '@/app/lib/pricing-plans';
import { planIdToTier, type ProductTier } from '@/lib/tiers';
import { getPlanEntitlements, type PlanEntitlements } from '@/lib/billing/entitlements';

const TIER_WORDMARK: Record<ProductTier, string> = {
  starter: 'STARTER',
  see: 'SEE',
  understand: 'UNDERSTAND',
  act: 'ACT',
};

function currentPlanFromRow(planId: string | null | undefined): {
  id: string;
  tierWordmark: string;
  name: string;
} | null {
  if (!planId) return null;
  const listed = PLANS.find((p) => p.id === planId);
  if (listed) {
    return { id: listed.id, tierWordmark: listed.tierWordmark, name: listed.name };
  }
  const tier = planIdToTier(planId);
  return {
    id: planId,
    tierWordmark: tier ? TIER_WORDMARK[tier] : planId.toUpperCase(),
    name: planId,
  };
}

/**
 * GET /api/billing/status
 * Returns the authenticated user's current subscription summary, if any.
 */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from('stripe_subscriptions')
    .select(
      'stripe_subscription_id, status, plan_id, price_id, interval, current_period_end, trial_end, cancel_at_period_end'
    )
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const isActive =
    !!data &&
    ['active', 'trialing', 'past_due'].includes(String(data.status ?? ''));

  const currentPlan = isActive ? currentPlanFromRow(data.plan_id as string | null) : null;
  const entitlements: PlanEntitlements | null = isActive && data.plan_id
    ? getPlanEntitlements(data.plan_id as string)
    : null;

  return NextResponse.json({
    hasSubscription: !!data,
    isActive,
    subscription: data ?? null,
    currentPlan,
    entitlements,
  });
}