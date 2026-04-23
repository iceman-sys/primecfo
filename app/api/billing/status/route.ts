import { NextResponse } from 'next/server';
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/qbo/supabaseAdmin';

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

  return NextResponse.json({
    hasSubscription: !!data,
    isActive,
    subscription: data ?? null,
  });
}
