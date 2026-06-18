"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import type { ReportRange } from "@/lib/api/client";

export type RangePreset = { key: ReportRange; label: string };

type ReportRangePresetBarProps = {
  presets: RangePreset[];
  value: ReportRange;
  onChange: (range: ReportRange) => void;
  /** True while data for the selected range is loading */
  loading?: boolean;
  disabled?: boolean;
  className?: string;
};

/** Horizontal date-range preset buttons with loading feedback. */
const ReportRangePresetBar: React.FC<ReportRangePresetBarProps> = ({
  presets,
  value,
  onChange,
  loading = false,
  disabled = false,
  className = "",
}) => {
  const busy = loading || disabled;

  return (
    <div className={className}>
      <div
        className="grid grid-cols-2 lg:flex lg:flex-wrap gap-2"
        role="radiogroup"
        aria-label="Report date range"
        aria-busy={loading}
      >
        {presets.map((p) => {
          const selected = value === p.key;
          const showSpinner = selected && loading;
          return (
            <button
              key={p.key}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(p.key)}
              disabled={busy}
              className={`min-h-[44px] rounded-xl px-4 py-2.5 text-sm font-medium border transition-all inline-flex items-center justify-center gap-2 ${
                selected
                  ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-white border-transparent shadow-md shadow-teal-500/20"
                  : "border-slate-700 bg-slate-800/50 text-slate-400 hover:text-white hover:border-slate-600"
              } ${busy ? "cursor-wait" : ""} ${busy && !selected ? "opacity-70" : ""}`}
            >
              {showSpinner ? (
                <Loader2 className="w-4 h-4 shrink-0 animate-spin" aria-hidden />
              ) : null}
              <span>{p.label}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="mt-2 h-0.5 w-full overflow-hidden rounded-full bg-slate-800" aria-hidden>
          <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 animate-[range-load_1.1s_ease-in-out_infinite]" />
        </div>
      ) : null}
    </div>
  );
};

export default ReportRangePresetBar;
