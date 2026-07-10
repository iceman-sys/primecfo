"use client";



import React, { useCallback, useEffect, useState } from "react";

import { Info, X } from "lucide-react";

import type { DataQualityAdvisory, DataQualityAdvisorySeverity } from "@/lib/dataQuality/types";

import { mailtoSales } from "@/lib/site/contact";



type DataQualityAdvisoryPanelProps = {

  advisory: DataQualityAdvisory;

  clientId: string;

  /** Metric card titles that should show an info badge (e.g. "Accounts Receivable"). */

  affectedMetricTitles?: string[];

  className?: string;

};



const SEVERITY_STYLES: Record<

  DataQualityAdvisorySeverity,

  {

    container: string;

    iconWrap: string;

    icon: string;

    headline: string;

    cta: string;

    ctaLink: string;

  }

> = {

  blue: {

    container: "border-blue-500/25 bg-blue-500/5",

    iconWrap: "bg-blue-500/10 border-blue-500/20",

    icon: "text-blue-400",

    headline: "text-blue-200",

    cta: "bg-blue-600/90 hover:bg-blue-600",

    ctaLink: "text-blue-300/90 hover:text-blue-200",

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

};



function dismissKey(clientId: string, rule: string) {

  return `pcfo-dq-dismiss:${clientId}:${rule}`;

}



export function useDataQualityDismissed(clientId: string | undefined, rule: string | undefined) {

  const [dismissed, setDismissed] = useState(true);



  useEffect(() => {

    if (!clientId || !rule) {

      setDismissed(false);

      return;

    }

    try {

      setDismissed(localStorage.getItem(dismissKey(clientId, rule)) === "1");

    } catch {

      setDismissed(false);

    }

  }, [clientId, rule]);



  const dismiss = useCallback(() => {

    if (!clientId || !rule) return;

    try {

      localStorage.setItem(dismissKey(clientId, rule), "1");

    } catch {

      /* ignore */

    }

    setDismissed(true);

  }, [clientId, rule]);



  return { dismissed, dismiss };

}



export default function DataQualityAdvisoryPanel({

  advisory,

  clientId,

  className = "",

}: DataQualityAdvisoryPanelProps) {

  const { dismissed, dismiss } = useDataQualityDismissed(clientId, advisory.rule);

  const styles = SEVERITY_STYLES[advisory.severity ?? "red"];



  if (dismissed) return null;



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

          <div className="flex items-start justify-between gap-2">

            <h3 className={`text-sm font-semibold ${styles.headline}`}>{advisory.headline}</h3>

            <button

              type="button"

              onClick={dismiss}

              className="p-1 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 transition-colors"

              aria-label="Dismiss advisory"

            >

              <X className="w-4 h-4" />

            </button>

          </div>

          <p className="text-sm text-slate-300 mt-1 leading-relaxed">{advisory.message}</p>

          <p className="text-xs text-slate-500 mt-2">

            These figures depend on how your books are kept. Prime Accounting Solutions can review and

            reconcile your books so your insights are precise.

          </p>

          <div className="flex flex-wrap items-center gap-3 mt-3">

            {/* Plain anchors so navigation works even if JS is busy/hydrating */}

            <a

              href="/contact"

              className={`inline-flex items-center px-3 py-1.5 rounded-lg text-white text-sm font-medium transition-colors ${styles.cta}`}

            >

              Talk to a Prime advisor

            </a>

            <a

              href={mailtoSales("PrimeCFO.ai — data quality review")}

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

        </div>

      </div>

    </div>

  );

}



/** Small info badge for metric cards affected by the advisory. */

export function DataQualityMetricBadge({

  advisory,

  metricTitle,

  clientId,

}: {

  advisory: DataQualityAdvisory;

  metricTitle: string;

  clientId: string;

}) {

  const { dismissed } = useDataQualityDismissed(clientId, advisory.rule);

  const [open, setOpen] = useState(false);

  const styles = SEVERITY_STYLES[advisory.severity ?? "red"];



  if (dismissed) return null;



  const affectsAll = advisory.affectedMetrics.includes("ALL");

  const matches = affectsAll || advisory.affectedMetrics.some(

    (m) => metricTitle.toLowerCase().includes(m.toLowerCase()) || m.toLowerCase().includes(metricTitle.toLowerCase())

  );

  if (!matches) return null;



  return (

    <div className="relative inline-flex">

      <button

        type="button"

        onClick={() => setOpen((v) => !v)}

        className={`p-1 rounded-md hover:bg-opacity-10 transition-colors ${styles.icon}`}

        aria-label="Data quality advisory"

        title={advisory.headline}

      >

        <Info className="w-4 h-4" />

      </button>

      {open && (

        <>

          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />

          <div className={`absolute right-0 top-full mt-1 z-50 w-72 rounded-lg border bg-slate-900 shadow-xl p-3 text-left ${styles.container}`}>

            <p className={`text-xs font-semibold mb-1 ${styles.headline}`}>{advisory.headline}</p>

            <p className="text-xs text-slate-300 leading-relaxed">{advisory.message}</p>

            <a

              href="/contact"

              className={`inline-block mt-2 text-xs font-medium ${styles.ctaLink}`}

              onClick={() => setOpen(false)}

            >

              Talk to a Prime advisor →

            </a>

          </div>

        </>

      )}

    </div>

  );

}


