import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe/client';
import {
  TRIAL_PERIOD_DAYS,
  getOrCreateStripePriceId,
  getPlanById,
  isCheckoutPlan,
} from '@/lib/stripe/plans';
import { getOrCreateStripeCustomer } from '@/lib/stripe/repo';
import { getPublicAppBaseUrl } from '@/lib/qbo/env';

const BodySchema = z.object({
  planId: z.string().min(1),
  interval: z.enum(['month', 'year']),
  successPath: z.string().startsWith('/').optional(),
  cancelPath: z.string().startsWith('/').optional(),
});

export async function POST(request: NextRequest) {
  let parsed;
  try {
    parsed = BodySchema.parse(await request.json());
  } catch (err) {
    return NextResponse.json(
      { error: 'Invalid request body', details: err instanceof Error ? err.message : String(err) },
      { status: 400 }
    );
  }
  const { planId, interval, successPath, cancelPath } = parsed;

  if (!isCheckoutPlan(planId)) {
    return NextResponse.json(
      { error: `Plan "${planId}" is sales-led; no self-serve checkout.` },
      { status: 400 }
    );
  }
  const plan = getPlanById(planId);
  if (!plan) {
    return NextResponse.json({ error: `Unknown plan "${planId}".` }, { status: 400 });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: 'Billing is not configured: STRIPE_SECRET_KEY is missing on the server.' },
      { status: 503 }
    );
  }

  let priceId: string;
  try {
    priceId = await getOrCreateStripePriceId(planId, interval);
  } catch (err) {
    console.error('[stripe/checkout] failed to resolve/create price', err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : `Could not resolve Stripe price for ${planId}/${interval}.`,
      },
      { status: 500 }
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let customerId: string;
  try {
    customerId = await getOrCreateStripeCustomer({ userId: user.id, email: user.email ?? null });
  } catch (err) {
    console.error('[stripe/checkout] customer creation failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create Stripe customer' },
      { status: 500 }
    );
  }

  const base = getPublicAppBaseUrl();
  const successUrl = `${base}${successPath ?? '/dashboard'}?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${base}${cancelPath ?? '/pricing'}?checkout=cancel`;

  try {
    const session = await stripe().checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      subscription_data: {
        trial_period_days: TRIAL_PERIOD_DAYS,
        metadata: {
          supabase_user_id: user.id,
          plan_id: planId,
          interval,
        },
      },
      metadata: {
        supabase_user_id: user.id,
        plan_id: planId,
        interval,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    if (!session.url) {
      return NextResponse.json({ error: 'Stripe did not return a checkout URL.' }, { status: 500 });
    }

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('[stripe/checkout] failed to create session', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
