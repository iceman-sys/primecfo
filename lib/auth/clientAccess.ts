import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { isAdminEmail } from '@/lib/auth/admin';
import { requireUser } from '@/lib/auth/requireUser';
import { supabaseAdmin } from '@/lib/qbo/supabaseAdmin';

type ClientAccessRow = {
  user_id: string | null;
  is_active: boolean | null;
};

/** Admins may access any client; customers only their user_id-linked row. */
export async function userCanAccessClient(user: User, clientId: string): Promise<boolean> {
  if (isAdminEmail(user.email)) return true;

  const sb = supabaseAdmin();
  const { data } = await sb
    .from('clients')
    .select('user_id')
    .eq('client_id', clientId)
    .maybeSingle();

  return data?.user_id === user.id;
}

async function loadClientAccessRow(clientId: string): Promise<ClientAccessRow | null> {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from('clients')
    .select('user_id, is_active')
    .eq('client_id', clientId)
    .maybeSingle();
  return (data as ClientAccessRow | null) ?? null;
}

/**
 * Enforce plan client quota on data APIs — inactive clients are rejected
 * server-side (not just hidden in the UI). Activation is gated separately.
 */
export async function assertClientWithinPlan(opts: {
  user: User;
  clientId: string;
  row: ClientAccessRow;
}): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const { user, row } = opts;

  // Operators / firm admins manage book-of-business outside SaaS seat limits.
  if (isAdminEmail(user.email)) {
    return { ok: true };
  }

  if (row.is_active === false) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            'This client is not activated on your plan. Activate it (within your client limit) or upgrade to access its data.',
          code: 'client_not_activated',
          upgradePath: '/pricing',
        },
        { status: 402 }
      ),
    };
  }

  return { ok: true };
}

type GuardResult =
  | { ok: true; user: User; clientId: string }
  | { ok: false; response: NextResponse };

/** Ownership only — used when activating an inactive client (quota checked separately). */
export async function guardClientOwnership(
  clientId: string | null | undefined
): Promise<GuardResult> {
  const id = (clientId ?? '').trim();
  if (!id) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'clientId is required' }, { status: 400 }),
    };
  }

  const auth = await requireUser();
  if (!auth.ok) return auth;

  const row = await loadClientAccessRow(id);
  if (!row) {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  if (!isAdminEmail(auth.user.email) && row.user_id !== auth.user.id) {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { ok: true, user: auth.user, clientId: id };
}

/** Require auth + permission + plan activation to use the given clientId. */
export async function guardClientAccess(clientId: string | null | undefined): Promise<GuardResult> {
  const ownership = await guardClientOwnership(clientId);
  if (!ownership.ok) return ownership;

  const row = await loadClientAccessRow(ownership.clientId);
  if (!row) {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  const planGate = await assertClientWithinPlan({
    user: ownership.user,
    clientId: ownership.clientId,
    row,
  });
  if (!planGate.ok) return planGate;

  return ownership;
}
