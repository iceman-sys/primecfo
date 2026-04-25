import { PLANS, type Plan } from '@/app/lib/pricing-plans';
import { stripe } from './client';

export type BillingInterval = 'month' | 'year';

/**
 * Map of plan id -> { month, year } -> env var name holding an explicit Stripe Price ID.
 * These are optional; when unset, we auto-provision Products and Prices via lookup_keys.
 * All public tiers (Self-Service, Starter, Growth) are self-serve Checkout prices.
 */
const PRICE_ENV_MAP: Record<string, Partial<Record<BillingInterval, string>>> = {
  'self-service': {
    month: 'STRIPE_PRICE_SELF_SERVICE_MONTHLY',
    year: 'STRIPE_PRICE_SELF_SERVICE_ANNUAL',
  },
  starter: {
    month: 'STRIPE_PRICE_STARTER_MONTHLY',
    year: 'STRIPE_PRICE_STARTER_ANNUAL',
  },
  // Act (growth) tier is conversation-led in the product UI; no self-serve Checkout.
};

export function isCheckoutPlan(planId: string): boolean {
  return planId in PRICE_ENV_MAP;
}

export function getPlanById(planId: string): Plan | undefined {
  return PLANS.find((p) => p.id === planId);
}

function envPriceId(planId: string, interval: BillingInterval): string | null {
  const envKey = PRICE_ENV_MAP[planId]?.[interval];
  if (!envKey) return null;
  const value = process.env[envKey];
  return value && value.length > 0 ? value : null;
}

/**
 * Build a Stripe `lookup_key` that includes the current unit_amount.
 * This way, any price change in `pricing-plans.ts` auto-provisions a fresh
 * Stripe Price instead of returning the old cached one for the same plan id.
 */
function lookupKey(plan: Plan, interval: BillingInterval): string {
  const amount = computeUnitAmount(plan, interval);
  return `primecfo_${plan.id.replace(/-/g, '_')}_${interval}_${amount}`;
}

/**
 * Compute the integer amount in cents Stripe expects for a plan+interval.
 * - month: plan.monthly * 100
 * - year: plan.annual (per-month price) * 12 * 100  (billed yearly, marketed as $X/mo)
 */
function computeUnitAmount(plan: Plan, interval: BillingInterval): number {
  if (interval === 'month') return Math.round(plan.monthly * 100);
  return Math.round(plan.annual * 12 * 100);
}

function productIdFor(planId: string): string {
  return `primecfo_${planId.replace(/-/g, '_')}`;
}

async function findOrCreateProduct(plan: Plan): Promise<string> {
  const productId = productIdFor(plan.id);
  try {
    const existing = await stripe().products.retrieve(productId);
    if (existing && !existing.deleted) return existing.id;
  } catch (err) {
    const code =
      typeof err === 'object' && err && 'code' in err
        ? (err as { code?: string }).code
        : undefined;
    const statusCode =
      typeof err === 'object' && err && 'statusCode' in err
        ? (err as { statusCode?: number }).statusCode
        : undefined;
    if (code !== 'resource_missing' && statusCode !== 404) {
      throw err;
    }
  }

  const product = await stripe().products.create({
    id: productId,
    name: `PrimeCFO.ai ${plan.name}`,
    description: plan.target,
    metadata: {
      primecfo_plan_id: plan.id,
    },
  });
  return product.id;
}

/**
 * Resolves the Stripe Price ID for a plan+interval in this order:
 *   1. Explicit STRIPE_PRICE_* env var (if set).
 *   2. Existing active Price in Stripe with the matching `lookup_key`.
 *   3. A freshly created Product + Price (idempotent via lookup_key and product metadata).
 *
 * Requires STRIPE_SECRET_KEY to be set. Throws a descriptive error if not.
 */
export async function getOrCreateStripePriceId(
  planId: string,
  interval: BillingInterval
): Promise<string> {
  const plan = getPlanById(planId);
  if (!plan) throw new Error(`Unknown plan "${planId}".`);
  if (!isCheckoutPlan(planId)) {
    throw new Error(`Plan "${planId}" is sales-led; no self-serve checkout.`);
  }

  const fromEnv = envPriceId(planId, interval);
  if (fromEnv) return fromEnv;

  const key = lookupKey(plan, interval);

  const existing = await stripe().prices.list({
    lookup_keys: [key],
    active: true,
    limit: 1,
  });
  if (existing.data.length > 0 && existing.data[0].id) {
    return existing.data[0].id;
  }

  const productId = await findOrCreateProduct(plan);

  const price = await stripe().prices.create({
    product: productId,
    currency: 'usd',
    unit_amount: computeUnitAmount(plan, interval),
    recurring: { interval },
    lookup_key: key,
    metadata: {
      primecfo_plan_id: plan.id,
      primecfo_interval: interval,
    },
  });

  return price.id;
}

export const TRIAL_PERIOD_DAYS = 14;
