"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/app/components/primecfo/Navbar";
import Footer from "@/app/components/primecfo/Footer";
import PricingPage from "@/app/components/primecfo/PricingPage";
import { CONTACT_EMAIL, type Plan } from "@/app/lib/pricing-plans";

export default function PricingPageClient() {
  const router = useRouter();
  const [session, setSession] = useState<{ user: { email?: string } } | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutPending, setCheckoutPending] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session: s }, error }) => {
      if (error?.code === "refresh_token_not_found") {
        supabase.auth.signOut();
      }
      setSession(s);
      setLoading(false);
    });
  }, []);

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
      const supabase = createClient();
      await supabase.auth.signOut();
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
        toast.error(data.error || "Could not start checkout. Please try again.");
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

  const handleContact = () => {
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=PrimeCFO.ai%20consultation%20request`;
  };

  const handleStartTrial = () => {
    if (session) {
      void startCheckout("self-service", "month");
    } else {
      router.push(
        `/login?next=${encodeURIComponent("/pricing?plan=self-service&interval=month&autostart=1")}`
      );
    }
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

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar
        currentView="pricing"
        onNavigate={handleNavigate}
        isLoggedIn={!!session}
        onLogin={handleLogin}
      />
      <PricingPage
        onPlanCta={handlePlanCta}
        onContact={handleContact}
        onStartTrial={handleStartTrial}
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
