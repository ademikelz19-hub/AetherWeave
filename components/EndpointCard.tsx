"use client";

import { useState } from "react";
import { WebhookEndpointRow, ChaosProfile } from "@/lib/types";
import {
  Copy,
  Trash2,
  Edit2,
  Check,
  ExternalLink,
  Activity,
} from "lucide-react";
import { ChaosConfigPanel } from "./ChaosConfigPanel";

interface Props {
  endpoint: WebhookEndpointRow;
  isSelected: boolean;
  onClick: () => void;
  onUpdated: (ep: WebhookEndpointRow) => void;
  onDeleted: () => void;
}

export function EndpointCard({
  endpoint,
  isSelected,
  onClick,
  onUpdated,
  onDeleted,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const ingestUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/ingest/${endpoint.id}`
      : `/api/ingest/${endpoint.id}`;

  const copyUrl = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(ingestUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete endpoint "${endpoint.name}"?`)) return;
    setDeleting(true);
    try {
      await fetch(`/api/endpoints/${endpoint.id}`, { method: "DELETE" });
      onDeleted();
    } catch {
      setDeleting(false);
    }
  };

  const handleChaosUpdate = async (profile: ChaosProfile) => {
    const res = await fetch(`/api/endpoints/${endpoint.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chaosProfile: profile }),
    });
    if (res.ok) {
      const updated = await res.json();
      onUpdated({ ...endpoint, chaosProfile: updated.chaosProfile });
    }
  };

  const profile = endpoint.chaosProfile;
  const hasActiveChaos =
    profile.latencyMs > 0 ||
    profile.dropProb > 0 ||
    profile.duplicate ||
    profile.scramble;

  return (
    <div
      onClick={onClick}
      className={`glass-panel-hover p-3 cursor-pointer transition-all ${
        isSelected
          ? "border-cyan-500/50 bg-slate-800/80 neon-border-cyan"
          : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-2 h-2 rounded-full flex-shrink-0 ${
              hasActiveChaos
                ? "bg-purple-400 animate-pulse"
                : "bg-emerald-400"
            }`}
          />
          <span className="text-sm font-medium text-slate-200 truncate">
            {endpoint.name}
          </span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowConfig(!showConfig);
            }}
            className="p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-purple-400 transition-colors"
            title="Configure chaos"
          >
            <Activity className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={copyUrl}
            className="p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-cyan-400 transition-colors"
            title="Copy ingest URL"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-red-400 transition-colors"
            title="Delete endpoint"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Target URL */}
      <div className="flex items-center gap-1 text-xs text-slate-500 mb-2 truncate">
        <ExternalLink className="w-3 h-3 flex-shrink-0" />
        <span className="truncate">{endpoint.targetUrl}</span>
      </div>

      {/* Chaos Badges */}
      {hasActiveChaos && (
        <div className="flex flex-wrap gap-1">
          {profile.latencyMs > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              +{profile.latencyMs}ms
            </span>
          )}
          {profile.dropProb > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
              drop {Math.round(profile.dropProb * 100)}%
            </span>
          )}
          {profile.duplicate && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
              2x dup
            </span>
          )}
          {profile.scramble && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">
              scramble
            </span>
          )}
        </div>
      )}

      {showConfig && (
        <div onClick={(e) => e.stopPropagation()} className="mt-3 pt-3 border-t border-slate-700/50">
          <ChaosConfigPanel
            profile={endpoint.chaosProfile}
            onUpdate={handleChaosUpdate}
            compact
          />
        </div>
      )}
    </div>
  );
}
