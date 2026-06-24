import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { assertPasswordAllowed } from '@/lib/auth/passwordPolicy';
import { ensureUserClient } from '@/lib/clients/provision';

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
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (data.user) {
    try {
      await ensureUserClient(data.user);
    } catch (e) {
      console.error('Client provision on signup failed:', e);
    }
  }

  return NextResponse.json({
    ok: true,
    needsEmailConfirmation: !data.session,
  });
}
