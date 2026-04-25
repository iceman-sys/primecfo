import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Brain,
  Compass,
  Heart,
  LineChart,
  Sparkles,
  Target,
  Users,
  ShieldCheck,
  Zap,
} from "lucide-react";
import PublicShell from "@/app/components/primecfo/PublicShell";

export const metadata: Metadata = {
  title: "About Us | PrimeCFO.ai",
  description:
    "PrimeCFO.ai turns QuickBooks data into clear, AI-powered financial insights for modern business owners.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About PrimeCFO.ai",
    description:
      "Our mission is to make financial clarity accessible to every business owner.",
    url: "/about",
    type: "website",
  },
};

// NOTE: The About Us content/design referenced in the project brief lives at
//   https://claude.ai/public/artifacts/3d66e271-6255-4222-a805-95e1a1e49fe3
// Claude public artifact pages are rendered client-side, so the raw copy
// cannot be fetched programmatically. If the artifact contains canonical
// wording you want to preserve verbatim, paste it into the sections below.
// The layout, tone, and visual system below follow the existing PrimeCFO.ai
// site style (dark slate + teal/emerald accents, Tailwind utility classes).

export default function AboutPage() {
  const values = [
    {
      icon: Compass,
      title: "Clarity over complexity",
      description:
        "Financial software shouldn't require an accounting degree. We translate numbers into plain language so owners can act with confidence.",
      color: "from-teal-500 to-emerald-500",
    },
    {
      icon: Heart,
      title: "Built for business owners",
      description:
        "We design for the people running the business — not the people reconciling its books. Every feature starts with a real owner question.",
      color: "from-pink-500 to-rose-500",
    },
    {
      icon: ShieldCheck,
      title: "Security is non-negotiable",
      description:
        "Your books are sensitive. We encrypt data in transit and at rest, isolate every tenant, and follow SOC 2-aligned controls end to end.",
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: Sparkles,
      title: "AI that's accountable",
      description:
        "Every insight ties back to real numbers from your general ledger. No hallucinations, no vague advice — just analysis you can trace.",
      color: "from-violet-500 to-purple-500",
    },
  ];

  const stats = [
    { value: "100%", label: "QuickBooks-native data" },
    { value: "<60s", label: "From connect to first insight" },
    { value: "3", label: "Plans from $99 to $449/mo" },
    { value: "14-day", label: "Free trial, no card required" },
  ];

  return (
    <PublicShell currentView="about">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-900/20 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-blue-900/15 via-transparent to-transparent" />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 lg:pt-28 lg:pb-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-teal-500/10 border border-teal-500/20 rounded-full mb-8">
            <div className="w-2 h-2 bg-teal-400 rounded-full animate-pulse" />
            <span className="text-sm text-teal-400 font-medium">About PrimeCFO.ai</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
            Financial clarity for{" "}
            <span className="bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
              every business owner.
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-400 leading-relaxed max-w-2xl mx-auto">
            PrimeCFO.ai connects to your QuickBooks account and turns raw
            financial data into the insights a full-time CFO would surface — at
            a price any growing business can afford.
          </p>
        </div>
      </section>

      <section className="bg-slate-900 py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-10 lg:gap-16 items-start">
            <div>
              <p className="text-teal-400 text-sm font-semibold uppercase tracking-wider mb-3">
                Our mission
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Make financial intelligence accessible.
              </h2>
              <p className="text-slate-400 leading-relaxed mb-4">
                Most small and mid-sized businesses operate without a CFO.
                Owners rely on bookkeepers for clean records and accountants
                for year-end tax work — but nobody is turning the numbers into
                decisions.
              </p>
              <p className="text-slate-400 leading-relaxed">
                PrimeCFO.ai closes that gap. We pair your general ledger with
                AI that reads your financials the way a senior finance leader
                would, and we surface what matters — in plain English, every
                time you log in.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className="bg-slate-900/60 border border-slate-800 rounded-xl p-5"
                >
                  <p className="text-3xl font-bold bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
                    {s.value}
                  </p>
                  <p className="text-xs text-slate-400 mt-2 leading-snug">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-950 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-teal-400 text-sm font-semibold uppercase tracking-wider mb-3">
              What we believe
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              The principles behind the product
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              We build PrimeCFO.ai around a few convictions that shape every
              feature.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {values.map((v) => (
              <div
                key={v.title}
                className="group bg-slate-900/50 border border-slate-800 rounded-xl p-6 hover:border-slate-700 hover:bg-slate-900 transition-all duration-300"
              >
                <div
                  className={`w-12 h-12 bg-gradient-to-br ${v.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                >
                  <v.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {v.title}
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {v.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-900 py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-teal-400 text-sm font-semibold uppercase tracking-wider mb-3">
              Who it&rsquo;s for
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Built for owners, advisors, and the teams in between
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Users,
                title: "Business owners",
                body:
                  "Get a CFO-style read on your business without hiring one. Understand cash, revenue, and margin at a glance.",
              },
              {
                icon: LineChart,
                title: "Accounting firms",
                body:
                  "Deliver proactive advisory across your book of business. One dashboard for every client you serve.",
              },
              {
                icon: Target,
                title: "Fractional CFOs",
                body:
                  "Spend less time building reports and more time advising. PrimeCFO.ai automates the baseline so you can focus on strategy.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-slate-950/60 border border-slate-800 rounded-xl p-6"
              >
                <div className="w-10 h-10 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mb-4">
                  <item.icon className="w-5 h-5 text-teal-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-950 py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-teal-900/20 via-transparent to-transparent" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-teal-500/10 border border-teal-500/20 rounded-full mb-6">
            <Brain className="w-4 h-4 text-teal-400" />
            <span className="text-sm text-teal-400 font-medium">
              AI-powered, owner-friendly
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Want to see PrimeCFO.ai in action?
          </h2>
          <p className="text-lg text-slate-400 mb-8 max-w-2xl mx-auto">
            Connect your QuickBooks account and see your first AI-generated
            financial insight in under a minute.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold rounded-xl hover:from-teal-400 hover:to-emerald-400 transition-all shadow-xl shadow-teal-500/25 hover:shadow-teal-500/40"
            >
              Start free trial
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-slate-700 text-slate-300 font-semibold rounded-xl hover:bg-slate-800 hover:border-slate-600 transition-all"
            >
              <Zap className="w-5 h-5 text-teal-400" />
              See pricing
            </Link>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
