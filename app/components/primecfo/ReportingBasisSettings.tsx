'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import type { AccountingBasis } from '@/lib/qbo/accountingBasis';

type BasisResponse = {
  qboReportBasis: AccountingBasis | null;
  override: AccountingBasis | null;
  displayBasis: AccountingBasis;
  hasInvoicingActivity: boolean | null;
  notice?: string;
};

export default function ReportingBasisSettings({ clientId }: { clientId: string | null }) {
  const [data, setData] = useState<BasisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!clientId) {
      setData(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/clients/reporting-basis?clientId=${encodeURIComponent(clientId)}`,
          { cache: 'no-store' }
        );
        const json = (await res.json()) as BasisResponse;
        if (!cancelled && res.ok) setData(json);
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const save = async (override: AccountingBasis | 'default') => {
    if (!clientId || saving) return;
    setSaving(true);
    try {
      const res = await fetch('/api/clients/reporting-basis', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          override: override === 'default' ? null : override,
        }),
      });
      const json = (await res.json()) as BasisResponse & { error?: string };
      if (!res.ok) {
        toast.error(json.error ?? 'Could not update reporting basis');
        return;
      }
      setData(json);
      toast.success(json.notice ?? 'Reporting basis updated');
    } catch {
      toast.error('Could not update reporting basis');
    } finally {
      setSaving(false);
    }
  };

  if (!clientId) {
    return (
      <p className="text-sm text-slate-500">Select a client to set reporting basis.</p>
    );
  }

  if (loading && !data) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading basis…
      </div>
    );
  }

  const selected: AccountingBasis | 'default' = data?.override ?? 'default';

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-400">
        QuickBooks default:{' '}
        <span className="text-slate-200">{data?.qboReportBasis ?? 'Not detected yet (run Sync)'}</span>
        {data?.hasInvoicingActivity != null && (
          <>
            {' '}
            · Invoicing activity:{' '}
            <span className="text-slate-200">{data.hasInvoicingActivity ? 'Yes' : 'No'}</span>
          </>
        )}
      </p>
      <p className="text-sm text-slate-400">
        Display basis:{' '}
        <span className="font-medium text-teal-300">{data?.displayBasis ?? '—'}</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: 'default' as const, label: 'Use QuickBooks default' },
            { id: 'Cash' as const, label: 'Cash' },
            { id: 'Accrual' as const, label: 'Accrual' },
          ] as const
        ).map((opt) => (
          <button
            key={opt.id}
            type="button"
            disabled={saving}
            onClick={() => void save(opt.id)}
            className={`rounded-lg px-3 py-1.5 text-sm border transition ${
              selected === opt.id
                ? 'border-teal-500/50 bg-teal-500/15 text-teal-200'
                : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-600'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-500">
        After changing basis, run Sync so P&amp;L and balance sheet refresh on the selected method.
        A/R and A/P aging stay available whenever the company has invoices or bills.
      </p>
    </div>
  );
}
