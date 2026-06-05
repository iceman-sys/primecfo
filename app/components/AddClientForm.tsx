'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  AlertCircle,
  Plus,
  Building2,
  Mail,
  Phone,
  Tag,
  FileText,
  Link,
  ChevronRight,
  Loader2,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';

interface ClientFormData {
  client_name: string;
  company_name: string;
  email: string;
  phone: string;
  client_type: string;
  tags: string[];
  notes: string;
  is_active: boolean;
  qbo_customer_id?: string;
}

interface AddClientFormProps {
  onClose?: () => void;
  onSuccess?: (client: unknown) => void;
}

const inputClass =
  'w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50';
const labelClass = 'block text-sm font-medium text-slate-300 mb-1.5';
const sectionClass = 'text-base font-semibold text-white flex items-center gap-2 pb-3 border-b border-slate-700/50';

const clientTypes = [
  'Small Business',
  'Enterprise',
  'Startup',
  'Non-Profit',
  'Individual',
  'Agency',
  'E-commerce',
  'SaaS',
  'Retail',
  'Manufacturing',
  'Healthcare',
  'Real Estate',
  'Other',
];

const suggestedTags = [
  'VIP',
  'High Priority',
  'New',
  'Monthly Retainer',
  'Project-Based',
  'Hourly',
  'Remote',
  'Local',
  'International',
];

export default function AddClientForm({ onClose, onSuccess }: AddClientFormProps) {
  const [formData, setFormData] = useState<ClientFormData>({
    client_name: '',
    company_name: '',
    email: '',
    phone: '',
    client_type: '',
    tags: [],
    notes: '',
    is_active: true,
    qbo_customer_id: '',
  });

  const [currentTag, setCurrentTag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newClientId, setNewClientId] = useState<string | null>(null);
  const [qboConnecting, setQboConnecting] = useState(false);
  const [qboConnected, setQboConnected] = useState(false);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const connected = urlParams.get('connected');
    const connectionError = urlParams.get('error');

    if (connected === 'true') {
      setQboConnected(true);
      setQboConnecting(false);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (connectionError === 'connection_failed') {
      setError('Failed to connect to QuickBooks. Please try again.');
      setQboConnecting(false);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleAddTag = () => {
    if (currentTag.trim() && !formData.tags.includes(currentTag.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, currentTag.trim()],
      }));
      setCurrentTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const handleAddSuggestedTag = (tag: string) => {
    if (!formData.tags.includes(tag)) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, tag],
      }));
    }
  };

  const validateForm = (): boolean => {
    if (!formData.client_name.trim()) {
      setError('Client name is required');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (formData.phone && !/^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
      setError('Please enter a valid phone number');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const clientData = {
        client_name: formData.client_name,
        company_name: formData.company_name,
        email: formData.email,
        phone: formData.phone,
        client_type: formData.client_type,
        tags: formData.tags,
        notes: formData.notes,
        is_active: formData.is_active,
        qbo_customer_id: formData.qbo_customer_id || null,
      };

      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create client');
      }

      setNewClientId(result.data.client_id);
      setShowSuccessScreen(true);
      onSuccess?.(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConnectQuickBooks = () => {
    if (!newClientId) return;
    setQboConnecting(true);
    window.location.href = `/api/quickbooks/auth?clientId=${encodeURIComponent(newClientId)}&returnTo=add`;
  };

  const handleFinish = () => {
    if (onClose) {
      onClose();
    } else {
      setFormData({
        client_name: '',
        company_name: '',
        email: '',
        phone: '',
        client_type: '',
        tags: [],
        notes: '',
        is_active: true,
        qbo_customer_id: '',
      });
      setNewClientId(null);
      setQboConnected(false);
      setShowSuccessScreen(false);
      setError(null);
    }
  };

  if (showSuccessScreen) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Client Added Successfully</h2>
          <p className="text-slate-400">Connect their QuickBooks account to start syncing data</p>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-teal-400" />
              Client Details
            </h3>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-slate-500">Name</dt>
                <dd className="font-medium text-white">{formData.client_name}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Email</dt>
                <dd className="font-medium text-white">{formData.email}</dd>
              </div>
              {formData.company_name && (
                <div>
                  <dt className="text-slate-500">Company</dt>
                  <dd className="font-medium text-white">{formData.company_name}</dd>
                </div>
              )}
              {formData.client_type && (
                <div>
                  <dt className="text-slate-500">Type</dt>
                  <dd className="font-medium text-white">{formData.client_type}</dd>
                </div>
              )}
              {formData.phone && (
                <div>
                  <dt className="text-slate-500">Phone</dt>
                  <dd className="font-medium text-white">{formData.phone}</dd>
                </div>
              )}
              {formData.qbo_customer_id && (
                <div>
                  <dt className="text-slate-500">QuickBooks ID</dt>
                  <dd className="font-medium text-white">{formData.qbo_customer_id}</dd>
                </div>
              )}
              {formData.tags.length > 0 && (
                <div className="col-span-2">
                  <dt className="text-slate-500 mb-1">Tags</dt>
                  <dd className="flex flex-wrap gap-1.5">
                    {formData.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2.5 py-0.5 bg-teal-500/10 text-teal-400 border border-teal-500/20 text-xs rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <div
            className={`border rounded-xl p-6 transition-all ${
              qboConnected
                ? 'border-emerald-500/30 bg-emerald-500/5'
                : 'border-slate-700 bg-slate-800/30'
            }`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  qboConnected
                    ? 'bg-emerald-500/20'
                    : 'bg-slate-700 border border-slate-600'
                }`}
              >
                {qboConnecting ? (
                  <Loader2 className="w-5 h-5 text-teal-400 animate-spin" />
                ) : qboConnected ? (
                  <Check className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Link className="w-5 h-5 text-slate-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white">QuickBooks Integration</h3>
                <p className="text-sm text-slate-400 mt-0.5">
                  {qboConnected
                    ? 'Successfully connected!'
                    : qboConnecting
                      ? 'Connecting to QuickBooks…'
                      : formData.qbo_customer_id
                        ? 'Customer ID provided — ready to sync'
                        : 'Connect to sync financial data automatically'}
                </p>

                {!qboConnected && !qboConnecting && !formData.qbo_customer_id && (
                  <div className="mt-4 space-y-3">
                    <ul className="space-y-1.5 text-sm text-slate-400">
                      {[
                        'Sync invoices and payments automatically',
                        'Track customer balances in real-time',
                        'Generate financial reports instantly',
                      ].map((item) => (
                        <li key={item} className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      onClick={handleConnectQuickBooks}
                      className="w-full px-4 py-2.5 bg-[#2ca01c] text-white rounded-xl hover:bg-[#248517] transition-colors flex items-center justify-center gap-2 font-medium text-sm"
                    >
                      <img
                        src="https://cdn.brandfolder.io/I0O6R8JF/at/c3vm4xbbxcb9f5vqstfnv4/qb-logo-white.svg"
                        alt="QuickBooks"
                        className="h-5"
                      />
                      Connect QuickBooks
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {formData.qbo_customer_id && !qboConnected && (
                  <div className="mt-4 p-3 bg-teal-500/10 border border-teal-500/20 rounded-xl">
                    <p className="text-sm text-teal-300">
                      QuickBooks Customer ID provided. Data will sync using ID:{' '}
                      {formData.qbo_customer_id}
                    </p>
                  </div>
                )}

                {qboConnected && (
                  <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                    <p className="text-sm text-emerald-300">
                      QuickBooks connected. Financial data will sync automatically.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            {!qboConnected && !formData.qbo_customer_id && (
              <button
                type="button"
                onClick={handleFinish}
                className="flex-1 px-4 py-2.5 border border-slate-600 text-slate-300 rounded-xl hover:bg-slate-800 transition-colors text-sm font-medium"
              >
                Skip for Now
              </button>
            )}
            <button
              type="button"
              onClick={handleFinish}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl hover:from-teal-400 hover:to-emerald-400 transition-all shadow-lg shadow-teal-500/25 flex items-center justify-center gap-2 text-sm font-medium"
            >
              {qboConnected || formData.qbo_customer_id ? (
                <>
                  Finish Setup
                  <ChevronRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  Back to Clients
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="space-y-4">
        <h3 className={sectionClass}>
          <Building2 className="w-4 h-4 text-teal-400" />
          Basic Information
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="client_name" className={labelClass}>
              Client Name *
            </label>
            <input
              type="text"
              id="client_name"
              name="client_name"
              value={formData.client_name}
              onChange={handleInputChange}
              placeholder="John Doe or Company Name"
              className={inputClass}
              required
            />
          </div>
          <div>
            <label htmlFor="company_name" className={labelClass}>
              Company Name
            </label>
            <input
              type="text"
              id="company_name"
              name="company_name"
              value={formData.company_name}
              onChange={handleInputChange}
              placeholder="Optional company name"
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="email" className={labelClass}>
              Email *
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="client@example.com"
                className={`${inputClass} pl-10`}
                required
              />
            </div>
          </div>
          <div>
            <label htmlFor="phone" className={labelClass}>
              Phone
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="+1 234 567 890"
                className={`${inputClass} pl-10`}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="client_type" className={labelClass}>
              Client Type
            </label>
            <select
              id="client_type"
              name="client_type"
              value={formData.client_type}
              onChange={handleInputChange}
              className={`${inputClass} appearance-none`}
            >
              <option value="" className="bg-slate-800">
                Select type…
              </option>
              {clientTypes.map((type) => (
                <option key={type} value={type} className="bg-slate-800">
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="qbo_customer_id" className={labelClass}>
              QuickBooks Customer ID (optional)
            </label>
            <input
              type="text"
              id="qbo_customer_id"
              name="qbo_customer_id"
              value={formData.qbo_customer_id || ''}
              onChange={handleInputChange}
              placeholder="e.g., 58"
              className={inputClass}
            />
            <p className="text-xs text-slate-500 mt-1.5">
              Leave blank to connect later via OAuth.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className={sectionClass}>
          <Tag className="w-4 h-4 text-teal-400" />
          Tags & Categories
        </h3>

        <div className="flex gap-2">
          <input
            type="text"
            value={currentTag}
            onChange={(e) => setCurrentTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddTag();
              }
            }}
            placeholder="Add a tag…"
            className={`${inputClass} flex-1`}
          />
          <button
            type="button"
            onClick={handleAddTag}
            className="px-4 py-2.5 bg-slate-700 text-slate-200 rounded-xl hover:bg-slate-600 transition-colors text-sm font-medium"
          >
            Add
          </button>
        </div>

        {formData.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {formData.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded-full text-sm flex items-center gap-1.5"
              >
                <Tag className="w-3 h-3" />
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="text-teal-500 hover:text-teal-300"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div>
          <p className="text-xs text-slate-500 mb-2">Suggested tags</p>
          <div className="flex flex-wrap gap-2">
            {suggestedTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => handleAddSuggestedTag(tag)}
                disabled={formData.tags.includes(tag)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  formData.tags.includes(tag)
                    ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                    : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:text-white hover:border-slate-600'
                }`}
              >
                <Plus className="inline w-3 h-3 mr-1" />
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="notes" className={labelClass}>
          <span className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-teal-400" />
            Notes
          </span>
        </label>
        <textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleInputChange}
          rows={4}
          placeholder="Any additional notes about this client…"
          className={`${inputClass} resize-none`}
        />
      </div>

      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          id="is_active"
          name="is_active"
          checked={formData.is_active}
          onChange={handleInputChange}
          className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-teal-500 focus:ring-teal-500/50 focus:ring-offset-0"
        />
        <span className="text-sm font-medium text-slate-300">Client is active</span>
      </label>

      <div className="p-4 bg-teal-500/5 border border-teal-500/20 rounded-xl">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 bg-teal-500/10 border border-teal-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <Link className="w-4 h-4 text-teal-400" />
          </div>
          <div>
            <h4 className="font-semibold text-white mb-1">QuickBooks Integration</h4>
            <p className="text-sm text-slate-400">
              {formData.qbo_customer_id
                ? `Customer ID ${formData.qbo_customer_id} will be used for automatic syncing.`
                : "After creating the client, you'll be able to connect their QuickBooks account for automatic financial data syncing."}
            </p>
          </div>
        </div>
      </div>

      {error && !isSubmitting && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      <div className="flex gap-3 pt-4 border-t border-slate-700/50">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-slate-600 text-slate-300 rounded-xl hover:bg-slate-800 transition-colors text-sm font-medium"
            disabled={isSubmitting}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 px-4 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl hover:from-teal-400 hover:to-emerald-400 transition-all shadow-lg shadow-teal-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm font-medium"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating Client…
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              Create Client
            </>
          )}
        </button>
      </div>
    </form>
  );
}
