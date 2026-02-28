"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Plus,
  Search,
  MoreVertical,
  Building2,
  Mail,
  Phone,
  Globe,
  CheckCircle,
  AlertCircle,
  Clock,
  XCircle,
  Link2,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useClientContext } from "@/contexts/ClientContext";
import { timeAgo } from "@/lib/financialData";
import type { Client } from "@/lib/financialData";
import AddClientModal from "@/app/components/AddClientModal";

const statusBadge: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; label: string; className: string }
> = {
  connected: {
    icon: CheckCircle,
    label: "Connected",
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  disconnected: {
    icon: XCircle,
    label: "Disconnected",
    className: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  },
  expired: {
    icon: AlertCircle,
    label: "Expired",
    className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  error: {
    icon: XCircle,
    label: "Error",
    className: "bg-red-500/10 text-red-400 border-red-500/20",
  },
};

export default function ClientsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { clients, selectedClient, setSelectedClient, isLoading } = useClientContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

  const filtered = clients.filter(
    (c) =>
      c.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectAndNavigate = (client: Client, view: string) => {
    setSelectedClient(client);
    setActiveMenu(null);
    if (view === "dashboard") router.push("/dashboard");
    else if (view === "connect") router.push("/connect");
    else if (view === "reports") router.push("/reports");
  };

  const openDeleteConfirm = (client: Client) => {
    setActiveMenu(null);
    setClientToDelete(client);
  };

  const handleDeleteClient = async () => {
    if (!clientToDelete) return;
    const client = clientToDelete;
    setDeleteError(null);
    setDeletingId(client.id);
    try {
      const res = await fetch("/api/clients", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: client.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to delete client");
      }
      setClientToDelete(null);
      if (selectedClient?.id === client.id) {
        const remaining = clients.filter((c) => c.id !== client.id);
        setSelectedClient(remaining[0] ?? null);
      }
      await queryClient.invalidateQueries({ queryKey: ["clients"] });
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete client");
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-400">
        Loading clients…
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Client Management</h3>
            <p className="text-xs text-slate-400">{clients.length} clients total</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-sm font-medium rounded-xl hover:from-teal-400 hover:to-emerald-400 transition-all shadow-lg shadow-teal-500/25"
        >
          <Plus className="w-4 h-4" />
          Add Client
        </button>
      </div>

      <AddClientModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["clients"] })}
      />

      {deleteError && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-sm text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {deleteError}
          <button
            type="button"
            onClick={() => setDeleteError(null)}
            className="ml-auto text-red-400 hover:text-red-300"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Delete confirm */}
      {clientToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-slate-800 border border-slate-600 rounded-xl shadow-xl max-w-sm w-full p-6">
            <p className="text-white font-medium mb-1">Delete client?</p>
            <p className="text-slate-400 text-sm mb-6">
              {clientToDelete.companyName} will be removed. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setClientToDelete(null)}
                className="flex-1 py-2.5 bg-slate-700 text-slate-300 text-sm font-medium rounded-xl hover:bg-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteClient}
                disabled={deletingId === clientToDelete.id}
                className="flex-1 py-2.5 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-500 disabled:opacity-50"
              >
                {deletingId === clientToDelete.id ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search clients by name, company, or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50"
        />
      </div>

      {/* Client Cards */}
      <div className="grid gap-4">
        {filtered.map((client) => {
          const badge = statusBadge[client.qbStatus] ?? statusBadge.disconnected;
          const BadgeIcon = badge.icon;

          return (
            <div
              key={client.id}
              className={`bg-slate-800/50 border rounded-xl p-5 transition-all ${
                selectedClient?.id === client.id
                  ? "border-teal-500/50 ring-1 ring-teal-500/30"
                  : "border-slate-700/50 hover:border-slate-600"
              }`}
            >
              <div className="flex items-start justify-between">
                <div
                  className="flex items-start gap-4 flex-1 min-w-0 cursor-pointer"
                  onClick={() => setSelectedClient(client)}
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-6 h-6 text-slate-400" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-base font-semibold text-white mb-0.5 truncate">
                      {client.companyName}
                    </h4>
                    <p className="text-sm text-slate-400 mb-3 truncate">{client.name}</p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1.5 truncate">
                        <Mail className="w-3.5 h-3.5 flex-shrink-0" /> {client.email}
                      </span>
                      {client.phone && (
                        <span className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 flex-shrink-0" /> {client.phone}
                        </span>
                      )}
                      {client.industry && (
                        <span className="flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 flex-shrink-0" /> {client.industry}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <div
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium ${badge.className}`}
                  >
                    <BadgeIcon className="w-3.5 h-3.5" />
                    {badge.label}
                  </div>

                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenu(activeMenu === client.id ? null : client.id);
                      }}
                      className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {activeMenu === client.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setActiveMenu(null)}
                          aria-hidden="true"
                        />
                        <div className="absolute right-0 mt-1 w-48 bg-slate-700 border border-slate-600 rounded-xl shadow-2xl overflow-hidden z-20">
                          <button
                            type="button"
                            onClick={() => handleSelectAndNavigate(client, "dashboard")}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-600 text-left"
                          >
                            <Building2 className="w-4 h-4" /> View Dashboard
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSelectAndNavigate(client, "connect")}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-600 text-left"
                          >
                            <Link2 className="w-4 h-4" /> Manage Connection
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSelectAndNavigate(client, "reports")}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-600 text-left"
                          >
                            <RefreshCw className="w-4 h-4" /> Sync & Reports
                          </button>
                          <button
                            type="button"
                            onClick={() => openDeleteConfirm(client)}
                            disabled={deletingId === client.id}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-slate-600 text-left disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" /> Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {client.qbStatus === "connected" && client.lastSync && (
                <div className="mt-4 pt-3 border-t border-slate-700/30 flex items-center gap-2 text-xs text-slate-500">
                  <Clock className="w-3.5 h-3.5" />
                  Last synced {timeAgo(client.lastSync)}
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-400 mb-4">
              {clients.length === 0 ? "No clients yet." : "No clients found."}
            </p>
            {clients.length === 0 && (
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-sm font-medium rounded-xl hover:from-teal-400 hover:to-emerald-400 transition-all shadow-lg shadow-teal-500/25"
              >
                <Plus className="w-4 h-4" />
                Add your first client
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
