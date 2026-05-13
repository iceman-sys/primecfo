"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  DollarSign,
  PieChart as PieChartIcon,
  TrendingUp,
  Sparkles,
} from "lucide-react";

/**
 * Animated, self-contained "live dashboard" preview for the marketing hero.
 *
 * - Animated counters on the four KPIs (revenue, profit, cash, margin)
 * - Animated SVG area chart with a sweeping highlight
 * - Rotating AI-insight tagline
 * - Pulsing "QB Connected" status badge + subtle sync shimmer
 *
 * Built with pure CSS / requestAnimationFrame — no heavy chart lib needed.
 * Respects `prefers-reduced-motion`: animations short-circuit to final value.
 */

type Metric = {
  label: string;
  prefix?: string;
  suffix?: string;
  value: number;
  /** number of decimals when formatting */
  decimals?: number;
  icon: React.ComponentType<{ className?: string }>;
  /** Trend percentage (positive or negative) shown next to the value. */
  trend: number;
  /** Color used for trend arrow. */
  positive?: boolean;
};

const METRICS: Metric[] = [
  { label: "Revenue", prefix: "$", value: 184_320, icon: DollarSign, trend: 12.4, positive: true },
  { label: "Net Profit", prefix: "$", value: 42_870, icon: TrendingUp, trend: 8.1, positive: true },
  { label: "Cash Position", prefix: "$", value: 127_510, icon: BarChart3, trend: 3.2, positive: true },
  { label: "Profit Margin", suffix: "%", value: 23.3, decimals: 1, icon: PieChartIcon, trend: -1.4, positive: false },
];

const INSIGHT_LINES = [
  "Revenue trending +12% MoM — outpacing your last 4 quarters.",
  "Operating cash runway: ~9.6 months at current burn.",
  "Marketing spend ROI improved 18% vs. last quarter.",
  "Watch: AR over 60 days up 14% — consider follow-ups.",
];

const usePrefersReducedMotion = () => {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(!!mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);
  return reduced;
};

const useInView = <T extends Element>() => {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setInView(true)),
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, inView };
};

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

const useAnimatedNumber = (target: number, start: boolean, durationMs = 1400) => {
  const reduced = usePrefersReducedMotion();
  const [value, setValue] = useState(reduced ? target : 0);
  useEffect(() => {
    if (!start) return;
    if (reduced) {
      setValue(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / durationMs);
      setValue(target * easeOutCubic(k));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, start, durationMs, reduced]);
  return value;
};

const formatNumber = (n: number, decimals = 0) =>
  n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

const MetricCard: React.FC<{ m: Metric; start: boolean; delay: number }> = ({ m, start, delay }) => {
  const reduced = usePrefersReducedMotion();
  const v = useAnimatedNumber(m.value, start, 1400);
  return (
    <div
      className="relative bg-slate-900/60 rounded-xl p-3.5 border border-slate-700/40 overflow-hidden"
      style={{
        opacity: start || reduced ? 1 : 0,
        transform: start || reduced ? "translateY(0)" : "translateY(6px)",
        transition: `opacity 500ms ease ${delay}ms, transform 500ms ease ${delay}ms`,
      }}
    >
      <m.icon className="w-4 h-4 text-slate-500 mb-2" />
      <p className="text-lg font-bold text-white tabular-nums">
        {m.prefix ?? ""}
        {formatNumber(v, m.decimals ?? 0)}
        {m.suffix ?? ""}
      </p>
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">{m.label}</p>
        <span
          className={`text-[10px] font-semibold ${
            m.positive ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {m.trend > 0 ? "▲" : "▼"} {Math.abs(m.trend).toFixed(1)}%
        </span>
      </div>
    </div>
  );
};

/** Smooth animated area chart drawn with an SVG <path>. */
const AnimatedChart: React.FC<{ start: boolean }> = ({ start }) => {
  const reduced = usePrefersReducedMotion();

  // Stable “revenue” curve, slight upward trend.
  const points = useMemo(() => {
    const raw = [22, 28, 26, 34, 31, 42, 38, 47, 46, 55, 58, 64];
    return raw;
  }, []);

  const { path, area, max, min } = useMemo(() => {
    const W = 320;
    const H = 90;
    const PAD = 4;
    const max = Math.max(...points);
    const min = Math.min(...points);
    const range = max - min || 1;
    const stepX = (W - PAD * 2) / (points.length - 1);
    const coords = points.map((p, i) => {
      const x = PAD + i * stepX;
      const y = H - PAD - ((p - min) / range) * (H - PAD * 2);
      return [x, y] as const;
    });
    const d = coords
      .map(([x, y], i) =>
        i === 0
          ? `M ${x.toFixed(2)} ${y.toFixed(2)}`
          : `L ${x.toFixed(2)} ${y.toFixed(2)}`
      )
      .join(" ");
    const a = `${d} L ${coords[coords.length - 1][0].toFixed(2)} ${H - PAD} L ${coords[0][0].toFixed(
      2
    )} ${H - PAD} Z`;
    return { path: d, area: a, max, min };
  }, [points]);

  const pathRef = useRef<SVGPathElement | null>(null);
  const [drawn, setDrawn] = useState(reduced);
  useEffect(() => {
    if (!start) return;
    if (reduced) {
      setDrawn(true);
      return;
    }
    setDrawn(false);
    const id = window.setTimeout(() => setDrawn(true), 80);
    return () => window.clearTimeout(id);
  }, [start, reduced]);

  const length = pathRef.current?.getTotalLength?.() ?? 600;

  return (
    <div className="relative">
      <svg
        viewBox="0 0 320 90"
        preserveAspectRatio="none"
        className="w-full h-[110px]"
        aria-hidden
      >
        <defs>
          <linearGradient id="lp-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="hsl(173 80% 50%)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="hsl(173 80% 40%)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="lp-line" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="hsl(173 80% 60%)" />
            <stop offset="100%" stopColor="hsl(152 80% 55%)" />
          </linearGradient>
        </defs>
        <path
          d={area}
          fill="url(#lp-area)"
          style={{
            opacity: drawn ? 1 : 0,
            transition: "opacity 900ms ease 600ms",
          }}
        />
        <path
          ref={pathRef}
          d={path}
          fill="none"
          stroke="url(#lp-line)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: length,
            strokeDashoffset: drawn ? 0 : length,
            transition: reduced ? "none" : "stroke-dashoffset 1500ms cubic-bezier(0.4,0,0.2,1)",
          }}
        />
      </svg>
      {/* sweep highlight */}
      {!reduced && (
        <div
          className="pointer-events-none absolute inset-y-0 -inset-x-2 [mask-image:linear-gradient(90deg,transparent,black_30%,black_70%,transparent)]"
          aria-hidden
        >
          <div
            className="absolute inset-y-0 w-1/4"
            style={{
              background:
                "linear-gradient(90deg, transparent, hsla(173,90%,60%,0.18), transparent)",
              animation: "lp-sweep 3.6s ease-in-out infinite",
            }}
          />
        </div>
      )}
      <style jsx>{`
        @keyframes lp-sweep {
          0% {
            transform: translateX(-30%);
            opacity: 0;
          }
          15% {
            opacity: 1;
          }
          80% {
            opacity: 1;
          }
          100% {
            transform: translateX(420%);
            opacity: 0;
          }
        }
      `}</style>
      <p className="sr-only">
        Animated revenue chart trending upward — peak {max}, low {min}.
      </p>
    </div>
  );
};

const DashboardPreview: React.FC = () => {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useInView<HTMLDivElement>();
  const start = inView || reduced;

  const [insightIdx, setInsightIdx] = useState(0);
  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => {
      setInsightIdx((i) => (i + 1) % INSIGHT_LINES.length);
    }, 4200);
    return () => window.clearInterval(id);
  }, [reduced]);

  return (
    <div ref={ref} className="relative lg:pl-8">
      {/* Soft glow behind card */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-teal-500/10 via-transparent to-emerald-500/10 blur-2xl"
      />
      <div className="relative bg-slate-800/60 backdrop-blur-sm border border-slate-700/60 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-[0.18em]">Financial Overview</p>
            <p className="text-base sm:text-lg font-semibold text-white">Acme Co. · This Month</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
            <span className="relative flex h-2 w-2">
              {!reduced && (
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
              )}
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span className="text-[11px] text-emerald-400 font-medium">QB Connected · Live</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          {METRICS.map((m, i) => (
            <MetricCard key={m.label} m={m} start={start} delay={120 * i} />
          ))}
        </div>

        <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-3.5 mb-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Revenue · last 12 mo</p>
            <p className="text-[10px] text-emerald-400 font-semibold">+18.4% YoY</p>
          </div>
          <AnimatedChart start={start} />
        </div>

        <div className="flex items-start gap-2.5 rounded-xl border border-teal-500/20 bg-teal-500/[0.06] p-3">
          <div className="mt-0.5 flex-shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-teal-300/90 font-semibold mb-1">
              AI Insight
            </p>
            <p
              key={insightIdx}
              className="text-[13px] leading-snug text-slate-200"
              style={{
                animation: reduced ? "none" : "lp-fade 600ms ease both",
              }}
            >
              {INSIGHT_LINES[insightIdx]}
            </p>
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes lp-fade {
          from {
            opacity: 0;
            transform: translateY(2px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default DashboardPreview;
