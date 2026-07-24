/**
 * Accounting basis is a parameter of each report pull — not a fixed property
 * of the client. Display basis = Settings override ?? QBO ReportPrefs default.
 */

export type AccountingBasis = 'Cash' | 'Accrual';

export function isAccountingBasis(v: unknown): v is AccountingBasis {
  return v === 'Cash' || v === 'Accrual';
}

export function normalizeAccountingBasis(raw: unknown): AccountingBasis | null {
  if (typeof raw !== 'string') return null;
  const t = raw.trim().toLowerCase();
  if (t === 'cash') return 'Cash';
  if (t === 'accrual') return 'Accrual';
  return null;
}

/** Effective display basis for P&L / BS presentation. */
export function resolveDisplayBasis(opts: {
  qboReportBasis?: AccountingBasis | null;
  override?: AccountingBasis | null;
  /** Fallback when neither is set (legacy Cash-synced clients). */
  fallback?: AccountingBasis;
}): AccountingBasis {
  if (isAccountingBasis(opts.override)) return opts.override;
  if (isAccountingBasis(opts.qboReportBasis)) return opts.qboReportBasis;
  return opts.fallback ?? 'Cash';
}

export function basisLabel(basis: AccountingBasis): string {
  return `Basis: ${basis}`;
}
