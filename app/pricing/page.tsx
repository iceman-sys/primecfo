import type { Metadata } from "next";
import PricingPageClient from "./PricingPageClient";

export const metadata: Metadata = {
  title: "Pricing | PrimeCFO.ai",
  description:
    "Financial intelligence for every stage of growth. Plans from $99/mo. 14-day free trial, no credit card required.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "PrimeCFO.ai Pricing",
    description: "Stop guessing. Start seeing. Plans from $99/mo.",
    url: "/pricing",
    type: "website",
  },
};

export default function Pricing() {
  return <PricingPageClient />;
}
