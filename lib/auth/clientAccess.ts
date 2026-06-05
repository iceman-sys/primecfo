import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { isAdminEmail } from '@/lib/auth/admin';
import { requireUser } from '@/lib/auth/requireUser';
import { supabaseAdmin } from '@/lib/qbo/supabaseAdmin';

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

type GuardResult =
  | { ok: true; user: User; clientId: string }
  | { ok: false; response: NextResponse };

/** Require auth + permission to use the given clientId in an API route. */
export async function guardClientAccess(clientId: string | null | undefined): Promise<GuardResult> {
  const id = (clientId ?? '').trim();
  if (!id) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'clientId is required' }, { status: 400 }),
    };
  }

  const auth = await requireUser();
  if (!auth.ok) return auth;

  const allowed = await userCanAccessClient(auth.user, id);
  if (!allowed) {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { ok: true, user: auth.user, clientId: id };
}
