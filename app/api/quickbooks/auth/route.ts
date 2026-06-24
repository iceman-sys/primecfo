import { NextRequest, NextResponse } from 'next/server';
import OAuthClient from 'intuit-oauth';
import { guardClientAccess } from '@/lib/auth/clientAccess';
import { getQboOAuthConfig } from '@/lib/qbo/env';
import { generateOAuthStateNonce } from '@/lib/qbo/oauthState';
import { supabaseAdmin } from '@/lib/qbo/supabaseAdmin';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/quickbooks/auth
 *
 * Starts Intuit OAuth. Stores an opaque random state in qbo_oauth_state for callback verification.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const clientId = searchParams.get('clientId')?.trim();
  const returnTo = searchParams.get('returnTo') || 'add';

  const access = await guardClientAccess(clientId);
  if (!access.ok) return access.response;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const stateNonce = generateOAuthStateNonce();

  const sb = supabaseAdmin();
  await sb.from('qbo_oauth_state').delete().eq('client_id', access.clientId);

  const { error: insertError } = await sb.from('qbo_oauth_state').insert({
    state: stateNonce,
    client_id: access.clientId,
    return_to: returnTo,
  });

  if (insertError) {
    console.error('qbo_oauth_state insert failed:', insertError);
    return NextResponse.json(
      { error: 'Failed to store OAuth state; ensure table qbo_oauth_state exists.' },
      { status: 500 }
    );
  }

  const config = getQboOAuthConfig();
  const oauthClient = new OAuthClient(config);
  const authUri = oauthClient.authorizeUri({
    scope: [OAuthClient.scopes.Accounting],
    state: stateNonce,
  });

  return NextResponse.redirect(authUri);
}
