"use client";

import Link from "next/link";
import { CheckCircle, Link2 } from "lucide-react";
import { useClientContext } from "@/contexts/ClientContext";
import { timeAgo } from "@/lib/financialData";

const placeholderIntegrations = [
  { id: "stripe", name: "Stripe", description: "Payment processing", connected: false },
  { id: "plaid", name: "Plaid", description: "Banking & financial data", connected: false },
];

export default function IntegrationsTab() {
  const { selectedClient } = useClientContext();
  const qbConnected = selectedClient?.qbStatus === "connected";
  const connectedCount = (qbConnected ? 1 : 0) + placeholderIntegrations.filter((i) => i.connected).length;
  const totalShown = 1 + placeholderIntegrations.length;

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Integration status</h3>
          <span className="text-sm text-slate-400">{connectedCount} of {totalShown} connected</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-sm rounded-full">
            {connectedCount} Active
          </span>
          <span className="px-3 py-1 bg-slate-600 text-slate-300 text-sm rounded-full">
            {totalShown - connectedCount} Available
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          className={`rounded-xl p-6 border-2 ${
            qbConnected ? "bg-slate-800/50 border-emerald-500/50" : "bg-slate-800/50 border-slate-600"
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">QuickBooks</h3>
            {qbConnected ? (
              <CheckCircle className="w-5 h-5 text-emerald-500" />
            ) : (
              <span className="w-5 h-5 rounded-full bg-slate-500" />
            )}
          </div>
          <p className="text-sm text-slate-400 mb-4">Accounting & invoicing</p>
          <div className="space-y-1 mb-4 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Status</span>
              <span className={qbConnected ? "text-emerald-400 font-medium" : "text-slate-400"}>
                {qbConnected ? "Connected" : "Not connected"}
              </span>
            </div>
            {qbConnected && selectedClient?.lastSync && (
              <div className="flex justify-between">
                <span className="text-slate-500">Last sync</span>
                <span className="text-slate-400">{timeAgo(selectedClient.lastSync)}</span>
              </div>
            )}
          </div>
          <Link
            href="/connect"
            className="block w-full text-center px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-500"
          >
            {qbConnected ? "Manage" : "Connect"}
          </Link>
        </div>

        {placeholderIntegrations.map((int) => (
          <div
            key={int.id}
            className="rounded-xl p-6 border-2 border-slate-600 bg-slate-800/50"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">{int.name}</h3>
              <Link2 className="w-5 h-5 text-slate-500" />
            </div>
            <p className="text-sm text-slate-400 mb-4">{int.description}</p>
            <div className="space-y-1 mb-4 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Status</span>
                <span className="text-slate-400">Not connected</span>
              </div>
            </div>
            <button
              type="button"
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-slate-300 text-sm font-medium rounded-xl hover:bg-slate-600"
            >
              Connect
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
