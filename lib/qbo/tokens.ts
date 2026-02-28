import OAuthClient from 'intuit-oauth';
import { decryptToken, encryptToken, isEncryptedToken } from './crypto';
import { getQboOAuthConfig } from './env';
import { supabaseAdmin } from './supabaseAdmin';

type QuickbooksConnectionRow = {
  id?: string;
  client_id: string;
  realm_id: string;
  access_token: string | null;
  refresh_token: string | null;
  access_expires_at: string | null;
  refresh_expires_at?: string | null;
  scope?: string | null;
  status?: string | null;
  last_refresh_error?: string | null;
};

/** Legacy qbo_tokens row shape (for fallback) */
type QboTokenRow = {
  client_id: string;
  company_id: string;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
};

/** Server-only: use for QuickBooks API calls; never expose to the frontend. */
export type QuickBooksAccessTokenResult = {
  accessToken: string;
  realmId: string;
};

/** @deprecated Use QuickBooksAccessTokenResult; companyId === realmId */
export type QboAccessTokenResult = {
  companyId: string;
  accessToken: string;
};

const EXPIRY_SKEW_SECONDS = 120;

function isExpired(expiresAtIso: string | null, skewSeconds = EXPIRY_SKEW_SECONDS): boolean {
  if (!expiresAtIso) return true;
  const expiresAt = new Date(expiresAtIso).getTime();
  return expiresAt - Date.now() <= skewSeconds * 1000;
}

function oauthClient() {
  return new OAuthClient(getQboOAuthConfig());
}

/**
 * Reusable token refresh: load connection, return valid access token and realmId.
 * If access token is expired or near expiry, refreshes using refresh_token and updates the DB.
 * On refresh failure, sets status = needs_reauth and last_refresh_error, then throws.
 * Server-only; never expose returned accessToken to the frontend.
 */
export async function getValidQuickBooksAccessToken(
  clientId: string
): Promise<QuickBooksAccessTokenResult> {
  const sb = supabaseAdmin();

  const { data: connData, error: connError } = await sb
    .from('quickbooks_connections')
    .select('*')
    .eq('client_id', clientId)
    .eq('status', 'connected')
    .maybeSingle();

  if (!connError && connData) {
    const row = connData as QuickbooksConnectionRow;
    const access = decryptToken(row.access_token);
    const refresh = decryptToken(row.refresh_token);
    if (!access || !refresh) {
      throw new Error('Missing access_token/refresh_token for client');
    }

    if (!isExpired(row.access_expires_at)) {
      return { accessToken: access, realmId: row.realm_id };
    }

    const oc = oauthClient();
    oc.setToken({ access_token: access, refresh_token: refresh, token_type: 'bearer' });

    try {
      const newToken = await oc.refresh();
      const newAccess = newToken.token.access_token as string;
      const rawNewRefresh = newToken.token.refresh_token;
      const newRefresh =
        rawNewRefresh != null && String(rawNewRefresh).trim() !== ''
          ? (rawNewRefresh as string)
          : null;
      if (!newRefresh) {
        console.warn(
          `[QBO] Intuit did not return a new refresh_token for client ${clientId}; connection may fail on next refresh.`
        );
      }
      const expiresIn = Number(newToken.token.expires_in) || 3600;
      const accessExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

      const updatePayload: Record<string, unknown> = {
        access_token: encryptToken(newAccess),
        access_expires_at: accessExpiresAt,
        last_refresh_error: null,
        updated_at: new Date().toISOString(),
      };
      if (newRefresh) {
        updatePayload.refresh_token = encryptToken(newRefresh);
      }

      const { error: updateError } = await sb
        .from('quickbooks_connections')
        .update(updatePayload)
        .eq('client_id', clientId);

      if (updateError) {
        console.error('[QBO] Failed to persist tokens after refresh:', updateError);
        throw updateError;
      }

      return { accessToken: newAccess, realmId: row.realm_id };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Token refresh failed';
      await sb
        .from('quickbooks_connections')
        .update({
          status: 'needs_reauth',
          last_refresh_error: errorMessage,
          updated_at: new Date().toISOString(),
        })
        .eq('client_id', clientId);
      await sb
        .from('client_qbo_connections')
        .update({ status: 'expired' })
        .eq('client_id', clientId);
      throw err;
    }
  }

  const { data: tokenData, error: tokenError } = await sb
    .from('qbo_tokens')
    .select('*')
    .eq('client_id', clientId)
    .maybeSingle();

  if (tokenError) throw tokenError;
  if (!tokenData) {
    throw new Error('No QuickBooks connection for this client. Please connect QuickBooks first.');
  }

  const row = tokenData as QboTokenRow;
  if (!row.company_id) throw new Error('Missing company_id on qbo_tokens record');

  const access = decryptToken(row.access_token);
  const refresh = decryptToken(row.refresh_token);
  if (!access || !refresh) throw new Error('Missing access_token/refresh_token for client');

  if (!isExpired(row.expires_at)) {
    return { accessToken: access, realmId: row.company_id };
  }

  const oc = oauthClient();
  oc.setToken({ access_token: access, refresh_token: refresh, token_type: 'bearer' });
  const newToken = await oc.refresh();
  const newAccess = newToken.token.access_token as string;
  const rawNewRefresh = newToken.token.refresh_token;
  const newRefresh =
    rawNewRefresh != null && String(rawNewRefresh).trim() !== ''
      ? (rawNewRefresh as string)
      : null;
  if (!newRefresh) {
    console.warn(
      `[QBO] Intuit did not return a new refresh_token for client ${clientId} (qbo_tokens); connection may fail on next refresh.`
    );
  }
  const expiresAt = new Date(Date.now() + (newToken.token.expires_in as number) * 1000).toISOString();

  const tokenUpdatePayload: Record<string, unknown> = {
    access_token: encryptToken(newAccess),
    expires_at: expiresAt,
  };
  if (newRefresh) {
    tokenUpdatePayload.refresh_token = encryptToken(newRefresh);
  }

  const { error: tokenUpdateError } = await sb
    .from('qbo_tokens')
    .update(tokenUpdatePayload)
    .eq('client_id', clientId);

  if (tokenUpdateError) {
    console.error('[QBO] Failed to persist qbo_tokens after refresh:', tokenUpdateError);
    throw tokenUpdateError;
  }

  return { accessToken: newAccess, realmId: row.company_id };
}

/** @deprecated Use getValidQuickBooksAccessToken for new code. */
export async function getValidAccessTokenForClient(
  clientId: string
): Promise<QboAccessTokenResult> {
  const { accessToken, realmId } = await getValidQuickBooksAccessToken(clientId);
  return { companyId: realmId, accessToken };
}

export async function ensureEncryptedTokensForClient(clientId: string): Promise<void> {
  const sb = supabaseAdmin();
  const { data: tokenData } = await sb
    .from('qbo_tokens')
    .select('*')
    .eq('client_id', clientId)
    .single();

  if (!tokenData) return;
  const row = tokenData as QboTokenRow;

  const updates: Partial<QboTokenRow> = {};
  if (row.access_token && !isEncryptedToken(row.access_token)) {
    updates.access_token = encryptToken(row.access_token);
  }
  if (row.refresh_token && !isEncryptedToken(row.refresh_token)) {
    updates.refresh_token = encryptToken(row.refresh_token);
  }
  if (Object.keys(updates).length === 0) return;

  await sb.from('qbo_tokens').update(updates).eq('client_id', clientId);
}
