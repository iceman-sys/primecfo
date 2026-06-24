import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { assertPasswordAllowed } from '@/lib/auth/passwordPolicy';

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
  };

  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? '';

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }

  const passwordCheck = await assertPasswordAllowed(password);
  if (!passwordCheck.ok) {
    return NextResponse.json({ error: passwordCheck.message }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  // If the user has a verified TOTP factor, the password sign-in only reaches AAL1.
  // Surface the factor so the client can prompt for a 6-digit code to reach AAL2.
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel === 'aal1' && aal?.nextLevel === 'aal2') {
    const { data: factorsData } = await supabase.auth.mfa.listFactors();
    const verified = (factorsData?.totp ?? []).find((f) => f.status === 'verified');
    if (verified) {
      return NextResponse.json({ ok: true, mfaRequired: true, factorId: verified.id });
    }
  }

  return NextResponse.json({ ok: true });
}
