"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReportRange } from "@/lib/api/client";

const STORAGE_KEY = "primecfo_report_range";
const VALID_RANGES: ReportRange[] = ["3m", "6m", "12m", "4q"];

function isReportRange(value: string | null | undefined): value is ReportRange {
  return !!value && VALID_RANGES.includes(value as ReportRange);
}

type ReportRangeContextValue = {
  range: ReportRange;
  setRange: (range: ReportRange) => void;
};

const ReportRangeContext = createContext<ReportRangeContextValue>({
  range: "3m",
  setRange: () => {},
});

export function ReportRangeProvider({ children }: { children: React.ReactNode }) {
  const [range, setRangeState] = useState<ReportRange>("3m");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const fromUrl = params.get("range");
      if (isReportRange(fromUrl)) {
        setRangeState(fromUrl);
        localStorage.setItem(STORAGE_KEY, fromUrl);
      } else {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (isReportRange(stored)) setRangeState(stored);
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  const setRange = useCallback((next: ReportRange) => {
    setRangeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(() => ({ range, setRange }), [range, setRange]);

  if (!hydrated) {
    return <ReportRangeContext.Provider value={value}>{children}</ReportRangeContext.Provider>;
  }

  return <ReportRangeContext.Provider value={value}>{children}</ReportRangeContext.Provider>;
}

export function useReportRange() {
  return useContext(ReportRangeContext);
}
