import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/auth/mfa/enroll — begin TOTP enrollment.
 * Clears any leftover unverified factors first to avoid duplicate-name errors,
 * then returns the QR code + secret for the authenticator app.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: existing } = await supabase.auth.mfa.listFactors();
  for (const factor of existing?.totp ?? []) {
    if (factor.status !== 'verified') {
      await supabase.auth.mfa.unenroll({ factorId: factor.id });
    }
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: `Authenticator (${new Date().toISOString().slice(0, 10)})`,
  });

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Enrollment failed' }, { status: 400 });
  }

  return NextResponse.json({
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
    uri: data.totp.uri,
  });
}
