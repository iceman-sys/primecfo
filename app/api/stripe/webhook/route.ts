import { NextResponse, type NextRequest } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe/client';
import { getStripeWebhookSecret } from '@/lib/qbo/env';
import {
  isEventAlreadyProcessed,
  markEventProcessed,
  upsertSubscription,
} from '@/lib/stripe/repo';

// Stripe webhook route: MUST run on Node.js runtime (needs raw body + node crypto).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function handleEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== 'subscription') return;
      const subscriptionId =
        typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription?.id;
      if (!subscriptionId) return;
      const sub = await stripe().subscriptions.retrieve(subscriptionId);
      await upsertSubscription(sub);
      return;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
    case 'customer.subscription.trial_will_end': {
      const sub = event.data.object as Stripe.Subscription;
      await upsertSubscription(sub);
      return;
    }

    case 'invoice.paid':
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice & { subscription?: string | Stripe.Subscription };
      const subscriptionId =
        typeof invoice.subscription === 'string'
          ? invoice.subscription
          : invoice.subscription?.id;
      if (!subscriptionId) return;
      const sub = await stripe().subscriptions.retrieve(subscriptionId);
      await upsertSubscription(sub);
      return;
    }

    default:
      return;
  }
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(rawBody, signature, getStripeWebhookSecret());
  } catch (err) {
    console.error('[stripe/webhook] signature verification failed', err);
    return NextResponse.json(
      { error: 'Invalid signature', details: err instanceof Error ? err.message : String(err) },
      { status: 400 }
    );
  }

  if (await isEventAlreadyProcessed(event.id)) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  try {
    await handleEvent(event);
    await markEventProcessed({ id: event.id, type: event.type });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[stripe/webhook] failed to handle ${event.type}`, err);
    await markEventProcessed({ id: event.id, type: event.type, error: msg });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
