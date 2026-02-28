"use client";

import React from "react";
import Link from "next/link";
import { BarChart3, Shield, Lock } from "lucide-react";

const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-950 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
          <div className="col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">
                Prime<span className="text-teal-400">CFO</span>
                <span className="text-slate-400 text-sm">.ai</span>
              </span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed mb-6 max-w-xs">
              AI-powered financial intelligence that transforms your QuickBooks data into clear, actionable business insights.
            </p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-slate-500">
                <Shield className="w-4 h-4" />
                <span className="text-xs">SOC 2</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-500">
                <Lock className="w-4 h-4" />
                <span className="text-xs">256-bit SSL</span>
              </div>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Product</h4>
            <ul className="space-y-2.5">
              <li>
                <a href="#features" className="text-sm text-slate-400 hover:text-teal-400 transition-colors">Features</a>
              </li>
              <li>
                <a href="#pricing" className="text-sm text-slate-400 hover:text-teal-400 transition-colors">Pricing</a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Legal</h4>
            <ul className="space-y-2.5">
              <li>
                <Link href="/privacy" className="text-sm text-slate-400 hover:text-teal-400 transition-colors">Privacy Policy</Link>
              </li>
              <li>
                <Link href="/eula" className="text-sm text-slate-400 hover:text-teal-400 transition-colors">Terms of Service</Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500">&copy; 2026 PrimeCFO.ai. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
