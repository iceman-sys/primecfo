import { quickBooksRequest } from '@/lib/qbo/api';
import { normalizeAccountingBasis, type AccountingBasis } from '@/lib/qbo/accountingBasis';
import { supabaseAdmin } from '@/lib/qbo/supabaseAdmin';

/**
 * Read Preferences.ReportPrefs.ReportBasis from QuickBooks.
 * QBO does not store the company "on" a basis — this is the report default only.
 */
export async function fetchQboReportBasis(clientId: string): Promise<AccountingBasis | null> {
  try {
    const raw = await quickBooksRequest<Record<string, unknown>>(clientId, {
      path: '/v3/company/{realmId}/preferences',
      method: 'GET',
    });

    const prefs = (raw.Preferences ?? raw) as Record<string, unknown>;
    const reportPrefs = (prefs.ReportPrefs ?? prefs.reportPrefs) as Record<string, unknown> | undefined;
    const basis =
      reportPrefs?.ReportBasis ??
      reportPrefs?.reportBasis ??
      (prefs as { ReportBasis?: unknown }).ReportBasis;

    return normalizeAccountingBasis(basis);
  } catch (err) {
    console.warn(
      '[qbo] Preferences ReportBasis fetch failed:',
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

export type ClientBasisSettings = {
  qboReportBasis: AccountingBasis | null;
  reportingBasisOverride: AccountingBasis | null;
  displayBasis: AccountingBasis;
  hasInvoicingActivity: boolean | null;
};

/** Load stored basis settings for a client (display = override ?? QBO default ?? Cash). */
export async function loadClientBasisSettings(clientId: string): Promise<ClientBasisSettings> {
  const { resolveDisplayBasis } = await import('@/lib/qbo/accountingBasis');
  try {
    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from('clients')
      .select('qbo_report_basis, reporting_basis_override, has_invoicing_activity')
      .eq('client_id', clientId)
      .maybeSingle();

    if (error) {
      console.warn('[basis] loadClientBasisSettings:', error.message);
      return {
        qboReportBasis: null,
        reportingBasisOverride: null,
        displayBasis: resolveDisplayBasis({}),
        hasInvoicingActivity: null,
      };
    }

    const qboReportBasis = normalizeAccountingBasis(data?.qbo_report_basis) ?? null;
    const reportingBasisOverride = normalizeAccountingBasis(data?.reporting_basis_override) ?? null;
    const hasInvoicingActivity =
      typeof data?.has_invoicing_activity === 'boolean' ? data.has_invoicing_activity : null;

    return {
      qboReportBasis,
      reportingBasisOverride,
      displayBasis: resolveDisplayBasis({ qboReportBasis, override: reportingBasisOverride }),
      hasInvoicingActivity,
    };
  } catch (err) {
    console.warn('[basis] loadClientBasisSettings failed', err);
    return {
      qboReportBasis: null,
      reportingBasisOverride: null,
      displayBasis: resolveDisplayBasis({}),
      hasInvoicingActivity: null,
    };
  }
}

/** Persist QBO-detected default (does not overwrite user override). */
export async function saveQboReportBasis(
  clientId: string,
  basis: AccountingBasis
): Promise<void> {
  const sb = supabaseAdmin();
  await sb
    .from('clients')
    .update({ qbo_report_basis: basis })
    .eq('client_id', clientId);
}

export async function saveReportingBasisOverride(
  clientId: string,
  override: AccountingBasis | null
): Promise<void> {
  const sb = supabaseAdmin();
  await sb
    .from('clients')
    .update({
      reporting_basis_override: override,
    })
    .eq('client_id', clientId);
}

export async function saveInvoicingActivityFlag(
  clientId: string,
  hasActivity: boolean
): Promise<void> {
  const sb = supabaseAdmin();
  await sb
    .from('clients')
    .update({
      has_invoicing_activity: hasActivity,
    })
    .eq('client_id', clientId);
}
