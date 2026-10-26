"use client";

import { useState, useEffect, useCallback } from "react";
import { EndpointCard } from "@/components/EndpointCard";
import { CreateEndpointModal } from "@/components/CreateEndpointModal";
import { EventTimeline } from "@/components/EventTimeline";
import { FlowMap } from "@/components/FlowMap";
import { StatsBar } from "@/components/StatsBar";
import { LiveWebhookSender } from "@/components/LiveWebhookSender";
import { SinkMonitor } from "@/components/SinkMonitor";
import { HowItWorksBanner } from "@/components/HowItWorksBanner";
import { WebhookEndpointRow, EventPayloadRow } from "@/lib/types";
import { Zap, Plus, Activity, GitBranch, Shield, ShieldCheck, Send } from "lucide-react";

const POLL_INTERVAL = 2000;

export default function Home() {
  const [endpoints, setEndpoints] = useState<WebhookEndpointRow[]>([]);
  const [events, setEvents] = useState<EventPayloadRow[]>([]);
  const [selectedEndpoint, setSelectedEndpoint] = useState<WebhookEndpointRow | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"timeline" | "flow" | "sink">("timeline");
  const [showSender, setShowSender] = useState(true);
  const [loading, setLoading] = useState(true);

  const fetchEndpoints = useCallback(async () => {
    try {
      const res = await fetch("/api/endpoints");
      if (res.ok) {
        let data = await res.json();
        // Auto-seed initial functional endpoint if fresh
        if (data.length === 0) {
          try {
            const seedRes = await fetch("/api/endpoints", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: "Stripe Billing Ingress (Built-in Sink)",
                targetUrl: typeof window !== "undefined" ? `${window.location.origin}/api/sink` : "http://localhost:3000/api/sink",
                chaosProfile: {
                  latencyMs: 1500,
                  dropProb: 0,
                  duplicate: true,
                  scramble: false,
                },
              }),
            });
            if (seedRes.ok) {
              const seeded = await seedRes.json();
              data = [seeded];
            }
          } catch {}
        }
        setEndpoints(data);
        if (!selectedEndpoint && data.length > 0) {
          setSelectedEndpoint(data[0]);
        }
      }
    } catch {}
  }, [selectedEndpoint]);

  const fetchEvents = useCallback(async () => {
    try {
      const url = selectedEndpoint
        ? `/api/events?endpointId=${selectedEndpoint.id}&limit=50`
        : "/api/events?limit=50";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch {}
  }, [selectedEndpoint]);

  useEffect(() => {
    const init = async () => {
      await fetchEndpoints();
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  const handleEndpointCreated = (endpoint: WebhookEndpointRow) => {
    setEndpoints((prev) => [endpoint, ...prev]);
    setSelectedEndpoint(endpoint);
    setShowCreateModal(false);
  };

  const handleEndpointUpdated = (updated: WebhookEndpointRow) => {
    setEndpoints((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    if (selectedEndpoint?.id === updated.id) {
      setSelectedEndpoint(updated);
    }
  };

  const handleEndpointDeleted = (id: string) => {
    setEndpoints((prev) => prev.filter((e) => e.id !== id));
    if (selectedEndpoint?.id === id) {
      setSelectedEndpoint(endpoints.find((e) => e.id !== id) ?? null);
    }
  };

  const selectedEvents = selectedEndpoint
    ? events.filter((e) => e.endpointId === selectedEndpoint.id)
    : events;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800/80 glass-panel rounded-none border-l-0 border-r-0 border-t-0">
        <div className="max-w-screen-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500/30 to-purple-500/30 border border-cyan-500/40 flex items-center justify-center vortex-glow">
              <Zap className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold font-space neon-text-cyan tracking-tight">
                AetherWeave
              </h1>
              <p className="text-xs text-slate-400">
                Webhook Stress Testing &amp; Double-Payment / Double-Vote Protection
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSender(!showSender)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all ${
                showSender
                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50"
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              {showSender ? "Hide Webhook Tester" : "⚡ Test Webhooks"}
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              + Add Target Website
            </button>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <StatsBar endpoints={endpoints} events={events} />

      <div className="flex-1 max-w-screen-2xl mx-auto w-full px-6 py-6 flex flex-col gap-6">
        {/* Universal Explainer & Quick Start Guide */}
        <HowItWorksBanner selectedEndpoint={selectedEndpoint} />

        {/* Collapsible Live Webhook Dispatcher */}
        {showSender && (
          <LiveWebhookSender
            endpoint={selectedEndpoint}
            onSent={() => {
              fetchEvents();
            }}
          />
        )}

        <div className="flex-1 flex gap-6">
          {/* Sidebar: Endpoint List */}
          <aside className="w-72 flex-shrink-0 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
                Target Apps &amp; Websites
              </h2>
              <span className="text-xs text-slate-500 font-mono">{endpoints.length} active</span>
            </div>

            <div className="flex flex-col gap-2 overflow-y-auto max-h-[calc(100vh-320px)]">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="glass-panel p-4 animate-pulse h-24 rounded-xl"
                  />
                ))
              ) : endpoints.length === 0 ? (
                <div className="glass-panel p-6 text-center">
                  <Shield className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-400 font-medium">No target apps yet</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Click &quot;+ Add Target Website&quot; to test your site
                  </p>
                </div>
              ) : (
                endpoints.map((endpoint) => (
                  <EndpointCard
                    key={endpoint.id}
                    endpoint={endpoint}
                    isSelected={selectedEndpoint?.id === endpoint.id}
                    onClick={() => setSelectedEndpoint(endpoint)}
                    onUpdated={handleEndpointUpdated}
                    onDeleted={() => handleEndpointDeleted(endpoint.id)}
                  />
                ))
              )}
            </div>
          </aside>

          {/* Main Panel */}
          <main className="flex-1 flex flex-col gap-4 min-w-0">
            {selectedEndpoint ? (
              <>
                {/* Tab Bar */}
                <div className="flex items-center gap-1 glass-panel p-1 w-fit rounded-lg">
                  <button
                    onClick={() => setActiveTab("timeline")}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                      activeTab === "timeline"
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5 inline mr-1.5" />
                    Test History &amp; Logs ({selectedEvents.length})
                  </button>

                  <button
                    onClick={() => setActiveTab("flow")}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                      activeTab === "flow"
                        ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5 inline mr-1.5" />
                    Visual Delivery Path
                  </button>

                  <button
                    onClick={() => setActiveTab("sink")}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                      activeTab === "sink"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 inline mr-1.5" />
                    Duplicate Protection Checker
                  </button>
                </div>

                {activeTab === "timeline" ? (
                  <EventTimeline
                    endpoint={selectedEndpoint}
                    events={selectedEvents}
                    onChaosUpdated={handleEndpointUpdated}
                  />
                ) : activeTab === "flow" ? (
                  <FlowMap endpoint={selectedEndpoint} events={selectedEvents} />
                ) : (
                  <SinkMonitor />
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="glass-panel p-12 text-center max-w-md">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center mx-auto mb-4 vortex-glow">
                    <Zap className="w-10 h-10 text-cyan-400" />
                  </div>
                  <h2 className="text-xl font-bold font-space neon-text-cyan mb-2">
                    The Vortex Awaits
                  </h2>
                  <p className="text-slate-400 text-sm leading-relaxed mb-6">
                    AetherWeave intercepts webhooks and applies deterministic chaos
                    — latency injection, duplication, and sequence scrambling — to
                    test your application&apos;s event handling resilience.
                  </p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="btn-primary"
                  >
                    <Plus className="w-4 h-4 inline mr-1.5" />
                    Create Your First Endpoint
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {showCreateModal && (
        <CreateEndpointModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleEndpointCreated}
        />
      )}
    </div>
  );
}
