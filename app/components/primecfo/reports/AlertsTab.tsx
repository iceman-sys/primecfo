"use client";

import { AlertTriangle, AlertCircle, Info } from "lucide-react";

type Severity = "critical" | "warning" | "info";

const mockAlerts = [
  {
    id: "1",
    severity: "critical" as Severity,
    category: "Cash Flow",
    title: "Low Cash Alert",
    description: "Projected cash balance will fall below minimum threshold in 5 days",
    actionRequired: true,
    timestamp: "2024-11-14T10:30:00",
  },
  {
    id: "2",
    severity: "warning" as Severity,
    category: "Collections",
    title: "Large Invoice Overdue",
    description: "Invoice #1230 ($125,000) is 15 days overdue",
    actionRequired: true,
    timestamp: "2024-11-14T09:15:00",
  },
  {
    id: "3",
    severity: "info" as Severity,
    category: "Banking",
    title: "Wire Transfer Completed",
    description: "Wire transfer of $50,000 to vendor completed successfully",
    actionRequired: false,
    timestamp: "2024-11-14T08:00:00",
  },
];

function getSeverityStyles(severity: Severity) {
  switch (severity) {
    case "critical":
      return "bg-red-500/10 border-red-500/20 text-red-400";
    case "warning":
      return "bg-amber-500/10 border-amber-500/20 text-amber-400";
    default:
      return "bg-blue-500/10 border-blue-500/20 text-blue-400";
  }
}

function getSeverityIcon(severity: Severity) {
  switch (severity) {
    case "critical":
      return <AlertTriangle className="w-5 h-5 text-red-400" />;
    case "warning":
      return <AlertCircle className="w-5 h-5 text-amber-400" />;
    default:
      return <Info className="w-5 h-5 text-blue-400" />;
  }
}

export default function AlertsTab() {
  const critical = mockAlerts.filter((a) => a.severity === "critical").length;
  const warning = mockAlerts.filter((a) => a.severity === "warning").length;
  const info = mockAlerts.filter((a) => a.severity === "info").length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-400">Critical</p>
              <p className="text-2xl font-bold text-red-400">{critical}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-500/70" />
          </div>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-amber-400">Warnings</p>
              <p className="text-2xl font-bold text-amber-400">{warning}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-amber-500/70" />
          </div>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-400">Info</p>
              <p className="text-2xl font-bold text-blue-400">{info}</p>
            </div>
            <Info className="w-8 h-8 text-blue-500/70" />
          </div>
        </div>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700/50 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white">Active Alerts</h3>
          <button type="button" className="text-sm text-slate-400 hover:text-white">
            Mark all read
          </button>
        </div>
        <div className="divide-y divide-slate-700/50">
          {mockAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`px-6 py-4 ${getSeverityStyles(alert.severity)} border-l-4 ${
                alert.severity === "critical"
                  ? "border-red-500"
                  : alert.severity === "warning"
                    ? "border-amber-500"
                    : "border-blue-500"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  {getSeverityIcon(alert.severity)}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-white">{alert.title}</h4>
                      <span className="px-2 py-0.5 text-xs bg-slate-700/50 text-slate-300 rounded">
                        {alert.category}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300 mb-1">{alert.description}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(alert.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
                {alert.actionRequired && (
                  <button
                    type="button"
                    className="px-3 py-1.5 bg-slate-700 border border-slate-600 text-sm text-white rounded-lg hover:bg-slate-600 shrink-0"
                  >
                    Take action
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
