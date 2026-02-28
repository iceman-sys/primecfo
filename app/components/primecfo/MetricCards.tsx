"use client";

import React from "react";
import {
  DollarSign,
  CreditCard,
  TrendingUp,
  TrendingDown,
  PieChart,
  Wallet,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
import {
  MetricCard,
  formatCurrency,
  formatExactCurrency,
  formatPercentChange,
  getPercentChange,
} from "@/lib/financialData";

interface MetricCardsProps {
  metrics: MetricCard[];
}

const iconMap: Record<string, React.FC<{ className?: string }>> = {
  DollarSign,
  CreditCard,
  TrendingUp,
  PieChart,
  Wallet,
  FileText,
};

const colorMap: Record<string, { bg: string; icon: string; border: string }> = {
  emerald: { bg: "bg-emerald-500/10", icon: "text-emerald-400", border: "border-emerald-500/20" },
  red: { bg: "bg-red-500/10", icon: "text-red-400", border: "border-red-500/20" },
  blue: { bg: "bg-blue-500/10", icon: "text-blue-400", border: "border-blue-500/20" },
  violet: { bg: "bg-violet-500/10", icon: "text-violet-400", border: "border-violet-500/20" },
  teal: { bg: "bg-teal-500/10", icon: "text-teal-400", border: "border-teal-500/20" },
  amber: { bg: "bg-amber-500/10", icon: "text-amber-400", border: "border-amber-500/20" },
};

const MetricCards: React.FC<MetricCardsProps> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {metrics.map((metric) => {
        const IconComponent = iconMap[metric.icon] || DollarSign;
        const colors = colorMap[metric.color] || colorMap.teal;
        const percentChange = getPercentChange(metric.value, metric.previousValue);
        const changeStr = formatPercentChange(metric.value, metric.previousValue);

        let displayValue = "";
        if (metric.format === "currency") displayValue = formatCurrency(metric.value);
        else if (metric.format === "currencyExact") displayValue = formatExactCurrency(metric.value);
        else if (metric.format === "percentage") displayValue = `${metric.value}%`;
        else if (metric.format === "days") displayValue = `${metric.value} days`;
        else displayValue = metric.value.toLocaleString();

        return (
          <div
            key={metric.id}
            className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 hover:border-slate-600 transition-all group"
          >
            <div className="flex items-start justify-between mb-4">
              <div
                className={`w-10 h-10 ${colors.bg} border ${colors.border} rounded-xl flex items-center justify-center`}
              >
                <IconComponent className={`w-5 h-5 ${colors.icon}`} />
              </div>
              <div
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                  metric.trendIsGood
                    ? "bg-emerald-500/10 text-emerald-400"
                    : percentChange === 0
                      ? "bg-slate-500/10 text-slate-400"
                      : "bg-red-500/10 text-red-400"
                }`}
              >
                {metric.trend === "up" ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : metric.trend === "down" ? (
                  <ArrowDownRight className="w-3 h-3" />
                ) : (
                  <Minus className="w-3 h-3" />
                )}
                {changeStr}
              </div>
            </div>
            <p className="text-2xl font-bold text-white mb-1">{displayValue}</p>
            <p className="text-sm text-slate-400">{metric.title}</p>
            <div className="mt-3 pt-3 border-t border-slate-700/30">
              <p className="text-xs text-slate-500">
                Previous:{" "}
                {metric.format === "currency"
                  ? formatCurrency(metric.previousValue)
                  : metric.format === "currencyExact"
                    ? formatExactCurrency(metric.previousValue)
                    : metric.format === "percentage"
                      ? `${metric.previousValue}%`
                      : metric.previousValue.toLocaleString()}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MetricCards;
