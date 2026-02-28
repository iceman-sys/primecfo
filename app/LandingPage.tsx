"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/app/components/primecfo/Navbar";
import Hero from "@/app/components/primecfo/Hero";
import Features from "@/app/components/primecfo/Features";
import Footer from "@/app/components/primecfo/Footer";

export default function LandingPage() {
  const router = useRouter();
  const [session, setSession] = useState<{ user: { email?: string } } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setLoading(false);
    });
  }, []);

  const handleNavigate = (view: string) => {
    if (view === "landing") {
      router.push("/");
      return;
    }
    router.push("/" + view);
  };

  const handleGetStarted = () => {
    if (session) {
      router.push("/dashboard");
    } else {
      router.push("/login?next=/dashboard");
    }
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
        currentView="landing"
        onNavigate={handleNavigate}
        isLoggedIn={!!session}
        onLogin={handleLogin}
      />
      <Hero onGetStarted={handleGetStarted} />
      <Features onGetStarted={handleGetStarted} />
      <Footer />
    </div>
  );
}
