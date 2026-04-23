"use client";

import React, { useState } from "react";
import { Check, Minus, Zap, Users, Building2, ArrowRight } from "lucide-react";
import {
  PLANS,
  LANES,
  FAQS,
  DECISION_HELPERS,
  CONTACT_EMAIL,
  type Plan,
  type DecisionHelper,
} from "@/app/lib/pricing-plans";

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

  return (
    <div
      className="min-h-screen"
      style={{
        background: "#FAFBFC",
        fontFamily: "var(--font-dm-sans), 'Helvetica Neue', sans-serif",
      }}
    >
      {/* HERO */}
      <div
        className="relative overflow-hidden px-6 pt-14 pb-20 md:pt-20 md:pb-28"
        style={{ background: "linear-gradient(160deg, #0F2238 0%, #1B3A5C 40%, #1E4D6B 100%)" }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative z-[1] mx-auto max-w-3xl text-center">
          <div
            className="mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5"
            style={{ background: "rgba(42, 157, 143, 0.2)", borderColor: "rgba(42, 157, 143, 0.3)" }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />
            <span className="text-xs font-medium uppercase tracking-[0.08em] text-teal-300">Powered by AI</span>
          </div>

          <h1
            className="mb-4 text-white"
            style={{
              fontFamily: "var(--font-fraunces), Georgia, serif",
              fontSize: "clamp(36px, 5vw, 56px)",
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-1px",
            }}
          >
            PrimeCFO<span style={{ color: "#2A9D8F" }}>.ai</span>
          </h1>

          <p
            className="mx-auto mb-8 max-w-xl font-light leading-relaxed text-white/70"
            style={{ fontSize: "clamp(16px, 2.2vw, 20px)" }}
          >
            Financial intelligence for every stage of growth. From AI-powered self-service to full-service CFO advisory
            — one platform, your way.
          </p>

          {/* Toggle */}
          <div
            role="radiogroup"
            aria-label="Billing period"
            className="inline-flex items-center gap-2 rounded-full border p-1.5"
            style={{
              background: "rgba(255,255,255,0.08)",
              borderColor: "rgba(255,255,255,0.1)",
              minHeight: 44,
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
                color: annual ? "rgba(255,255,255,0.55)" : "#fff",
                background: annual ? "transparent" : "rgba(255,255,255,0.12)",
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
                color: annual ? "#fff" : "rgba(255,255,255,0.55)",
                background: annual ? "rgba(42,157,143,0.25)" : "transparent",
              }}
            >
              Annual
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                style={{ color: "#2A9D8F", background: "rgba(42,157,143,0.15)" }}
              >
                Save 15-20%
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* LANE LABELS */}
      <div className="relative z-[2] mx-auto max-w-[1280px] -mt-10 px-6">
        <div className="mb-5 flex flex-wrap justify-center gap-3">
          {LANES.map((lane) => (
            <div
              key={lane.label}
              className="flex items-center gap-2 rounded-full bg-white px-5 py-2"
              style={{
                boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                border: `1px solid ${lane.color}22`,
              }}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: lane.color }} />
              <span className="text-[13px] font-semibold" style={{ color: "#1B3A5C" }}>
                {lane.label}
              </span>
              <span className="text-xs text-slate-500">{lane.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* PRICING CARDS */}
      <div
        className="mx-auto grid max-w-[1320px] grid-cols-1 gap-4 px-4 pb-14 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 xl:gap-3"
      >
        {PLANS.map((plan, i) => {
          const isHovered = hoveredPlan === i;
          const price = annual ? plan.annual : plan.monthly;
          const annualSavings = (plan.monthly - plan.annual) * 12;

          return (
            <div
              key={plan.id}
              onMouseEnter={() => setHoveredPlan(i)}
              onMouseLeave={() => setHoveredPlan(null)}
              className="relative flex flex-col rounded-2xl p-7 transition-all duration-300 motion-reduce:transition-none xl:p-5"
              style={{
                background: plan.popular
                  ? "linear-gradient(180deg, #FFFDF5 0%, #FFFFFF 100%)"
                  : "#FFFFFF",
                border: plan.popular ? "2px solid #D4A843" : "1px solid #E5E7EB",
                transform: isHovered ? "translateY(-4px)" : "none",
                boxShadow: isHovered
                  ? "0 20px 40px rgba(0,0,0,0.1), 0 8px 16px rgba(0,0,0,0.06)"
                  : plan.popular
                  ? "0 8px 30px rgba(212,168,67,0.15)"
                  : "0 2px 8px rgba(0,0,0,0.04)",
              }}
            >
              {plan.popular && (
                <div
                  className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full px-4 py-1 text-[11px] font-bold uppercase tracking-wider text-white"
                  style={{
                    background: "linear-gradient(135deg, #D4A843, #C49A38)",
                    boxShadow: "0 2px 8px rgba(212,168,67,0.3)",
                  }}
                >
                  Most Popular
                </div>
              )}

              <div
                className="mb-5 h-[3px] w-full rounded-sm opacity-60"
                style={{ background: plan.accent }}
              />

              <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                {plan.subtitle}
              </div>
              <h3
                className="mb-1 text-[22px] font-bold"
                style={{ color: "#1B3A5C", fontFamily: "var(--font-fraunces), Georgia, serif" }}
              >
                {plan.name}
              </h3>
              <p className="mb-5 text-xs leading-snug text-slate-500">{plan.target}</p>

              {/* Price */}
              <div className="mb-5">
                <div className="flex items-baseline gap-0.5">
                  <span className="text-sm font-medium text-slate-500">$</span>
                  <span
                    className="leading-none"
                    style={{
                      fontSize: 42,
                      fontWeight: 700,
                      color: "#1B3A5C",
                      fontFamily: "var(--font-fraunces), Georgia, serif",
                      letterSpacing: "-2px",
                    }}
                  >
                    {price}
                  </span>
                  <span className="ml-0.5 text-sm text-slate-400">/mo</span>
                </div>
                {annual && annualSavings > 0 && (
                  <div className="mt-1 text-xs font-medium" style={{ color: "#2A9D8F" }}>
                    Save ${annualSavings.toLocaleString()}/year
                  </div>
                )}
                <div className="mt-1 text-[11px] text-slate-400">{plan.ctaNote}</div>
              </div>

              {/* Features */}
              <div className="mb-6 flex-1">
                {plan.features.map((f) => {
                  const isExcluded = f.included === false;
                  return (
                    <div
                      key={f.label}
                      className="flex items-center gap-2.5 border-b border-slate-100 py-[7px]"
                    >
                      {isExcluded ? (
                        <span className="flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full bg-slate-200">
                          <Minus className="h-3 w-3 text-slate-400" strokeWidth={2.5} />
                        </span>
                      ) : (
                        <span
                          className="flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full"
                          style={{ background: "rgba(42,157,143,0.15)" }}
                        >
                          <Check className="h-3 w-3" style={{ color: "#2A9D8F" }} strokeWidth={3} />
                        </span>
                      )}
                      <span
                        className="flex-1 text-[13px]"
                        style={{ color: isExcluded ? "#C0C4CC" : "#4B5563" }}
                      >
                        {f.label}
                      </span>
                      {f.value && (
                        <span
                          className="whitespace-nowrap rounded px-2 py-0.5 text-[11px] font-semibold"
                          style={{ color: "#1B3A5C", background: "#F0F4F8" }}
                        >
                          {f.value}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* CTA */}
              <button
                type="button"
                onClick={() => onPlanCta(plan, annual ? "year" : "month")}
                className="w-full cursor-pointer rounded-[10px] border-0 py-3.5 text-sm font-semibold text-white transition-all duration-200"
                style={{
                  background: plan.popular
                    ? "linear-gradient(135deg, #D4A843, #C49A38)"
                    : plan.ctaKind === "contact"
                    ? "#1B3A5C"
                    : "#2A9D8F",
                  boxShadow: isHovered ? "0 4px 12px rgba(0,0,0,0.15)" : "none",
                }}
              >
                {plan.cta}
              </button>
            </div>
          );
        })}
      </div>

      {/* DECISION HELPER */}
      <div className="border-t border-slate-200 bg-white px-6 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2
            className="mb-3 text-3xl font-bold md:text-[32px]"
            style={{
              color: "#1B3A5C",
              fontFamily: "var(--font-fraunces), Georgia, serif",
              letterSpacing: "-0.5px",
            }}
          >
            Not sure which tier is right?
          </h2>
          <p className="mb-12 text-base leading-relaxed text-slate-500">
            Here&apos;s the simple version: choose based on how much you want us involved.
          </p>

          <div className="grid grid-cols-1 gap-6 text-left md:grid-cols-3">
            {DECISION_HELPERS.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-slate-200 p-7"
                style={{ background: "#FAFBFC" }}
              >
                <div
                  className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl"
                  style={{ background: `${item.color}18`, color: item.color }}
                >
                  <DecisionIcon kind={item.icon} className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-bold" style={{ color: "#1B3A5C" }}>
                  {item.title}
                </h3>
                <p className="mb-4 text-sm leading-relaxed text-slate-500">{item.desc}</p>
                <div
                  className="inline-block rounded-lg px-3 py-1.5 text-[13px] font-semibold"
                  style={{ color: item.color, background: `${item.color}11` }}
                >
                  {item.tier}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="border-t border-slate-200 px-6 py-16" style={{ background: "#FAFBFC" }}>
        <div className="mx-auto max-w-2xl">
          <h2
            className="mb-8 text-center text-[28px] font-bold"
            style={{ color: "#1B3A5C", fontFamily: "var(--font-fraunces), Georgia, serif" }}
          >
            Frequently Asked Questions
          </h2>

          {FAQS.map((faq, idx) => {
            const isOpen = expandedFaq === idx;
            const panelId = `faq-panel-${idx}`;
            const buttonId = `faq-button-${idx}`;
            return (
              <div key={faq.q} className="overflow-hidden border-b border-slate-200">
                <button
                  id={buttonId}
                  type="button"
                  onClick={() => setExpandedFaq(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  className="flex w-full cursor-pointer items-center justify-between border-0 bg-transparent py-5 text-left"
                >
                  <span className="pr-4 text-[15px] font-semibold" style={{ color: "#1B3A5C" }}>
                    {faq.q}
                  </span>
                  <span
                    className="flex-shrink-0 text-xl text-slate-400 transition-transform duration-300 motion-reduce:transition-none"
                    style={{ transform: isOpen ? "rotate(45deg)" : "none" }}
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
                    maxHeight: isOpen ? 240 : 0,
                    opacity: isOpen ? 1 : 0,
                  }}
                >
                  <p className="m-0 mb-5 pr-10 text-sm leading-[1.7] text-slate-500">{faq.a}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CTA FOOTER STRIP */}
      <div
        className="px-6 py-16 text-center"
        style={{ background: "linear-gradient(160deg, #0F2238 0%, #1B3A5C 100%)" }}
      >
        <h2
          className="mb-3 text-[32px] font-bold text-white"
          style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
        >
          Ready to see your numbers clearly?
        </h2>
        <p className="mb-8 text-base text-white/60">
          Start with a free 14-day trial. No credit card required.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={onStartTrial}
            className="group flex cursor-pointer items-center gap-2 rounded-[10px] border-0 px-8 py-3.5 text-[15px] font-semibold text-white transition-transform"
            style={{ background: "#2A9D8F" }}
          >
            Start Free Trial
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
          </button>
          <button
            type="button"
            onClick={onContact}
            className="cursor-pointer rounded-[10px] border bg-transparent px-8 py-3.5 text-[15px] font-semibold text-white"
            style={{ borderColor: "rgba(255,255,255,0.2)" }}
          >
            Book a Consultation
          </button>
        </div>
        <p className="mt-6 text-xs text-white/40">
          Questions?{" "}
          <a className="underline decoration-white/30 hover:text-white" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>
        </p>
      </div>
    </div>
  );
};

export default PricingPage;
