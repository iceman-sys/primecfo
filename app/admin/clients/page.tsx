'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Building2, Mail, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import AdminAuth from '@/app/components/AdminAuth';
import SignOutButton from '@/app/components/SignOutButton';

interface ApiClient {
  client_id: string;
  client_name: string;
  company_name: string | null;
  email: string;
  phone: string | null;
  is_active: boolean;
  client_qbo_connections?: { status: string }[];
}

function AdminClientsPageFallback() {
  return (
    <AdminAuth>
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
                    <p className="mt-1 text-sm text-gray-500">Manage clients and QuickBooks connections</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-center items-center py-16">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      </div>
    </AdminAuth>
  );
}

function AdminClientsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [clients, setClients] = useState<ApiClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const connected = searchParams.get('connected') === 'true';
  const connectionError = searchParams.get('error') === 'connection_failed';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/clients?list=1');
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? `Failed to load clients (${res.status})`);
        }
        const data = await res.json();
        if (!cancelled) setClients(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load clients');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Clear success/error from URL after a short delay so user can see the message
  useEffect(() => {
    if (!connected && !connectionError) return;
    const t = setTimeout(() => {
      router.replace('/admin/clients', { scroll: false });
    }, 5000);
    return () => clearTimeout(t);
  }, [connected, connectionError, router]);

  return (
    <AdminAuth>
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => router.push('/admin/dashboard')}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    aria-label="Back to dashboard"
                  >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
                    <p className="mt-1 text-sm text-gray-500">
                      Manage clients and QuickBooks connections
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href="/admin/clients/add"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add client
                  </Link>
                  <SignOutButton variant="link" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {connected && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-800">QuickBooks connected successfully for the new client.</p>
            </div>
          )}
          {connectionError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-800">QuickBooks connection failed. You can reconnect from the dashboard.</p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : error ? (
            <div className="p-6 bg-white rounded-lg border border-gray-200">
              <p className="text-red-600">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Retry
              </button>
            </div>
          ) : clients.length === 0 ? (
            <div className="p-12 bg-white rounded-lg border border-gray-200 text-center">
              <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-gray-900 mb-2">No clients yet</h2>
              <p className="text-gray-500 mb-6">Add your first client to get started.</p>
              <Link
                href="/admin/clients/add"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Add client
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">QuickBooks</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {clients.map((client) => {
                    const qbStatus = client.client_qbo_connections?.[0]?.status ?? 'disconnected';
                    const isConnected = qbStatus === 'connected';
                    return (
                      <tr key={client.client_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Building2 className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{client.client_name}</div>
                              {client.company_name && (
                                <div className="text-xs text-gray-500">{client.company_name}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-600">
                            <Mail className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                            {client.email}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              isConnected ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {isConnected ? 'Connected' : qbStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <button
                            onClick={() => router.push(`/admin/dashboard?client=${client.client_id}`)}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            View in dashboard
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminAuth>
  );
}

export default function AdminClientsPage() {
  return (
    <Suspense fallback={<AdminClientsPageFallback />}>
      <AdminClientsPageContent />
    </Suspense>
  );
}
