import { NextResponse, type NextRequest } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe/client';
import { getStripeWebhookSecret } from '@/lib/qbo/env';
import {
  isEventAlreadyProcessed,
  markEventProcessed,
  upsertSubscription,
} from '@/lib/stripe/repo';
import { sendNewSubscriberAlert } from '@/lib/alerts/subscriberAlert';
import { getPlanById } from '@/lib/stripe/plans';
import {
  resolveCustomerEmail,
  sendPaymentFailedEmail,
  sendTrialEndingEmail,
} from '@/lib/billing/stripeEmail';

// Stripe webhook route: MUST run on Node.js runtime (needs raw body + node crypto).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function subscriptionPriceDetails(sub: Stripe.Subscription): {
  amountInCents: number;
  currency: string;
  interval: 'month' | 'year';
} | null {
  const item = sub.items?.data?.[0];
  const price = item?.price;
  if (!price || typeof price.unit_amount !== 'number' || !price.currency) return null;
  const interval = price.recurring?.interval;
  if (interval !== 'month' && interval !== 'year') return null;
  return { amountInCents: price.unit_amount, currency: price.currency, interval };
}

async function handleTrialWillEnd(sub: Stripe.Subscription): Promise<void> {
  await upsertSubscription(sub);

  if (!sub.trial_end) return;

  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  const customerEmail = await resolveCustomerEmail(stripe(), customerId);
  if (!customerEmail) return;

  const planId =
    (typeof sub.metadata?.plan_id === 'string' && sub.metadata.plan_id) || null;
  const planName = planId ? getPlanById(planId)?.name ?? planId : 'PrimeCFO.ai';
  const priceDetails = subscriptionPriceDetails(sub);
  if (!priceDetails) return;

  await sendTrialEndingEmail({
    customerEmail,
    planName,
    trialEndUnix: sub.trial_end,
    amountInCents: priceDetails.amountInCents,
    currency: priceDetails.currency,
    interval: priceDetails.interval,
  });
}

async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const subscriptionId =
    typeof invoice.parent?.subscription_details?.subscription === 'string'
      ? invoice.parent.subscription_details.subscription
      : typeof (invoice as Stripe.Invoice & { subscription?: string | null }).subscription === 'string'
        ? (invoice as Stripe.Invoice & { subscription: string }).subscription
        : null;
  if (!subscriptionId) return;

  const sub = await stripe().subscriptions.retrieve(subscriptionId, {
    expand: ['items.data.price'],
  });
  await upsertSubscription(sub);

  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  const customerEmail =
    invoice.customer_email ?? (await resolveCustomerEmail(stripe(), customerId));
  if (!customerEmail) return;

  const planId =
    (typeof sub.metadata?.plan_id === 'string' && sub.metadata.plan_id) || null;
  const planName = planId ? getPlanById(planId)?.name ?? planId : 'PrimeCFO.ai';
  const amountInCents =
    typeof invoice.amount_due === 'number'
      ? invoice.amount_due
      : subscriptionPriceDetails(sub)?.amountInCents ?? 0;
  const currency = invoice.currency ?? subscriptionPriceDetails(sub)?.currency ?? 'usd';

  if (amountInCents > 0) {
    await sendPaymentFailedEmail({
      customerEmail,
      planName,
      amountInCents,
      currency,
    });
  }
}

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
      const sub = await stripe().subscriptions.retrieve(subscriptionId, {
        expand: ['items.data.price'],
      });
      await upsertSubscription(sub);

      const planId =
        (typeof session.metadata?.plan_id === 'string' && session.metadata.plan_id) ||
        (typeof sub.metadata?.plan_id === 'string' && sub.metadata.plan_id) ||
        null;
      const planName = planId ? getPlanById(planId)?.name ?? null : null;
      const customerEmail =
        session.customer_details?.email ||
        session.customer_email ||
        null;
      await sendNewSubscriberAlert({
        subscription: sub,
        customerEmail,
        planId,
        planName,
      });
      return;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      await upsertSubscription(sub);
      return;
    }

    case 'customer.subscription.trial_will_end': {
      const sub = event.data.object as Stripe.Subscription;
      await handleTrialWillEnd(sub);
      return;
    }

    case 'invoice.paid':
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      if (event.type === 'invoice.payment_failed') {
        await handlePaymentFailed(invoice);
        return;
      }
      const subscriptionId =
        typeof invoice.parent?.subscription_details?.subscription === 'string'
          ? invoice.parent.subscription_details.subscription
          : typeof (invoice as Stripe.Invoice & { subscription?: string | null }).subscription ===
              'string'
            ? (invoice as Stripe.Invoice & { subscription: string }).subscription
            : null;
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
