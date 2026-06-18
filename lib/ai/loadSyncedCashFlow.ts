import { supabaseAdmin } from '@/lib/qbo/supabaseAdmin';

/** Load the most recent multi-column Cash Flow report synced for a client. */
export async function loadSyncedMonthlyCashFlow(
  clientId: string,
  monthsBack = 18
): Promise<unknown | null> {
  const sb = supabaseAdmin();
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - monthsBack);

  const { data } = await sb
    .from('financial_reports')
    .select('raw_json, period_label')
    .eq('client_id', clientId)
    .eq('report_type', 'cash_flow')
    .gte('synced_at', cutoff.toISOString())
    .order('synced_at', { ascending: false })
    .limit(5);

  if (!data?.length) return null;

  const multiCol = data.find((r) => {
    const json = r.raw_json as { Columns?: { Column?: unknown[] } };
    return (json.Columns?.Column?.length ?? 0) > 2;
  });

  return multiCol?.raw_json ?? data[0]?.raw_json ?? null;
}
