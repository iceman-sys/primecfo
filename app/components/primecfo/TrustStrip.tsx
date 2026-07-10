"use client";

import React from "react";
import { ShieldCheck, Star } from "lucide-react";
import { TESTIMONIALS, TRUST_LOGOS } from "@/app/lib/pricing-plans";

/**
 * Renders trusted-by logos and a few short testimonials.
 * Sits above pricing on the landing + pricing pages to build buyer trust.
 *
 * We render logos as small SVG marks (inline) so they look sharp on any DPR
 * and don't require us to ship/host third-party brand assets.
 */

const LogoMark: React.FC<{ name: string; className?: string }> = ({ name, className }) => {
  const cls = className ?? "h-5 w-5";
  switch (name) {
    case "QuickBooks":
      return (
        <span
          aria-hidden
          className="inline-flex items-center gap-2"
        >
          <svg viewBox="0 0 32 32" className={cls} fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="15" stroke="currentColor" strokeWidth="2" />
            <path
              d="M11 9.5h3.25a4.5 4.5 0 0 1 0 9H12.5v-2H14.25a2.5 2.5 0 0 0 0-5H11v-2Zm10 5H17.75a4.5 4.5 0 0 1 0-9H19.5v2H17.75a2.5 2.5 0 0 0 0 5H21v2Z"
              fill="currentColor"
            />
          </svg>
          <span className="text-base font-semibold tracking-tight">QuickBooks</span>
        </span>
      );
    case "Stripe":
      return (
        <span aria-hidden className="inline-flex items-center gap-2">
          <svg viewBox="0 0 32 32" className={cls} fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="1" y="4" width="30" height="24" rx="6" stroke="currentColor" strokeWidth="2" />
            <path
              d="M18.4 13.2c-.9-.4-1.6-.6-2.3-.6-.8 0-1.3.3-1.3.8 0 1.4 5.2.8 5.2 4.4 0 2-1.6 3.2-3.9 3.2-1 0-2.1-.2-3.3-.7v-2.5c1 .6 2.3.9 3.3.9.8 0 1.4-.3 1.4-.9 0-1.5-5.2-.9-5.2-4.4 0-2 1.5-3.1 3.7-3.1.9 0 1.9.1 2.9.5l-.5 2.4Z"
              fill="currentColor"
            />
          </svg>
          <span className="text-base font-semibold tracking-tight italic">Stripe</span>
        </span>
      );
    case "Plaid":
      return (
        <span aria-hidden className="inline-flex items-center gap-2">
          <svg viewBox="0 0 32 32" className={cls} fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M16 3 5 9v8c0 5.6 4.4 10.9 11 12 6.6-1.1 11-6.4 11-12V9l-11-6Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path d="M16 11v10M11 16h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="text-base font-semibold tracking-tight">Plaid</span>
        </span>
      );
    case "Supabase":
      return (
        <span aria-hidden className="inline-flex items-center gap-2">
          <svg viewBox="0 0 32 32" className={cls} fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M18.3 2.5c.9 0 1.5.9 1 1.7L14 16h11.5c1.2 0 1.8 1.4 1 2.3L15 30c-.7.8-2 .1-1.8-1L15 19H4.6c-1.2 0-1.8-1.4-1-2.3L17 3c.3-.3.7-.5 1.3-.5Z"
              fill="currentColor"
              fillOpacity="0.9"
            />
          </svg>
          <span className="text-base font-semibold tracking-tight">Supabase</span>
        </span>
      );
    case "SOC 2":
      return (
        <span aria-hidden className="inline-flex items-center gap-2">
          <ShieldCheck className={cls} />
          <span className="text-base font-semibold tracking-tight">SOC 2</span>
        </span>
      );
    default:
      return <span className="text-base font-semibold tracking-tight">{name}</span>;
  }
};

const TrustStrip: React.FC<{
  className?: string;
  /** When true, also renders 2-3 short testimonials (default true). */
  showTestimonials?: boolean;
  /** Optional eyebrow text — defaults to "Trusted Integrations & Standards". */
  eyebrow?: string;
}> = ({ className = "", showTestimonials = true, eyebrow }) => {
  return (
    <section
      aria-label="Trusted integrations and customer feedback"
      className={`relative bg-slate-950 border-y border-slate-800/60 ${className}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-14">
        <p className="text-center text-[11px] sm:text-xs text-slate-500 uppercase tracking-[0.22em] font-semibold mb-7">
          {eyebrow ?? "Trusted Integrations & Standards"}
        </p>

        <ul
          role="list"
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-x-6 gap-y-6 items-center justify-items-center text-slate-400"
        >
          {TRUST_LOGOS.map((logo) => (
            <li
              key={logo.name}
              className="flex flex-col items-center gap-1 group transition-colors hover:text-slate-200"
            >
              <LogoMark name={logo.name} />
              {logo.caption && (
                <span className="text-[10px] uppercase tracking-wider text-slate-600 group-hover:text-slate-500">
                  {logo.caption}
                </span>
              )}
            </li>
          ))}
        </ul>

        <p className="mt-6 text-center text-xs text-slate-600">
          Built by{" "}
          <a
            href="https://primeaccsolutions.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-teal-300 transition-colors underline decoration-slate-700 underline-offset-4"
          >
            Prime Accounting Solutions
          </a>{" "}
          · 20 years helping small businesses unlock potential through financial intelligence.
        </p>

        {showTestimonials && (
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TESTIMONIALS.map((t) => (
              <figure
                key={t.author}
                className="relative h-full rounded-2xl border border-slate-800/70 bg-slate-900/40 p-5 backdrop-blur-sm hover:border-slate-700/80 hover:bg-slate-900/60 transition-colors"
              >
                <div className="flex items-center gap-1 mb-3 text-amber-400" aria-hidden>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5" fill="currentColor" stroke="none" />
                  ))}
                </div>
                <blockquote className="text-[13.5px] leading-relaxed text-slate-300">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-4 flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-400">
                    <span className="font-semibold text-slate-200">{t.author}</span>{" "}
                    <span className="text-slate-500">· {t.location}</span>
                  </span>
                  {t.source && (
                    <span className="text-[10px] uppercase tracking-wider text-slate-600">
                      via {t.source}
                    </span>
                  )}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default TrustStrip;
