import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server';

type AuthResult =
  | { ok: true; user: User }
  | { ok: false; response: NextResponse };

/** Require any signed-in Supabase user. */
export async function requireUser(): Promise<AuthResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { ok: false, response: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) };
  }

  return { ok: true, user };
}
