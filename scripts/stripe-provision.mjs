/**
 * Provision / sync Stripe Products + Prices for all PrimeCFO tiers.
 *
 * Usage (from repo root, with STRIPE_SECRET_KEY in .env.local):
 *   node --env-file=.env.local scripts/stripe-provision.mjs
 *
 * Or in PowerShell:
 *   $env:STRIPE_SECRET_KEY="sk_test_..."; node scripts/stripe-provision.mjs
 *
 * - Creates or updates product display names (safe for existing subscriptions).
 * - Creates prices via lookup_keys when amounts change.
 * - Archives legacy lookup_keys from prior pricing eras (~17%, $529, $441, etc.).
 *
 * Test-mode IDs do NOT carry over to live — re-run with sk_live_ at launch.
 */

import Stripe from 'stripe';

const PLANS = [
  {
    id: 'entry',
    name: 'PrimeCFO — Starter',
    description:
      'Essential dashboard, monthly AI summary, current cash position & runway — updated daily.',
    monthlyCents: 5_900,
    annualCents: 63_600,
  },
  {
    id: 'self-service',
    name: 'PrimeCFO — See',
    description:
      'Your numbers, finally clear. Dashboard KPIs, monthly AI summary, 30-day cash flow forecast.',
    monthlyCents: 11_900,
    annualCents: 128_400,
  },
  {
    id: 'starter',
    name: 'PrimeCFO — Understand',
    description:
      'AI insights. Human guidance. Weekly summaries, 60-day forecast, quarterly fractional CFO advisory.',
    monthlyCents: 34_900,
    annualCents: 376_800,
  },
  {
    id: 'growth',
    name: 'PrimeCFO — Act',
    description:
      'A finance team in your corner. 90-day scenarios, custom alerts, monthly fractional CFO advisory.',
    monthlyCents: 69_900,
    annualCents: 754_800,
  },
];

const ENV_KEYS = {
  entry: {
    month: 'STRIPE_PRICE_ENTRY_MONTHLY',
    year: 'STRIPE_PRICE_ENTRY_ANNUAL',
  },
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

/** Legacy lookup_key amount suffixes to archive (prior pricing eras). */
const LEGACY_LOOKUP_AMOUNTS = [
  9900, 10700, 29100, 31400, 44100, 52900, 63600, 118800, 128400, 349000, 376800, 529000, 69900,
];

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
      console.log(`  ✓ Updated product name: "${plan.name}"`);
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
  console.log(`  ✓ Created product: "${plan.name}"`);
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

/** Rename legacy products that still carry old display names in Stripe. */
async function syncLegacyProductNames(stripe) {
  const renames = [
    { match: /self[- ]?service/i, planId: 'self-service', name: 'PrimeCFO — See' },
    { match: /starter/i, planId: 'starter', name: 'PrimeCFO — Understand' },
    { match: /^primecfo — starter$/i, planId: 'entry', name: 'PrimeCFO — Starter' },
  ];

  const products = await stripe.products.list({ limit: 100, active: true });
  for (const product of products.data) {
    const metaPlanId = product.metadata?.primecfo_plan_id;
    if (metaPlanId && PLANS.some((p) => p.id === metaPlanId)) {
      const plan = PLANS.find((p) => p.id === metaPlanId);
      if (plan && product.name !== plan.name) {
        await stripe.products.update(product.id, { name: plan.name, description: plan.description });
        console.log(`  ✓ Renamed "${product.name}" → "${plan.name}" (${product.id})`);
      }
      continue;
    }

    for (const rule of renames) {
      if (rule.match.test(product.name) && product.name !== rule.name) {
        const canonical = PLANS.find((p) => p.id === rule.planId);
        if (!canonical) continue;
        if (product.name.toLowerCase().includes('understand') || product.name.toLowerCase().includes('see')) {
          continue;
        }
        if (rule.planId === 'starter' && product.name.toLowerCase().includes('starter') && metaPlanId === 'entry') {
          continue;
        }
        await stripe.products.update(product.id, {
          name: canonical.name,
          description: canonical.description,
          metadata: { ...product.metadata, primecfo_plan_id: rule.planId },
        });
        console.log(`  ✓ Legacy rename "${product.name}" → "${canonical.name}" (${product.id})`);
        break;
      }
    }
  }
}

async function archiveLegacyPrices(stripe) {
  let archived = 0;
  for (const plan of PLANS) {
    for (const interval of ['month', 'year']) {
      for (const amount of LEGACY_LOOKUP_AMOUNTS) {
        const key = lookupKey(plan.id, interval, amount);
        const currentAmount = interval === 'month' ? plan.monthlyCents : plan.annualCents;
        if (amount === currentAmount) continue;

        const existing = await stripe.prices.list({ lookup_keys: [key], active: true, limit: 1 });
        const price = existing.data[0];
        if (price?.id) {
          await stripe.prices.update(price.id, { active: false, lookup_key: `${key}_archived_${Date.now()}` });
          archived++;
        }
      }
    }
  }
  if (archived > 0) console.log(`\n  ✓ Archived ${archived} legacy price(s).`);
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

  console.log('Syncing legacy product display names…');
  await syncLegacyProductNames(stripe);

  for (const plan of PLANS) {
    const product = await findOrCreateProduct(stripe, plan);
    const monthId = await findOrCreatePrice(stripe, product, plan.id, 'month', plan.monthlyCents);
    const yearId = await findOrCreatePrice(stripe, product, plan.id, 'year', plan.annualCents);

    console.log(`\n${plan.name}`);
    console.log(`  Product:  ${product}`);
    console.log(`  Monthly:  ${monthId}  ($${(plan.monthlyCents / 100).toFixed(2)}/mo)`);
    console.log(`  Annual:   ${yearId}  ($${(plan.annualCents / 100).toFixed(2)}/yr)\n`);

    const keys = ENV_KEYS[plan.id];
    if (keys) {
      lines.push(`${keys.month}=${monthId}`);
      lines.push(`${keys.year}=${yearId}`);
    }
  }

  await archiveLegacyPrices(stripe);

  console.log('── Paste into .env.local / Vercel ──\n');
  console.log(lines.join('\n'));
  console.log('\n── Verify Act product shows "PrimeCFO — Act" at $699/mo · $7,548/yr ──');
  console.log('── Webhook URL: https://www.primecfo.ai/api/stripe/webhook ──\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
