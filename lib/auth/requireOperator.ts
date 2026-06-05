import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/auth/admin';

type AuthResult =
  | { ok: true; user: User }
  | { ok: false; response: NextResponse };

/** Require a signed-in user on the operator (ADMIN_EMAILS) allowlist. */
export async function requireOperator(): Promise<AuthResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { ok: false, response: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) };
  }

  if (!isAdminEmail(user.email)) {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { ok: true, user };
}
