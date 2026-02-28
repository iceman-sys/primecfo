"use client";

import { useState } from "react";
import ReportViewer from "@/app/components/primecfo/ReportViewer";
import TreasuryTab from "@/app/components/primecfo/reports/TreasuryTab";
import AssetsTab from "@/app/components/primecfo/reports/AssetsTab";
import APARTab from "@/app/components/primecfo/reports/APARTab";
import AnalyticsTab from "@/app/components/primecfo/reports/AnalyticsTab";
import AlertsTab from "@/app/components/primecfo/reports/AlertsTab";
import DocumentsTab from "@/app/components/primecfo/reports/DocumentsTab";
import IntegrationsTab from "@/app/components/primecfo/reports/IntegrationsTab";
import NotesAndTasksTab from "@/app/components/primecfo/reports/NotesAndTasksTab";

export type ReportsTabId =
  | "treasury"
  | "assets"
  | "ap-ar"
  | "analytics"
  | "reports"
  | "alerts"
  | "documents"
  | "integrations"
  | "notes";

const TABS: Array<{ id: ReportsTabId; label: string }> = [
  { id: "treasury", label: "Treasury" },
  { id: "assets", label: "Assets" },
  { id: "ap-ar", label: "AP/AR" },
  { id: "analytics", label: "Analytics & Reports" },
  { id: "reports", label: "Financial Reports" },
  { id: "alerts", label: "Alerts" },
  { id: "documents", label: "Documents" },
  { id: "integrations", label: "Integrations" },
  { id: "notes", label: "Notes & Tasks" },
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
                  ? "bg-teal-600 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-700/50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-auto p-6">
        {activeTab === "reports" && <ReportViewer />}
        {activeTab === "treasury" && <TreasuryTab />}
        {activeTab === "assets" && <AssetsTab />}
        {activeTab === "ap-ar" && <APARTab />}
        {activeTab === "analytics" && <AnalyticsTab />}
        {activeTab === "alerts" && <AlertsTab />}
        {activeTab === "documents" && <DocumentsTab />}
        {activeTab === "integrations" && <IntegrationsTab />}
        {activeTab === "notes" && <NotesAndTasksTab />}
      </div>
    </div>
  );
}
