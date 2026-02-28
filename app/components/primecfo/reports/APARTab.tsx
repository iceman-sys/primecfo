"use client";

import { ArrowDownRight, ArrowUpRight, ArrowRightLeft, FileText, AlertCircle, Users, Building, Package } from "lucide-react";

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n);

const mockAR = [
  { id: "INV-2024-089", customer: "Acme Corp", amount: 12500, dueDate: "2024-11-01", overdue: true },
  { id: "INV-2024-092", customer: "Beta LLC", amount: 8200, dueDate: "2024-11-20", overdue: false },
];
const mockAP = [
  { id: "PO-1001", vendor: "Office Supplies Inc", amount: 3200, dueDate: "2024-11-15", overdue: false },
  { id: "PO-1002", vendor: "Cloud Services", amount: 1500, dueDate: "2024-11-10", overdue: true },
];

const mockExpenseCategories = [
  { name: "Payroll & Benefits", pct: "45%", amount: 171000, icon: Users },
  { name: "Office & Facilities", pct: "20%", amount: 76000, icon: Building },
  { name: "Software & Tools", pct: "15%", amount: 57000, icon: Package },
];

export default function APARTab() {
  const totalAR = mockAR.reduce((s, r) => s + r.amount, 0);
  const overdueAR = mockAR.filter((r) => r.overdue).reduce((s, r) => s + r.amount, 0);
  const totalAP = 245000; // admin uses fixed 245000 for payables
  const overdueAP = mockAP.filter((r) => r.overdue).reduce((s, r) => s + r.amount, 0);
  const netPosition = totalAR - totalAP;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-400">Receivables</p>
            <ArrowDownRight className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-xl font-bold text-white">{formatCurrency(totalAR)}</p>
          <p className="text-xs text-slate-500 mt-1">Outstanding</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-400">Payables</p>
            <ArrowUpRight className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-xl font-bold text-white">{formatCurrency(totalAP)}</p>
          <p className="text-xs text-slate-500 mt-1">To vendors</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-400">Overdue</p>
            <AlertCircle className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-xl font-bold text-amber-400">{formatCurrency(overdueAR + overdueAP)}</p>
          <p className="text-xs text-slate-500 mt-1">Needs attention</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-400">Net Position</p>
            <ArrowRightLeft className="w-5 h-5 text-blue-500" />
          </div>
          <p className={`text-xl font-bold ${netPosition >= 0 ? "text-blue-400" : "text-red-400"}`}>
            {formatCurrency(netPosition)}
          </p>
          <p className="text-xs text-slate-500 mt-1">AR - AP</p>
        </div>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Accounts Receivable</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-slate-700/30 rounded-xl p-4">
            <p className="text-sm text-slate-400">Open Invoices</p>
            <p className="text-xl font-bold text-white">12</p>
          </div>
          <div className="bg-slate-700/30 rounded-xl p-4">
            <p className="text-sm text-slate-400">Paid This Month</p>
            <p className="text-xl font-bold text-emerald-400">8</p>
          </div>
          <div className="bg-slate-700/30 rounded-xl p-4">
            <p className="text-sm text-slate-400">Overdue</p>
            <p className="text-xl font-bold text-red-400">3</p>
          </div>
          <div className="bg-slate-700/30 rounded-xl p-4">
            <p className="text-sm text-slate-400">Avg Days to Pay</p>
            <p className="text-xl font-bold text-white">28</p>
          </div>
        </div>
        <div className="border border-slate-600 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-600 bg-slate-700/30">
            <h4 className="text-sm font-semibold text-white">Recent Receivables</h4>
          </div>
          <div className="divide-y divide-slate-700/50">
            {mockAR.map((r) => (
              <div key={r.id} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-slate-500" />
                  <div>
                    <p className="text-sm font-medium text-white">{r.id}</p>
                    <p className="text-xs text-slate-400">{r.customer} · Due {r.dueDate}</p>
                  </div>
                </div>
                <span className={r.overdue ? "text-amber-400 font-medium" : "text-white"}>
                  {formatCurrency(r.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Accounts Payable & Expenses</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-700/30 rounded-xl p-4">
            <p className="text-sm text-slate-400">Total Expenses</p>
            <p className="text-xl font-bold text-white">{formatCurrency(380000)}</p>
            <p className="text-xs text-slate-500">This period</p>
          </div>
          <div className="bg-slate-700/30 rounded-xl p-4">
            <p className="text-sm text-slate-400">Largest Category</p>
            <p className="text-xl font-bold text-white">Payroll</p>
            <p className="text-xs text-slate-500">45% of total</p>
          </div>
          <div className="bg-slate-700/30 rounded-xl p-4">
            <p className="text-sm text-slate-400">vs Last Period</p>
            <p className="text-xl font-bold text-emerald-400">-8.2%</p>
            <p className="text-xs text-slate-500">Good trend</p>
          </div>
        </div>
        <div className="space-y-3">
          {mockExpenseCategories.map((cat, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 bg-slate-700/20 rounded-xl border border-slate-600/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                  <cat.icon className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-white">{cat.name}</p>
                  <p className="text-sm text-slate-500">{cat.pct} of expenses</p>
                </div>
              </div>
              <p className="font-semibold text-white">{formatCurrency(cat.amount)}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-slate-700/50">
          <h4 className="text-sm font-semibold text-white mb-3">Recent Payables</h4>
          <div className="space-y-2">
            {mockAP.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-700/20">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <div>
                    <p className="text-sm font-medium text-white">{r.id}</p>
                    <p className="text-xs text-slate-400">{r.vendor} · Due {r.dueDate}</p>
                  </div>
                </div>
                <span className={r.overdue ? "text-amber-400 font-medium" : "text-white"}>
                  {formatCurrency(r.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
