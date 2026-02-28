import { NextRequest, NextResponse } from 'next/server';
import OAuthClient from 'intuit-oauth';
import { encryptToken } from '@/lib/qbo/crypto';
import { getPublicBaseUrl, getQboOAuthConfig } from '@/lib/qbo/env';
import { supabaseAdmin } from '@/lib/qbo/supabaseAdmin';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const realmId = searchParams.get('realmId'); // QBO Company ID

  const baseUrl = getPublicBaseUrl();
  const errorRedirectBase = `${baseUrl}/clients`;

  // Step 1: Require code, realmId, and state — redirect with specific error if any missing
  if (!code || !code.trim()) {
    return NextResponse.redirect(`${errorRedirectBase}?error=missing_code`);
  }
  if (!realmId || !realmId.trim()) {
    return NextResponse.redirect(`${errorRedirectBase}?error=missing_realm_id`);
  }
  if (!state || !state.trim()) {
    return NextResponse.redirect(`${errorRedirectBase}?error=missing_state`);
  }

  console.log('=== QuickBooks OAuth Callback Received ===');

  // Step 2: Verify state matches stored state (one-time use, TTL 10 min)
  const sb = supabaseAdmin();
  const { data: storedRow, error: stateLookupError } = await sb
    .from('qbo_oauth_state')
    .select('id, client_id, return_to, created_at')
    .eq('state', state)
    .maybeSingle();

  if (stateLookupError) {
    console.error('❌ qbo_oauth_state lookup error:', stateLookupError);
    return NextResponse.redirect(`${errorRedirectBase}?error=invalid_state`);
  }
  if (!storedRow) {
    console.error('❌ No stored state found (replay or expired)');
    return NextResponse.redirect(`${errorRedirectBase}?error=invalid_state`);
  }

  const stateCreatedAt = new Date(storedRow.created_at).getTime();
  const STATE_TTL_MS = 10 * 60 * 1000;
  if (Date.now() - stateCreatedAt > STATE_TTL_MS) {
    await sb.from('qbo_oauth_state').delete().eq('id', storedRow.id);
    return NextResponse.redirect(`${errorRedirectBase}?error=invalid_state`);
  }

  const clientId = storedRow.client_id ?? '';
  const returnTo = storedRow.return_to || 'add';
  if (!clientId) {
    await sb.from('qbo_oauth_state').delete().eq('id', storedRow.id);
    return NextResponse.redirect(`${errorRedirectBase}?error=missing_client_id`);
  }

  // One-time use: delete state so it cannot be reused
  await sb.from('qbo_oauth_state').delete().eq('id', storedRow.id);

  try {
    console.log('Creating OAuth token...');
    const oauthClient = new OAuthClient(getQboOAuthConfig());
    const authResponse = await oauthClient.createToken(request.url);
    console.log('✅ Token created successfully');

    // Step 3: Extract token response fields (from Intuit token endpoint)
    const token = authResponse.token;
    const rawJson = (authResponse as { json?: Record<string, unknown> }).json;
    const access_token = (token.access_token as string) ?? '';
    const refresh_token = (token.refresh_token as string) ?? '';
    const expires_in = Number(token.expires_in) || 0;
    const x_refresh_token_expires_in = Number(token.x_refresh_token_expires_in) || 0;
    const scope =
      (typeof rawJson?.scope === 'string' ? rawJson.scope : null) ??
      'com.intuit.quickbooks.accounting';

    const accessExpiresAt = new Date(Date.now() + expires_in * 1000).toISOString();
    const refreshExpiresAt = new Date(
      Date.now() + x_refresh_token_expires_in * 1000
    ).toISOString();

    // Step 4: Store in quickbooks_connections — tokens encrypted before storage; never sent to frontend
    const connPayload = {
      client_id: clientId,
      realm_id: realmId.trim(),
      access_token: encryptToken(access_token),
      refresh_token: encryptToken(refresh_token),
      access_expires_at: accessExpiresAt,
      refresh_expires_at: refreshExpiresAt,
      scope,
      status: 'connected',
      last_refresh_error: null,
      updated_at: new Date().toISOString(),
    };

    const { error: connError } = await sb
      .from('quickbooks_connections')
      .upsert(connPayload, { onConflict: 'client_id' });

    if (connError) {
      console.error('❌ Error saving quickbooks_connections:', connError);
      throw connError;
    }
    console.log('✅ quickbooks_connections saved');

    // Keep client_qbo_connections in sync for dashboard/API (connection status)
    console.log('Updating client_qbo_connections...');
    const { data: existingConn } = await sb
      .from('client_qbo_connections')
      .select('id')
      .eq('client_id', clientId)
      .eq('company_id', realmId)
      .maybeSingle();

    const qboConnPayload = {
      client_id: clientId,
      company_id: realmId,
      realm_id: realmId,
      status: 'connected',
      connected_at: new Date().toISOString(),
    };

    const connWrite = existingConn?.id
      ? sb.from('client_qbo_connections').update(qboConnPayload).eq('id', existingConn.id).select()
      : sb.from('client_qbo_connections').insert(qboConnPayload).select();

    const { data: connectionData, error: connectionError } = await connWrite;

    if (connectionError) {
      console.error('❌ Error updating connection:', connectionError);
      throw connectionError;
    }
    console.log('✅ Connection status updated:', connectionData);

    // Redirect based on where the connection was initiated
    let redirectUrl: string;
    if (returnTo === 'add') {
      redirectUrl = `${baseUrl}/admin/clients?connected=true`;
    } else if (returnTo === 'dashboard' || returnTo === 'connect') {
      redirectUrl = returnTo === 'connect'
        ? `${baseUrl}/connect?connected=true`
        : `${baseUrl}/dashboard?connected=true`;
    } else {
      redirectUrl = `${baseUrl}/clients?connected=true`;
    }

    console.log('✅ Redirecting to:', redirectUrl);
    console.log('=== OAuth Callback Complete ===');
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('❌ OAuth callback error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    let redirectUrl: string;
    if (returnTo === 'add') {
      redirectUrl = `${baseUrl}/admin/clients?error=connection_failed`;
    } else if (returnTo === 'dashboard' || returnTo === 'connect') {
      redirectUrl = returnTo === 'connect'
        ? `${baseUrl}/connect?error=connection_failed`
        : `${baseUrl}/dashboard?error=connection_failed`;
    } else {
      redirectUrl = `${baseUrl}/clients?error=connection_failed`;
    }

    console.log('Redirecting to error page:', redirectUrl);
    return NextResponse.redirect(redirectUrl);
  }
}