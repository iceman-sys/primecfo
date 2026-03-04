import { supabaseAdmin } from './supabaseAdmin';

export type QboConnectionState = 'connected' | 'needs_reauth' | 'disconnected';

/**
 * Update connection status in both quickbooks_connections and client_qbo_connections atomically.
 * Keeps the two tables in sync so the UI always reflects the real state.
 */
export async function syncConnectionStatus(
  clientId: string,
  state: QboConnectionState,
  errorMessage?: string
): Promise<void> {
  const sb = supabaseAdmin();
  const now = new Date().toISOString();

  const qbcStatus = state === 'connected' ? 'connected' : 'needs_reauth';
  const clientStatus =
    state === 'connected' ? 'connected' : state === 'needs_reauth' ? 'expired' : 'disconnected';

  await Promise.all([
    sb
      .from('quickbooks_connections')
      .update({
        status: qbcStatus,
        last_refresh_error: errorMessage ?? null,
        updated_at: now,
      })
      .eq('client_id', clientId),
    sb
      .from('client_qbo_connections')
      .update({ status: clientStatus })
      .eq('client_id', clientId),
  ]);
}
