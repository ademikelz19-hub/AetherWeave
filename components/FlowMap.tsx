"use client";

import { WebhookEndpointRow, EventPayloadRow } from "@/lib/types";
import { ArrowRight, Server, ShieldCheck, Zap, AlertTriangle, Send } from "lucide-react";

interface Props {
  endpoint: WebhookEndpointRow;
  events: EventPayloadRow[];
}

export function FlowMap({ endpoint, events }: Props) {
  const profile = endpoint.chaosProfile;
  const recentEvents = events.slice(0, 5);

  return (
    <div className="glass-panel p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold font-space neon-text-purple flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-400" />
            Visual Message Route Map
          </h2>
          <p className="text-xs text-slate-400">
            Watch how a message travels from the payment provider, through the stress test, to your website
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping inline-block" />
          <span className="text-slate-300 font-mono">Live Monitoring</span>
        </div>
      </div>

      {/* Visual Topological Pipeline */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative py-4">
        {/* Node 1: External Origin */}
        <div className="glass-panel p-5 border-slate-700/80 bg-slate-900/60 flex flex-col items-center text-center relative z-10">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-3 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
            <Server className="w-6 h-6" />
          </div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Step 1: Sender
          </span>
          <h3 className="text-sm font-bold text-slate-200 mt-1">Stripe / Paystack / GitHub</h3>
          <p className="text-[11px] text-slate-500 mt-2">
            Sends payment or event notification as a JSON message
          </p>
          <div className="mt-4 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-medium">
            Immediate 202 Accepted
          </div>
        </div>

        {/* Node 2: AetherWeave Chaos Vortex */}
        <div className="glass-panel p-5 border-purple-500/40 bg-slate-900/80 flex flex-col items-center text-center relative z-10 vortex-glow">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/50 flex items-center justify-center text-purple-400 mb-3 animate-pulse">
            <Zap className="w-6 h-6" />
          </div>
          <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
            Step 2: AetherWeave Stress Filter
          </span>
          <h3 className="text-sm font-bold neon-text-purple mt-1">Simulates Network Chaos</h3>
          <div className="mt-3 flex flex-col gap-1.5 w-full text-left">
            <div className="flex justify-between items-center text-[11px] bg-slate-950/60 px-2.5 py-1 rounded border border-slate-800">
              <span className="text-slate-400">Added Lag:</span>
              <span className="text-amber-400 font-mono font-bold">+{profile.latencyMs}ms</span>
            </div>
            <div className="flex justify-between items-center text-[11px] bg-slate-950/60 px-2.5 py-1 rounded border border-slate-800">
              <span className="text-slate-400">Lost Message Rate:</span>
              <span className="text-red-400 font-mono font-bold">{Math.round(profile.dropProb * 100)}%</span>
            </div>
            <div className="flex justify-between items-center text-[11px] bg-slate-950/60 px-2.5 py-1 rounded border border-slate-800">
              <span className="text-slate-400">Send Twice (Duplicate):</span>
              <span className={profile.duplicate ? "text-purple-400 font-bold" : "text-slate-600"}>
                {profile.duplicate ? "ACTIVE (2x)" : "OFF"}
              </span>
            </div>
          </div>
        </div>

        {/* Node 3: Target Application */}
        <div className="glass-panel p-5 border-slate-700/80 bg-slate-900/60 flex flex-col items-center text-center relative z-10">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-3 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Step 3: Your Website
          </span>
          <h3 className="text-sm font-bold text-slate-200 mt-1 truncate max-w-full font-mono text-xs">
            {endpoint.targetUrl}
          </h3>
          <p className="text-[11px] text-slate-500 mt-2">
            Your server receives the message and processes the event
          </p>
          <div className="mt-4 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[10px] text-cyan-300 font-medium">
            Must handle duplicates safely
          </div>
        </div>
      </div>

      {/* Active In-Flight Flow Streams */}
      <div className="border border-slate-800 rounded-xl p-4 bg-slate-950/40">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Send className="w-3.5 h-3.5 text-cyan-400" />
          Active In-Flight Event Vectors
        </h4>

        {recentEvents.length === 0 ? (
          <p className="text-xs text-slate-600 py-3 text-center">
            No active payloads traversing the vortex circuit. Trigger a webhook to inspect live routing.
          </p>
        ) : (
          <div className="space-y-2">
            {recentEvents.map((ev) => {
              const attempt = ev.attempts[0];
              const isSuccess = attempt?.status === "success";
              const isDropped = attempt?.status === "dropped";
              const isFailed = attempt?.status === "failed";

              return (
                <div
                  key={ev.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/50 border border-slate-800 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-cyan-400 font-medium">
                      {ev.id.slice(0, 10)}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                    <span className="text-slate-400">
                      {isDropped
                        ? "Intercepted & Dropped"
                        : `Delayed ${attempt?.latencyMs ?? 0}ms`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {attempt?.duplicate && (
                      <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px]">
                        DUPLICATE EMITTED
                      </span>
                    )}
                    {isSuccess && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Dispatched 200 OK
                      </span>
                    )}
                    {isDropped && (
                      <span className="px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                        Dropped (Chaos Profile)
                      </span>
                    )}
                    {isFailed && (
                      <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                        Target Error
                      </span>
                    )}
                    {!attempt && (
                      <span className="px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 animate-pulse">
                        Holding in Vortex
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
