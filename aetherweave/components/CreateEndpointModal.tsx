"use client";

import { useState } from "react";
import { WebhookEndpointRow } from "@/lib/types";
import { X, Sparkles, Globe, Terminal } from "lucide-react";

interface Props {
  onClose: () => void;
  onCreated: (endpoint: WebhookEndpointRow) => void;
}

export function CreateEndpointModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [targetUrl, setTargetUrl] = useState("https://httpbin.org/post");
  const [latencyMs, setLatencyMs] = useState(500);
  const [dropProb, setDropProb] = useState(0);
  const [duplicate, setDuplicate] = useState(false);
  const [scramble, setScramble] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Endpoint name is required");
      return;
    }
    try {
      new URL(targetUrl);
    } catch {
      setError("Please provide a valid destination URL (e.g. https://api.my-app.com/webhooks)");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/endpoints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          targetUrl: targetUrl.trim(),
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
        throw new Error(data.error || "Failed to create endpoint");
      }

      const created = await res.json();
      onCreated(created);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="glass-panel w-full max-w-lg p-6 relative border-cyan-500/30 neon-border-cyan animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-space neon-text-cyan">
              Deploy Chaos Vortex Endpoint
            </h2>
            <p className="text-xs text-slate-400">
              Generate an edge-resilient proxy listener for incoming webhooks
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Endpoint Name
            </label>
            <div className="relative">
              <Terminal className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="e.g. Stripe Payment Ingress (Staging)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field pl-9"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Destination Target URL
            </label>
            <div className="relative">
              <Globe className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="url"
                placeholder="https://api.myapp.vercel.app/api/webhooks/stripe"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                className="input-field pl-9"
                required
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Where AetherWeave will forward the intercepted and degraded payloads.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-4">
            <h3 className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
              Initial Chaos Profile
            </h3>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Latency Injection</span>
                <span className="text-amber-400 font-mono font-bold">{latencyMs} ms</span>
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
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Packet Drop Rate</span>
                <span className="text-red-400 font-mono font-bold">{Math.round(dropProb * 100)} %</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={dropProb}
                onChange={(e) => setDropProb(Number(e.target.value))}
                className="w-full h-1.5 appearance-none rounded-full bg-slate-700 cursor-pointer accent-red-400"
              />
            </div>

            <div className="flex gap-4 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={duplicate}
                  onChange={(e) => setDuplicate(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-purple-500 focus:ring-0"
                />
                Duplicate (2x)
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={scramble}
                  onChange={(e) => setScramble(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-orange-500 focus:ring-0"
                />
                Sequence Scrambling
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? "Initializing..." : "Create Vortex Endpoint"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
