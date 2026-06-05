'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  CreditCard,
  DollarSign,
  Clock,
  RefreshCw,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Mail,
} from 'lucide-react';
import AdminAuth from '@/app/components/AdminAuth';
import AdminShell from '@/app/components/admin/AdminShell';

type Row = {
  id: string;
  email: string | null;
  createdAt: string | null;
  lastSignInAt: string | null;
  emailConfirmed: boolean;
  stripeCustomerId: string | null;
  hasSubscription: boolean;
  status: string | null;
  planId: string | null;
  planName: string | null;
  tierWordmark: string | null;
  interval: 'month' | 'year' | null;
  trialEnd: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  subscriptionUpdatedAt: string | null;
};

type ApiResponse = {
  generatedAt: string;
  stripeMode: 'test' | 'live' | 'unknown';
  stats: {
    totalUsers: number;
    subscribers: number;
    active: number;
    trialing: number;
    pastDue: number;
    canceled: number;
    liveSubscribers: number;
    mrr: number;
    currency: string;
  };
  rows: Row[];
};

type StatusFilter = 'all' | 'active' | 'trialing' | 'past_due' | 'canceled' | 'none';

const fmtDate = (iso: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const fmtMoney = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const statusBadge = (status: string | null) => {
  switch (status) {
    case 'active':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    case 'trialing':
      return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    case 'past_due':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    case 'canceled':
    case 'incomplete_expired':
      return 'bg-red-500/10 text-red-400 border-red-500/20';
    default:
      return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  }
};

const StatCard: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
}> = ({ icon: Icon, label, value, hint }) => (
  <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
    <div className="flex items-center justify-between">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
      <Icon className="w-4 h-4 text-slate-500" />
    </div>
    <p className="mt-2 text-2xl font-bold text-white tabular-nums">{value}</p>
    {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
  </div>
);

function SubscribersContent() {
  const router = useRouter();
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/subscribers', { cache: 'no-store' });
      if (res.status === 403) {
        router.replace('/dashboard');
        return;
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || `Failed to load (${res.status})`);
      }
      const json = (await res.json()) as ApiResponse;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load subscribers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.rows.filter((r) => {
      if (statusFilter !== 'all') {
        if (statusFilter === 'none' && r.status) return false;
        if (statusFilter !== 'none' && r.status !== statusFilter) return false;
      }
      if (!q) return true;
      return (
        (r.email ?? '').toLowerCase().includes(q) ||
        (r.planName ?? '').toLowerCase().includes(q) ||
        (r.stripeCustomerId ?? '').toLowerCase().includes(q)
      );
    });
  }, [data, query, statusFilter]);

  const stats = data?.stats;

  return (
    <AdminShell
      title="Subscribers"
      subtitle="New signups & subscription activity"
      actions={
        <>
          {data?.stripeMode && data.stripeMode !== 'unknown' && (
            <span
              className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                data.stripeMode === 'live'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}
            >
              Stripe {data.stripeMode}
            </span>
          )}
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 border border-slate-700 text-slate-300 rounded-xl hover:bg-slate-700 text-sm disabled:opacity-60 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </>
      }
    >
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <StatCard icon={Users} label="Total users" value={String(stats.totalUsers)} />
          <StatCard icon={CreditCard} label="Subscribers" value={String(stats.subscribers)} />
          <StatCard icon={CheckCircle2} label="Active" value={String(stats.active)} />
          <StatCard icon={Clock} label="Trialing" value={String(stats.trialing)} />
          <StatCard icon={DollarSign} label="MRR" value={fmtMoney(stats.mrr)} hint="Active subs only" />
          <StatCard
            icon={XCircle}
            label="Past due / canceled"
            value={`${stats.pastDue} / ${stats.canceled}`}
          />
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by email, plan, or Stripe customer…"
            className="w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(
            [
              ['all', 'All'],
              ['active', 'Active'],
              ['trialing', 'Trialing'],
              ['past_due', 'Past due'],
              ['canceled', 'Canceled'],
              ['none', 'No sub'],
            ] as [StatusFilter, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                statusFilter === value
                  ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg shadow-teal-500/20'
                  : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:text-white hover:border-slate-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
        </div>
      ) : error ? (
        <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700">
          <div className="flex items-center gap-2 text-red-400 mb-3">
            <AlertCircle className="w-5 h-5" />
            <p className="font-medium">{error}</p>
          </div>
          <button
            onClick={() => load()}
            className="px-4 py-2 bg-slate-700 text-slate-300 rounded-xl hover:bg-slate-600 text-sm"
          >
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 bg-slate-800/50 rounded-xl border border-slate-700 text-center">
          <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-white mb-1">No matching users</h2>
          <p className="text-slate-400 text-sm">
            {data && data.rows.length === 0
              ? 'No signups yet. New users will appear here.'
              : 'Try a different search or filter.'}
          </p>
        </div>
      ) : (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Plan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Billing</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Signed up</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Renews / Trial ends</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-white">
                        <Mail className="w-4 h-4 text-slate-500 flex-shrink-0" />
                        <span className="truncate max-w-[220px]">{r.email ?? '(no email)'}</span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                        {r.emailConfirmed ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" /> verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-400">
                            <Clock className="w-3 h-3" /> unverified
                          </span>
                        )}
                        {r.stripeCustomerId && (
                          <span className="text-slate-600 truncate max-w-[140px]">· {r.stripeCustomerId}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {r.planName ? (
                        <div>
                          <span className="font-medium text-white">{r.planName}</span>
                          {r.tierWordmark && (
                            <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider text-teal-400">
                              {r.tierWordmark}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusBadge(
                          r.status
                        )}`}
                      >
                        {r.status ?? 'no sub'}
                      </span>
                      {r.cancelAtPeriodEnd && (
                        <span className="ml-2 text-[10px] font-medium text-red-400">cancels</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                      {r.interval ? (r.interval === 'year' ? 'Annual' : 'Monthly') : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                      {fmtDate(r.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                      {r.status === 'trialing' ? fmtDate(r.trialEnd) : fmtDate(r.currentPeriodEnd)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data && (
        <p className="mt-4 text-xs text-slate-600">
          Showing {filtered.length} of {data.rows.length} users · updated {fmtDate(data.generatedAt)}{' '}
          {new Date(data.generatedAt).toLocaleTimeString()}
        </p>
      )}
    </AdminShell>
  );
}

export default function AdminSubscribersPage() {
  return (
    <AdminAuth>
      <SubscribersContent />
    </AdminAuth>
  );
}
