"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/app/components/primecfo/Navbar";
import Footer from "@/app/components/primecfo/Footer";

interface PublicShellProps {
  currentView?: string;
  children: React.ReactNode;
}

export default function PublicShell({ currentView = "", children }: PublicShellProps) {
  const router = useRouter();
  const [session, setSession] = useState<{ user: { email?: string } } | null>(null);
  const [isOperator, setIsOperator] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session: s }, error }) => {
      if (error?.code === "refresh_token_not_found") {
        supabase.auth.signOut();
      }
      setSession(s);
      if (s) {
        try {
          const res = await fetch("/api/me", { cache: "no-store" });
          if (res.ok) {
            const me = (await res.json()) as { isOperator?: boolean };
            setIsOperator(!!me.isOperator);
          }
        } catch {
          setIsOperator(false);
        }
      }
      setLoading(false);
    });
  }, []);

  const handleNavigate = (view: string) => {
    if (view === "landing") {
      router.push("/");
      return;
    }
    if (view.startsWith("#")) {
      router.push(`/${view}`);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar
        currentView={currentView}
        onNavigate={handleNavigate}
        isLoggedIn={!!session}
        onLogin={handleLogin}
        userEmail={session?.user?.email ?? null}
        isOperator={isOperator}
      />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
