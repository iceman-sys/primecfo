import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe/client';
import { upsertSubscription } from '@/lib/stripe/repo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BodySchema = z.object({
  sessionId: z.string().min(1),
});

/**
 * POST /api/stripe/checkout/sync
 * After Checkout redirect, persists subscription to Supabase when webhooks are delayed or unavailable (e.g. local dev).
 * Idempotent with webhook upserts (same stripe_subscription_id).
 */
export async function POST(request: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Billing is not configured' }, { status: 503 });
  }

  let parsed: z.infer<typeof BodySchema>;
  try {
    parsed = BodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid body: sessionId required' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const session = await stripe().checkout.sessions.retrieve(parsed.sessionId, {
    expand: ['subscription'],
  });

  const ownerRef =
    session.client_reference_id?.trim() ||
    (typeof session.metadata?.supabase_user_id === 'string' ? session.metadata.supabase_user_id.trim() : '');
  if (!ownerRef || ownerRef !== user.id) {
    return NextResponse.json({ error: 'Session does not belong to this user' }, { status: 403 });
  }

  if (session.mode !== 'subscription') {
    return NextResponse.json({ error: 'Not a subscription checkout' }, { status: 400 });
  }

  const embedded = session.subscription;
  const subscriptionId = typeof embedded === 'string' ? embedded : embedded?.id;
  if (!subscriptionId) {
    return NextResponse.json({ error: 'No subscription on checkout session yet' }, { status: 409 });
  }

  const sub = await stripe().subscriptions.retrieve(subscriptionId, {
    expand: ['items.data.price'],
  });

  await upsertSubscription(sub);

  return NextResponse.json({ ok: true, subscriptionId: sub.id });
}
