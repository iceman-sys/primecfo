"use client";

import React, { useState } from "react";
import { Brain, AlertTriangle, Eye, TrendingUp, Info, ChevronDown, ChevronUp } from "lucide-react";
import { AIInsight } from "@/lib/financialData";

interface AIInsightsProps {
  insights: AIInsight[];
  compact?: boolean;
}

const urgencyConfig: Record<
  string,
  { label: string; icon: React.FC<{ className?: string }>; bg: string; border: string; text: string; dot: string }
> = {
  action_required: { label: "Action Required", icon: AlertTriangle, bg: "bg-red-500/10", border: "border-red-500/20", text: "text-red-400", dot: "bg-red-400" },
  watch: { label: "Watch Closely", icon: Eye, bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400", dot: "bg-amber-400" },
  positive: { label: "Positive Trend", icon: TrendingUp, bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400", dot: "bg-emerald-400" },
  info: { label: "Information", icon: Info, bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-400", dot: "bg-blue-400" },
};

const AIInsights: React.FC<AIInsightsProps> = ({ insights, compact = false }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterUrgency, setFilterUrgency] = useState<string>("all");

  const filtered = filterUrgency === "all" ? insights : insights.filter((i) => i.urgency === filterUrgency);
  const displayed = compact ? filtered.slice(0, 4) : filtered;

  return (
    <div className={compact ? "" : "bg-slate-800/50 border border-slate-700/50 rounded-xl p-6"}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/20 rounded-xl flex items-center justify-center">
            <Brain className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">AI Insights</h3>
            <p className="text-xs text-slate-400">{insights.length} insights</p>
          </div>
        </div>
        {!compact && (
          <div className="flex items-center gap-2">
            {["all", "action_required", "watch", "positive", "info"].map((u) => (
              <button
                key={u}
                onClick={() => setFilterUrgency(u)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize ${
                  filterUrgency === u ? "bg-violet-500/20 text-violet-400 border border-violet-500/30" : "bg-slate-700 text-slate-300 border border-slate-600"
                }`}
              >
                {u === "all" ? "All" : u.replace("_", " ")}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="space-y-3">
        {displayed.map((insight) => {
          const config = urgencyConfig[insight.urgency] || urgencyConfig.info;
          const Icon = config.icon;
          const isExpanded = expandedId === insight.id;

          return (
            <div
              key={insight.id}
              className={`${config.bg} border ${config.border} rounded-xl overflow-hidden`}
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : insight.id)}
                className="w-full flex items-center gap-4 p-4 text-left"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.bg} border ${config.border}`}>
                  <Icon className={`w-5 h-5 ${config.text}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${config.text}`}>{config.label}</p>
                  <p className="text-sm text-white truncate">{insight.title}</p>
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>
              {isExpanded && (
                <div className="px-4 pb-4 pt-0">
                  <p className="text-sm text-slate-300 leading-relaxed">{insight.description}</p>
                  {(insight.metric ?? insight.metricValue) && (
                    <p className="text-xs text-slate-500 mt-2">
                      {insight.metric} {insight.metricValue}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AIInsights;
