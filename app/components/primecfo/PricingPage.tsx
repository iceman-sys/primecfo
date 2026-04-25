"use client";

import React, { useState } from "react";
import { Check, Zap, Users, Building2, ArrowRight } from "lucide-react";
import {
  PLANS,
  FAQS,
  DECISION_HELPERS,
  CONTACT_EMAIL,
  type Plan,
  type DecisionHelper,
} from "@/app/lib/pricing-plans";

/** Deep navy palette (user reference ~#050714 / #080b1e) */
const BG_DEEP = "#050714";
const BG_LIFT = "#080b1e";
const BORDER_SOFT = "rgba(255, 255, 255, 0.06)";
const BORDER_SOFTER = "rgba(255, 255, 255, 0.04)";
const TEXT = "#f1f5f9";
const TEXT_MUTED = "#94a3b8";
const TEXT_DIM = "#64748b";

/** Brand accent — teal from `globals.css` */
const ACCENT = "hsl(var(--primary))";
const ACCENT_GLOW_SOFT = "hsl(var(--primary) / 0.14)";
const ACCENT_GLOW = "hsl(var(--primary) / 0.22)";

interface PricingPageProps {
  onPlanCta: (plan: Plan, interval: "month" | "year") => void;
  onContact: () => void;
  onStartTrial: () => void;
}

const DecisionIcon: React.FC<{ kind: DecisionHelper["icon"]; className?: string }> = ({ kind, className }) => {
  if (kind === "zap") return <Zap className={className} />;
  if (kind === "users") return <Users className={className} />;
  return <Building2 className={className} />;
};

const PricingPage: React.FC<PricingPageProps> = ({ onPlanCta, onContact, onStartTrial }) => {
  const [annual, setAnnual] = useState<boolean>(false);
  const [hoveredPlan, setHoveredPlan] = useState<number | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const serif = "var(--font-fraunces), Georgia, 'Times New Roman', serif";
  const sans = "var(--font-dm-sans), system-ui, sans-serif";

  const pageShell = {
    background: BG_DEEP,
    fontFamily: sans,
    color: TEXT,
  };

  const heroBg = {
    background: `
      radial-gradient(ellipse 120% 80% at 50% -40%, hsl(var(--primary) / 0.09), transparent 55%),
      linear-gradient(180deg, ${BG_LIFT} 0%, ${BG_DEEP} 45%, ${BG_DEEP} 100%)
    `,
  };

  return (
    <div className="min-h-screen antialiased" style={pageShell}>
      {/* HERO */}
      <div className="relative overflow-hidden px-6 pt-14 pb-10 md:pt-20 md:pb-14" style={heroBg}>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            maskImage: "linear-gradient(180deg, black 0%, transparent 85%)",
          }}
        />
        <div className="relative z-[1] mx-auto max-w-2xl text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: ACCENT }}>
            Pricing
          </p>
          <h1
            className="mb-4"
            style={{
              fontFamily: serif,
              fontSize: "clamp(32px, 4.5vw, 48px)",
              fontWeight: 700,
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              color: TEXT,
            }}
          >
            PrimeCFO<span style={{ color: ACCENT }}>.ai</span>
          </h1>
          <p className="mx-auto mb-8 max-w-lg text-base leading-relaxed" style={{ color: TEXT_MUTED }}>
            Three simple paths — see your numbers clearly, understand them with help, or act with a team in your
            corner.
          </p>

          <div
            role="radiogroup"
            aria-label="Billing period"
            className="inline-flex items-center gap-1 rounded-full p-1"
            style={{
              minHeight: 44,
              background: BG_DEEP,
              border: `1px solid ${BORDER_SOFT}`,
              boxShadow: `inset 0 1px 0 ${BORDER_SOFTER}`,
            }}
          >
            <button
              type="button"
              role="radio"
              aria-checked={!annual}
              onClick={() => setAnnual(false)}
              className="rounded-full px-5 py-2 text-sm transition-all duration-300"
              style={{
                fontWeight: annual ? 400 : 600,
                color: annual ? TEXT_DIM : ACCENT,
                background: annual ? "transparent" : ACCENT_GLOW_SOFT,
              }}
            >
              Monthly
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={annual}
              onClick={() => setAnnual(true)}
              className="flex items-center gap-2 rounded-full px-5 py-2 text-sm transition-all duration-300"
              style={{
                fontWeight: annual ? 600 : 400,
                color: annual ? ACCENT : TEXT_DIM,
                background: annual ? ACCENT_GLOW_SOFT : "transparent",
              }}
            >
              Annual
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                style={{ color: ACCENT, background: ACCENT_GLOW }}
              >
                Save 15–20%
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Subtle section divider */}
      <div className="h-px w-full" style={{ background: `linear-gradient(90deg, transparent, ${BORDER_SOFT}, transparent)` }} />

      {/* PRICING CARDS */}
      <div
        className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 py-14 md:grid-cols-3 md:gap-5"
        style={{ background: BG_DEEP }}
      >
        {PLANS.map((plan, i) => {
          const isHovered = hoveredPlan === i;
          const price = annual ? plan.annual : plan.monthly;
          const annualSavings = (plan.monthly - plan.annual) * 12;
          const isOutline = plan.ctaVariant === "outline";

          return (
            <div
              key={plan.id}
              onMouseEnter={() => setHoveredPlan(i)}
              onMouseLeave={() => setHoveredPlan(null)}
              className="relative flex flex-col rounded-2xl p-8 transition-all duration-300 motion-reduce:transition-none"
              style={{
                background: `linear-gradient(165deg, ${BG_LIFT} 0%, rgba(8, 11, 30, 0.92) 100%)`,
                border: plan.popular ? `2px solid ${ACCENT}` : `1px solid ${BORDER_SOFT}`,
                boxShadow: isHovered
                  ? `0 20px 48px rgba(0,0,0,0.45), 0 0 0 1px ${BORDER_SOFTER}, 0 0 40px hsl(var(--primary) / 0.08)`
                  : plan.popular
                    ? `0 12px 40px rgba(0,0,0,0.35), 0 0 0 1px ${BORDER_SOFT}, 0 0 32px hsl(var(--primary) / 0.06)`
                    : `0 8px 32px rgba(0,0,0,0.25), 0 0 0 1px ${BORDER_SOFTER}`,
                transform: isHovered ? "translateY(-4px)" : "none",
              }}
            >
              {plan.popular && (
                <div
                  className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white"
                  style={{
                    background: ACCENT,
                    boxShadow: `0 2px 16px hsl(var(--primary) / 0.4)`,
                  }}
                >
                  Most Popular
                </div>
              )}

              <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: ACCENT }}>
                {plan.tierWordmark}
              </p>

              <div className="mb-4 flex items-baseline gap-0.5">
                <span className="text-base font-medium" style={{ color: TEXT_DIM }}>
                  $
                </span>
                <span
                  className="leading-none"
                  style={{
                    fontFamily: serif,
                    fontSize: "clamp(40px, 5vw, 48px)",
                    fontWeight: 700,
                    letterSpacing: "-0.03em",
                    color: TEXT,
                  }}
                >
                  {price}
                </span>
                <span className="ml-0.5 text-sm" style={{ color: TEXT_DIM }}>
                  /mo
                </span>
              </div>
              {annual && annualSavings > 0 && (
                <p className="-mt-2 mb-3 text-xs font-medium" style={{ color: ACCENT }}>
                  Save ${annualSavings.toLocaleString()}/year
                </p>
              )}

              <h2
                className="mb-6 text-xl font-bold leading-snug md:text-[22px]"
                style={{ fontFamily: serif, color: TEXT }}
              >
                {plan.headline}
              </h2>

              <ul className="mb-8 flex flex-1 flex-col gap-3">
                {plan.cardBullets.map((line) => (
                  <li key={line} className="flex gap-3 text-[14px] leading-snug" style={{ color: TEXT_MUTED }}>
                    <span
                      className="mt-0.5 flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full"
                      style={{ background: ACCENT_GLOW }}
                    >
                      <Check className="h-3 w-3" style={{ color: ACCENT }} strokeWidth={2.75} />
                    </span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => onPlanCta(plan, annual ? "year" : "month")}
                className="w-full cursor-pointer rounded-xl py-3.5 text-sm font-semibold transition-all duration-200"
                style={
                  isOutline
                    ? {
                        border: `2px solid ${ACCENT}`,
                        color: ACCENT,
                        background: "transparent",
                        boxShadow: isHovered ? `0 0 24px hsl(var(--primary) / 0.15)` : "none",
                      }
                    : {
                        border: "none",
                        color: "#fff",
                        background: ACCENT,
                        boxShadow: isHovered
                          ? `0 8px 24px hsl(var(--primary) / 0.35)`
                          : `0 4px 16px hsl(var(--primary) / 0.25)`,
                      }
                }
              >
                {plan.cta}
              </button>
              <p className="mt-3 text-center text-xs" style={{ color: TEXT_DIM }}>
                {plan.ctaFooter}
              </p>
            </div>
          );
        })}
      </div>

      <div className="h-px w-full" style={{ background: `linear-gradient(90deg, transparent, ${BORDER_SOFT}, transparent)` }} />

      {/* DECISION HELPER */}
      <div className="px-6 py-16" style={{ background: BG_LIFT }}>
        <div className="mx-auto max-w-3xl text-center">
          <h2
            className="mb-3 text-3xl font-bold md:text-[32px]"
            style={{
              color: TEXT,
              fontFamily: serif,
              letterSpacing: "-0.02em",
            }}
          >
            Not sure which tier is right?
          </h2>
          <p className="mb-12 text-base leading-relaxed" style={{ color: TEXT_MUTED }}>
            Here&apos;s the simple version: choose based on how much you want us involved.
          </p>

          <div className="grid grid-cols-1 gap-6 text-left md:grid-cols-3">
            {DECISION_HELPERS.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl p-7 transition-shadow duration-300"
                style={{
                  background: `linear-gradient(165deg, rgba(5, 7, 20, 0.6) 0%, ${BG_DEEP} 100%)`,
                  border: `1px solid ${BORDER_SOFT}`,
                  boxShadow: `0 8px 32px rgba(0,0,0,0.2)`,
                }}
              >
                <div
                  className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl"
                  style={{ background: ACCENT_GLOW, color: ACCENT }}
                >
                  <DecisionIcon kind={item.icon} className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-bold" style={{ color: TEXT }}>
                  {item.title}
                </h3>
                <p className="mb-4 text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>
                  {item.desc}
                </p>
                <div
                  className="inline-block rounded-lg px-3 py-1.5 text-[13px] font-semibold"
                  style={{ color: ACCENT, background: ACCENT_GLOW_SOFT }}
                >
                  {item.tier}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="h-px w-full" style={{ background: `linear-gradient(90deg, transparent, ${BORDER_SOFT}, transparent)` }} />

      {/* FAQ */}
      <div className="px-6 py-16" style={{ background: BG_DEEP }}>
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-8 text-center text-[28px] font-bold" style={{ color: TEXT, fontFamily: serif }}>
            Frequently Asked Questions
          </h2>

          {FAQS.map((faq, idx) => {
            const isOpen = expandedFaq === idx;
            const panelId = `faq-panel-${idx}`;
            const buttonId = `faq-button-${idx}`;
            return (
              <div key={faq.q} className="overflow-hidden border-b" style={{ borderColor: BORDER_SOFT }}>
                <button
                  id={buttonId}
                  type="button"
                  onClick={() => setExpandedFaq(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  className="flex w-full cursor-pointer items-center justify-between border-0 bg-transparent py-5 text-left"
                >
                  <span className="pr-4 text-[15px] font-semibold" style={{ color: TEXT }}>
                    {faq.q}
                  </span>
                  <span
                    className="flex-shrink-0 text-xl transition-transform duration-300 motion-reduce:transition-none"
                    style={{
                      color: TEXT_DIM,
                      transform: isOpen ? "rotate(45deg)" : "none",
                    }}
                    aria-hidden
                  >
                    +
                  </span>
                </button>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  hidden={!isOpen}
                  className="overflow-hidden transition-all duration-300 motion-reduce:transition-none"
                  style={{
                    maxHeight: isOpen ? 280 : 0,
                    opacity: isOpen ? 1 : 0,
                  }}
                >
                  <p className="m-0 mb-5 pr-10 text-sm leading-[1.7]" style={{ color: TEXT_MUTED }}>
                    {faq.a}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CTA FOOTER — smooth blend back into lift tone + teal accent */}
      <div
        className="px-6 py-16 text-center"
        style={{
          background: `linear-gradient(180deg, ${BG_LIFT} 0%, ${BG_DEEP} 100%)`,
          borderTop: `1px solid ${BORDER_SOFT}`,
        }}
      >
        <h2 className="mb-3 text-[32px] font-bold" style={{ fontFamily: serif, color: TEXT }}>
          Ready to see your numbers clearly?
        </h2>
        <p className="mb-8 text-base" style={{ color: TEXT_MUTED }}>
          Start with a free 14-day trial. No credit card required.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={onStartTrial}
            className="group flex cursor-pointer items-center gap-2 rounded-xl border-0 px-8 py-3.5 text-[15px] font-semibold text-white transition-transform duration-200 hover:brightness-110"
            style={{
              background: ACCENT,
              boxShadow: `0 4px 20px hsl(var(--primary) / 0.35)`,
            }}
          >
            Start Free Trial
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
          </button>
          <button
            type="button"
            onClick={onContact}
            className="cursor-pointer rounded-xl px-8 py-3.5 text-[15px] font-semibold transition-colors duration-200"
            style={{
              border: `2px solid ${BORDER_SOFT}`,
              color: TEXT,
              background: ACCENT_GLOW_SOFT,
            }}
          >
            Book a Consultation
          </button>
        </div>
        <p className="mt-6 text-xs" style={{ color: TEXT_DIM }}>
          Questions?{" "}
          <a className="underline decoration-white/20 transition-colors hover:text-white" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>
        </p>
      </div>
    </div>
  );
};

export default PricingPage;
