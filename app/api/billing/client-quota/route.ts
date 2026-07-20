import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/requireUser';
import { isAdminEmail } from '@/lib/auth/admin';
import { getClientQuota } from '@/lib/billing/clientLimits';

/**
 * GET /api/billing/client-quota
 * Returns active client count vs plan limit for the signed-in user.
 * Operators (admin allowlist) are counted against the firm-wide active client total.
 */
export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const firmScope = isAdminEmail(auth.user.email);

  try {
    const quota = await getClientQuota({ firmScope });
    return NextResponse.json({
      tier: quota.tier,
      limit: Number.isFinite(quota.limit) ? quota.limit : null,
      activeCount: quota.activeCount,
      remaining: Number.isFinite(quota.remaining) ? quota.remaining : null,
      canAdd: quota.canAdd,
      upgradePath: '/pricing',
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load client quota' },
      { status: 500 }
    );
  }
}
