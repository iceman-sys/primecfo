import type { Metadata } from "next";
import PublicShell from "@/app/components/primecfo/PublicShell";

export const metadata: Metadata = {
  title: "Terms of Service | PrimeCFO.ai",
  description:
    "The terms and conditions that govern your use of PrimeCFO.ai and related services.",
  alternates: { canonical: "/terms" },
};

// TODO: Paste the full Terms of Service content from `PrimeCFO_Terms_of_Service.md`
// into the <article> block below, replacing the placeholder sections. Do not
// invent or paraphrase legal text — use the canonical source document only.
//
// Markdown rendering tip: if you want to render the file directly, add a
// markdown renderer (e.g. `react-markdown`) and import the .md as a string.

export default function TermsOfServicePage() {
  return (
    <PublicShell currentView="terms">
      <section className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <header className="mb-10">
            <p className="text-teal-400 text-sm font-semibold uppercase tracking-wider mb-3">
              Legal
            </p>
            <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-3">
              Terms of Service
            </h1>
            <p className="text-sm text-slate-500">Last updated: April 24, 2026</p>
          </header>

          <article className="max-w-none text-slate-300 leading-relaxed space-y-8">
            {/* TODO: Replace the placeholder sections below with the exact
                contents of PrimeCFO_Terms_of_Service.md once that file is
                added to the repository. */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">
                1. Introduction
              </h2>
              <p>
                These Terms of Service (&ldquo;Terms&rdquo;) govern your access
                to and use of PrimeCFO.ai (the &ldquo;Service&rdquo;). By
                creating an account or using the Service, you agree to be bound
                by these Terms.
              </p>
              <p className="text-amber-300/80 text-sm italic">
                Placeholder &mdash; paste the canonical Terms of Service content
                from{" "}
                <code className="px-1 py-0.5 rounded bg-slate-800 text-amber-200">
                  PrimeCFO_Terms_of_Service.md
                </code>{" "}
                here.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">
                2. Accounts and Eligibility
              </h2>
              <p>
                You must provide accurate information when creating an account
                and are responsible for safeguarding your credentials.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">
                3. Acceptable Use
              </h2>
              <p>
                You agree not to misuse the Service, attempt to reverse engineer
                it, or use it in a way that violates applicable law.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">
                4. Subscriptions and Billing
              </h2>
              <p>
                Paid plans are billed according to the terms displayed at
                checkout. You may cancel at any time; cancellations take effect
                at the end of the current billing period.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">
                5. Third-Party Services
              </h2>
              <p>
                The Service integrates with third-party services such as
                QuickBooks Online. Your use of those services is governed by
                their own terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">
                6. Disclaimer of Warranties
              </h2>
              <p>
                The Service is provided &ldquo;as is&rdquo; without warranties
                of any kind, express or implied, to the fullest extent permitted
                by law.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">
                7. Limitation of Liability
              </h2>
              <p>
                To the maximum extent permitted by law, PrimeCFO AI Inc. shall
                not be liable for any indirect, incidental, or consequential
                damages arising from your use of the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">
                8. Changes to These Terms
              </h2>
              <p>
                We may update these Terms from time to time. Material changes
                will be communicated via the Service or email.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">
                9. Contact
              </h2>
              <p>
                Questions about these Terms? Contact us at{" "}
                <a
                  href="mailto:support@primecfo.ai"
                  className="text-teal-400 hover:text-teal-300 underline"
                >
                  support@primecfo.ai
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
