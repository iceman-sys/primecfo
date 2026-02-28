"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useClientContext } from "@/contexts/ClientContext";
import AIInsights from "@/app/components/primecfo/AIInsights";
import { getInsights, generateInsights, type ReportRange } from "@/lib/api/client";
import type { AIInsight } from "@/lib/financialData";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

const RANGE_OPTIONS: { value: ReportRange; label: string }[] = [
  { value: "3m", label: "Last 3 Months" },
  { value: "6m", label: "Last 6 Months" },
  { value: "12m", label: "Trailing 12 Months" },
  { value: "4q", label: "Last 4 Quarters" },
];

export default function InsightsPage() {
  const queryClient = useQueryClient();
  const { selectedClient } = useClientContext();
  const [range, setRange] = useState<ReportRange>("12m");

  const { data, isLoading, error } = useQuery({
    queryKey: ["insights", selectedClient?.id, range],
    queryFn: () => getInsights(selectedClient!.id, range),
    enabled: !!selectedClient?.id,
  });

  const generateMutation = useMutation({
    mutationFn: () => generateInsights(selectedClient!.id, range),
    onSuccess: (result) => {
      queryClient.setQueryData(["insights", selectedClient?.id, range], { insights: result.insights });
      toast.success("AI insights generated");
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Failed to generate insights");
    },
  });

  const insights: AIInsight[] = data?.insights ?? [];

  if (!selectedClient) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">AI Insights</h2>
        <p className="text-slate-400">Select a client to view insights.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-white">AI Insights</h2>
        <div className="flex items-center gap-3">
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as ReportRange)}
            className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-violet-500"
          >
            {RANGE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {generateMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Generate insights
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
        </div>
      ) : error ? (
        <p className="text-red-400 py-4">{error instanceof Error ? error.message : "Failed to load insights"}</p>
      ) : insights.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 text-center">
          <p className="text-slate-400 mb-4">No AI insights yet for this period.</p>
          <p className="text-slate-500 text-sm mb-6">Sync QuickBooks data, then click &quot;Generate insights&quot; to create plain-English analysis.</p>
          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-lg font-medium"
          >
            {generateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Generate insights
          </button>
        </div>
      ) : (
        <AIInsights insights={insights} />
      )}
    </div>
  );
}
