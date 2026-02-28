import { NextRequest, NextResponse } from 'next/server';
import OAuthClient from 'intuit-oauth';
import { getQboOAuthConfig } from '@/lib/qbo/env';
import { supabaseAdmin } from '@/lib/qbo/supabaseAdmin';

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * GET /api/quickbooks/auth
 *
 * Production-ready OAuth Connect Flow: starts Intuit OAuth when the user clicks
 * "Connect QuickBooks". Stores state in qbo_oauth_state for callback verification,
 * then redirects to Intuit's authorize URL.
 *
 * Query:
 *   - clientId (required): PrimeCFO client UUID to associate with this QBO connection
 *   - returnTo (optional): "add" | "dashboard" | "connect" — where to redirect after callback
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const clientId = searchParams.get('clientId')?.trim();
  const returnTo = searchParams.get('returnTo') || 'add';

  if (!clientId) {
    return NextResponse.json({ error: 'Client ID required' }, { status: 400 });
  }

  const stateData = JSON.stringify({ clientId, returnTo });

  const sb = supabaseAdmin();
  await sb.from('qbo_oauth_state').delete().eq('client_id', clientId);

  const { error: insertError } = await sb.from('qbo_oauth_state').insert({
    state: stateData,
    client_id: clientId,
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
    state: stateData,
  });

  return NextResponse.redirect(authUri);
}
