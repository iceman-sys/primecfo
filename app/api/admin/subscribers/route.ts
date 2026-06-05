import { NextResponse } from 'next/server';
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/qbo/supabaseAdmin';
import { isAdminEmail } from '@/lib/auth/admin';
import { PLANS } from '@/app/lib/pricing-plans';
import { planIdToTier, type ProductTier } from '@/lib/tiers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TIER_WORDMARK: Record<ProductTier, string> = {
  see: 'SEE',
  understand: 'UNDERSTAND',
  act: 'ACT',
};

/** Statuses we treat as "currently paying / live". */
const ACTIVE_STATUSES = new Set(['active', 'trialing', 'past_due']);

type SubscriptionRow = {
  stripe_subscription_id: string;
  user_id: string;
  stripe_customer_id: string;
  status: string;
  plan_id: string | null;
  price_id: string | null;
  interval: 'month' | 'year' | null;
  current_period_end: string | null;
  trial_end: string | null;
  cancel_at_period_end: boolean | null;
  canceled_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type CustomerRow = {
  user_id: string;
  stripe_customer_id: string;
  email: string | null;
  created_at: string | null;
};

function planMeta(planId: string | null) {
  if (!planId) return { planName: null as string | null, tierWordmark: null as string | null };
  const listed = PLANS.find((p) => p.id === planId);
  if (listed) return { planName: listed.name, tierWordmark: listed.tierWordmark };
  const tier = planIdToTier(planId);
  return {
    planName: planId,
    tierWordmark: tier ? TIER_WORDMARK[tier] : planId.toUpperCase(),
  };
}

/** Monthly-equivalent dollar amount for MRR. Annual plans store the per-month price. */
function monthlyAmount(planId: string | null, interval: 'month' | 'year' | null): number {
  if (!planId) return 0;
  const plan = PLANS.find((p) => p.id === planId);
  if (!plan) return 0;
  return interval === 'year' ? plan.annual : plan.monthly;
}

function stripeMode(): 'test' | 'live' | 'unknown' {
  const key = process.env.STRIPE_SECRET_KEY ?? '';
  if (key.startsWith('sk_test_')) return 'test';
  if (key.startsWith('sk_live_')) return 'live';
  return 'unknown';
}

/**
 * GET /api/admin/subscribers
 * Operator-only. Lists every Supabase user with their latest Stripe subscription
 * (if any) plus rollup stats. Secured by the ADMIN_EMAILS allowlist.
 */
export async function GET() {
  // 1) Must be authenticated.
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // 2) Must be an allowlisted admin.
  if (!isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const sb = supabaseAdmin();

  // 3) Pull billing tables (service role; bypasses RLS).
  const [{ data: subsData, error: subsError }, { data: custData, error: custError }] =
    await Promise.all([
      sb
        .from('stripe_subscriptions')
        .select(
          'stripe_subscription_id, user_id, stripe_customer_id, status, plan_id, price_id, interval, current_period_end, trial_end, cancel_at_period_end, canceled_at, created_at, updated_at'
        )
        .order('updated_at', { ascending: false }),
      sb.from('stripe_customers').select('user_id, stripe_customer_id, email, created_at'),
    ]);

  if (subsError) {
    return NextResponse.json({ error: `subscriptions: ${subsError.message}` }, { status: 500 });
  }
  if (custError) {
    return NextResponse.json({ error: `customers: ${custError.message}` }, { status: 500 });
  }

  const subs = (subsData ?? []) as SubscriptionRow[];
  const customers = (custData ?? []) as CustomerRow[];

  // Latest subscription per user (subs already ordered by updated_at desc).
  const latestSubByUser = new Map<string, SubscriptionRow>();
  for (const s of subs) {
    if (!latestSubByUser.has(s.user_id)) latestSubByUser.set(s.user_id, s);
  }
  const customerByUser = new Map<string, CustomerRow>();
  for (const c of customers) customerByUser.set(c.user_id, c);

  // 4) Page through Supabase auth users.
  type AuthUser = {
    id: string;
    email?: string | null;
    created_at?: string;
    last_sign_in_at?: string | null;
    email_confirmed_at?: string | null;
    confirmed_at?: string | null;
  };
  const authUsers: AuthUser[] = [];
  const perPage = 200;
  const maxPages = 25; // safety cap (5,000 users)
  for (let page = 1; page <= maxPages; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage });
    if (error) {
      return NextResponse.json({ error: `auth users: ${error.message}` }, { status: 500 });
    }
    const batch = (data?.users ?? []) as AuthUser[];
    authUsers.push(...batch);
    if (batch.length < perPage) break;
  }

  // 5) Compose rows: one per user, enriched with subscription state.
  const rows = authUsers.map((u) => {
    const sub = latestSubByUser.get(u.id) ?? null;
    const cust = customerByUser.get(u.id) ?? null;
    const meta = planMeta(sub?.plan_id ?? null);
    const confirmed = !!(u.email_confirmed_at || u.confirmed_at);
    return {
      id: u.id,
      email: u.email ?? cust?.email ?? null,
      createdAt: u.created_at ?? null,
      lastSignInAt: u.last_sign_in_at ?? null,
      emailConfirmed: confirmed,
      stripeCustomerId: cust?.stripe_customer_id ?? sub?.stripe_customer_id ?? null,
      hasSubscription: !!sub,
      status: sub?.status ?? null,
      planId: sub?.plan_id ?? null,
      planName: meta.planName,
      tierWordmark: meta.tierWordmark,
      interval: sub?.interval ?? null,
      trialEnd: sub?.trial_end ?? null,
      currentPeriodEnd: sub?.current_period_end ?? null,
      cancelAtPeriodEnd: !!sub?.cancel_at_period_end,
      subscriptionUpdatedAt: sub?.updated_at ?? null,
    };
  });

  // Sort newest signups first.
  rows.sort((a, b) => {
    const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
    const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
    return tb - ta;
  });

  // 6) Rollup stats.
  let active = 0;
  let trialing = 0;
  let pastDue = 0;
  let canceled = 0;
  let mrr = 0;
  for (const r of rows) {
    if (!r.status) continue;
    if (r.status === 'trialing') trialing++;
    else if (r.status === 'active') active++;
    else if (r.status === 'past_due') pastDue++;
    else if (r.status === 'canceled' || r.status === 'incomplete_expired') canceled++;

    // MRR from genuinely paying subscriptions only (exclude trials).
    if (r.status === 'active') {
      mrr += monthlyAmount(r.planId, r.interval);
    }
  }

  const subscribers = rows.filter((r) => r.hasSubscription).length;

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    stripeMode: stripeMode(),
    stats: {
      totalUsers: rows.length,
      subscribers,
      active,
      trialing,
      pastDue,
      canceled,
      liveSubscribers: rows.filter((r) => r.status && ACTIVE_STATUSES.has(r.status)).length,
      mrr,
      currency: 'usd',
    },
    rows,
  });
}
