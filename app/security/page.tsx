import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Database,
  KeyRound,
  Lock,
  Mail,
  Server,
  Shield,
  Trash2,
  Users,
} from "lucide-react";
import PublicShell from "@/app/components/primecfo/PublicShell";
import { SECURITY_EMAIL, mailtoSecurity } from "@/lib/site/contact";

export const metadata: Metadata = {
  title: "Security | PrimeCFO.ai",
  description:
    "How PrimeCFO.ai protects your financial data: encryption, OAuth QuickBooks access, per-tenant isolation, and our infrastructure partners.",
  alternates: { canonical: "/security" },
  openGraph: {
    title: "Security | PrimeCFO.ai",
    description:
      "Factual security practices for PrimeCFO.ai — encryption, OAuth, tenant isolation, and trusted infrastructure.",
    url: "/security",
    type: "website",
  },
};

const PRACTICES = [
  {
    icon: Lock,
    title: "Encryption in transit and at rest",
    body: "All traffic uses 256-bit SSL/TLS. Data stored in our database is encrypted at rest by our infrastructure provider.",
  },
  {
    icon: KeyRound,
    title: "OAuth-secured QuickBooks connection",
    body: "We connect to QuickBooks Online via Intuit’s OAuth flow. We never ask for or store your QuickBooks password. Access tokens are encrypted at rest.",
  },
  {
    icon: Users,
    title: "Per-tenant data isolation",
    body: "Each customer’s books and insights are scoped to their account. Client data is isolated so one tenant cannot access another’s financials.",
  },
  {
    icon: Database,
    title: "Read-focused financial access",
    body: "PrimeCFO.ai uses QuickBooks report and account data to compute metrics and insights. We do not use your connection to alter your general ledger as part of normal product operation.",
  },
  {
    icon: Server,
    title: "Trusted infrastructure partners",
    body: "Core services run on recognized providers: Supabase (application data), Stripe (billing), and Plaid where bank-level connections apply. QuickBooks Online is the source of truth for your books.",
  },
  {
    icon: Trash2,
    title: "Retention and deletion",
    body: "You can disconnect QuickBooks at any time. Disconnecting stops sync and removes stored connection tokens. Account and synced report data can be deleted on request — email our security contact below.",
  },
] as const;

export default function SecurityPage() {
  return (
    <PublicShell currentView="security">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-900/20 via-transparent to-transparent" />
        </div>
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-14 lg:pt-28 lg:pb-16 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-teal-500/10 border border-teal-500/20 rounded-full mb-8">
            <Shield className="w-4 h-4 text-teal-400" />
            <span className="text-sm text-teal-400 font-medium">Security practices</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4">
            How we protect your books
          </h1>
          <p className="text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto">
            Financial data deserves factual controls — not vague badges. Here is what PrimeCFO.ai
            actually does to keep your information secure.
          </p>
        </div>
      </section>

      <section className="bg-slate-900 py-16 sm:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 gap-6">
            {PRACTICES.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-slate-800 bg-slate-950/40 p-6 hover:border-slate-700 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mb-4">
                  <item.icon className="w-5 h-5 text-teal-400" />
                </div>
                <h2 className="text-lg font-semibold text-white mb-2">{item.title}</h2>
                <p className="text-sm text-slate-400 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-950 py-16 border-t border-slate-800/60">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 mb-5">
            <Mail className="w-5 h-5 text-teal-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Security contact</h2>
          <p className="text-slate-400 mb-6 leading-relaxed">
            For security questions, vulnerability reports, or data deletion requests, email us
            directly. We take reports seriously and respond as quickly as we can.
          </p>
          <a
            href={mailtoSecurity("PrimeCFO.ai — security inquiry")}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold hover:from-teal-400 hover:to-emerald-400 transition-all shadow-lg shadow-teal-500/20"
          >
            {SECURITY_EMAIL}
            <ArrowRight className="w-4 h-4" />
          </a>
          <p className="mt-8 text-sm text-slate-500">
            Looking for product help instead?{" "}
            <Link href="/contact" className="text-teal-400 hover:text-teal-300 underline-offset-4 hover:underline">
              Contact us
            </Link>
            {" · "}
            <Link href="/privacy" className="text-teal-400 hover:text-teal-300 underline-offset-4 hover:underline">
              Privacy Policy
            </Link>
          </p>
        </div>
      </section>
    </PublicShell>
  );
}
