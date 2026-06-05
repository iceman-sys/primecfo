'use client';

import React from 'react';
import Link from 'next/link';
import { BarChart3, LayoutDashboard } from 'lucide-react';
import SignOutButton from '@/app/components/SignOutButton';

interface AdminShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export default function AdminShell({ title, subtitle, children, actions }: AdminShellProps) {
  return (
    <div className="min-h-screen bg-slate-950">
      <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/admin/subscribers" className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">
                Prime<span className="text-teal-400">CFO</span>
                <span className="text-slate-400 text-sm">.ai</span>
              </span>
              <span className="hidden sm:inline text-[10px] font-semibold uppercase tracking-wider text-teal-400/80 ml-1">
                Admin
              </span>
            </Link>

            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                className="hidden sm:inline-flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <LayoutDashboard className="w-4 h-4" />
                App dashboard
              </Link>
              <SignOutButton variant="link" theme="dark" />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-3 flex-shrink-0">{actions}</div>}
        </div>
        {children}
      </main>
    </div>
  );
}
