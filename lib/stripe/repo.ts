import type Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/qbo/supabaseAdmin';
import { stripe } from './client';

/**
 * Return an existing stripe_customer_id for the given Supabase user, or create
 * a new Stripe customer, persist the mapping, and return the new id.
 */
export async function getOrCreateStripeCustomer(params: {
  userId: string;
  email: string | null;
}): Promise<string> {
  const sb = supabaseAdmin();
  const { userId, email } = params;

  const { data: existing, error: fetchError } = await sb
    .from('stripe_customers')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (fetchError) {
    throw new Error(`Failed to read stripe_customers: ${fetchError.message}`);
  }
  if (existing?.stripe_customer_id) return existing.stripe_customer_id as string;

  const customer = await stripe().customers.create({
    email: email ?? undefined,
    metadata: { supabase_user_id: userId },
  });

  const { error: insertError } = await sb.from('stripe_customers').insert({
    user_id: userId,
    stripe_customer_id: customer.id,
    email,
  });
  if (insertError) {
    throw new Error(`Failed to persist stripe_customers: ${insertError.message}`);
  }

  return customer.id;
}

function pickPriceId(sub: Stripe.Subscription): string | null {
  const item = sub.items?.data?.[0];
  return item?.price?.id ?? null;
}

function pickInterval(sub: Stripe.Subscription): 'month' | 'year' | null {
  const interval = sub.items?.data?.[0]?.price?.recurring?.interval;
  return interval === 'month' || interval === 'year' ? interval : null;
}

function toIso(epochSeconds: number | null | undefined): string | null {
  if (!epochSeconds) return null;
  return new Date(epochSeconds * 1000).toISOString();
}

/**
 * Upsert subscription state from a Stripe.Subscription object.
 * Called from webhook handlers; safe to call multiple times with the same event.
 */
export async function upsertSubscription(sub: Stripe.Subscription): Promise<void> {
  const sb = supabaseAdmin();
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;

  const { data: customerRow, error: customerErr } = await sb
    .from('stripe_customers')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();
  if (customerErr) {
    throw new Error(`Failed to resolve user for customer ${customerId}: ${customerErr.message}`);
  }
  const userId = (customerRow?.user_id as string | undefined) ?? null;
  if (!userId) {
    // Unknown customer (e.g. created outside this flow); skip silently.
    console.warn(`[stripe] No user mapping for customer ${customerId}; skipping upsert.`);
    return;
  }

  const planId = (sub.metadata?.plan_id as string | undefined) ?? null;
  const price = sub.items?.data?.[0]?.price;
  const priceId = pickPriceId(sub);
  const interval = pickInterval(sub);
  const item = sub.items?.data?.[0];
  const currentPeriodStart = toIso(item?.current_period_start ?? null);
  const currentPeriodEnd = toIso(item?.current_period_end ?? null);

  const { error } = await sb
    .from('stripe_subscriptions')
    .upsert(
      {
        stripe_subscription_id: sub.id,
        user_id: userId,
        stripe_customer_id: customerId,
        status: sub.status,
        plan_id: planId ?? (price?.metadata?.plan_id as string | undefined) ?? null,
        price_id: priceId,
        interval,
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd,
        trial_end: toIso(sub.trial_end ?? null),
        cancel_at_period_end: sub.cancel_at_period_end ?? false,
        canceled_at: toIso(sub.canceled_at ?? null),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'stripe_subscription_id' }
    );

  if (error) {
    throw new Error(`Failed to upsert subscription ${sub.id}: ${error.message}`);
  }
}

/**
 * Mark a Stripe webhook event as processed. Returns false if already processed
 * (use this for idempotency before doing any side effects).
 */
export async function markEventProcessed(params: {
  id: string;
  type: string;
  error?: string | null;
}): Promise<void> {
  const sb = supabaseAdmin();
  await sb.from('stripe_webhook_events').upsert(
    {
      id: params.id,
      type: params.type,
      processed_at: new Date().toISOString(),
      error_message: params.error ?? null,
    },
    { onConflict: 'id' }
  );
}

/**
 * Returns true if this event has already been successfully processed.
 */
export async function isEventAlreadyProcessed(eventId: string): Promise<boolean> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from('stripe_webhook_events')
    .select('id, processed_at')
    .eq('id', eventId)
    .maybeSingle();
  if (error) return false;
  return !!(data && data.processed_at);
}
