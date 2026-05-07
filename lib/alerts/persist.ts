import { supabaseAdmin } from '@/lib/qbo/supabaseAdmin';
import type { EvaluatedAlert } from './evaluate';

/** Upsert active alerts and mark resolved rows that no longer fire. */
export async function persistFinancialAlerts(
  clientId: string,
  fired: EvaluatedAlert[]
): Promise<void> {
  const sb = supabaseAdmin();
  const now = new Date().toISOString();
  const kinds = fired.map((a) => a.alert_kind);

  for (const a of fired) {
    await sb.from('financial_alert_events').upsert(
      {
        client_id: clientId,
        alert_kind: a.alert_kind,
        state: 'active',
        severity_key: a.severity_key,
        title: a.title,
        body: a.body,
        updated_at: now,
      },
      { onConflict: 'client_id,alert_kind' }
    );
  }

  const { data: existing } = await sb
    .from('financial_alert_events')
    .select('alert_kind')
    .eq('client_id', clientId)
    .eq('state', 'active');

  for (const row of existing ?? []) {
    const kind = row.alert_kind as EvaluatedAlert['alert_kind'];
    if (!kinds.includes(kind)) {
      await sb
        .from('financial_alert_events')
        .update({ state: 'resolved', updated_at: now })
        .eq('client_id', clientId)
        .eq('alert_kind', kind);
    }
  }
}
