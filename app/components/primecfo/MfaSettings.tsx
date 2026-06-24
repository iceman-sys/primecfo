"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { ShieldCheck, ShieldAlert, Loader2 } from "lucide-react";

type Factor = { id: string; friendlyName: string | null; status: string };

type EnrollData = { factorId: string; qrCode: string; secret: string };

export default function MfaSettings() {
  const [loading, setLoading] = useState(true);
  const [factors, setFactors] = useState<Factor[]>([]);
  const [enroll, setEnroll] = useState<EnrollData | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const verified = factors.find((f) => f.status === "verified") ?? null;

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/mfa/factors", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { factors: Factor[] };
        setFactors(data.factors ?? []);
      }
    } catch {
      // ignore — section simply shows the enable button
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const startEnroll = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/auth/mfa/enroll", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as EnrollData & { error?: string };
      if (!res.ok) {
        toast.error(data.error || "Could not start enrollment.");
        return;
      }
      setEnroll({ factorId: data.factorId, qrCode: data.qrCode, secret: data.secret });
    } finally {
      setBusy(false);
    }
  };

  const confirmEnroll = async () => {
    if (!enroll) return;
    setBusy(true);
    try {
      const res = await fetch("/api/auth/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ factorId: enroll.factorId, code }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data.error || "That code was incorrect. Try again.");
        return;
      }
      toast.success("Two-factor authentication is now enabled.");
      setEnroll(null);
      setCode("");
      await load();
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    if (!verified) return;
    setBusy(true);
    try {
      const res = await fetch("/api/auth/mfa/unenroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ factorId: verified.id }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data.error || "Could not disable two-factor authentication.");
        return;
      }
      toast.success("Two-factor authentication disabled.");
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
          {verified ? (
            <ShieldCheck className="w-5 h-5 text-teal-400" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-amber-400" />
          )}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Two-factor authentication</h3>
          <p className="text-sm text-slate-400">
            Add a time-based code from an authenticator app for an extra layer of security.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : verified ? (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm text-teal-300">
            Two-factor authentication is <span className="font-semibold">enabled</span>. You&apos;ll
            be asked for a code each time you sign in.
          </p>
          <button
            type="button"
            onClick={disable}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-red-500/40 text-red-300 hover:bg-red-500/10 disabled:opacity-60 text-sm font-medium transition-colors"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Disable
          </button>
        </div>
      ) : enroll ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            Scan this QR code with Google Authenticator, 1Password, Authy, or any TOTP app, then
            enter the 6-digit code to confirm.
          </p>
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            <div className="rounded-lg bg-white p-3">
              {/* Supabase returns an SVG data URL */}
              <Image src={enroll.qrCode} alt="Authenticator QR code" width={160} height={160} unoptimized />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                  Manual setup key
                </p>
                <code className="text-xs text-slate-300 break-all bg-slate-900/60 rounded px-2 py-1 inline-block">
                  {enroll.secret}
                </code>
              </div>
              <div>
                <label htmlFor="enrollCode" className="block text-sm font-medium text-white/80 mb-1.5">
                  6-digit code
                </label>
                <input
                  id="enrollCode"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className="w-40 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-center text-lg tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  placeholder="000000"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={confirmEnroll}
                  disabled={busy || code.length < 6}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 disabled:opacity-60 text-white text-sm font-semibold transition-colors"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Confirm &amp; enable
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEnroll(null);
                    setCode("");
                  }}
                  className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700/50 text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-slate-400 text-sm mb-4">
            Two-factor authentication is not enabled. We recommend turning it on to protect your
            financial data.
          </p>
          <button
            type="button"
            onClick={startEnroll}
            disabled={busy}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 disabled:opacity-60 text-white text-sm font-semibold transition-colors"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Enable two-factor authentication
          </button>
        </div>
      )}
    </div>
  );
}
