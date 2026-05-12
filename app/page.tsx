import type { Metadata } from "next";
import LandingPage from "./LandingPage";

export const metadata: Metadata = {
  title: "PrimeCFO.ai | Unlocking Potential Through Financial Intelligence™",
  description:
    "Unlocking Potential Through Financial Intelligence™ — AI-powered clarity from QuickBooks to smarter decisions.",
  openGraph: {
    title: "PrimeCFO.ai",
    description:
      "Unlocking Potential Through Financial Intelligence™ — connect QuickBooks for clear financial insight.",
    url: "/",
    type: "website",
  },
};

export default function Home() {
  return <LandingPage />;
}
