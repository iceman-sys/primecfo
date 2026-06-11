import type { Metadata } from "next";
import PublicShell from "@/app/components/primecfo/PublicShell";
import { SUPPORT_EMAIL } from "@/lib/site/contact";

export const metadata: Metadata = {
  title: "Privacy Policy | PrimeCFO.ai",
  description:
    "How PrimeCFO.ai collects, uses, and protects your information.",
  alternates: { canonical: "/privacy" },
};

// TODO: Paste the full Privacy Policy content from
// `PrimeCFO_Privacy_Policy.md` into the <article> block below, replacing the
// placeholder sections. Do not invent or paraphrase legal text — use the
// canonical source document only.
//
// Markdown rendering tip: if you want to render the file directly, add a
// markdown renderer (e.g. `react-markdown`) and import the .md as a string.

export default function PrivacyPolicyPage() {
  return (
    <PublicShell currentView="privacy">
      <section className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <header className="mb-10">
            <p className="text-teal-400 text-sm font-semibold uppercase tracking-wider mb-3">
              Legal
            </p>
            <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-3">
              Privacy Policy
            </h1>
            <p className="text-sm text-slate-500">Last updated: April 24, 2026</p>
          </header>

          <article className="max-w-none text-slate-300 leading-relaxed space-y-8">
            {/* TODO: Replace the placeholder sections below with the exact
                contents of PrimeCFO_Privacy_Policy.md once that file is added
                to the repository. */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">
                1. Introduction
              </h2>
              <p>
                This Privacy Policy describes how PrimeCFO AI Inc.
                (&ldquo;PrimeCFO.ai&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;)
                collects, uses, and shares information when you use our
                services.
              </p>
              <p className="text-amber-300/80 text-sm italic">
                Placeholder &mdash; paste the canonical Privacy Policy content
                from{" "}
                <code className="px-1 py-0.5 rounded bg-slate-800 text-amber-200">
                  PrimeCFO_Privacy_Policy.md
                </code>{" "}
                here.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">
                2. Information We Collect
              </h2>
              <p>
                Account information you provide (such as email and password)
                and financial data retrieved from integrations you connect
                (such as QuickBooks Online).
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">
                3. How We Use Information
              </h2>
              <p>
                We use your information to operate and improve the Service,
                generate financial insights, and communicate with you about
                your account.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">
                4. Data Storage and Security
              </h2>
              <p>
                Data is stored securely using industry-standard encryption in
                transit and at rest. Access is limited to authorized personnel.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">
                5. Sharing of Information
              </h2>
              <p>
                We do not sell your information. We share information only with
                service providers that help us operate the Service, or when
                required by law.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">
                6. Your Rights
              </h2>
              <p>
                You may access, correct, or delete your account information at
                any time by contacting us.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">
                7. Changes to This Policy
              </h2>
              <p>
                We may update this Privacy Policy from time to time. Material
                changes will be communicated via the Service or email.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">
                8. Contact
              </h2>
              <p>
                Privacy questions? Contact us at{" "}
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="text-teal-400 hover:text-teal-300 underline"
                >
                  {SUPPORT_EMAIL}
                </a>
                .
              </p>
            </section>
          </article>
        </div>
      </section>
    </PublicShell>
  );
}
