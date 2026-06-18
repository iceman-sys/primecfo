"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useReportRange } from "@/contexts/ReportRangeContext";
import ReportViewer from "@/app/components/primecfo/ReportViewer";
import TreasuryTab from "@/app/components/primecfo/reports/TreasuryTab";
import AnalyticsTab from "@/app/components/primecfo/reports/AnalyticsTab";

export type ReportsTabId = "treasury" | "analytics" | "reports";

const TABS: Array<{ id: ReportsTabId; label: string }> = [
  { id: "treasury", label: "Treasury" },
  { id: "analytics", label: "Analytics & Reports" },
  { id: "reports", label: "Financial Reports" },
];

const VALID_TABS = new Set<ReportsTabId>(["treasury", "analytics", "reports"]);

function parseTabParam(value: string | null): ReportsTabId {
  if (value && VALID_TABS.has(value as ReportsTabId)) return value as ReportsTabId;
  return "reports";
}

export default function ReportsPage() {
  const searchParams = useSearchParams();
  const { range } = useReportRange();
  const [activeTab, setActiveTab] = useState<ReportsTabId>(() => parseTabParam(searchParams.get("tab")));

  useEffect(() => {
    setActiveTab(parseTabParam(searchParams.get("tab")));
  }, [searchParams]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (!params.get("range")) {
      params.set("range", range);
      window.history.replaceState(null, "", `/reports?${params.toString()}`);
    }
  }, [searchParams, range]);

  const selectTab = (tab: ReportsTabId) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    params.set("range", params.get("range") ?? range);
    if (tab !== "reports") params.delete("report");
    window.history.replaceState(null, "", `/reports?${params.toString()}`);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-center border-b border-slate-800/50 shrink-0 overflow-x-auto scroll-smooth">
        <div className="flex items-center min-h-[3rem] gap-1 min-w-max px-3 py-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => selectTab(tab.id)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 ease-in-out ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-md shadow-teal-500/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-auto p-6 scrollbar-reports">
        {activeTab === "reports" && <ReportViewer />}
        {activeTab === "treasury" && <TreasuryTab />}
        {activeTab === "analytics" && <AnalyticsTab />}
      </div>
    </div>
  );
}
