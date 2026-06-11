import Link from 'next/link';
import { HelpCircle, Mail, ArrowRight } from 'lucide-react';
import { SUPPORT_EMAIL, mailtoSupport } from '@/lib/site/contact';

type ContactHelpBlockProps = {
  /** Short context shown above the support link. */
  message?: string;
  /** Optional mailto subject line. */
  subject?: string;
  className?: string;
};

export default function ContactHelpBlock({
  message = 'Questions about your account or need help?',
  subject = 'PrimeCFO.ai support request',
  className = '',
}: ContactHelpBlockProps) {
  return (
    <div
      className={`bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center flex-shrink-0">
          <HelpCircle className="w-5 h-5 text-teal-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-white mb-1">Need help?</h3>
          <p className="text-sm text-slate-400 mb-4">{message}</p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <a
              href={mailtoSupport(subject)}
              className="inline-flex items-center gap-2 text-sm text-teal-400 hover:text-teal-300 font-medium transition-colors"
            >
              <Mail className="w-4 h-4" />
              {SUPPORT_EMAIL}
            </a>
            <Link
              href="/contact"
              className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Contact page
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
