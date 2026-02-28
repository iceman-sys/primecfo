"use client";

import React from 'react';
import {
  LayoutDashboard,
  FileText,
  Brain,
  Users,
  Link2,
  Settings,
  ChevronDown,
  Building2,
  RefreshCw,
  HelpCircle,
} from 'lucide-react';
import { Client, timeAgo } from '@/lib/financialData';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  selectedClient: Client | null;
  clients: Client[];
  onSelectClient: (client: Client) => void;
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  selectedClient,
  clients,
  onSelectClient,
  isOpen,
  onClose,
}) => {
  const [clientDropdownOpen, setClientDropdownOpen] = React.useState(false);

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', view: 'dashboard' },
    { icon: FileText, label: 'Reports', view: 'reports' },
    { icon: Brain, label: 'AI Insights', view: 'insights' },
    { icon: Link2, label: 'Connections', view: 'connect' },
    { icon: Users, label: 'Clients', view: 'clients' },
    { icon: Settings, label: 'Settings', view: 'settings' },
  ];

  const qbStatusColors: Record<string, string> = {
    connected: 'bg-emerald-400',
    disconnected: 'bg-slate-500',
    expired: 'bg-amber-400',
    error: 'bg-red-400',
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 bg-slate-900 border-r border-slate-800 z-40 transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-slate-800">
            <div className="relative">
              <button
                onClick={() => setClientDropdownOpen(!clientDropdownOpen)}
                className="w-full flex items-center gap-3 p-3 bg-slate-800/50 border border-slate-700 rounded-xl hover:bg-slate-800 transition-colors"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {selectedClient?.companyName || 'Select Client'}
                  </p>
                  {selectedClient && (
                    <div className="flex items-center gap-1.5">
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${qbStatusColors[selectedClient.qbStatus]}`}
                      />
                      <span className="text-xs text-slate-400 capitalize">{selectedClient.qbStatus}</span>
                    </div>
                  )}
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform ${clientDropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {clientDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50">
                  <div className="max-h-64 overflow-y-auto">
                    {clients.filter((c) => c.status === 'active').map((client) => (
                      <button
                        key={client.id}
                        onClick={() => {
                          onSelectClient(client);
                          setClientDropdownOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700 transition-colors ${
                          selectedClient?.id === client.id ? 'bg-slate-700/50' : ''
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full ${qbStatusColors[client.qbStatus]}`} />
                        <div className="text-left min-w-0">
                          <p className="text-sm text-white truncate">{client.companyName}</p>
                          <p className="text-xs text-slate-400">
                            {client.qbStatus === 'connected'
                              ? `Synced ${timeAgo(client.lastSync)}`
                              : client.qbStatus}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {selectedClient?.qbStatus === 'connected' && (
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                <RefreshCw className="w-3 h-3" />
                <span>Last sync: {timeAgo(selectedClient.lastSync)}</span>
              </div>
            )}
          </div>

          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <button
                key={item.view}
                onClick={() => {
                  onNavigate(item.view);
                  onClose();
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  currentView === item.view
                    ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-slate-800">
            <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
              <HelpCircle className="w-5 h-5" />
              Help & Support
            </button>
          </div>
        </div>

        {clientDropdownOpen && (
          <div className="fixed inset-0 z-[-1]" onClick={() => setClientDropdownOpen(false)} />
        )}
      </aside>
    </>
  );
};

export default Sidebar;
