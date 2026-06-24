import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/** POST /api/auth/mfa/unenroll — remove a TOTP factor. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { factorId?: string };
  const factorId = body.factorId?.trim();

  if (!factorId) {
    return NextResponse.json({ error: 'Factor is required' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
