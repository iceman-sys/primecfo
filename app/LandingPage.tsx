"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Navbar from "@/app/components/primecfo/Navbar";
import Hero from "@/app/components/primecfo/Hero";
import Features from "@/app/components/primecfo/Features";
import Footer from "@/app/components/primecfo/Footer";

export default function LandingPage() {
  const router = useRouter();
  const [session, setSession] = useState<{ user: { email?: string } } | null>(null);
  const [isOperator, setIsOperator] = useState(false);

  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) {
          setSession(null);
          setIsOperator(false);
          return;
        }
        const me = (await res.json()) as { email?: string | null; isOperator?: boolean };
        setSession({ user: { email: me.email ?? undefined } });
        setIsOperator(!!me.isOperator);
      })
      .catch(() => {
        setSession(null);
        setIsOperator(false);
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
      await fetch('/api/auth/signout', { method: 'POST' });
      setSession(null);
      router.push("/");
    } else {
      router.push("/login?next=/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar
        currentView="landing"
        onNavigate={handleNavigate}
        isLoggedIn={!!session}
        onLogin={handleLogin}
        userEmail={session?.user?.email ?? null}
        isOperator={isOperator}
      />
      <Hero onGetStarted={handleGetStarted} />
      <Features onGetStarted={handleGetStarted} />
      <Footer />
    </div>
  );
}
