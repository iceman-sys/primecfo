"use client";

import React, { useState } from "react";
import {
  X,
  Plus,
  Mail,
  Phone,
  Tag,
  Link as LinkIcon,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (clientId: string) => void;
}

const clientTypes = [
  "Small Business",
  "Enterprise",
  "Startup",
  "Non-Profit",
  "Individual",
  "Agency",
  "E-commerce",
  "SaaS",
  "Retail",
  "Manufacturing",
  "Healthcare",
  "Real Estate",
  "Other",
];

const suggestedTags = [
  "VIP",
  "High Priority",
  "New",
  "Monthly Retainer",
  "Project-Based",
  "Hourly",
  "Remote",
  "Local",
  "International",
];

export default function AddClientModal({ isOpen, onClose, onSuccess }: AddClientModalProps) {
  const [clientName, setClientName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [clientType, setClientType] = useState("");
  const [qboCustomerId, setQboCustomerId] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [newClientId, setNewClientId] = useState<string | null>(null);

  const resetForm = () => {
    setClientName("");
    setCompanyName("");
    setEmail("");
    setPhone("");
    setClientType("");
    setQboCustomerId("");
    setTags([]);
    setTagInput("");
    setNotes("");
    setIsActive(true);
    setError(null);
    setSuccess(false);
    setNewClientId(null);
  };

  const handleAddTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) {
      setTags((prev) => [...prev, t]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags((prev) => prev.filter((x) => x !== tag));
  };

  const handleSuggestedTag = (tag: string) => {
    if (!tags.includes(tag)) setTags((prev) => [...prev, tag]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!clientName.trim()) {
      setError("Client name is required");
      return;
    }
    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_name: clientName.trim(),
          company_name: companyName.trim() || null,
          email: email.trim(),
          phone: phone.trim() || null,
          client_type: clientType || null,
          tags: tags.length > 0 ? tags : null,
          notes: notes.trim() || null,
          is_active: isActive,
          qbo_customer_id: qboCustomerId.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to create client");
      }
      setNewClientId(data.data?.client_id ?? null);
      setSuccess(true);
      onSuccess?.(data.data?.client_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create client");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConnectQuickBooks = () => {
    if (!newClientId) return;
    window.location.href = `/api/quickbooks/auth?clientId=${encodeURIComponent(newClientId)}&returnTo=connect`;
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-2x1 shadow-2xl max-h-[100vh] max-w-[50vw] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-700 sticky top-0 bg-slate-800 z-10">
          <h3 className="text-lg font-semibold text-white">Add New Client</h3>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="p-6 space-y-6">
            <div className="text-center">
              <div className="w-14 h-14 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <h4 className="text-lg font-semibold text-white mb-1">Client added successfully</h4>
              <p className="text-sm text-slate-400">You can connect QuickBooks now or later from the Connections page.</p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 py-2.5 bg-slate-700 text-slate-300 text-sm font-medium rounded-xl hover:bg-slate-600 transition-colors"
              >
                Done
              </button>
              <button
                type="button"
                onClick={handleConnectQuickBooks}
                className="flex-1 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-sm font-medium rounded-xl hover:from-teal-400 hover:to-emerald-400 transition-all shadow-lg shadow-teal-500/25"
              >
                Connect QuickBooks
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Basic info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Contact Name *</label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                  placeholder="John Smith"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Email *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                  placeholder="john@company.com"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Company Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                  placeholder="Acme Corporation"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Client Type</label>
                <select
                  value={clientType}
                  onChange={(e) => setClientType(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                >
                  <option value="">Select type...</option>
                  {clientTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">QuickBooks Customer ID (Optional)</label>
                <input
                  type="text"
                  value={qboCustomerId}
                  onChange={(e) => setQboCustomerId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                  placeholder="e.g., 58"
                />
                <p className="text-xs text-slate-500 mt-1">Leave blank to connect later. Find this in QuickBooks under customer details.</p>
              </div>
            </div>

            {/* Tags & Categories */}
            <div className="border-t border-slate-700/50 pt-5">
              <h4 className="text-sm font-medium text-white mb-3">Tags & Categories</h4>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                  className="flex-1 px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                  placeholder="Add tags..."
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-500 transition-colors"
                >
                  Add
                </button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-600 text-slate-200 rounded-lg text-xs"
                    >
                      <Tag className="w-3 h-3" />
                      {t}
                      <button type="button" onClick={() => handleRemoveTag(t)} className="text-slate-400 hover:text-white">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <p className="text-xs text-slate-500 mb-2">Suggested tags:</p>
              <div className="flex flex-wrap gap-2">
                {suggestedTags.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleSuggestedTag(t)}
                    disabled={tags.includes(t)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-colors ${
                      tags.includes(t)
                        ? "bg-slate-600 text-slate-400 cursor-default"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white"
                    }`}
                  >
                    <Plus className="w-3 h-3" /> {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 resize-none"
                placeholder="Add additional notes about the client."
              />
            </div>

            {/* Client is Active */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="modal-is-active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 text-teal-600 bg-slate-700 border-slate-600 rounded focus:ring-teal-500/50"
              />
              <label htmlFor="modal-is-active" className="text-sm text-slate-300">Client is Active</label>
            </div>

            {/* QuickBooks Integration banner */}
            <div className="p-4 bg-slate-700/50 border border-slate-600 rounded-xl flex items-start gap-3">
              <div className="w-8 h-8 bg-teal-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <LinkIcon className="w-4 h-4 text-teal-400" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white mb-1">QuickBooks Integration</h4>
                <p className="text-xs text-slate-400">
                  After creating the client, you&apos;ll have the option to connect their QuickBooks account for automatic financial data syncing and reporting.
                </p>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-sm text-red-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 py-2.5 bg-slate-700 text-slate-300 text-sm font-medium rounded-xl hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-sm font-medium rounded-xl hover:from-teal-400 hover:to-emerald-400 transition-all shadow-lg shadow-teal-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Add Client"
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
