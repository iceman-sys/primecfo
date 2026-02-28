"use client";

import Link from "next/link";
import { Wallet, CreditCard, ArrowRightLeft, Calendar, ArrowDownRight, ArrowUpRight, TrendingUp } from "lucide-react";

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n);

const formatDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const mockAccounts = [
  { bank: "Chase", accountName: "Operating", balance: 1250000, available: 1250000, currency: "USD" },
  { bank: "Wells Fargo", accountName: "Savings", balance: 450000, available: 450000, currency: "USD" },
];

const mockCreditLines = [
  { lender: "Chase", limit: 500000, used: 150000, available: 350000, rate: 7.5 },
  { lender: "Wells Fargo", limit: 250000, used: 0, available: 250000, rate: 8.0 },
];

const mockUpcomingTransactions = [
  { date: "2024-11-15", description: "Client Payment - Invoice #1234", amount: 85000, type: "inflow" as const },
  { date: "2024-11-16", description: "Payroll", amount: 125000, type: "outflow" as const },
  { date: "2024-11-18", description: "Vendor Payment - Supplies", amount: 32000, type: "outflow" as const },
  { date: "2024-11-20", description: "Client Payment - Invoice #1235", amount: 95000, type: "inflow" as const },
];

export default function TreasuryTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-400">Total Cash</p>
            <Wallet className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-xl font-bold text-white">{formatCurrency(1700000)}</p>
          <p className="text-xs text-slate-500 mt-1">Across all accounts</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-400">Available Credit</p>
            <CreditCard className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-xl font-bold text-white">{formatCurrency(600000)}</p>
          <p className="text-xs text-slate-500 mt-1">Across 2 credit lines</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-400">Net Cash Flow</p>
            <ArrowRightLeft className="w-5 h-5 text-violet-500" />
          </div>
          <p className="text-xl font-bold text-emerald-400">{formatCurrency(140000)}</p>
          <p className="text-xs text-slate-500 mt-1">This period</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-400">Days Cash On Hand</p>
            <Calendar className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-xl font-bold text-white">32</p>
          <p className="text-xs text-slate-500 mt-1">Based on burn rate</p>
        </div>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Cash Flow Analysis</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-emerald-400">Inflows</p>
              <ArrowDownRight className="w-5 h-5 text-emerald-500" />
            </div>
            <p className="text-xl font-bold text-emerald-400 mt-2">{formatCurrency(520000)}</p>
            <p className="text-xs text-slate-500">This period</p>
          </div>
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-red-400">Outflows</p>
              <ArrowUpRight className="w-5 h-5 text-red-500" />
            </div>
            <p className="text-xl font-bold text-red-400 mt-2">{formatCurrency(380000)}</p>
            <p className="text-xs text-slate-500">This period</p>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-blue-400">Net Flow</p>
              <TrendingUp className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-xl font-bold text-blue-400 mt-2">{formatCurrency(140000)}</p>
            <p className="text-xs text-slate-500">Positive trend</p>
          </div>
        </div>
        <div className="border-t border-slate-700/50 pt-4">
          <h4 className="font-medium text-white mb-3">30-Day Forecast</h4>
          <div className="bg-slate-700/30 rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-slate-400">Expected ending balance</span>
              <span className="font-bold text-lg text-white">{formatCurrency(2987500)}</span>
            </div>
            <div className="w-full bg-slate-600 rounded-full h-2">
              <div className="bg-emerald-500 h-2 rounded-full" style={{ width: "85%" }} />
            </div>
            <p className="text-xs text-slate-500 mt-2">Based on historical patterns</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Bank Accounts</h3>
          <Link href="/connect" className="text-sm text-teal-400 hover:text-teal-300 font-medium">
            Connect New Bank →
          </Link>
        </div>
        <div className="space-y-4">
          {mockAccounts.map((acc, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-4 bg-slate-700/30 rounded-xl border border-slate-600/50"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-white">
                    {acc.bank} — {acc.accountName}
                  </p>
                  <p className="text-sm text-slate-400">Available: {formatCurrency(acc.available)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-white">{formatCurrency(acc.balance)}</p>
                <p className="text-xs text-slate-500">{acc.currency}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-4">Connect more accounts in Integrations.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Credit Lines</h3>
          <div className="space-y-4">
            {mockCreditLines.map((line, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-slate-300">{line.lender}</span>
                  <span className="text-sm text-slate-500">{line.rate}% APR</span>
                </div>
                <div className="w-full bg-slate-600 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${line.limit ? (line.used / line.limit) * 100 : 0}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Used: {formatCurrency(line.used)}</span>
                  <span>Available: {formatCurrency(line.available)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Upcoming Transactions</h3>
          <div className="space-y-3">
            {mockUpcomingTransactions.map((tx, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-700/20 hover:bg-slate-700/30 transition-colors">
                <div className="flex items-center gap-3">
                  {tx.type === "inflow" ? (
                    <ArrowDownRight className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <ArrowUpRight className="w-4 h-4 text-red-500 shrink-0" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-white">{tx.description}</p>
                    <p className="text-xs text-slate-500">{formatDate(tx.date)}</p>
                  </div>
                </div>
                <span className={`font-medium shrink-0 ${tx.type === "inflow" ? "text-emerald-400" : "text-red-400"}`}>
                  {tx.type === "inflow" ? "+" : "-"}
                  {formatCurrency(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
