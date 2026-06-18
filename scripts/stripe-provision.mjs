/**
 * Provision Stripe Products + Prices for all PrimeCFO tiers.
 *
 * Usage (from repo root, with STRIPE_SECRET_KEY in .env.local):
 *   node --env-file=.env.local scripts/stripe-provision.mjs
 *
 * Or in PowerShell:
 *   $env:STRIPE_SECRET_KEY="sk_test_..."; node scripts/stripe-provision.mjs
 *
 * Prints the six Price IDs to paste into .env.local / Vercel.
 * Test-mode IDs do NOT carry over to live — re-run with sk_live_ at launch.
 */

import Stripe from 'stripe';

const PLANS = [
  {
    id: 'self-service',
    name: 'PrimeCFO — See',
    description:
      'Your numbers, finally clear. 5 key metrics, monthly AI summary, 30-day forecast.',
    monthlyCents: 11_900,
    annualCents: 118_800,
  },
  {
    id: 'starter',
    name: 'PrimeCFO — Understand',
    description:
      'AI insights. Human guidance. Weekly summaries, 60-day forecast, quarterly advisory.',
    monthlyCents: 34_900,
    annualCents: 349_000,
  },
  {
    id: 'growth',
    name: 'PrimeCFO — Act',
    description:
      'A finance team in your corner. 90-day scenarios, custom alerts, monthly advisory.',
    monthlyCents: 52_900,
    annualCents: 529_000,
  },
];

const ENV_KEYS = {
  'self-service': {
    month: 'STRIPE_PRICE_SELF_SERVICE_MONTHLY',
    year: 'STRIPE_PRICE_SELF_SERVICE_ANNUAL',
  },
  starter: {
    month: 'STRIPE_PRICE_STARTER_MONTHLY',
    year: 'STRIPE_PRICE_STARTER_ANNUAL',
  },
  growth: {
    month: 'STRIPE_PRICE_GROWTH_MONTHLY',
    year: 'STRIPE_PRICE_GROWTH_ANNUAL',
  },
};

function productId(planId) {
  return `primecfo_${planId.replace(/-/g, '_')}`;
}

function lookupKey(planId, interval, amountCents) {
  return `primecfo_${planId.replace(/-/g, '_')}_${interval}_${amountCents}`;
}

async function findOrCreateProduct(stripe, plan) {
  const id = productId(plan.id);
  try {
    const existing = await stripe.products.retrieve(id);
    if (existing && !existing.deleted) {
      await stripe.products.update(id, {
        name: plan.name,
        description: plan.description,
        metadata: { primecfo_plan_id: plan.id },
      });
      return existing.id;
    }
  } catch (err) {
    if (err?.code !== 'resource_missing' && err?.statusCode !== 404) throw err;
  }

  const created = await stripe.products.create({
    id,
    name: plan.name,
    description: plan.description,
    metadata: { primecfo_plan_id: plan.id },
  });
  return created.id;
}

async function findOrCreatePrice(stripe, productId, planId, interval, amountCents) {
  const key = lookupKey(planId, interval, amountCents);
  const existing = await stripe.prices.list({ lookup_keys: [key], active: true, limit: 1 });
  if (existing.data[0]?.id) return existing.data[0].id;

  const price = await stripe.prices.create({
    product: productId,
    currency: 'usd',
    unit_amount: amountCents,
    recurring: { interval },
    lookup_key: key,
    metadata: { primecfo_plan_id: planId, primecfo_interval: interval },
  });
  return price.id;
}

async function main() {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    console.error('STRIPE_SECRET_KEY is required. Use: node --env-file=.env.local scripts/stripe-provision.mjs');
    process.exit(1);
  }

  const stripe = new Stripe(secret);
  const lines = [];

  console.log(`\nProvisioning Stripe catalog (${secret.startsWith('sk_live') ? 'LIVE' : 'TEST'})…\n`);

  for (const plan of PLANS) {
    const product = await findOrCreateProduct(stripe, plan);
    const monthId = await findOrCreatePrice(stripe, product, plan.id, 'month', plan.monthlyCents);
    const yearId = await findOrCreatePrice(stripe, product, plan.id, 'year', plan.annualCents);

    console.log(`${plan.name}`);
    console.log(`  Product:  ${product}`);
    console.log(`  Monthly:  ${monthId}  ($${(plan.monthlyCents / 100).toFixed(2)}/mo)`);
    console.log(`  Annual:   ${yearId}  ($${(plan.annualCents / 100).toFixed(2)}/yr)\n`);

    const keys = ENV_KEYS[plan.id];
    lines.push(`${keys.month}=${monthId}`);
    lines.push(`${keys.year}=${yearId}`);
  }

  console.log('── Paste into .env.local / Vercel ──\n');
  console.log(lines.join('\n'));
  console.log('\n── Webhook (Dashboard → Developers → Webhooks) ──');
  console.log('URL: https://www.primecfo.ai/api/stripe/webhook');
  console.log('Events: checkout.session.completed, customer.subscription.*, invoice.paid, invoice.payment_failed');
  console.log('\n── Customer Portal (Dashboard → Settings → Billing → Customer portal) ──');
  console.log('Enable: upgrade/downgrade across all 3 tiers, monthly↔annual, cancel, update card.\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
