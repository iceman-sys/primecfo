"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
}

interface SelectProps<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  "aria-label"?: string;
}

export function Select<T extends string = string>({
  value,
  onChange,
  options,
  placeholder = "Select…",
  className,
  triggerClassName,
  "aria-label": ariaLabel,
}: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selected = options.find((o) => o.value === value);
  const display = selected?.label ?? placeholder;

  return (
    <div className={cn("relative", className)} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel ?? (typeof display === "string" ? display : undefined)}
        className={cn(
          "flex items-center justify-between gap-2 w-full min-w-[10rem]",
          "rounded-xl border bg-slate-800/90 border-slate-600/60",
          "px-4 py-2.5 text-[0.9375rem] font-medium text-white",
          "hover:border-slate-500/60 hover:bg-slate-800 transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500/50",
          triggerClassName
        )}
      >
        <span className="truncate">{display}</span>
        <ChevronDown
          className={cn("w-4 h-4 text-slate-400 flex-shrink-0 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <ul
            role="listbox"
            className="absolute right-0 mt-2 w-full min-w-[12rem] max-h-60 overflow-y-auto overflow-x-hidden py-1.5 rounded-xl bg-slate-800 border border-slate-700/80 shadow-xl z-20 scrollbar-reports"
            style={{ left: 0 }}
          >
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(opt.value as T);
                    setOpen(false);
                  }}
                  className={cn(
                    "px-4 py-2.5 text-[0.9375rem] font-medium cursor-pointer transition-colors",
                    isSelected
                      ? "bg-teal-500/20 text-teal-300"
                      : "text-slate-300 hover:bg-slate-700/60 hover:text-white"
                  )}
                >
                  {opt.label}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
