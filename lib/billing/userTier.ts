import { createClient as createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/qbo/supabaseAdmin';
import { getTierCapabilities, type TierCapabilities } from '@/lib/tiers';

/**
 * Load Stripe plan_id for the current session user and derive tier capabilities.
 */
export async function getTierCapabilitiesForSession(): Promise<{
  userId: string | null;
  planId: string | null;
  capabilities: TierCapabilities;
}> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      userId: null,
      planId: null,
      capabilities: getTierCapabilities(null),
    };
  }

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from('stripe_subscriptions')
    .select('plan_id, status')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return { userId: user.id, planId: null, capabilities: getTierCapabilities(null) };
  }

  const active = ['active', 'trialing', 'past_due'].includes(String(data.status ?? ''));
  const planId = active ? ((data.plan_id as string | null) ?? null) : null;

  return {
    userId: user.id,
    planId,
    capabilities: getTierCapabilities(planId),
  };
}
