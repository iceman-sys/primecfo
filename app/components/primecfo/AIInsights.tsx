"use client";

import React, { useState } from "react";
import {
  Brain,
  AlertTriangle,
  AlertCircle,
  Eye,
  TrendingUp,
  Info,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Lightbulb,
  MessageSquareQuote,
} from "lucide-react";
import type { AIInsight, InsightSeverity } from "@/lib/financialData";

interface AIInsightsProps {
  insights: AIInsight[];
  compact?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

const urgencyConfig: Record<
  InsightSeverity,
  {
    label: string;
    icon: React.FC<{ className?: string }>;
    bg: string;
    border: string;
    text: string;
    metricText: string;
    iconBg: string;
  }
> = {
  critical: {
    label: "IMMEDIATE ATTENTION REQUIRED",
    icon: AlertTriangle,
    bg: "bg-red-500/5",
    border: "border-red-500/15",
    text: "text-red-400",
    metricText: "text-red-400",
    iconBg: "bg-red-500/10",
  },
  warning: {
    label: "MONITOR CLOSELY",
    icon: AlertCircle,
    bg: "bg-orange-500/5",
    border: "border-orange-500/15",
    text: "text-orange-400",
    metricText: "text-orange-400",
    iconBg: "bg-orange-500/10",
  },
  watch: {
    label: "EMERGING PATTERN",
    icon: Eye,
    bg: "bg-amber-500/5",
    border: "border-amber-500/15",
    text: "text-amber-400",
    metricText: "text-amber-400",
    iconBg: "bg-amber-500/10",
  },
  positive: {
    label: "WHAT'S WORKING",
    icon: TrendingUp,
    bg: "bg-emerald-500/5",
    border: "border-emerald-500/15",
    text: "text-emerald-400",
    metricText: "text-emerald-400",
    iconBg: "bg-emerald-500/10",
  },
  info: {
    label: "INFORMATION",
    icon: Info,
    bg: "bg-blue-500/5",
    border: "border-blue-500/15",
    text: "text-blue-400",
    metricText: "text-blue-400",
    iconBg: "bg-blue-500/10",
  },
};

const filterButtons = [
  { key: "all", label: "All" },
  { key: "critical", label: "Critical" },
  { key: "warning", label: "Warning" },
  { key: "watch", label: "Watch" },
  { key: "positive", label: "Positive" },
  { key: "info", label: "Info" },
];

const AIInsights: React.FC<AIInsightsProps> = ({
  insights,
  compact = false,
  onRefresh,
  isRefreshing = false,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterUrgency, setFilterUrgency] = useState<string>("all");

  const filtered =
    filterUrgency === "all"
      ? insights
      : insights.filter((i) => i.urgency === filterUrgency);
  const displayed = compact ? filtered.slice(0, 4) : filtered;

  return (
    <div
      className={`font-insights ${
        compact
          ? ""
          : "bg-slate-900/60 border border-slate-700/40 rounded-2xl p-6"
      }`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-br from-violet-500/20 to-purple-600/20 border border-violet-500/20 rounded-xl flex items-center justify-center">
            <Brain className="w-6 h-6 text-violet-400" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-white tracking-tight">
              AI Insights
            </h3>
            <p className="text-sm text-slate-500">
              {insights.length} insights generated
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {!compact &&
            filterButtons.map((btn) => (
              <button
                key={btn.key}
                onClick={() => setFilterUrgency(btn.key)}
                className={`px-3.5 py-2 text-sm font-medium rounded-lg transition-colors ${
                  filterUrgency === btn.key
                    ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                    : "bg-slate-800/80 text-slate-400 border border-slate-700/50 hover:text-slate-300 hover:border-slate-600"
                }`}
              >
                {btn.label}
              </button>
            ))}
          {!compact && onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white transition-colors ml-1"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          )}
        </div>
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {displayed.map((insight) => {
          const config =
            urgencyConfig[insight.urgency] || urgencyConfig.info;
          const Icon = config.icon;
          const isExpanded = expandedId === insight.id;
          const hasRecommendations =
            insight.recommendations && insight.recommendations.length > 0;
          const hasTalkingPoints =
            insight.talkingPoints && insight.talkingPoints.length > 0;

          return (
            <div
              key={insight.id}
              className={`${config.bg} border ${config.border} rounded-xl overflow-hidden transition-colors hover:border-opacity-40`}
            >
              <button
                onClick={() =>
                  setExpandedId(isExpanded ? null : insight.id)
                }
                className="w-full flex items-center gap-5 px-5 py-5 text-left"
              >
                {/* Icon */}
                <div
                  className={`w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center ${config.iconBg}`}
                >
                  <Icon className={`w-6 h-6 ${config.text}`} />
                </div>

                {/* Text content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-xs font-bold tracking-wider uppercase ${config.text}`}
                    >
                      {config.label}
                    </span>
                    {insight.category && (
                      <>
                        <span className="text-slate-600">|</span>
                        <span className="text-xs text-slate-500">
                          {insight.category}
                        </span>
                      </>
                    )}
                  </div>
                  <p className="text-base font-semibold text-white leading-snug">
                    {insight.title}
                  </p>
                  <p className="text-sm text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {insight.description}
                  </p>
                </div>

                {/* Metric badge */}
                {insight.metricValue && (
                  <div className="flex-shrink-0 text-right mr-1">
                    <p
                      className={`text-2xl font-bold leading-tight ${config.metricText}`}
                    >
                      {insight.metricValue}
                    </p>
                    {insight.metric && (
                      <p className="text-sm text-slate-500 mt-1">
                        {insight.metric}
                      </p>
                    )}
                  </div>
                )}

                {/* Chevron */}
                <div className="flex-shrink-0">
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-slate-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-500" />
                  )}
                </div>
              </button>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-0 ml-[4.25rem] space-y-4">
                  {/* Full description */}
                  <p className="text-base text-slate-300 leading-relaxed">
                    {insight.description}
                  </p>

                  {/* Recommendations */}
                  {hasRecommendations && (
                    <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Lightbulb className="w-4 h-4 text-violet-400" />
                        <h4 className="text-sm font-semibold text-white tracking-tight">
                          Strategic Recommendations
                        </h4>
                      </div>
                      <div className="space-y-3">
                        {insight.recommendations!.map((rec, idx) => (
                          <div
                            key={idx}
                            className="flex gap-3"
                          >
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-500/15 text-violet-400 text-xs font-bold flex items-center justify-center mt-0.5">
                              {idx + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-slate-200 leading-relaxed">
                                {rec.action}
                              </p>
                              {rec.expectedImpact && (
                                <p className="text-xs text-slate-500 mt-1">
                                  Expected impact: {rec.expectedImpact}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Advisor Talking Points */}
                  {hasTalkingPoints && (
                    <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <MessageSquareQuote className="w-4 h-4 text-teal-400" />
                        <h4 className="text-sm font-semibold text-white tracking-tight">
                          Advisor Talking Points
                        </h4>
                      </div>
                      <div className="space-y-2">
                        {insight.talkingPoints!.map((point, idx) => (
                          <div
                            key={idx}
                            className="flex gap-3 items-start"
                          >
                            <span className="flex-shrink-0 w-1 h-1 rounded-full bg-teal-400 mt-2" />
                            <p className="text-sm text-slate-300 leading-relaxed italic">
                              &ldquo;{point}&rdquo;
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
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
