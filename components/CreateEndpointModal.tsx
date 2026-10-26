"use client";

import { useState } from "react";
import { WebhookEndpointRow } from "@/lib/types";
import { X, Globe, Terminal, ShieldCheck, Timer, AlertCircle, CheckCircle2 } from "lucide-react";

interface Props {
  onClose: () => void;
  onCreated: (endpoint: WebhookEndpointRow) => void;
}

export function CreateEndpointModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [targetMode, setTargetMode] = useState<"custom" | "sandbox">("custom");
  const [targetUrl, setTargetUrl] = useState("");
  const [latencyMs, setLatencyMs] = useState(1500);
  const [dropProb, setDropProb] = useState(0);
  const [duplicate, setDuplicate] = useState(true);
  const [scramble, setScramble] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please give your test a name (e.g. My Website Payment Webhook).");
      return;
    }

    let finalTarget = targetMode === "sandbox" ? "/api/sink" : targetUrl.trim();

    if (!finalTarget) {
      setError("Please enter your website's webhook URL, or choose the Built-in Testing Sandbox.");
      return;
    }

    // Resolve relative URL to origin if needed
    if (finalTarget.startsWith("/")) {
      const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
      finalTarget = `${origin}${finalTarget}`;
    } else {
      try {
        new URL(finalTarget);
      } catch {
        setError("Invalid URL format. Please include http:// or https:// (e.g. https://my-website.com/api/webhooks).");
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/endpoints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          targetUrl: finalTarget,
          chaosProfile: {
            latencyMs: Number(latencyMs),
            dropProb: Number(dropProb),
            duplicate,
            scramble,
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create endpoint.");
      }

      const created = await res.json();
      onCreated(created);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="glass-panel w-full max-w-xl p-6 sm:p-7 relative border-cyan-500/30 shadow-[0_0_40px_rgba(6,182,212,0.15)] rounded-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-3.5 mb-6">
          <div className="w-11 h-11 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 flex-shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-space text-slate-100 tracking-tight">
              Add Target Website To Test
            </h2>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Tell AetherWeave where to send test webhooks so you can stress-test how your site handles slow internet, lost connections, and duplicate payments.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Step 1: Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
              1. Name Your Test
            </label>
            <p className="text-[11px] text-slate-400">
              Give this test a friendly name so you can recognize it in your list.
            </p>
            <div className="relative">
              <Terminal className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="e.g. My Website Payment Webhook (Staging)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field pl-10 text-sm font-medium"
                required
              />
            </div>
          </div>

          {/* Step 2: Target Destination Mode */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
              2. Where Should We Send The Test Messages?
            </label>

            {/* Mode Selector Tabs */}
            <div className="grid grid-cols-2 gap-2.5 p-1 rounded-xl bg-slate-900 border border-slate-800">
              <button
                type="button"
                onClick={() => setTargetMode("custom")}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  targetMode === "custom"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                My Own Website URL
              </button>
              <button
                type="button"
                onClick={() => setTargetMode("sandbox")}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  targetMode === "sandbox"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Built-in Sandbox (/api/sink)
              </button>
            </div>

            {targetMode === "custom" ? (
              <div className="space-y-1.5 pt-1">
                <div className="relative">
                  <Globe className="w-4 h-4 text-cyan-400 absolute left-3.5 top-3.5" />
                  <input
                    type="url"
                    placeholder="https://my-app.com/api/webhooks"
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    className="input-field pl-10 font-mono text-xs text-cyan-300 placeholder:text-slate-600"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Enter your server&apos;s webhook handler URL (e.g. your payment endpoint or local tunnel URL).
                </p>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-xs text-emerald-300/90 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1 text-[11px] leading-relaxed">
                  <span className="font-bold text-emerald-300">Using Built-in Testing Sandbox:</span>
                  <p>
                    Test messages will be forwarded to AetherWeave&apos;s built-in target sink, proving duplicate protection and signature validation without needing an external server.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Step 3: Stress Test Controls */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">
                3. Choose Initial Stress Settings
              </span>
              <span className="text-[10px] text-slate-400">You can adjust these anytime</span>
            </div>

            {/* Delay Slider */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <Timer className="w-3.5 h-3.5 text-amber-400" />
                  Simulated Internet Lag
                </span>
                <span className="text-amber-400 font-mono font-bold">{latencyMs} ms ({latencyMs === 0 ? "Instant" : `${(latencyMs / 1000).toFixed(1)}s lag`})</span>
              </div>
              <input
                type="range"
                min="0"
                max="5000"
                step="100"
                value={latencyMs}
                onChange={(e) => setLatencyMs(Number(e.target.value))}
                className="w-full h-1.5 appearance-none rounded-full bg-slate-700 cursor-pointer accent-amber-400"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>0s (Instant)</span>
                <span>2.5s</span>
                <span>5.0s (Severe Lag)</span>
              </div>
            </div>

            {/* Duplicate & Drop Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <label className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                duplicate ? "bg-purple-500/15 border-purple-500/50 text-purple-200" : "bg-slate-900 border-slate-800 text-slate-400"
              }`}>
                <input
                  type="checkbox"
                  checked={duplicate}
                  onChange={(e) => setDuplicate(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-purple-500 focus:ring-0 w-4 h-4"
                />
                <div className="text-left">
                  <div className="text-xs font-bold">Send Twice (Double Test)</div>
                  <div className="text-[10px] opacity-75">Tests duplicate payments</div>
                </div>
              </label>

              <label className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                scramble ? "bg-orange-500/15 border-orange-500/50 text-orange-200" : "bg-slate-900 border-slate-800 text-slate-400"
              }`}>
                <input
                  type="checkbox"
                  checked={scramble}
                  onChange={(e) => setScramble(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-orange-500 focus:ring-0 w-4 h-4"
                />
                <div className="text-left">
                  <div className="text-xs font-bold">Reverse Delivery Order</div>
                  <div className="text-[10px] opacity-75">Tests out-of-order events</div>
                </div>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost text-xs px-4 py-2"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary text-xs px-6 py-2.5 flex items-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <span>Save &amp; Start Testing</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
