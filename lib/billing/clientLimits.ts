import { planIdToTier, type ProductTier } from '@/lib/tiers';
import { isAdminEmail } from '@/lib/auth/admin';
import { getTierCapabilitiesForSession } from '@/lib/billing/userTier';
import { supabaseAdmin } from '@/lib/qbo/supabaseAdmin';

/**
 * Max active client companies per subscription tier.
 * Andrew’s examples (July 2026) — adjust when pricing finalizes overage/add-on.
 */
export const CLIENT_LIMITS: Record<ProductTier, number> = {
  starter: 1,
  see: 1,
  understand: 3,
  act: 5,
};

/** Optional firm override for ADMIN_EMAILS (internal book of business). */
function firmClientLimit(): number {
  const raw = process.env.PRIME_FIRM_CLIENT_LIMIT?.trim();
  if (raw === 'unlimited' || raw === '0') return Number.POSITIVE_INFINITY;
  const n = raw ? Number(raw) : 50;
  return Number.isFinite(n) && n > 0 ? n : 50;
}

export function clientLimitForTier(tier: ProductTier, email?: string | null): number {
  const base = CLIENT_LIMITS[tier] ?? 1;
  if (email && isAdminEmail(email)) {
    return Math.max(base, firmClientLimit());
  }
  return base;
}

export type ClientQuota = {
  tier: ProductTier;
  limit: number;
  activeCount: number;
  remaining: number;
  canAdd: boolean;
};

/** Count active clients owned by this user (SaaS) or all active firm clients (operators). */
export async function countActiveClients(opts: {
  userId: string;
  email?: string | null;
  /** When true, count all active clients in the firm (operator / book-of-business). */
  firmScope?: boolean;
}): Promise<number> {
  const sb = supabaseAdmin();

  if (opts.firmScope) {
    const { count, error } = await sb
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);
    if (error) throw new Error(error.message);
    return count ?? 0;
  }

  const { count, error } = await sb
    .from('clients')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', opts.userId)
    .eq('is_active', true);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function getClientQuota(opts?: {
  firmScope?: boolean;
}): Promise<ClientQuota & { userId: string | null; email: string | null }> {
  const session = await getTierCapabilitiesForSession();
  const supabase = await import('@/lib/supabase/server').then((m) => m.createClient());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = user?.email ?? null;
  const tier = session.capabilities.tier;
  const limit = clientLimitForTier(tier, email);

  if (!user) {
    return {
      userId: null,
      email: null,
      tier,
      limit,
      activeCount: 0,
      remaining: limit,
      canAdd: false,
    };
  }

  const activeCount = await countActiveClients({
    userId: user.id,
    email,
    firmScope: opts?.firmScope,
  });

  const remaining = Number.isFinite(limit) ? Math.max(0, limit - activeCount) : Number.POSITIVE_INFINITY;

  return {
    userId: user.id,
    email,
    tier,
    limit,
    activeCount,
    remaining: Number.isFinite(remaining) ? remaining : 999,
    canAdd: activeCount < limit,
  };
}

export function upgradeMessageForClientLimit(quota: ClientQuota): string {
  return (
    `Your ${quota.tier} plan includes ${quota.limit} active client` +
    `${quota.limit === 1 ? '' : 's'} ` +
    `(${quota.activeCount} in use). Upgrade to add more clients, or deactivate a client first.`
  );
}
