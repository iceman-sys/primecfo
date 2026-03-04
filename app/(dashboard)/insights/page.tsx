"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useClientContext } from "@/contexts/ClientContext";
import AIInsights from "@/app/components/primecfo/AIInsights";
import { Select } from "@/app/components/ui/select";
import { getInsights, generateInsights, type ReportRange } from "@/lib/api/client";
import type { AIInsight } from "@/lib/financialData";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

const RANGE_OPTIONS = [
  { value: "3m" as const, label: "Last 3 Months" },
  { value: "6m" as const, label: "Last 6 Months" },
  { value: "12m" as const, label: "Trailing 12 Months" },
  { value: "4q" as const, label: "Last 4 Quarters" },
];

export default function InsightsPage() {
  const queryClient = useQueryClient();
  const { selectedClient } = useClientContext();
  const [range, setRange] = useState<ReportRange>("3m");

  const { data, isLoading, error } = useQuery({
    queryKey: ["insights", selectedClient?.id, range],
    queryFn: () => getInsights(selectedClient!.id, range),
    enabled: !!selectedClient?.id,
  });

  const generateMutation = useMutation({
    mutationFn: () => generateInsights(selectedClient!.id, range),
    onSuccess: (result) => {
      queryClient.setQueryData(["insights", selectedClient?.id, range], {
        insights: result.insights,
      });
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
      {/* Range selector above the card */}
      <div className="flex items-center justify-end mb-4">
        <Select<ReportRange>
          value={range}
          onChange={setRange}
          options={RANGE_OPTIONS}
          aria-label="Time period"
          className="w-48"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
        </div>
      ) : error ? (
        <p className="text-red-400 py-4">
          {error instanceof Error ? error.message : "Failed to load insights"}
        </p>
      ) : insights.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-10 text-center">
          <div className="w-14 h-14 bg-violet-500/10 border border-violet-500/20 rounded-xl flex items-center justify-center mx-auto mb-5">
            <Sparkles className="w-7 h-7 text-violet-400" />
          </div>
          <p className="text-white font-medium mb-2">No AI insights yet</p>
          <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
            Sync QuickBooks data first, then generate plain-English financial analysis powered by AI.
          </p>
          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-lg font-medium text-sm transition-colors"
          >
            {generateMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Generate insights
          </button>
        </div>
      ) : (
        <AIInsights
          insights={insights}
          onRefresh={() => generateMutation.mutate()}
          isRefreshing={generateMutation.isPending}
        />
      )}
    </div>
  );
}
