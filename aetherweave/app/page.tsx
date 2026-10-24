"use client";

import { useState, useEffect, useCallback } from "react";
import { EndpointCard } from "@/components/EndpointCard";
import { CreateEndpointModal } from "@/components/CreateEndpointModal";
import { EventTimeline } from "@/components/EventTimeline";
import { FlowMap } from "@/components/FlowMap";
import { StatsBar } from "@/components/StatsBar";
import { WebhookEndpointRow, EventPayloadRow } from "@/lib/types";
import { Zap, Plus, Activity, GitBranch, Shield } from "lucide-react";

const POLL_INTERVAL = 2000;

export default function Home() {
  const [endpoints, setEndpoints] = useState<WebhookEndpointRow[]>([]);
  const [events, setEvents] = useState<EventPayloadRow[]>([]);
  const [selectedEndpoint, setSelectedEndpoint] = useState<WebhookEndpointRow | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"timeline" | "flow">("timeline");
  const [loading, setLoading] = useState(true);

  const fetchEndpoints = useCallback(async () => {
    try {
      const res = await fetch("/api/endpoints");
      if (res.ok) {
        const data = await res.json();
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
              <p className="text-xs text-slate-500">
                Deterministic Async Event Orchestrator
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-emerald-400">Vortex Active</span>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Endpoint
            </button>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <StatsBar endpoints={endpoints} events={events} />

      <div className="flex-1 max-w-screen-2xl mx-auto w-full px-6 py-6 flex gap-6">
        {/* Sidebar: Endpoint List */}
        <aside className="w-72 flex-shrink-0 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <GitBranch className="w-3.5 h-3.5" />
              Endpoints
            </h2>
            <span className="text-xs text-slate-600">{endpoints.length} active</span>
          </div>

          <div className="flex flex-col gap-2 overflow-y-auto max-h-[calc(100vh-220px)]">
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
                <p className="text-sm text-slate-500">No endpoints yet</p>
                <p className="text-xs text-slate-600 mt-1">
                  Create one to start intercepting webhooks
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
                  Event Timeline
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
                  Flow Map
                </button>
              </div>

              {activeTab === "timeline" ? (
                <EventTimeline
                  endpoint={selectedEndpoint}
                  events={selectedEvents}
                  onChaosUpdated={handleEndpointUpdated}
                />
              ) : (
                <FlowMap endpoint={selectedEndpoint} events={selectedEvents} />
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

      {showCreateModal && (
        <CreateEndpointModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleEndpointCreated}
        />
      )}
    </div>
  );
}
