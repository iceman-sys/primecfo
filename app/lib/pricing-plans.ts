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
  features: Feature[];
  cta: string;
  ctaNote: string;
  ctaKind: "signup" | "contact";
};

export const LANE_COLORS = {
  selfService: "#2A9D8F",
  hybrid: "#D4A843",
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
    features: [
      { label: "QuickBooks Dashboard", included: true },
      { label: "AI Financial Summaries", value: "Monthly" },
      { label: "Cash Flow Forecast", value: "30-day" },
      { label: "KPI Tracking", value: "3 KPIs" },
      { label: "Custom Alerts", included: false },
      { label: "In-App Chat", value: "AI only" },
      { label: "Advisory Hours", included: false },
      { label: "Monthly Review Call", included: false },
      { label: "Bookkeeping", included: false },
      { label: "Tax Preparation", included: false },
    ],
    cta: "Get Started Free",
    ctaNote: "14-day free trial",
    ctaKind: "signup",
  },
  {
    id: "starter",
    name: "Starter",
    subtitle: "AI + Hybrid",
    monthly: 249,
    annual: 209,
    accent: LANE_COLORS.selfService,
    popular: false,
    target: "Early-stage small businesses",
    features: [
      { label: "QuickBooks Dashboard", included: true },
      { label: "AI Financial Summaries", value: "Monthly" },
      { label: "Cash Flow Forecast", value: "30-day" },
      { label: "KPI Tracking", value: "5 KPIs" },
      { label: "Custom Alerts", included: false },
      { label: "In-App Chat", value: "AI + team escalation" },
      { label: "Advisory Hours", value: "1 hr/month" },
      { label: "Monthly Review Call", included: false },
      { label: "Bookkeeping", included: false },
      { label: "Tax Preparation", included: false },
    ],
    cta: "Start Free Trial",
    ctaNote: "14-day free trial",
    ctaKind: "signup",
  },
  {
    id: "growth",
    name: "Growth",
    subtitle: "AI + Advisory",
    monthly: 499,
    annual: 419,
    accent: LANE_COLORS.hybrid,
    popular: true,
    target: "Growing companies ($750K–$2M)",
    features: [
      { label: "QuickBooks Dashboard", included: true },
      { label: "AI Financial Summaries", value: "Weekly" },
      { label: "Cash Flow Forecast", value: "60-day" },
      { label: "KPI Tracking", value: "10 KPIs" },
      { label: "Custom Alerts", included: true },
      { label: "In-App Chat", value: "AI + team escalation" },
      { label: "Advisory Hours", value: "2 hrs/month" },
      { label: "Monthly Review Call", value: "15-min check-in" },
      { label: "Bookkeeping", included: false },
      { label: "Tax Preparation", included: false },
    ],
    cta: "Start Free Trial",
    ctaNote: "$500 one-time setup",
    ctaKind: "signup",
  },
  {
    id: "premier",
    name: "Premier",
    subtitle: "Full-Service + AI",
    monthly: 799,
    annual: 679,
    accent: LANE_COLORS.fullService,
    popular: false,
    target: "Established businesses ($2M–$10M)",
    features: [
      { label: "QuickBooks Dashboard", included: true },
      { label: "AI Financial Summaries", value: "Weekly" },
      { label: "Cash Flow Forecast", value: "90-day" },
      { label: "KPI Tracking", value: "Unlimited" },
      { label: "Custom Alerts", included: true },
      { label: "In-App Chat", value: "Direct team access" },
      { label: "Advisory Hours", value: "Included" },
      { label: "Monthly Review Call", value: "30-min strategy" },
      { label: "Bookkeeping", value: "Full-service" },
      { label: "Tax Preparation", value: "Add-on available" },
    ],
    cta: "Book a Consultation",
    ctaNote: "Setup waived with retainer",
    ctaKind: "contact",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    subtitle: "Full-Service + AI",
    monthly: 1499,
    annual: 1274,
    accent: LANE_COLORS.fullService,
    popular: false,
    target: "Complex / multi-entity ($10M+)",
    features: [
      { label: "QuickBooks Dashboard", included: true },
      { label: "AI Financial Summaries", value: "Daily" },
      { label: "Cash Flow Forecast", value: "90-day + scenarios" },
      { label: "KPI Tracking", value: "Unlimited + custom" },
      { label: "Custom Alerts", included: true },
      { label: "In-App Chat", value: "Dedicated team" },
      { label: "Advisory Hours", value: "Included" },
      { label: "Monthly Review Call", value: "60-min CFO call" },
      { label: "Bookkeeping", value: "Full-service" },
      { label: "Tax Preparation", value: "Included" },
    ],
    cta: "Book a Consultation",
    ctaNote: "Setup waived with retainer",
    ctaKind: "contact",
  },
];

export type Lane = {
  label: string;
  desc: string;
  color: string;
};

export const LANES: Lane[] = [
  { label: "Self-Service", desc: "AI Only", color: LANE_COLORS.selfService },
  { label: "Hybrid", desc: "AI + Your Team", color: LANE_COLORS.hybrid },
  { label: "Full-Service", desc: "Everything Included", color: LANE_COLORS.fullService },
];

export type DecisionHelper = {
  icon: "zap" | "users" | "building";
  title: string;
  desc: string;
  tier: string;
  color: string;
};

export const DECISION_HELPERS: DecisionHelper[] = [
  {
    icon: "zap",
    title: "I want to do it myself",
    desc: "Self-Service gives you the AI dashboard and insights. You run the show, the AI keeps you informed.",
    tier: "Self-Service — $99/mo",
    color: LANE_COLORS.selfService,
  },
  {
    icon: "users",
    title: "I want a guide",
    desc: "Starter or Growth gives you AI plus real accountants who check in, answer questions, and keep you on track.",
    tier: "Starter $249 / Growth $499",
    color: LANE_COLORS.hybrid,
  },
  {
    icon: "building",
    title: "Handle it all for me",
    desc: "Premier or Enterprise means we manage your books, taxes, and strategy — now supercharged with AI intelligence.",
    tier: "Premier $799 / Enterprise $1,499",
    color: LANE_COLORS.fullService,
  },
];

export type Faq = { q: string; a: string };

export const FAQS: Faq[] = [
  {
    q: "Can I switch tiers as my business grows?",
    a: "Absolutely. Upgrading is seamless — your dashboard, data, and history carry over automatically. You only gain features, never lose them.",
  },
  {
    q: "What if I already use Prime for accounting?",
    a: "Premier and Enterprise tiers are built for you. Your existing accounting services are included, now enhanced with AI-powered dashboards, forecasting, and KPI tracking.",
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
