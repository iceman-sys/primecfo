"use client";

import React from "react";

/**
 * Persistent in-app signal that a real accounting firm stands behind the platform.
 */
export default function PrimeBackedStrip({ className = "" }: { className?: string }) {
  return (
    <p
      className={`text-[11px] sm:text-xs text-slate-500 leading-snug ${className}`}
      role="note"
    >
      Backed by{" "}
      <a
        href="https://primeaccsolutions.com"
        target="_blank"
        rel="noopener noreferrer"
        className="text-slate-400 hover:text-teal-300 underline decoration-slate-700 underline-offset-2 transition-colors"
      >
        Prime Accounting Solutions, LLC
      </a>
      {" "}
      — 20 years helping small businesses unlock potential through financial intelligence.
    </p>
  );
}
