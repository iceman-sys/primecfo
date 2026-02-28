"use client";

import { Building2, TrendingDown, Activity, Plus } from "lucide-react";

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n);

const mockAssets = [
  { name: "Dell PowerEdge R740 Server", category: "fixed", purchaseDate: "2023-01-15", currentValue: 18750, originalCost: 25000, status: "active" as const },
  { name: "Office Building - 123 Main St", category: "fixed", purchaseDate: "2020-06-01", currentValue: 1850000, originalCost: 2100000, status: "active" as const },
];

const categoryLabels: Record<string, string> = {
  fixed: "Fixed Assets",
  intangible: "Intangible",
  investment: "Investments",
  inventory: "Inventory",
  lease: "Leases",
};

const categoryIcons: Record<string, string> = {
  fixed: "🏢",
  intangible: "📜",
  investment: "📈",
  inventory: "📦",
  lease: "🔑",
};

export default function AssetsTab() {
  const totalCurrent = mockAssets.reduce((s, a) => s + a.currentValue, 0);
  const totalOriginal = mockAssets.reduce((s, a) => s + (a.originalCost ?? a.currentValue), 0) || 2100000;
  const totalDepreciation = totalOriginal - totalCurrent;
  const activeCount = mockAssets.filter((a) => a.status === "active").length;
  const byCategory: Record<string, number> = { fixed: totalCurrent, intangible: 0, investment: 0, inventory: 0, lease: 0 };
  const straightLineCount = mockAssets.filter((_a) => true).length;
  const decliningCount = 0;
  const noneCount = 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-400">Total Current Value</p>
            <Building2 className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-xl font-bold text-white">{formatCurrency(totalCurrent)}</p>
          <p className="text-xs text-slate-500 mt-1">Current value</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-400">Original Cost</p>
          </div>
          <p className="text-xl font-bold text-white">{formatCurrency(totalOriginal)}</p>
          <p className="text-xs text-slate-500 mt-1">Purchase price</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-400">Depreciation</p>
            <TrendingDown className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-xl font-bold text-red-400">{formatCurrency(totalDepreciation)}</p>
          <p className="text-xs text-slate-500 mt-1">Accumulated</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-400">Active Assets</p>
            <Activity className="w-5 h-5 text-violet-500" />
          </div>
          <p className="text-xl font-bold text-white">{activeCount}</p>
          <p className="text-xs text-slate-500 mt-1">of {mockAssets.length} total</p>
        </div>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Asset Categories</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(categoryLabels).map(([key, label]) => (
            <div key={key} className="text-center p-3 bg-slate-700/30 rounded-xl">
              <span className="text-2xl mb-2 block">{categoryIcons[key] ?? "📁"}</span>
              <p className="text-xs font-medium text-slate-400">{label}</p>
              <p className="text-lg font-bold text-white mt-1">{formatCurrency(byCategory[key] ?? 0)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700/50 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white">Asset Register</h3>
          <button type="button" className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-500">
            <Plus className="w-4 h-4" />
            Add Asset
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50 bg-slate-800/30">
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Asset</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Purchase Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Original Cost</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Current Value</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {mockAssets.map((a, idx) => (
                <tr key={idx} className="hover:bg-slate-700/20">
                  <td className="px-6 py-4 text-sm font-medium text-white">{a.name}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 text-xs rounded bg-blue-500/20 text-blue-400">{categoryLabels[a.category] ?? a.category}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400">{a.purchaseDate}</td>
                  <td className="px-6 py-4 text-sm text-slate-400">{formatCurrency(a.originalCost ?? a.currentValue)}</td>
                  <td className="px-6 py-4 text-sm text-white">{formatCurrency(a.currentValue)}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 text-xs rounded-full bg-emerald-500/20 text-emerald-400 capitalize">{a.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Depreciation Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm font-medium text-slate-400 mb-2">By Method</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Straight-line</span>
                <span className="font-medium text-white">{straightLineCount} assets</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Declining balance</span>
                <span className="font-medium text-white">{decliningCount} assets</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">No depreciation</span>
                <span className="font-medium text-white">{noneCount} assets</span>
              </div>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-400 mb-2">Annual Depreciation</p>
            <p className="text-2xl font-bold text-white">{formatCurrency(totalDepreciation / 3)}</p>
            <p className="text-xs text-slate-500">Estimated yearly</p>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-400 mb-2">Book Value Ratio</p>
            <p className="text-2xl font-bold text-white">
              {totalOriginal ? Math.round((totalCurrent / totalOriginal) * 100) : 0}%
            </p>
            <p className="text-xs text-slate-500">Of original value</p>
          </div>
        </div>
      </div>
    </div>
  );
}
