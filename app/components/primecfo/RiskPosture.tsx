"use client";

import React from "react";
import { Shield, AlertTriangle, AlertCircle, Eye, CheckCircle } from "lucide-react";
import type { RiskPosture as RiskPostureType } from "@/lib/financialData";

interface RiskPostureProps {
  riskPosture: RiskPostureType | null;
  compact?: boolean;
}

const ratingConfig: Record<
  RiskPostureType["rating"],
  {
    label: string;
    icon: React.FC<{ className?: string }>;
    bg: string;
    border: string;
    text: string;
    badgeBg: string;
    badgeText: string;
    iconBg: string;
  }
> = {
  HIGH: {
    label: "HIGH RISK",
    icon: AlertTriangle,
    bg: "bg-red-500/5",
    border: "border-red-500/20",
    text: "text-red-400",
    badgeBg: "bg-red-500/15",
    badgeText: "text-red-300",
    iconBg: "bg-red-500/10",
  },
  ELEVATED: {
    label: "ELEVATED RISK",
    icon: AlertCircle,
    bg: "bg-amber-500/5",
    border: "border-amber-500/20",
    text: "text-amber-400",
    badgeBg: "bg-amber-500/15",
    badgeText: "text-amber-300",
    iconBg: "bg-amber-500/10",
  },
  MODERATE: {
    label: "MODERATE RISK",
    icon: Eye,
    bg: "bg-blue-500/5",
    border: "border-blue-500/20",
    text: "text-blue-400",
    badgeBg: "bg-blue-500/15",
    badgeText: "text-blue-300",
    iconBg: "bg-blue-500/10",
  },
  LOW: {
    label: "LOW RISK",
    icon: CheckCircle,
    bg: "bg-emerald-500/5",
    border: "border-emerald-500/20",
    text: "text-emerald-400",
    badgeBg: "bg-emerald-500/15",
    badgeText: "text-emerald-300",
    iconBg: "bg-emerald-500/10",
  },
};

const RiskPosture: React.FC<RiskPostureProps> = ({ riskPosture, compact = false }) => {
  if (!riskPosture) return null;

  const config = ratingConfig[riskPosture.rating] ?? ratingConfig.MODERATE;
  const Icon = config.icon;

  if (compact) {
    return (
      <div className={`flex items-center gap-3 ${config.bg} border ${config.border} rounded-xl px-4 py-3`}>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${config.iconBg}`}>
          <Shield className={`w-5 h-5 ${config.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold tracking-wider uppercase ${config.text}`}>
              {config.label}
            </span>
          </div>
          <p className="text-sm text-slate-400 truncate">{riskPosture.summary}</p>
        </div>
        <Icon className={`w-5 h-5 ${config.text} flex-shrink-0`} />
      </div>
    );
  }

  return (
    <div className={`${config.bg} border ${config.border} rounded-2xl p-6 mb-6`}>
      <div className="flex items-start gap-5">
        <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${config.iconBg}`}>
          <Shield className={`w-8 h-8 ${config.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold tracking-wider uppercase ${config.badgeBg} ${config.badgeText}`}>
              <Icon className="w-3.5 h-3.5" />
              {config.label}
            </span>
            <span className="text-sm text-slate-500">Overall Risk Posture</span>
          </div>
          <p className="text-base text-slate-200 leading-relaxed mb-3">
            {riskPosture.summary}
          </p>
          {riskPosture.topAction && (
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Top Priority Action
              </p>
              <p className="text-sm text-white font-medium leading-relaxed">
                {riskPosture.topAction}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RiskPosture;
