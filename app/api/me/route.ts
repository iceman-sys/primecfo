import { NextResponse } from 'next/server';
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/auth/admin';

/**
 * GET /api/me
 * Returns the authenticated user's email and whether they are an operator (admin allowlist).
 */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const isAdmin = isAdminEmail(user.email);

  return NextResponse.json({
    id: user.id,
    email: user.email ?? null,
    isAdmin,
    /** @deprecated Use isAdmin — same ADMIN_EMAILS allowlist. */
    isOperator: isAdmin,
  });
}
