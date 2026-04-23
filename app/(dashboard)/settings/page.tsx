"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CreditCard, ExternalLink, Loader2 } from "lucide-react";

type BillingStatus = {
  hasSubscription: boolean;
  isActive: boolean;
  subscription: {
    stripe_subscription_id: string;
    status: string;
    plan_id: string | null;
    price_id: string | null;
    interval: "month" | "year" | null;
    current_period_end: string | null;
    trial_end: string | null;
    cancel_at_period_end: boolean;
  } | null;
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

function formatStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function SettingsPage() {
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalPending, setPortalPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/billing/status", { cache: "no-store" });
        const data = (await res.json()) as BillingStatus;
        if (!cancelled) setBilling(data);
      } catch (err) {
        console.error(err);
        if (!cancelled) setBilling({ hasSubscription: false, isActive: false, subscription: null });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openPortal = async () => {
    if (portalPending) return;
    setPortalPending(true);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnPath: "/settings" }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        toast.error(data.error || "Could not open billing portal.");
        setPortalPending(false);
        return;
      }
      window.location.href = data.url;
    } catch (err) {
      console.error(err);
      toast.error("Could not reach the billing portal.");
      setPortalPending(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Settings</h2>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-teal-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Billing &amp; Subscription</h3>
            <p className="text-sm text-slate-400">Manage your plan, payment method, and invoices.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading billing status…
          </div>
        ) : billing?.subscription ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Plan</p>
                <p className="text-white font-medium capitalize">
                  {billing.subscription.plan_id?.replace(/-/g, " ") || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Status</p>
                <p className="text-white font-medium">{formatStatus(billing.subscription.status)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Billing</p>
                <p className="text-white font-medium capitalize">
                  {billing.subscription.interval === "year"
                    ? "Annual"
                    : billing.subscription.interval === "month"
                    ? "Monthly"
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                  {billing.subscription.cancel_at_period_end ? "Cancels" : "Renews"}
                </p>
                <p className="text-white font-medium">
                  {formatDate(billing.subscription.current_period_end)}
                </p>
              </div>
            </div>

            {billing.subscription.trial_end &&
              new Date(billing.subscription.trial_end).getTime() > Date.now() && (
                <div className="rounded-lg border border-teal-500/20 bg-teal-500/5 px-4 py-3 text-sm text-teal-300">
                  Free trial ends {formatDate(billing.subscription.trial_end)}.
                </div>
              )}

            <button
              type="button"
              onClick={openPortal}
              disabled={portalPending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 disabled:opacity-60 text-white text-sm font-semibold transition-colors"
            >
              {portalPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ExternalLink className="w-4 h-4" />
              )}
              Manage billing
            </button>
          </div>
        ) : (
          <div>
            <p className="text-slate-400 text-sm mb-4">
              You don&apos;t have an active subscription yet. Choose a plan to get started.
            </p>
            <a
              href="/pricing"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-white text-sm font-semibold transition-colors"
            >
              View plans
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        )}
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-2">Preferences</h3>
        <p className="text-slate-400 text-sm">Additional settings will appear here.</p>
      </div>
    </div>
  );
}
