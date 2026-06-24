"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import Navbar from "@/app/components/primecfo/Navbar";
import Footer from "@/app/components/primecfo/Footer";
import PricingPage from "@/app/components/primecfo/PricingPage";
import { CONTACT_EMAIL, CALENDAR_URL, SUPPORT_EMAIL, type Plan } from "@/app/lib/pricing-plans";
import { getBillingStatus, type BillingStatusResponse, BILLING_UPDATED_EVENT } from "@/lib/api/client";

export default function PricingPageClient() {
  const router = useRouter();
  const [session, setSession] = useState<{ user: { email?: string; id?: string } } | null>(null);
  const [isOperator, setIsOperator] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkoutPending, setCheckoutPending] = useState(false);
  const [billing, setBilling] = useState<BillingStatusResponse | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);

  const refreshBilling = useCallback(async () => {
    setBillingLoading(true);
    try {
      const b = await getBillingStatus();
      setBilling(
        b ?? {
          hasSubscription: false,
          isActive: false,
          subscription: null,
          currentPlan: null,
        }
      );
    } catch {
      setBilling({
        hasSubscription: false,
        isActive: false,
        subscription: null,
        currentPlan: null,
      });
    } finally {
      setBillingLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) {
          setSession(null);
          setIsOperator(false);
          setLoading(false);
          return;
        }
        const me = (await res.json()) as {
          email?: string | null;
          id?: string;
          isOperator?: boolean;
        };
        setSession({ user: { email: me.email ?? undefined, id: me.id } });
        setIsOperator(!!me.isOperator);
        setLoading(false);
      })
      .catch(() => {
        setSession(null);
        setIsOperator(false);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!session) {
      setBilling(null);
      setBillingLoading(false);
      return;
    }
    setBilling(null);
    void refreshBilling();
  }, [session, refreshBilling]);

  useEffect(() => {
    const handler = () => {
      void refreshBilling();
    };
    window.addEventListener(BILLING_UPDATED_EVENT, handler);
    return () => window.removeEventListener(BILLING_UPDATED_EVENT, handler);
  }, [refreshBilling]);
  const handleNavigate = (view: string) => {
    if (view === "landing") {
      router.push("/");
      return;
    }
    if (view === "pricing") {
      router.push("/pricing");
      return;
    }
    router.push("/" + view);
  };

  const handleLogin = async () => {
    if (session) {
      await fetch('/api/auth/signout', { method: 'POST' });
      setSession(null);
      router.push("/");
    } else {
      router.push("/login?next=/pricing");
    }
  };

  const startCheckout = async (planId: string, interval: "month" | "year") => {
    if (checkoutPending) return;
    setCheckoutPending(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, interval }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        toast.error(
          data.error
            ? `${data.error} Contact ${SUPPORT_EMAIL} if this continues.`
            : `Could not start checkout. Contact ${SUPPORT_EMAIL} if this continues.`
        );
        setCheckoutPending(false);
        return;
      }
      window.location.href = data.url;
    } catch (err) {
      console.error(err);
      toast.error("Could not reach the billing service. Please try again.");
      setCheckoutPending(false);
    }
  };

  const handlePlanCta = (plan: Plan, interval: "month" | "year") => {
    if (plan.ctaKind === "contact") {
      window.location.href = `mailto:${CONTACT_EMAIL}?subject=PrimeCFO.ai%20${encodeURIComponent(plan.name)}%20inquiry`;
      return;
    }
    if (!session) {
      const next = `/pricing?plan=${plan.id}&interval=${interval}&autostart=1`;
      router.push(`/login?next=${encodeURIComponent(next)}`);
      return;
    }
    void startCheckout(plan.id, interval);
  };

  const handleSecondaryPlanCta = (plan: Plan) => {
    if (plan.secondaryCtaKind === "calendar") {
      window.open(CALENDAR_URL, "_blank", "noopener,noreferrer");
      return;
    }
    if (plan.secondaryCtaKind === "contact") {
      window.location.href = `mailto:${CONTACT_EMAIL}?subject=PrimeCFO.ai%20${encodeURIComponent(plan.name)}%20inquiry`;
    }
  };

  const handleContact = () => {
    window.open(CALENDAR_URL, "_blank", "noopener,noreferrer");
  };

  const handleStartTrial = () => {
    document.getElementById("pricing-plans")?.scrollIntoView({ behavior: "smooth" });
  };

  // Auto-resume checkout after a user signs in and comes back with ?autostart=1.
  useEffect(() => {
    if (loading || !session) return;
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("autostart") !== "1") return;
    const planId = params.get("plan");
    const interval = params.get("interval");
    if (!planId || (interval !== "month" && interval !== "year")) return;
    params.delete("autostart");
    params.delete("plan");
    params.delete("interval");
    const remaining = params.toString();
    const cleanUrl = window.location.pathname + (remaining ? `?${remaining}` : "");
    window.history.replaceState({}, "", cleanUrl);
    void startCheckout(planId, interval);
     
  }, [loading, session]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
      </div>
    );
  }

  const activeSubscription =
    billing && billing.isActive && billing.currentPlan
      ? {
          planId: billing.currentPlan.id,
          tierWordmark: billing.currentPlan.tierWordmark,
          planName: billing.currentPlan.name,
          interval:
            billing.subscription?.interval === "month" || billing.subscription?.interval === "year"
              ? (billing.subscription.interval as "month" | "year")
              : null,
        }
      : null;

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar
        currentView="pricing"
        onNavigate={handleNavigate}
        isLoggedIn={!!session}
        onLogin={handleLogin}
        userEmail={session?.user?.email ?? null}
        isOperator={isOperator}
      />
      <PricingPage
        onPlanCta={handlePlanCta}
        onSecondaryPlanCta={handleSecondaryPlanCta}
        onContact={handleContact}
        onStartTrial={handleStartTrial}
        activeSubscription={activeSubscription}
        isSubscriptionLoading={!!session && (billingLoading || billing === null)}
      />
      <Footer />
      {checkoutPending && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-x-0 bottom-6 mx-auto flex w-fit items-center gap-3 rounded-full bg-slate-900/95 px-5 py-3 text-sm text-white shadow-xl ring-1 ring-white/10 backdrop-blur"
        >
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-teal-500/40 border-t-teal-400" />
          Redirecting to secure checkout…
        </div>
      )}
    </div>
  );
}
