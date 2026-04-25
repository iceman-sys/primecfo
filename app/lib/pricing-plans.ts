export type Feature = {
  label: string;
  included?: boolean;
  value?: string;
};

export type Plan = {
  id: string;
  name: string;
  subtitle: string;
  monthly: number;
  annual: number;
  accent: string;
  popular: boolean;
  target: string;
  /** Legacy row-style features (e.g. admin); cards use `cardBullets`. */
  features: Feature[];
  /** Short bullets on the pricing cards (screenshot style). */
  cardBullets: string[];
  /** SEE / UNDERSTAND / ACT */
  tierWordmark: string;
  /** Serif headline under the price */
  headline: string;
  cta: string;
  ctaNote: string;
  ctaKind: "signup" | "contact";
  /** Outlined vs filled primary button */
  ctaVariant: "outline" | "solid";
  /** Muted line below the CTA */
  ctaFooter: string;
};

/** Teal aligned with `globals.css` `--primary` (173 80% 40%) / Navbar accents */
export const LANE_COLORS = {
  selfService: "#14b8a6",
  hybrid: "#0d9488",
  fullService: "#1B3A5C",
} as const;

export const PLANS: Plan[] = [
  {
    id: "self-service",
    name: "Self-Service",
    subtitle: "AI Only",
    monthly: 99,
    annual: 79,
    accent: LANE_COLORS.selfService,
    popular: false,
    target: "Solopreneurs & DIY bookkeepers",
    tierWordmark: "SEE",
    headline: "Your numbers, finally clear.",
    cardBullets: [
      "5 key metrics dashboard",
      "Monthly AI summary in plain English",
      "30-day cash flow forecast",
    ],
    features: [
      { label: "QuickBooks Dashboard", included: true },
      { label: "AI Financial Summaries", value: "Monthly" },
      { label: "Cash Flow Forecast", value: "30-day" },
      { label: "KPI Tracking", value: "5 KPIs" },
    ],
    cta: "Start Free for 14 Days",
    ctaNote: "14-day free trial",
    ctaKind: "signup",
    ctaVariant: "outline",
    ctaFooter: "No credit card required",
  },
  {
    id: "starter",
    name: "Starter",
    subtitle: "AI + Hybrid",
    monthly: 249,
    annual: 209,
    accent: LANE_COLORS.selfService,
    popular: true,
    target: "Early-stage small businesses",
    tierWordmark: "UNDERSTAND",
    headline: "AI insights. Human guidance.",
    cardBullets: [
      "Everything in See",
      "Weekly AI financial summaries",
      "60-day cash flow forecast",
      "1 hour/month with a real accountant",
    ],
    features: [
      { label: "QuickBooks Dashboard", included: true },
      { label: "AI Financial Summaries", value: "Weekly" },
      { label: "Cash Flow Forecast", value: "60-day" },
      { label: "Advisory Hours", value: "1 hr/month" },
    ],
    cta: "Start Free for 14 Days",
    ctaNote: "14-day free trial",
    ctaKind: "signup",
    ctaVariant: "solid",
    ctaFooter: "Most popular for growing businesses",
  },
  {
    id: "growth",
    name: "Growth",
    subtitle: "AI + Advisory",
    monthly: 449,
    annual: 379,
    accent: LANE_COLORS.hybrid,
    popular: false,
    target: "Growing companies ($750K–$2M)",
    tierWordmark: "ACT",
    headline: "A finance team in your corner.",
    cardBullets: [
      "Everything in Understand",
      "90-day forecast with scenarios",
      "Custom alerts when numbers shift",
      "2 hrs/month advisory + strategy call",
    ],
    features: [
      { label: "QuickBooks Dashboard", included: true },
      { label: "Cash Flow Forecast", value: "90-day + scenarios" },
      { label: "Custom Alerts", included: true },
      { label: "Advisory Hours", value: "2 hrs/month" },
    ],
    cta: "Book a Conversation",
    ctaNote: "",
    ctaKind: "contact",
    ctaVariant: "outline",
    ctaFooter: "For businesses ready to scale",
  },
];

export type DecisionHelper = {
  icon: "zap" | "users" | "building";
  title: string;
  desc: string;
  tier: string;
};

export const DECISION_HELPERS: DecisionHelper[] = [
  {
    icon: "zap",
    title: "I want to do it myself",
    desc: "See gives you a clear dashboard, monthly AI summary, and a 30-day cash outlook — you stay in control.",
    tier: "See — $99/mo",
  },
  {
    icon: "users",
    title: "I want a guide",
    desc: "Understand adds weekly summaries, a longer forecast, and an hour each month with a real accountant.",
    tier: "Understand — $249/mo",
  },
  {
    icon: "building",
    title: "I want a partner",
    desc: "Act layers in scenario planning, alerts, and more advisory time — a finance team in your corner.",
    tier: "Act — $449/mo",
  },
];

export type Faq = { q: string; a: string };

export const FAQS: Faq[] = [
  {
    q: "Can I switch tiers as my business grows?",
    a: "Absolutely. Upgrading is seamless — your dashboard, data, and history carry over automatically. You only gain features, never lose them.",
  },
  {
    q: "Do you offer full-service bookkeeping or tax prep?",
    a: "Bookkeeping and tax services are available as a separate engagement with Prime Accounting Solutions. Email us and we'll put together a quote that fits your business.",
  },
  {
    q: "How does the AI generate financial summaries?",
    a: "PrimeCFO.ai connects directly to your QuickBooks data, analyzes trends, anomalies, and key metrics, then generates plain-English summaries tailored to your business — like having a CFO review your numbers.",
  },
  {
    q: "Is my financial data secure?",
    a: "We maintain bank-level encryption, SOC 2 compliance standards, and a comprehensive Written Information Security Program (WISP). Your data is never shared or sold.",
  },
];

export const CONTACT_EMAIL = "andrew@primeaccsolutions.com";
