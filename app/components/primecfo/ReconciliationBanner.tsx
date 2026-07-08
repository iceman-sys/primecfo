"use client";

import React from "react";
import { Info } from "lucide-react";
import type { ReconciliationSeverity, ReconciliationStatus } from "@/lib/qbo/reconciliationStatus";

const STYLES: Record<
  ReconciliationSeverity,
  { container: string; iconWrap: string; icon: string; headline: string }
> = {
  blue: {
    container: "border-blue-500/25 bg-blue-500/5",
    iconWrap: "bg-blue-500/10 border-blue-500/20",
    icon: "text-blue-400",
    headline: "text-blue-200",
  },
  amber: {
    container: "border-amber-500/25 bg-amber-500/5",
    iconWrap: "bg-amber-500/10 border-amber-500/20",
    icon: "text-amber-400",
    headline: "text-amber-200",
  },
  red: {
    container: "border-red-500/25 bg-red-500/5",
    iconWrap: "bg-red-500/10 border-red-500/20",
    icon: "text-red-400",
    headline: "text-red-200",
  },
  unknown: {
    container: "border-slate-500/25 bg-slate-500/5",
    iconWrap: "bg-slate-500/10 border-slate-500/20",
    icon: "text-slate-400",
    headline: "text-slate-200",
  },
};

export default function ReconciliationBanner({
  status,
  className = "",
}: {
  status: ReconciliationStatus;
  className?: string;
}) {
  const styles = STYLES[status.severity];

  return (
    <div
      className={`rounded-xl border p-4 ${styles.container} ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0 ${styles.iconWrap}`}
        >
          <Info className={`w-5 h-5 ${styles.icon}`} aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-semibold ${styles.headline}`}>{status.headline}</h3>
          <p className="text-sm text-slate-300 mt-1 leading-relaxed">{status.message}</p>
        </div>
      </div>
    </div>
  );
}
