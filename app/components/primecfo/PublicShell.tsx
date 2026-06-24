"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
    fetch("/api/me", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) {
          setSession(null);
          setIsOperator(false);
          setLoading(false);
          return;
        }
        const me = (await res.json()) as { email?: string | null; isOperator?: boolean };
        setSession({ user: { email: me.email ?? undefined } });
        setIsOperator(!!me.isOperator);
        setLoading(false);
      })
      .catch(() => {
        setSession(null);
        setIsOperator(false);
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
      await fetch('/api/auth/signout', { method: 'POST' });
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
