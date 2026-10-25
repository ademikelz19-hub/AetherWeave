"use client";

import { useState, useEffect, useCallback } from "react";
import { ShieldCheck, Copy, Trash2, CheckCircle2, AlertTriangle, Clock } from "lucide-react";

interface SinkReceipt {
  id: string;
  sourceEventId: string | null;
  headers: Record<string, string>;
  body: string;
  isDuplicate: boolean;
  signatureStatus: string;
  receivedAt: string;
}

export function SinkMonitor() {
  const [receipts, setReceipts] = useState<SinkReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  const fetchReceipts = useCallback(async () => {
    try {
      const res = await fetch("/api/sink");
      if (res.ok) {
        const data = await res.json();
        setReceipts(data);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const init = async () => {
      await fetchReceipts();
      setLoading(false);
    };
    init();
    const interval = setInterval(fetchReceipts, 2000);
    return () => clearInterval(interval);
  }, [fetchReceipts]);

  const handleClear = async () => {
    setClearing(true);
    try {
      await fetch("/api/sink", { method: "DELETE" });
      setReceipts([]);
    } finally {
      setClearing(false);
    }
  };

  const duplicateCount = receipts.filter((r) => r.isDuplicate).length;

  return (
    <div className="glass-panel p-6 space-y-4 border-emerald-500/20">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold font-space text-emerald-400 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            Destination Target Sink & Idempotency Prover (`/api/sink`)
          </h3>
          <p className="text-xs text-slate-400">
            Live observable verification of payloads delivered by AetherWeave with mathematical idempotency tracking
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs">
            <span className="text-slate-400">Idempotency Checks:</span>
            <span className="text-purple-300 font-mono font-bold">
              {duplicateCount} duplicates absorbed
            </span>
          </div>

          <button
            onClick={handleClear}
            disabled={clearing || receipts.length === 0}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-500 hover:text-red-400 transition-colors disabled:opacity-30"
            title="Clear sink history"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-28 glass-panel animate-pulse rounded-lg" />
      ) : receipts.length === 0 ? (
        <div className="p-8 text-center glass-panel rounded-xl border-dashed border-slate-800">
          <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-400 font-medium">
            Waiting for forwarded payloads at `/api/sink`
          </p>
          <p className="text-xs text-slate-600 mt-1">
            Set your endpoint target URL to{" "}
            <code className="text-cyan-400">http://localhost:3000/api/sink</code> or your Vercel host, then trigger an event!
          </p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
          {receipts.map((rcpt) => {
            const delayHeader = rcpt.headers["x-aetherweave-delay-ms"];

            return (
              <div
                key={rcpt.id}
                className={`p-3 rounded-lg border text-xs transition-all ${
                  rcpt.isDuplicate
                    ? "bg-purple-950/20 border-purple-500/40"
                    : "bg-slate-900/60 border-slate-800"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {rcpt.isDuplicate ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30 text-[11px]">
                        <AlertTriangle className="w-3 h-3" />
                        IDEMPOTENT DUPLICATE (2nd Delivery)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium border border-emerald-500/30 text-[11px]">
                        <CheckCircle2 className="w-3 h-3" />
                        PRIMARY DELIVERY (200 OK)
                      </span>
                    )}

                    <span className="text-slate-500 font-mono">
                      {new Date(rcpt.receivedAt).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {delayHeader && (
                      <span className="text-amber-400 font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        Observed Delay: +{delayHeader}ms
                      </span>
                    )}
                    <span className="text-slate-500 font-mono">
                      Event: {rcpt.sourceEventId ?? "Generic"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-slate-400 bg-slate-950/40 px-2.5 py-1.5 rounded font-mono text-[11px]">
                  <span className="truncate max-w-md">
                    {rcpt.isDuplicate
                      ? "State Mutation Avoided: Event ID already marked processed in ledger."
                      : "State Mutated: Event verified and recorded into application state machine."}
                  </span>
                  <span
                    className={
                      rcpt.signatureStatus === "valid"
                        ? "text-emerald-400"
                        : "text-slate-500"
                    }
                  >
                    HMAC Signature: {rcpt.signatureStatus.toUpperCase()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
