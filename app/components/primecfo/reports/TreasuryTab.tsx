"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Wallet, ArrowRightLeft, Calendar, TrendingUp, Loader2, AlertTriangle } from "lucide-react";
import { useClientContext } from "@/contexts/ClientContext";
import { useReportRange } from "@/contexts/ReportRangeContext";
import { getTreasury } from "@/lib/api/client";
import TreasuryForecastSection from "@/app/components/primecfo/reports/TreasuryForecastSection";

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n);

export default function TreasuryTab() {
  const { selectedClient } = useClientContext();
  const { range } = useReportRange();
  const clientId = selectedClient?.id;

  const { data, isLoading, error } = useQuery({
    queryKey: ["treasury", clientId, range],
    queryFn: () => getTreasury(clientId!, range),
    enabled: !!clientId,
  });

  if (!clientId) {
    return (
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 text-center text-slate-400">
        Select a business to view treasury data.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400">
        <Loader2 className="w-8 h-8 text-teal-400 animate-spin mr-3" />
        Loading treasury data from QuickBooks…
      </div>
    );
  }

  if (error || !data?.hasData) {
    return (
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 text-center">
        <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
        <p className="text-white font-medium mb-2">No treasury data available</p>
        <p className="text-slate-400 text-sm mb-4">
          {data?.error ?? (error instanceof Error ? error.message : "Connect QuickBooks and run Sync.")}
        </p>
        <Link href="/connect" className="text-teal-400 hover:text-teal-300 text-sm font-medium">
          Connect QuickBooks →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {data.dataError && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Some metrics may be inaccurate. Re-sync from Dashboard after reviewing your QBO reports.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-400">Total Cash</p>
            <Wallet className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-xl font-bold text-white">{formatCurrency(data.totalCash ?? 0)}</p>
          <p className="text-xs text-slate-500 mt-1">QBO bank accounts</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-400">Net Cash Flow</p>
            <ArrowRightLeft className="w-5 h-5 text-violet-500" />
          </div>
          <p className={`text-xl font-bold ${(data.netCashFlow ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {data.netCashFlow != null ? formatCurrency(data.netCashFlow) : "—"}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {data.periodLabel ?? "Selected period"} · from Cash Flow Statement
          </p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-400">Days Cash On Hand</p>
            <Calendar className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-xl font-bold text-white">
            {data.daysCashOnHand != null ? Math.round(data.daysCashOnHand) : "—"}
          </p>
          <p className="text-xs text-slate-500 mt-1">Based on burn rate</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-400">Cash Runway</p>
            <TrendingUp className="w-5 h-5 text-teal-500" />
          </div>
          <p className="text-xl font-bold text-white">
            {data.cashFlowPositive
              ? "Cash-flow positive"
              : data.runwayMonths != null
                ? `${data.runwayMonths} mo`
                : "No runway constraint"}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {data.cashFlowPositive
              ? "No runway constraint at current net cash flow"
              : `Net burn ${formatCurrency(data.monthlyBurn ?? 0)}/mo`}
          </p>
        </div>
      </div>

      <TreasuryForecastSection clientId={clientId} />

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Bank Accounts</h3>
          <Link href="/connect" className="text-sm text-teal-400 hover:text-teal-300 font-medium">
            QuickBooks Connection →
          </Link>
        </div>
        {(data.bankAccounts ?? []).length === 0 ? (
          <p className="text-slate-400 text-sm">No bank accounts found in QuickBooks.</p>
        ) : (
          <div className="space-y-4">
            {data.bankAccounts!.map((acc) => (
              <div
                key={acc.name}
                className="flex items-center justify-between p-4 bg-slate-700/30 rounded-xl border border-slate-600/50"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white">{acc.name}</p>
                    <p className="text-sm text-slate-400">{acc.subType || "Bank"}</p>
                  </div>
                </div>
                <p className="text-lg font-semibold text-white">{formatCurrency(acc.balance)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
