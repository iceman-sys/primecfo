import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/** GET /api/auth/mfa/factors — list TOTP factors + current assurance level. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: factorsData, error } = await supabase.auth.mfa.listFactors();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  const totp = (factorsData?.totp ?? []).map((f) => ({
    id: f.id,
    friendlyName: f.friendly_name ?? null,
    status: f.status,
  }));

  return NextResponse.json({
    factors: totp,
    hasVerifiedFactor: totp.some((f) => f.status === 'verified'),
    currentLevel: aal?.currentLevel ?? null,
    nextLevel: aal?.nextLevel ?? null,
  });
}
