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
  /**
   * - "signup"   → self-serve checkout (Stripe)
   * - "contact"  → mailto: opens an email draft
   * - "calendar" → open a calendar booking link (Calendly/Cal.com)
   */
  ctaKind: "signup" | "contact" | "calendar";
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
    monthly: 119,
    annual: 99,
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
    monthly: 349,
    annual: 299,
    accent: LANE_COLORS.selfService,
    popular: true,
    target: "Early-stage small businesses",
    tierWordmark: "UNDERSTAND",
    headline: "AI insights. Human guidance.",
    cardBullets: [
      "Everything in See",
      "Weekly AI financial summaries",
      "60-day cash flow forecast",
      "1 hour quarterly advisory meeting",
    ],
    features: [
      { label: "QuickBooks Dashboard", included: true },
      { label: "AI Financial Summaries", value: "Weekly" },
      { label: "Cash Flow Forecast", value: "60-day" },
      { label: "Advisory Hours", value: "1 hr/quarter meeting" },
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
    monthly: 529,
    annual: 479,
    accent: LANE_COLORS.hybrid,
    popular: false,
    target: "Growing companies ($750K–$2M)",
    tierWordmark: "ACT",
    headline: "A finance team in your corner.",
    cardBullets: [
      "Everything in Understand",
      "90-day forecast with scenarios",
      "Custom alerts when numbers shift",
      "1 hour monthly advisory meeting",
    ],
    features: [
      { label: "QuickBooks Dashboard", included: true },
      { label: "Cash Flow Forecast", value: "90-day + scenarios" },
      { label: "Custom Alerts", included: true },
      { label: "Advisory Hours", value: "1 hr/month meeting" },
    ],
    cta: "Book a Conversation",
    ctaNote: "",
    ctaKind: "calendar",
    ctaVariant: "outline",
    ctaFooter: "Pick a time that works — no email tag",
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
    tier: "See — $99/mo billed annually ($119 monthly)",
  },
  {
    icon: "users",
    title: "I want a guide",
    desc: "Understand adds weekly summaries, a longer forecast, and a 1-hour quarterly advisory meeting.",
    tier: "Understand — $299/mo billed annually ($349 monthly)",
  },
  {
    icon: "building",
    title: "I want a partner",
    desc: "Act layers in scenario planning, alerts, and a 1-hour monthly advisory meeting — a finance team in your corner.",
    tier: "Act — $479/mo billed annually ($529 monthly)",
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

export {
  CALENDAR_URL,
  CONTACT_EMAIL,
  SALES_EMAIL,
  SUPPORT_EMAIL,
} from '@/lib/site/contact';

/** Short testimonial pulled from real Yelp reviews of Prime Accounting Solutions. */
export type Testimonial = {
  quote: string;
  author: string;
  location: string;
  source?: string;
};

export const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "I cannot say enough good things about Andrew and his team. He's always responsive and easy to deal with. Do yourself a favor — hand off this task to Prime Accounting.",
    author: "Michael B.",
    location: "Los Angeles, CA",
    source: "Yelp",
  },
  {
    quote:
      "Andrew and his team were so professional and welcoming. I needed help getting a better handle on my monthly expenses — if you're looking for someone who can get you on track and put you at ease, call them ASAP.",
    author: "Paul J.",
    location: "Santa Monica, CA",
    source: "Yelp",
  },
  {
    quote:
      "7 years and counting. 30 years in business — believe me, I know what it's like to be frustrated with bookkeeping and taxes. He knows accounting better than anyone we've ever used. An absolute professional.",
    author: "Richard R.",
    location: "Los Angeles, CA",
    source: "Yelp",
  },
];

/** Trust logos shown above pricing. SVG strings are inlined to avoid extra asset hosting. */
export type TrustLogo = {
  name: string;
  /** A short subtitle/badge, e.g. "Official Integration" or "SOC 2 aligned" */
  caption?: string;
};

export const TRUST_LOGOS: TrustLogo[] = [
  { name: "QuickBooks", caption: "Official Integration" },
  { name: "Stripe", caption: "Secure Payments" },
  { name: "Plaid", caption: "Bank-Level Connections" },
  { name: "Supabase", caption: "Encrypted Storage" },
  { name: "SOC 2", caption: "Compliance Aligned" },
];
