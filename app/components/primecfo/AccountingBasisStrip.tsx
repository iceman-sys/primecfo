'use client';

import { useEffect, useState } from 'react';
import { basisLabel, type AccountingBasis } from '@/lib/qbo/accountingBasis';

/**
 * Provenance strip — shows reporting basis on every authenticated page.
 */
export default function AccountingBasisStrip({
  clientId,
  className = '',
}: {
  clientId?: string | null;
  className?: string;
}) {
  const [basis, setBasis] = useState<AccountingBasis | null>(null);

  useEffect(() => {
    if (!clientId) {
      setBasis(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/clients/reporting-basis?clientId=${encodeURIComponent(clientId)}`,
          { cache: 'no-store' }
        );
        if (!res.ok) return;
        const data = (await res.json()) as { displayBasis?: AccountingBasis };
        if (!cancelled && data.displayBasis) setBasis(data.displayBasis);
      } catch {
        /* non-blocking */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  if (!basis) return null;

  return (
    <p
      className={`text-[11px] sm:text-xs text-slate-500 leading-snug ${className}`}
      role="note"
    >
      <span className="font-medium text-slate-400">{basisLabel(basis)}</span>
      <span className="text-slate-600"> · reports match this QuickBooks reporting basis</span>
    </p>
  );
}
