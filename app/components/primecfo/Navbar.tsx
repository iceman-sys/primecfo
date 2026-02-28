"use client";

import React, { useState } from 'react';
import { BarChart3, Menu, X, ChevronDown, Bell, Settings, LogOut, User } from 'lucide-react';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  isLoggedIn: boolean;
  onLogin: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate, isLoggedIn, onLogin }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const notifications = [
    { id: 1, text: 'Sync completed', time: '23m ago', read: false },
    { id: 2, text: 'New AI insights available', time: '1h ago', read: false },
  ];
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('landing')}>
            <div className="w-9 h-9 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">
              Prime<span className="text-teal-400">CFO</span>
              <span className="text-slate-400 text-sm">.ai</span>
            </span>
          </div>

          {!isLoggedIn ? (
            <div className="hidden md:flex items-center gap-1">
              {['Features', 'How It Works', 'Pricing'].map((item) => (
                <button
                  key={item}
                  onClick={() => {
                    const el = document.getElementById(item.toLowerCase().replace(/\s/g, '-'));
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors rounded-lg hover:bg-slate-800"
                >
                  {item}
                </button>
              ))}
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-1">
              {[
                { label: 'Dashboard', view: 'dashboard' },
                { label: 'Reports', view: 'reports' },
                { label: 'Insights', view: 'insights' },
                { label: 'Clients', view: 'clients' },
              ].map((item) => (
                <button
                  key={item.view}
                  onClick={() => onNavigate(item.view)}
                  className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                    currentView === item.view ? 'text-teal-400 bg-slate-800' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            {isLoggedIn ? (
              <>
                <div className="relative">
                  <button
                    onClick={() => {
                      setNotifOpen(!notifOpen);
                      setProfileOpen(false);
                    }}
                    className="relative p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-4 h-4 bg-teal-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                  {notifOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
                      <div className="px-4 py-3 border-b border-slate-700">
                        <p className="text-sm font-semibold text-white">Notifications</p>
                      </div>
                      {notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`px-4 py-3 border-b border-slate-700/50 hover:bg-slate-700/50 cursor-pointer ${!n.read ? 'bg-slate-700/20' : ''}`}
                        >
                          <p className="text-sm text-slate-200">{n.text}</p>
                          <p className="text-xs text-slate-500 mt-1">{n.time}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="relative">
                  <button
                    onClick={() => {
                      setProfileOpen(!profileOpen);
                      setNotifOpen(false);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <div className="w-7 h-7 bg-gradient-to-br from-teal-400 to-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-white">AD</span>
                    </div>
                    <span className="hidden sm:block text-sm">Admin</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  {profileOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
                      <div className="px-4 py-3 border-b border-slate-700">
                        <p className="text-sm font-semibold text-white">Admin User</p>
                        <p className="text-xs text-slate-400">admin@primecfo.ai</p>
                      </div>
                      <div className="py-1">
                        <button
                          onClick={() => {
                            onNavigate('settings');
                            setProfileOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-slate-700"
                        >
                          <Settings className="w-4 h-4" /> Settings
                        </button>
                        <button
                          onClick={() => {
                            onNavigate('clients');
                            setProfileOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-slate-700"
                        >
                          <User className="w-4 h-4" /> Manage Clients
                        </button>
                        <button
                          onClick={() => {
                            onLogin();
                            setProfileOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-slate-700"
                        >
                          <LogOut className="w-4 h-4" /> Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={onLogin}
                  className="hidden sm:block px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={onLogin}
                  className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-teal-500 to-emerald-500 rounded-lg hover:from-teal-400 hover:to-emerald-400 transition-all shadow-lg shadow-teal-500/25"
                >
                  Get Started
                </button>
              </div>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-900">
          <div className="px-4 py-3 space-y-1">
            {isLoggedIn ? (
              ['dashboard', 'reports', 'insights', 'clients'].map((view) => (
                <button
                  key={view}
                  onClick={() => {
                    onNavigate(view);
                    setMobileMenuOpen(false);
                  }}
                  className={`block w-full text-left px-4 py-2.5 text-sm rounded-lg ${
                    currentView === view ? 'text-teal-400 bg-slate-800' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {view.charAt(0).toUpperCase() + view.slice(1)}
                </button>
              ))
            ) : (
              <>
                <button
                  onClick={() => {
                    onLogin();
                    setMobileMenuOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 rounded-lg"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    onLogin();
                    setMobileMenuOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2.5 text-sm text-teal-400 font-medium hover:bg-slate-800 rounded-lg"
                >
                  Get Started Free
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {(profileOpen || notifOpen) && (
        <div
          className="fixed inset-0 z-[-1]"
          onClick={() => {
            setProfileOpen(false);
            setNotifOpen(false);
          }}
        />
      )}
    </nav>
  );
};

export default Navbar;
