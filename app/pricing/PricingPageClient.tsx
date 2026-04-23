"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/app/components/primecfo/Navbar";
import Footer from "@/app/components/primecfo/Footer";
import PricingPage from "@/app/components/primecfo/PricingPage";
import { CONTACT_EMAIL, type Plan } from "@/app/lib/pricing-plans";

export default function PricingPageClient() {
  const router = useRouter();
  const [session, setSession] = useState<{ user: { email?: string } } | null>(null);
  const [loading, setLoading] = useState(true);

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
      router.push("/login?next=/dashboard");
    }
  };

  const handlePlanCta = (plan: Plan) => {
    if (plan.ctaKind === "contact") {
      window.location.href = `mailto:${CONTACT_EMAIL}?subject=PrimeCFO.ai%20${encodeURIComponent(plan.name)}%20inquiry`;
      return;
    }
    if (session) {
      router.push(`/dashboard?plan=${plan.id}`);
    } else {
      router.push(`/login?next=${encodeURIComponent(`/dashboard?plan=${plan.id}`)}`);
    }
  };

  const handleContact = () => {
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=PrimeCFO.ai%20consultation%20request`;
  };

  const handleStartTrial = () => {
    if (session) {
      router.push("/dashboard");
    } else {
      router.push("/login?next=/dashboard");
    }
  };

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
    </div>
  );
}
