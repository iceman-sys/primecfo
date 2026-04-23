import { NextResponse, type NextRequest } from 'next/server';
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe/client';
import { supabaseAdmin } from '@/lib/qbo/supabaseAdmin';
import { getPublicAppBaseUrl } from '@/lib/qbo/env';

/**
 * POST /api/stripe/portal
 * Creates a Stripe Billing Portal session for the authenticated user
 * so they can manage their subscription, payment methods, and invoices.
 */
export async function POST(request: NextRequest) {
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
    .from('stripe_customers')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const customerId = data?.stripe_customer_id as string | undefined;
  if (!customerId) {
    return NextResponse.json(
      { error: 'No Stripe customer found for this user. Subscribe first.' },
      { status: 400 }
    );
  }

  let returnPath = '/settings';
  try {
    const body = (await request.json()) as { returnPath?: string };
    if (body.returnPath && body.returnPath.startsWith('/')) {
      returnPath = body.returnPath;
    }
  } catch {
    // no body is fine
  }

  try {
    const portal = await stripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${getPublicAppBaseUrl()}${returnPath}`,
    });
    return NextResponse.json({ url: portal.url });
  } catch (err) {
    console.error('[stripe/portal] failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create portal session' },
      { status: 500 }
    );
  }
}
