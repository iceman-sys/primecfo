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
  /** Optional secondary action (e.g. book a call on self-serve tiers) */
  secondaryCta?: string;
  secondaryCtaKind?: "calendar" | "contact";
};

/** Teal aligned with `globals.css` `--primary` (173 80% 40%) / Navbar accents */
export const LANE_COLORS = {
  selfService: "#14b8a6",
  hybrid: "#0d9488",
  fullService: "#1B3A5C",
} as const;

/** Annual prices reflect a 10% discount vs monthly. */
export const PLANS: Plan[] = [
  {
    id: "entry",
    name: "Starter",
    subtitle: "Essentials",
    monthly: 59,
    annual: 53,
    accent: LANE_COLORS.selfService,
    popular: false,
    target: "Solo operators getting started",
    tierWordmark: "STARTER",
    headline: "Your numbers, always visible.",
    cardBullets: [
      "Cash position, revenue trend, profit margin, AR aging, cash runway",
      "Monthly AI summary in plain English — emailed to you",
      "30-day cash flow forecast",
    ],
    features: [
      { label: "QuickBooks Dashboard", included: true },
      { label: "AI Financial Summaries", value: "Monthly — emailed" },
      { label: "Cash Flow Forecast", value: "30-day" },
      { label: "KPI Tracking", value: "5 KPIs" },
    ],
    cta: "Start Free for 14 Days",
    ctaNote: "14-day free trial · card required",
    ctaKind: "signup",
    ctaVariant: "outline",
    ctaFooter: "Card required · billing starts after 14 days",
  },
  {
    id: "self-service",
    name: "See",
    subtitle: "AI Only",
    monthly: 119,
    annual: 107,
    accent: LANE_COLORS.selfService,
    popular: false,
    target: "Solopreneurs & DIY bookkeepers",
    tierWordmark: "SEE",
    headline: "Your numbers, finally clear.",
    cardBullets: [
      "Everything in Starter",
      "30–60 day cash flow dashboard",
      "Data-quality alerts when your books need attention",
      "Monthly AI summary in plain English — emailed to you",
    ],
    features: [
      { label: "QuickBooks Dashboard", included: true },
      { label: "AI Financial Summaries", value: "Monthly — emailed" },
      { label: "Cash Flow Forecast", value: "30–60 day" },
      { label: "Data-Quality Alerts", included: true },
      { label: "KPI Tracking", value: "5 KPIs" },
    ],
    cta: "Start Free for 14 Days",
    ctaNote: "14-day free trial · card required",
    ctaKind: "signup",
    ctaVariant: "outline",
    ctaFooter: "Card required · billing starts after 14 days",
  },
  {
    id: "starter",
    name: "Understand",
    subtitle: "AI + Hybrid",
    monthly: 349,
    annual: 314,
    accent: LANE_COLORS.selfService,
    popular: true,
    target: "Early-stage small businesses",
    tierWordmark: "UNDERSTAND",
    headline: "AI insights. Human guidance.",
    cardBullets: [
      "Everything in See",
      "Weekly AI financial summaries",
      "30–90 day cash flow forecast",
      "1-hour quarterly advisory meeting with your fractional CFO",
    ],
    features: [
      { label: "QuickBooks Dashboard", included: true },
      { label: "AI Financial Summaries", value: "Weekly" },
      { label: "Cash Flow Forecast", value: "30–90 day" },
      { label: "Advisory Hours", value: "1 hr/quarter fractional CFO meeting" },
    ],
    cta: "Start Free for 14 Days",
    ctaNote: "14-day free trial · card required",
    ctaKind: "signup",
    ctaVariant: "solid",
    ctaFooter: "Card required · billing starts after 14 days",
  },
  {
    id: "growth",
    name: "Act",
    subtitle: "AI + Advisory",
    monthly: 699,
    annual: 629,
    accent: LANE_COLORS.hybrid,
    popular: false,
    target: "Growing companies ($750K–$2M)",
    tierWordmark: "ACT",
    headline: "A finance team in your corner.",
    cardBullets: [
      "Everything in Understand",
      "90-day forecast with scenarios",
      "Custom alerts when numbers shift",
      "1-hour monthly advisory meeting with your fractional CFO",
    ],
    features: [
      { label: "QuickBooks Dashboard", included: true },
      { label: "Cash Flow Forecast", value: "90-day + scenarios" },
      { label: "Custom Alerts", included: true },
      { label: "Advisory Hours", value: "1 hr/month fractional CFO meeting" },
    ],
    cta: "Start Free for 14 Days",
    ctaNote: "14-day free trial · card required",
    ctaKind: "signup",
    ctaVariant: "outline",
    ctaFooter: "Card required · or book a conversation first",
    secondaryCta: "Book a Conversation",
    secondaryCtaKind: "calendar" as const,
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
    title: "I want essentials",
    desc: "Starter gives you a clear dashboard, monthly AI summary emailed to you, and a 30-day cash outlook.",
    tier: "Starter — $53/mo billed annually ($59 monthly)",
  },
  {
    icon: "zap",
    title: "I want to do it myself",
    desc: "See adds a 30–60 day cash flow dashboard and data-quality alerts on top of Starter.",
    tier: "See — $107/mo billed annually ($119 monthly)",
  },
  {
    icon: "users",
    title: "I want a guide",
    desc: "Understand adds weekly summaries, a 30–90 day forecast, and a 1-hour quarterly advisory meeting with your fractional CFO.",
    tier: "Understand — $314/mo billed annually ($349 monthly)",
  },
  {
    icon: "building",
    title: "I want a partner",
    desc: "Act layers in scenario planning, alerts, and a 1-hour monthly advisory meeting with your fractional CFO.",
    tier: "Act — $629/mo billed annually ($699 monthly)",
  },
];

export type Faq = { q: string; a: string };

export const FAQS: Faq[] = [
  {
    q: "Is a credit card required for the free trial?",
    a: "Yes. All plans require a card at signup. You won't be charged during the 14-day trial — billing starts automatically on day 15 unless you cancel before then.",
  },
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
