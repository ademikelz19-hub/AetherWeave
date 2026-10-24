"use client";

import { WebhookEndpointRow, EventPayloadRow } from "@/lib/types";
import { ChaosConfigPanel } from "./ChaosConfigPanel";
import { Copy, Check, ExternalLink } from "lucide-react";
import { useState } from "react";

interface Props {
  endpoint: WebhookEndpointRow;
  events: EventPayloadRow[];
  onChaosUpdated: (ep: WebhookEndpointRow) => void;
}

export function EventTimeline({ endpoint, events, onChaosUpdated }: Props) {
  const [copied, setCopied] = useState(false);

  const ingestUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/ingest/${endpoint.id}`
      : `/api/ingest/${endpoint.id}`;

  const copyUrl = async () => {
    await navigator.clipboard.writeText(ingestUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleChaosUpdate = async (profile: import("@/lib/types").ChaosProfile) => {
    const res = await fetch(`/api/endpoints/${endpoint.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chaosProfile: profile }),
    });
    if (res.ok) {
      const updated = await res.json();
      onChaosUpdated({ ...endpoint, chaosProfile: updated.chaosProfile });
    }
  };

  return (
    <div className="flex gap-4 min-h-0 flex-1">
      {/* Event List */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        {/* Ingest URL bar */}
        <div className="glass-panel px-4 py-3 flex items-center gap-3">
          <span className="text-xs text-slate-500 flex-shrink-0">Ingest URL</span>
          <code className="flex-1 text-xs text-cyan-400 font-mono truncate bg-slate-800/50 px-2 py-1 rounded">
            {ingestUrl}
          </code>
          <button onClick={copyUrl} className="p-1.5 hover:bg-slate-700 rounded transition-colors text-slate-400 hover:text-cyan-400">
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
          <a
            href={endpoint.targetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 hover:bg-slate-700 rounded transition-colors text-slate-400 hover:text-cyan-400"
            title="Open target URL"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* Timeline */}
        <div className="glass-panel flex-1 overflow-y-auto p-4">
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <div className="text-4xl mb-3">⚡</div>
              <p className="text-slate-400 text-sm">No events captured yet</p>
              <p className="text-slate-600 text-xs mt-1">
                Send a POST request to your ingest URL to begin
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <EventRow key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chaos Config */}
      <div className="w-80 flex-shrink-0">
        <ChaosConfigPanel profile={endpoint.chaosProfile} onUpdate={handleChaosUpdate} />
      </div>
    </div>
  );
}

function EventRow({ event }: { event: EventPayloadRow }) {
  const [expanded, setExpanded] = useState(false);

  const overallStatus = event.attempts.length === 0
    ? "pending"
    : event.attempts.some((a) => a.status === "dropped")
    ? "dropped"
    : event.attempts.every((a) => a.status === "success")
    ? "success"
    : event.attempts.some((a) => a.status === "failed")
    ? "failed"
    : "pending";

  const statusClasses: Record<string, string> = {
    success: "status-success",
    failed: "status-failed",
    pending: "status-pending",
    dropped: "status-dropped",
  };

  const totalLatency = event.attempts.length > 0
    ? Math.max(...event.attempts.map((a) => a.latencyMs))
    : 0;

  const isDuplicated = event.attempts.some((a) => a.duplicate);
  const isScrambled = event.attempts.some((a) => a.scrambled);

  // Try to parse body as JSON for display
  let parsedBody: unknown = null;
  try {
    parsedBody = JSON.parse(event.body);
  } catch {}

  return (
    <div className="border border-slate-700/50 rounded-lg bg-slate-800/30 overflow-hidden">
      <div
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-800/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Status dot */}
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
          overallStatus === "success" ? "bg-emerald-400" :
          overallStatus === "failed" ? "bg-red-400" :
          overallStatus === "dropped" ? "bg-slate-500" :
          "bg-yellow-400 animate-pulse"
        }`} />

        {/* Time */}
        <span className="text-xs text-slate-500 flex-shrink-0 font-mono">
          {new Date(event.receivedAt).toLocaleTimeString()}
        </span>

        {/* ID */}
        <code className="text-xs text-cyan-400/70 font-mono flex-shrink-0">
          {event.id.slice(0, 8)}…
        </code>

        {/* Badges */}
        <div className="flex gap-1 flex-wrap flex-1">
          <span className={statusClasses[overallStatus]}>
            {overallStatus}
          </span>
          {totalLatency > 0 && (
            <span className="status-badge bg-amber-500/10 text-amber-400 border border-amber-500/20">
              +{totalLatency}ms
            </span>
          )}
          {isDuplicated && (
            <span className="status-badge bg-purple-500/10 text-purple-400 border border-purple-500/20">
              2x
            </span>
          )}
          {isScrambled && (
            <span className="status-badge bg-orange-500/10 text-orange-400 border border-orange-500/20">
              scrambled
            </span>
          )}
        </div>

        {/* Attempt count */}
        <span className="text-xs text-slate-600 flex-shrink-0">
          {event.attempts.length} attempt{event.attempts.length !== 1 ? "s" : ""}
        </span>

        <span className="text-slate-600 text-xs">{expanded ? "▲" : "▼"}</span>
      </div>

      {expanded && (
        <div className="border-t border-slate-700/30 p-3 space-y-3">
          {/* Attempts */}
          {event.attempts.length > 0 && (
            <div>
              <h4 className="text-xs text-slate-500 mb-2 uppercase tracking-wider">Delivery Attempts</h4>
              <div className="space-y-1">
                {event.attempts.map((attempt) => (
                  <div key={attempt.id} className="flex items-center gap-2 text-xs">
                    <span className={statusClasses[attempt.status] ?? "status-badge"}>
                      {attempt.status}
                    </span>
                    <span className="text-slate-500 font-mono">{attempt.latencyMs}ms</span>
                    {attempt.duplicate && (
                      <span className="text-purple-400">duplicate</span>
                    )}
                    {attempt.scrambled && (
                      <span className="text-orange-400">scrambled</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payload preview */}
          <div>
            <h4 className="text-xs text-slate-500 mb-2 uppercase tracking-wider">Payload</h4>
            <pre className="text-xs bg-slate-900/50 p-2 rounded overflow-x-auto text-slate-300 max-h-32">
              {parsedBody
                ? JSON.stringify(parsedBody, null, 2)
                : event.body.slice(0, 200)}
            </pre>
          </div>

          {/* Headers preview */}
          <div>
            <h4 className="text-xs text-slate-500 mb-2 uppercase tracking-wider">Key Headers</h4>
            <div className="space-y-0.5">
              {Object.entries(event.headers)
                .filter(([k]) =>
                  ["content-type", "x-signature", "stripe-signature", "x-hub-signature"].some(
                    (h) => k.toLowerCase().includes(h)
                  )
                )
                .slice(0, 4)
                .map(([k, v]) => (
                  <div key={k} className="flex gap-2 text-xs">
                    <span className="text-slate-500 font-mono">{k}:</span>
                    <span className="text-slate-400 font-mono truncate">{String(v)}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
