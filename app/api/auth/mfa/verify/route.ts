import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/auth/mfa/verify — verify a 6-digit TOTP code.
 * Used both to finish enrollment and to satisfy the MFA challenge at login.
 * On success the session is upgraded to AAL2 and cookies are refreshed.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    factorId?: string;
    code?: string;
  };
  const factorId = body.factorId?.trim();
  const code = body.code?.trim();

  if (!factorId || !code) {
    return NextResponse.json({ error: 'Factor and code are required' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
  if (challengeError || !challenge) {
    return NextResponse.json(
      { error: challengeError?.message ?? 'Could not start verification' },
      { status: 400 }
    );
  }

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });

  if (verifyError) {
    return NextResponse.json({ error: 'That code was incorrect or expired. Try again.' }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
