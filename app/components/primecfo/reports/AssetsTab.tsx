"use client";

import { useQuery } from "@tanstack/react-query";
import { Building2, TrendingDown, Activity, Loader2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useClientContext } from "@/contexts/ClientContext";
import { getAssets } from "@/lib/api/client";

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n);

export default function AssetsTab() {
  const { selectedClient } = useClientContext();
  const clientId = selectedClient?.id;

  const { data, isLoading, error } = useQuery({
    queryKey: ["assets", clientId],
    queryFn: () => getAssets(clientId!),
    enabled: !!clientId,
  });

  const assets = data?.assets ?? [];
  const totalCurrent = assets.reduce((s, a) => s + a.currentValue, 0);
  const activeCount = assets.filter((a) => a.status === "active").length;

  if (!clientId) {
    return (
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 text-center text-slate-400">
        Select a business to view assets.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400">
        <Loader2 className="w-8 h-8 text-teal-400 animate-spin mr-3" />
        Loading fixed assets from QuickBooks…
      </div>
    );
  }

  if (error || !data?.hasData) {
    return (
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 text-center">
        <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
        <p className="text-white font-medium mb-2">No assets found</p>
        <p className="text-slate-400 text-sm mb-4">
          {data?.error ?? (error instanceof Error ? error.message : "No fixed asset accounts in QuickBooks.")}
        </p>
        <p className="text-slate-500 text-xs">
          Add fixed asset accounts in QuickBooks, then run Sync.
        </p>
      </div>
    );
  }

  const byCategory: Record<string, number> = {};
  for (const a of assets) {
    byCategory[a.category] = (byCategory[a.category] ?? 0) + a.currentValue;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-400">Total Book Value</p>
            <Building2 className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-xl font-bold text-white">{formatCurrency(totalCurrent)}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-400">Active Assets</p>
            <Activity className="w-5 h-5 text-violet-500" />
          </div>
          <p className="text-xl font-bold text-white">{activeCount}</p>
          <p className="text-xs text-slate-500 mt-1">of {assets.length} accounts</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-400">Categories</p>
            <TrendingDown className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-xl font-bold text-white">{Object.keys(byCategory).length}</p>
        </div>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Asset Register (QuickBooks)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-700">
                <th className="pb-3 font-medium">Asset</th>
                <th className="pb-3 font-medium">Category</th>
                <th className="pb-3 font-medium text-right">Book Value</th>
                <th className="pb-3 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((a) => (
                <tr key={a.id} className="border-b border-slate-700/50">
                  <td className="py-3 text-white">{a.name}</td>
                  <td className="py-3 text-slate-400">{a.category}</td>
                  <td className="py-3 text-right text-white font-medium">{formatCurrency(a.currentValue)}</td>
                  <td className="py-3 text-right">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        a.status === "active"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-slate-600/50 text-slate-400"
                      }`}
                    >
                      {a.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500 mt-4">
          Pulled from QBO Chart of Accounts (Fixed Asset).{" "}
          <Link href="/connect" className="text-teal-400 hover:text-teal-300">
            Manage connection
          </Link>
        </p>
      </div>
    </div>
  );
}
