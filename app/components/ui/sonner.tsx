"use client";

import React from "react";
import { Toaster as Sonner, toast as sonnerToast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => (
  <Sonner
    theme="dark"
    className="toaster group"
    toastOptions={{
      classNames: {
        toast:
          "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
        description: "group-[.toast]:text-muted-foreground",
        actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
        cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
      },
    }}
    {...props}
  />
);

/** Props for error toast with progress bar (used with toast.custom) */
export type ToastErrorWithProgressOptions = {
  title: string;
  description?: string;
  duration?: number;
  action?: { label: string; onClick: () => void };
};

/** Renders error toast content with progress bar and top-right close (X); use via toastErrorWithProgress() */
function ToastErrorWithProgress({
  id,
  title,
  description,
  duration,
  action,
}: { id: string | number } & ToastErrorWithProgressOptions) {
  return (
    <div className="relative rounded-lg border border-red-500/20 bg-red-500/10 p-4 pr-10 text-left shadow-lg">
      <button
        type="button"
        onClick={() => sonnerToast.dismiss(id)}
        className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-700/50 hover:text-white"
        aria-label="Close"
      >
        <span className="text-lg leading-none">×</span>
      </button>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-red-200">{title}</p>
        {description && <p className="text-xs text-slate-400">{description}</p>}
        {action && (
          <button
            type="button"
            onClick={() => {
              action.onClick();
              sonnerToast.dismiss(id);
            }}
            className="mt-2 inline-flex w-fit items-center gap-2 rounded-lg bg-red-500/20 px-3 py-1.5 text-sm font-medium text-red-200 hover:bg-red-500/30"
          >
            {action.label}
          </button>
        )}
      </div>
      <div className="toast-progress-bar">
        <div
          className="toast-progress-bar-fill"
          style={{ animationDuration: `${duration ?? 4000}ms` }}
        />
      </div>
    </div>
  );
}

/** Show error toast with progress bar and optional action; close (X) is top-right via Sonner closeButton */
export function toastErrorWithProgress(
  title: string,
  options: Omit<ToastErrorWithProgressOptions, "title"> = {}
) {
  const { description, duration = 10_000, action } = options;
  sonnerToast.custom(
    (id) => (
      <ToastErrorWithProgress
        id={id}
        title={title}
        description={description}
        duration={duration}
        action={action}
      />
    ),
    { duration }
  );
}

export { Toaster };
export { toast } from "sonner";
