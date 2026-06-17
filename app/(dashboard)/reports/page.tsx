"use client";

import { useState } from "react";
import ReportViewer from "@/app/components/primecfo/ReportViewer";
import TreasuryTab from "@/app/components/primecfo/reports/TreasuryTab";
import AnalyticsTab from "@/app/components/primecfo/reports/AnalyticsTab";

export type ReportsTabId = "treasury" | "analytics" | "reports";

const TABS: Array<{ id: ReportsTabId; label: string }> = [
  { id: "treasury", label: "Treasury" },
  { id: "analytics", label: "Analytics & Reports" },
  { id: "reports", label: "Financial Reports" },
];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportsTabId>("reports");

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-center border-b border-slate-800/50 shrink-0 overflow-x-auto scroll-smooth">
        <div className="flex items-center min-h-[3rem] gap-1 min-w-max px-3 py-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
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
