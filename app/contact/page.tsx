import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  Calendar,
  CreditCard,
  Link2,
  Mail,
  MessageCircle,
  UserCircle,
} from 'lucide-react';
import PublicShell from '@/app/components/primecfo/PublicShell';
import {
  CALENDAR_URL,
  SUPPORT_EMAIL,
  SUPPORT_HOURS,
  SUPPORT_RESPONSE_NOTE,
  mailtoSupport,
} from '@/lib/site/contact';

export const metadata: Metadata = {
  title: 'Contact Us | PrimeCFO.ai',
  description:
    'Get help with QuickBooks connection, billing, and your PrimeCFO.ai account.',
  alternates: { canonical: '/contact' },
  openGraph: {
    title: 'Contact PrimeCFO.ai',
    description: 'Email support or book a conversation with our team.',
    url: '/contact',
    type: 'website',
  },
};

const TOPICS = [
  {
    icon: Link2,
    title: 'QuickBooks connection',
    description: 'OAuth errors, sync issues, or reconnecting your company.',
    href: '/connect',
  },
  {
    icon: CreditCard,
    title: 'Billing & subscriptions',
    description: 'Plans, invoices, trials, and payment questions.',
    href: '/pricing',
  },
  {
    icon: UserCircle,
    title: 'Account & login',
    description: 'Sign up, password reset, and access to your dashboard.',
    href: '/login',
  },
] as const;

export default function ContactPage() {
  return (
    <PublicShell currentView="contact">
      <section className="relative overflow-hidden bg-slate-950 py-16 sm:py-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-500/10 via-slate-950 to-slate-950" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-teal-400 text-sm font-semibold uppercase tracking-wider mb-3">
            Contact
          </p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            We&apos;re here to help
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Questions about QuickBooks, billing, or your account? Reach our team by email or
            schedule a call.
          </p>
        </div>
      </section>

      <section className="bg-slate-900 py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6 sm:p-8 hover:border-teal-500/30 transition-colors">
              <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-xl flex items-center justify-center mb-5">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Email support</h2>
              <p className="text-sm text-slate-400 mb-4 leading-relaxed">
                Best for account issues, QuickBooks connection problems, and billing questions.
                {SUPPORT_RESPONSE_NOTE}
              </p>
              <p className="text-sm text-slate-500 mb-4">{SUPPORT_HOURS}</p>
              <a
                href={mailtoSupport('PrimeCFO.ai support request')}
                className="inline-flex items-center gap-2 text-teal-400 hover:text-teal-300 font-medium transition-colors"
              >
                {SUPPORT_EMAIL}
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6 sm:p-8 hover:border-teal-500/30 transition-colors">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mb-5">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Book a conversation</h2>
              <p className="text-sm text-slate-400 mb-4 leading-relaxed">
                Prefer to talk through your setup or explore the ACT plan? Schedule a 15-minute
                call with our team.
              </p>
              <a
                href={CALENDAR_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-sm font-semibold hover:from-teal-400 hover:to-emerald-400 transition-all shadow-lg shadow-teal-500/20"
              >
                Schedule on Calendly
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-950 py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-8">
            <MessageCircle className="w-5 h-5 text-teal-400" />
            <h2 className="text-xl font-semibold text-white">Common topics</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {TOPICS.map((topic) => (
              <Link
                key={topic.title}
                href={topic.href}
                className="group bg-slate-900/50 border border-slate-800 rounded-xl p-5 hover:border-slate-700 hover:bg-slate-900 transition-all"
              >
                <topic.icon className="w-5 h-5 text-teal-400 mb-3" />
                <h3 className="text-sm font-semibold text-white mb-1.5 group-hover:text-teal-300 transition-colors">
                  {topic.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">{topic.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-900 py-12 border-t border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-teal-500/5 border border-teal-500/20 rounded-2xl p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-white mb-3">Before you write</h2>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-start gap-2">
                <span className="text-teal-400 mt-0.5">•</span>
                Include the email you used to sign up for PrimeCFO.ai.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal-400 mt-0.5">•</span>
                For QuickBooks issues, note whether you see an error on Intuit&apos;s screen or
                after returning to PrimeCFO.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal-400 mt-0.5">•</span>
                Screenshots of error messages help us resolve issues faster.
              </li>
            </ul>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
