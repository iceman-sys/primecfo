"use client";

import React from "react";
import { Calendar, MessageCircle } from "lucide-react";
import { CALENDAR_URL, mailtoSales } from "@/lib/site/contact";

type AdvisorCtaProps = {
  /** Compact for insight cards; default for header */
  variant?: "header" | "insight" | "inline";
  subject?: string;
  className?: string;
};

/**
 * Persistent path to Prime Accounting Solutions — the human backstop behind the AI.
 * Uses plain anchors so navigation works even if the app is busy.
 */
export default function AdvisorCta({
  variant = "header",
  subject = "PrimeCFO.ai — talk to my advisor",
  className = "",
}: AdvisorCtaProps) {
  if (variant === "insight") {
    return (
      <div className={`flex flex-wrap items-center gap-3 ${className}`}>
        <a
          href={CALENDAR_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-400 hover:text-teal-300 transition-colors"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          Discuss this with your Prime advisor
        </a>
        <a
          href={mailtoSales(subject)}
          className="text-xs text-slate-500 hover:text-slate-300 underline-offset-2 hover:underline transition-colors"
        >
          Email
        </a>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <a
        href={CALENDAR_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-1.5 text-sm text-teal-400 hover:text-teal-300 font-medium ${className}`}
      >
        <MessageCircle className="w-3.5 h-3.5" />
        Talk to your Prime advisor
      </a>
    );
  }

  return (
    <a
      href={CALENDAR_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-teal-500/30 bg-teal-500/10 text-teal-300 text-sm font-medium hover:bg-teal-500/20 hover:border-teal-500/50 transition-colors ${className}`}
    >
      <Calendar className="w-4 h-4" />
      Talk to Your Advisor
    </a>
  );
}
