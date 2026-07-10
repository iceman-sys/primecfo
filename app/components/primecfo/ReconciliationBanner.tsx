"use client";

import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Info, X } from "lucide-react";
import type { ReconciliationSeverity, ReconciliationStatus } from "@/lib/qbo/reconciliationStatus";
import { mailtoSales } from "@/lib/site/contact";

const STYLES: Record<
  ReconciliationSeverity,
  { container: string; iconWrap: string; icon: string; headline: string; cta: string; ctaLink: string }
> = {
  blue: {
    container: "border-emerald-500/20 bg-emerald-500/5",
    iconWrap: "bg-emerald-500/10 border-emerald-500/20",
    icon: "text-emerald-400",
    headline: "text-emerald-200",
    cta: "bg-emerald-600/90 hover:bg-emerald-600",
    ctaLink: "text-emerald-300/90 hover:text-emerald-200",
  },
  amber: {
    container: "border-amber-500/25 bg-amber-500/5",
    iconWrap: "bg-amber-500/10 border-amber-500/20",
    icon: "text-amber-400",
    headline: "text-amber-200",
    cta: "bg-amber-600/90 hover:bg-amber-600",
    ctaLink: "text-amber-300/90 hover:text-amber-200",
  },
  red: {
    container: "border-red-500/25 bg-red-500/5",
    iconWrap: "bg-red-500/10 border-red-500/20",
    icon: "text-red-400",
    headline: "text-red-200",
    cta: "bg-red-600/90 hover:bg-red-600",
    ctaLink: "text-red-300/90 hover:text-red-200",
  },
  unknown: {
    container: "border-slate-500/25 bg-slate-500/5",
    iconWrap: "bg-slate-500/10 border-slate-500/20",
    icon: "text-slate-400",
    headline: "text-slate-200",
    cta: "bg-teal-600/90 hover:bg-teal-600",
    ctaLink: "text-teal-300/90 hover:text-teal-200",
  },
};

function dismissKey(clientId: string, severity: string, dateKey: string) {
  return `pcfo-recon-dismiss:${clientId}:${severity}:${dateKey}`;
}

export default function ReconciliationBanner({
  status,
  clientId,
  className = "",
}: {
  status: ReconciliationStatus;
  clientId?: string;
  className?: string;
}) {
  const styles = STYLES[status.severity];
  const dateKey = status.lastReconciledDate ?? "unknown";
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!clientId) {
      setDismissed(false);
      return;
    }
    try {
      setDismissed(localStorage.getItem(dismissKey(clientId, status.severity, dateKey)) === "1");
    } catch {
      setDismissed(false);
    }
  }, [clientId, status.severity, dateKey]);

  const dismiss = useCallback(() => {
    if (clientId) {
      try {
        localStorage.setItem(dismissKey(clientId, status.severity, dateKey), "1");
      } catch {
        /* ignore */
      }
    }
    setDismissed(true);
  }, [clientId, status.severity, dateKey]);

  if (dismissed) return null;

  const showCtas = status.severity !== "blue";
  const Icon = status.severity === "blue" ? CheckCircle2 : Info;

  if (status.severity === "blue") {
    return (
      <div
        className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${styles.container} ${className}`}
        role="status"
        aria-live="polite"
      >
        <CheckCircle2 className={`w-4 h-4 shrink-0 ${styles.icon}`} aria-hidden />
        <p className="text-sm text-slate-300 flex-1 min-w-0">
          <span className={`font-medium ${styles.headline}`}>✓ </span>
          {status.message}
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="p-1 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 transition-colors shrink-0"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

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
          <Icon className={`w-5 h-5 ${styles.icon}`} aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className={`text-sm font-semibold ${styles.headline}`}>{status.headline}</h3>
            <button
              type="button"
              onClick={dismiss}
              className="p-1 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-slate-300 mt-1 leading-relaxed">{status.message}</p>
          {showCtas ? (
            <div className="flex flex-wrap items-center gap-3 mt-3">
              {/* Plain anchors so navigation works even if JS is busy/hydrating */}
              <a
                href="/contact"
                className={`inline-flex items-center px-3 py-1.5 rounded-lg text-white text-sm font-medium transition-colors ${styles.cta}`}
              >
                Talk to a Prime advisor
              </a>
              <a
                href={mailtoSales("PrimeCFO.ai — book reconciliation")}
                className={`text-sm underline-offset-2 hover:underline ${styles.ctaLink}`}
              >
                Email a Prime advisor
              </a>
              <button
                type="button"
                onClick={dismiss}
                className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
              >
                Got it
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
