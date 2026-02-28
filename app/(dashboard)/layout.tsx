"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getClients, mapApiClientToClient, type Client } from "@/lib/api/client";
import { AppProvider, useAppContext } from "@/contexts/AppContext";
import { ClientProvider } from "@/contexts/ClientContext";
import { useIsMobile } from "@/hooks/use-mobile";
import Navbar from "@/app/components/primecfo/Navbar";
import Sidebar from "@/app/components/primecfo/Sidebar";

const queryClient = new QueryClient();

function pathnameToView(pathname: string): string {
  if (!pathname || pathname === "/") return "landing";
  const segment = pathname.replace(/^\//, "").split("/")[0];
  return segment || "dashboard";
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const { sidebarOpen, toggleSidebar } = useAppContext();
  const [session, setSession] = useState<{ user: { email?: string } } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const { data: apiClients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const list = await getClients();
      return list.map(mapApiClientToClient);
    },
  });

  const clients: Client[] = apiClients;
  useEffect(() => {
    if (clients.length > 0 && !selectedClient) {
      setSelectedClient(clients[0]);
      return;
    }
    if (selectedClient) {
      const fromList = clients.find((c) => c.id === selectedClient.id);
      if (!fromList) {
        setSelectedClient(clients[0] ?? null);
      } else {
        setSelectedClient(fromList);
      }
    }
  }, [clients, selectedClient]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setAuthLoading(false);
    });
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      router.replace("/login?next=" + encodeURIComponent(pathname || "/dashboard"));
      return;
    }
  }, [authLoading, session, router, pathname]);

  const handleNavigate = (view: string) => {
    if (view === "landing") {
      router.push("/");
      return;
    }
    router.push("/" + view);
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setSession(null);
    router.push("/");
  };

  const currentView = pathnameToView(pathname ?? "");

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <ClientProvider
      value={{
        clients,
        selectedClient,
        setSelectedClient,
        isLoading: clientsLoading,
      }}
    >
      <div className="min-h-screen bg-slate-950">
        <Navbar
          currentView={currentView}
          onNavigate={handleNavigate}
          isLoggedIn={!!session}
          onLogin={handleSignOut}
        />
        <Sidebar
          currentView={currentView}
          onNavigate={handleNavigate}
          selectedClient={selectedClient}
          clients={clients}
          onSelectClient={setSelectedClient}
          isOpen={sidebarOpen}
          onClose={toggleSidebar}
        />
        <main className="flex-1 lg:ml-64 min-h-[calc(100vh-4rem)]">
          <div className="p-6 lg:p-8 max-w-7xl w-full mx-auto">{children}</div>
        </main>

        {isMobile && !sidebarOpen && (
          <button
            onClick={toggleSidebar}
            className="fixed bottom-6 left-6 z-30 w-12 h-12 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-full shadow-xl shadow-teal-500/25 flex items-center justify-center lg:hidden"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
      </div>
    </ClientProvider>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <DashboardShell>{children}</DashboardShell>
      </AppProvider>
    </QueryClientProvider>
  );
}
