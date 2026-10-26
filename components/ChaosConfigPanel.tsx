"use client";

import { useState, useEffect } from "react";
import { ChaosProfile } from "@/lib/types";
import { Zap, Timer, Shuffle, Copy } from "lucide-react";

interface Props {
  profile: ChaosProfile;
  onUpdate: (profile: ChaosProfile) => Promise<void>;
  compact?: boolean;
}

export function ChaosConfigPanel({ profile, onUpdate, compact = false }: Props) {
  const [local, setLocal] = useState<ChaosProfile>(profile);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setLocal(profile);
    setDirty(false);
  }, [profile]);

  const update = (patch: Partial<ChaosProfile>) => {
    setLocal((prev) => ({ ...prev, ...patch }));
    setDirty(true);
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(local);
      setSaved(true);
      setDirty(false);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  if (compact) {
    return (
      <div className="space-y-3">
        {/* Latency */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="flex items-center gap-1.5 text-xs text-slate-400">
              <Timer className="w-3 h-3 text-amber-400" />
              Latency Injection
            </label>
            <span className="text-xs text-amber-400 font-mono">{local.latencyMs}ms</span>
          </div>
          <input
            type="range"
            min={0}
            max={5000}
            step={100}
            value={local.latencyMs}
            onChange={(e) => update({ latencyMs: Number(e.target.value) })}
            className="w-full h-1.5 appearance-none rounded-full bg-slate-700 cursor-pointer accent-amber-400"
          />
        </div>

        {/* Drop Probability */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="flex items-center gap-1.5 text-xs text-slate-400">
              <Zap className="w-3 h-3 text-red-400" />
              Drop Probability
            </label>
            <span className="text-xs text-red-400 font-mono">
              {Math.round(local.dropProb * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={local.dropProb}
            onChange={(e) => update({ dropProb: Number(e.target.value) })}
            className="w-full h-1.5 appearance-none rounded-full bg-slate-700 cursor-pointer accent-red-400"
          />
        </div>

        {/* Toggles */}
        <div className="flex gap-2">
          <button
            onClick={() => update({ duplicate: !local.duplicate })}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-xs border transition-all ${
              local.duplicate
                ? "bg-purple-500/20 border-purple-500/50 text-purple-300"
                : "bg-slate-800 border-slate-700 text-slate-500"
            }`}
          >
            <Copy className="w-3 h-3" />
            Duplicate
          </button>
          <button
            onClick={() => update({ scramble: !local.scramble })}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-xs border transition-all ${
              local.scramble
                ? "bg-orange-500/20 border-orange-500/50 text-orange-300"
                : "bg-slate-800 border-slate-700 text-slate-500"
            }`}
          >
            <Shuffle className="w-3 h-3" />
            Scramble
          </button>
        </div>

        {dirty && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full btn-primary text-xs py-1.5"
          >
            {saving ? "Saving..." : saved ? "✓ Saved" : "Apply Chaos Profile"}
          </button>
        )}
      </div>
    );
  }

  // Full size panel
  return (
    <div className="glass-panel p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold font-space text-slate-200 flex items-center gap-2">
            <Zap className="w-4 h-4 text-purple-400" />
            Stress Test Settings
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Configure how to challenge your website
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="text-xs text-emerald-400">✓ Settings Saved</span>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="btn-primary text-xs px-3 py-1.5"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>

      {/* Latency Slider */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <Timer className="w-4 h-4 text-amber-400" />
            Simulate Slow Internet (Delay)
          </label>
          <div className="text-base font-mono text-amber-400 font-bold">
            {local.latencyMs}
            <span className="text-xs font-normal text-slate-500 ml-1">ms</span>
          </div>
        </div>
        <p className="text-[11px] text-slate-500 mb-2">
          Pauses the message before delivering it to test timeouts and lag.
        </p>
        <input
          type="range"
          min={0}
          max={5000}
          step={100}
          value={local.latencyMs}
          onChange={(e) => update({ latencyMs: Number(e.target.value) })}
          className="w-full h-2 appearance-none rounded-full bg-slate-700 cursor-pointer accent-amber-400"
        />
        <div className="flex justify-between text-xs text-slate-600 mt-1">
          <span>0ms (Instant)</span>
          <span>5000ms (5 seconds lag)</span>
        </div>
      </div>

      {/* Drop Probability Slider */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <Zap className="w-4 h-4 text-red-400" />
            Simulate Lost Connection (Drop Rate)
          </label>
          <div className="text-base font-mono text-red-400 font-bold">
            {Math.round(local.dropProb * 100)}
            <span className="text-xs font-normal text-slate-500 ml-1">%</span>
          </div>
        </div>
        <p className="text-[11px] text-slate-500 mb-2">
          Simulates network failure where the message never reaches your server.
        </p>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={local.dropProb}
          onChange={(e) => update({ dropProb: Number(e.target.value) })}
          className="w-full h-2 appearance-none rounded-full bg-slate-700 cursor-pointer accent-red-400"
        />
        <div className="flex justify-between text-xs text-slate-600 mt-1">
          <span>0% (Always delivered)</span>
          <span>100% (Always lost)</span>
        </div>
      </div>

      {/* Toggle Controls */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => update({ duplicate: !local.duplicate })}
          className={`flex items-center justify-center gap-2 p-3.5 rounded-xl border-2 transition-all ${
            local.duplicate
              ? "bg-purple-500/20 border-purple-500/60 text-purple-300"
              : "bg-slate-800/50 border-slate-700 text-slate-500 hover:border-slate-600"
          }`}
        >
          <Copy className="w-5 h-5 flex-shrink-0" />
          <div className="text-left">
            <div className="text-xs font-bold">Send Twice (Double-Delivery)</div>
            <div className="text-[10px] opacity-75 mt-0.5">Tests if your site double-counts votes</div>
          </div>
        </button>

        <button
          onClick={() => update({ scramble: !local.scramble })}
          className={`flex items-center justify-center gap-2 p-3.5 rounded-xl border-2 transition-all ${
            local.scramble
              ? "bg-orange-500/20 border-orange-500/60 text-orange-300"
              : "bg-slate-800/50 border-slate-700 text-slate-500 hover:border-slate-600"
          }`}
        >
          <Shuffle className="w-5 h-5 flex-shrink-0" />
          <div className="text-left">
            <div className="text-xs font-bold">Reverse Order Delivery</div>
            <div className="text-[10px] opacity-75 mt-0.5">Tests messages arriving backward</div>
          </div>
        </button>
      </div>
    </div>
  );
}
