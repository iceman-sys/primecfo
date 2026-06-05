import { supabaseAdmin } from '@/lib/qbo/supabaseAdmin';

const CLIENT_SELECT = `
  *,
  client_qbo_connections (
    company_id,
    customer_id,
    sync_enabled,
    status,
    connected_at
  )
`;

export async function fetchClientsWithLastSync(clientIds?: string[]) {
  const sb = supabaseAdmin();

  let query = sb
    .from('clients')
    .select(CLIENT_SELECT)
    .eq('is_active', true)
    .order('client_name', { ascending: true })
    .order('connected_at', { ascending: false, foreignTable: 'client_qbo_connections' });

  if (clientIds?.length) {
    query = query.in('client_id', clientIds);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message || 'Failed to fetch clients');
  }

  const clients = data ?? [];
  const ids = clients.map((c: { client_id: string }) => c.client_id);
  const lastSyncByClient = new Map<string, string>();

  if (ids.length > 0) {
    const { data: reportRows } = await sb
      .from('financial_reports')
      .select('client_id, synced_at')
      .in('client_id', ids);
    for (const r of reportRows ?? []) {
      const cur = lastSyncByClient.get(r.client_id);
      if (!cur || (r.synced_at && r.synced_at > cur)) {
        lastSyncByClient.set(r.client_id, r.synced_at ?? '');
      }
    }
  }

  return clients.map((c: { client_id: string }) => ({
    ...c,
    last_sync: lastSyncByClient.get(c.client_id) ?? null,
  }));
}
