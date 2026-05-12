import type { Metadata } from "next";
import PricingPageClient from "./PricingPageClient";

export const metadata: Metadata = {
  title: "Pricing | PrimeCFO.ai",
  description:
    "Unlocking Potential Through Financial Intelligence™. Plans from $99/mo when billed annually. 14-day free trial.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "PrimeCFO.ai Pricing",
    description: "Unlocking Potential Through Financial Intelligence™. Plans from $99/mo billed annually.",
    url: "/pricing",
    type: "website",
  },
};

export default function Pricing() {
  return <PricingPageClient />;
}
