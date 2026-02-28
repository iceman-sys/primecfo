"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  Link2,
  CheckCircle,
  Shield,
  RefreshCw,
  XCircle,
  Loader2,
  ExternalLink,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { useClientContext } from "@/contexts/ClientContext";
import { timeAgo } from "@/lib/financialData";
import { syncReports } from "@/lib/api/client";

export default function ConnectPage() {
  const searchParams = useSearchParams();
  const { selectedClient } = useClientContext();
  const queryClient = useQueryClient();
  const clientId = selectedClient?.id;
  const [disconnecting, setDisconnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [disconnectError, setDisconnectError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("connected") === "true") {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    }
  }, [searchParams, queryClient]);

  const handleConnect = () => {
    if (!clientId) return;
    window.location.href = `/api/quickbooks/auth?clientId=${encodeURIComponent(clientId)}&returnTo=connect`;
  };

  const handleDisconnect = async () => {
    if (!clientId) return;
    setDisconnectError(null);
    setDisconnecting(true);
    try {
      const res = await fetch("/api/quickbooks/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDisconnectError(data.error ?? "Failed to disconnect");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["clients"] });
    } catch (e) {
      setDisconnectError(e instanceof Error ? e.message : "Failed to disconnect");
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSync = async () => {
    if (!clientId) return;
    setSyncError(null);
    setSyncing(true);
    try {
      await syncReports(clientId, "12m", "month");
      await queryClient.invalidateQueries({ queryKey: ["clients"] });
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const isConnected = selectedClient?.qbStatus === "connected";
  const isExpired = selectedClient?.qbStatus === "expired";

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-center">
          <Link2 className="w-5 h-5 text-green-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">QuickBooks Connection</h3>
          <p className="text-xs text-slate-400">{selectedClient?.companyName || "No client selected"}</p>
        </div>
      </div>

      {/* Connection Status Card */}
      <div
        className={`rounded-2xl border p-8 mb-8 ${
          isConnected
            ? "bg-emerald-500/5 border-emerald-500/20"
            : isExpired
              ? "bg-amber-500/5 border-amber-500/20"
              : "bg-slate-800/50 border-slate-700/50"
        }`}
      >
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-800 border border-slate-700 rounded-2xl mb-6">
            <span className="text-2xl font-bold text-green-400">QB</span>
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">
            {isConnected ? "QuickBooks Connected" : isExpired ? "Connection Expired" : "Connect QuickBooks Online"}
          </h2>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            {isConnected
              ? `Your QuickBooks account is securely connected. Last synced ${timeAgo(selectedClient?.lastSync ?? "")}.`
              : isExpired
                ? "Your connection has expired. Please reconnect to continue syncing data."
                : "Securely connect your QuickBooks Online account to start pulling financial data automatically."}
          </p>

          {/* Status indicator */}
          <div
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border mb-8 ${
              isConnected
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : isExpired
                  ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                  : "bg-slate-700/50 border-slate-600 text-slate-400"
            }`}
          >
            {isConnected ? (
              <>
                <CheckCircle className="w-4 h-4" /> Connected & Active
              </>
            ) : isExpired ? (
              <>
                <AlertTriangle className="w-4 h-4" /> Token Expired
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4" /> Not Connected
              </>
            )}
          </div>

          {(disconnectError || syncError) && (
            <p className="text-red-400 text-sm mb-4">{disconnectError ?? syncError}</p>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {isConnected ? (
              <>
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-medium rounded-xl hover:from-teal-400 hover:to-emerald-400 transition-all shadow-lg shadow-teal-500/25 disabled:opacity-50"
                >
                  {syncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                  {syncing ? "Syncing Data…" : "Sync Now"}
                </button>
                <button
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-700 text-slate-300 font-medium rounded-xl hover:bg-slate-600 transition-colors border border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {disconnecting ? <Loader2 className="w-5 h-5 animate-spin" /> : <XCircle className="w-5 h-5" />}
                  {disconnecting ? "Disconnecting…" : "Disconnect"}
                </button>
              </>
            ) : (
              clientId && (
                <button
                  onClick={handleConnect}
                  className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-xl hover:from-green-400 hover:to-emerald-400 transition-all shadow-xl shadow-green-500/25"
                >
                  <ExternalLink className="w-5 h-5" />
                  Connect to QuickBooks
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Sync Progress */}
      {syncing && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 mb-8">
          <h4 className="text-sm font-semibold text-white mb-4">Syncing Financial Data</h4>
          <div className="space-y-3">
            {["Profit & Loss Report", "Balance Sheet", "Cash Flow Statement", "Chart of Accounts"].map((report) => (
              <div key={report} className="flex items-center gap-3">
                <Loader2 className="w-4 h-4 text-teal-400 animate-spin" />
                <span className="text-sm text-slate-300">{report}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connection Details */}
      {isConnected && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 mb-8">
          <h4 className="text-sm font-semibold text-white mb-4">Connection Details</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-xl">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <div>
                <p className="text-xs text-slate-500">Status</p>
                <p className="text-sm text-white font-medium">Active</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-xl">
              <Clock className="w-4 h-4 text-slate-300" />
              <div>
                <p className="text-xs text-slate-500">Last Sync</p>
                <p className="text-sm text-white font-medium">{timeAgo(selectedClient?.lastSync ?? "")}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-xl">
              <RefreshCw className="w-4 h-4 text-teal-400" />
              <div>
                <p className="text-xs text-slate-500">Auto-Refresh</p>
                <p className="text-sm text-white font-medium">Enabled</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-xl">
              <Shield className="w-4 h-4 text-blue-400" />
              <div>
                <p className="text-xs text-slate-500">Data Encryption</p>
                <p className="text-sm text-white font-medium">AES-256</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security Info */}
      <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <Shield className="w-6 h-6 text-teal-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-white mb-2">Security & Privacy</h4>
            <ul className="space-y-2">
              {[
                "OAuth 2.0 authentication — your QuickBooks credentials never touch our servers",
                "Access tokens are encrypted at rest using AES-256",
                "Automatic token refresh ensures uninterrupted access",
                "You can disconnect at any time to revoke access",
                "Read-only access — we never modify your QuickBooks data",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-slate-400">
                  <CheckCircle className="w-4 h-4 text-teal-500 flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
