"use client";

import React, { useState } from "react";
import { Link2, BarChart3, Brain, Shield, RefreshCw, Users, ArrowRight, Check, Zap, FileText, TrendingUp } from "lucide-react";

interface FeaturesProps {
  onGetStarted: () => void;
}

const Features: React.FC<FeaturesProps> = ({ onGetStarted }) => {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("annual");

  const features = [
    { icon: Link2, title: "QuickBooks Integration", description: "One-click secure connection to your QuickBooks Online account.", color: "from-teal-500 to-emerald-500" },
    { icon: BarChart3, title: "Financial Dashboard", description: "Real-time metrics, trend charts, and period comparisons.", color: "from-blue-500 to-cyan-500" },
    { icon: Brain, title: "AI-Powered Insights", description: "Plain-English analysis of your financial data.", color: "from-violet-500 to-purple-500" },
    { icon: FileText, title: "Automated Reports", description: "P&L, Balance Sheet, and Cash Flow from QuickBooks.", color: "from-amber-500 to-orange-500" },
    { icon: TrendingUp, title: "Trend Analysis", description: "Month-over-month and year-over-year performance.", color: "from-pink-500 to-rose-500" },
    { icon: Shield, title: "Enterprise Security", description: "Bank-level encryption and secure data isolation.", color: "from-slate-500 to-slate-600" },
    { icon: RefreshCw, title: "Auto-Sync", description: "Financial data syncs on a schedule.", color: "from-green-500 to-emerald-500" },
    { icon: Users, title: "Multi-Client Support", description: "Manage multiple businesses from one dashboard.", color: "from-indigo-500 to-blue-500" },
  ];

  const steps = [
    { step: "01", title: "Connect QuickBooks", description: "Securely link your QuickBooks Online account with one click." },
    { step: "02", title: "We Pull Your Data", description: "PrimeCFO.ai retrieves your P&L, Balance Sheet, and Cash Flow from QuickBooks." },
    { step: "03", title: "AI Analyzes Everything", description: "Our engine calculates metrics, identifies trends, and generates insights." },
    { step: "04", title: "You Make Better Decisions", description: "View your dashboard and insights — no accounting degree needed." },
  ];

  return (
    <div>
      <section id="features" className="bg-slate-950 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-teal-400 text-sm font-semibold uppercase tracking-wider mb-3">Features</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Everything You Need to Understand Your Finances</h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">From automated data retrieval to AI-powered analysis.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group bg-slate-900/50 border border-slate-800 rounded-xl p-6 hover:border-slate-700 hover:bg-slate-900 transition-all duration-300"
              >
                <div className={`w-12 h-12 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-slate-900 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-teal-400 text-sm font-semibold uppercase tracking-wider mb-3">How It Works</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">From QuickBooks to Insights in Minutes</h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">Four simple steps to transform your financial data.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step) => (
              <div key={step.step} className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-teal-500/20 to-emerald-500/20 border border-teal-500/30 rounded-2xl mb-5">
                  <span className="text-2xl font-bold bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">{step.step}</span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-3">{step.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="bg-slate-950 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-teal-400 text-sm font-semibold uppercase tracking-wider mb-3">Pricing</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Simple, Transparent Pricing</h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-8">Start with a 14-day free trial. No credit card required.</p>
            <div className="inline-flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl p-1">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`px-5 py-2 text-sm font-medium rounded-lg transition-all ${billingCycle === "monthly" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle("annual")}
                className={`px-5 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${billingCycle === "annual" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"}`}
              >
                Annual
                <span className="text-xs text-teal-400 font-semibold">Save 20%</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-900 py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-teal-900/20 via-transparent to-transparent" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-teal-500/10 border border-teal-500/20 rounded-full mb-6">
            <Zap className="w-4 h-4 text-teal-400" />
            <span className="text-sm text-teal-400 font-medium">14-Day Free Trial</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Ready to Understand Your Finances?</h2>
          <p className="text-lg text-slate-400 mb-8 max-w-2xl mx-auto">Join business owners who use PrimeCFO.ai to make smarter financial decisions.</p>
          <button
            onClick={onGetStarted}
            className="group px-8 py-4 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold rounded-xl hover:from-teal-400 hover:to-emerald-400 transition-all shadow-xl shadow-teal-500/25 hover:shadow-teal-500/40 inline-flex items-center gap-2"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>
    </div>
  );
};

export default Features;
