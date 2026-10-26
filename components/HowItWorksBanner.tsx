"use client";

import { useState } from "react";
import { HelpCircle, ChevronDown, ChevronUp, Copy, Check, ArrowRight, ShieldCheck, Zap, Terminal, Globe } from "lucide-react";
import { WebhookEndpointRow } from "@/lib/types";

interface Props {
  selectedEndpoint: WebhookEndpointRow | null;
}

export function HowItWorksBanner({ selectedEndpoint }: Props) {
  const [isOpen, setIsOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "https://aether-weave-eight.vercel.app";
  const ingressUrl = selectedEndpoint ? `${origin}/api/ingest/${selectedEndpoint.id}` : `${origin}/api/ingest/[endpointId]`;

  const copyIngress = () => {
    if (!selectedEndpoint) return;
    navigator.clipboard.writeText(ingressUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-panel p-4 border-cyan-500/20 bg-slate-950/40">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <HelpCircle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold font-space text-slate-200 tracking-wide uppercase">
              How This Works &bull; Test Any Website in 3 Plain English Steps
            </h3>
            <p className="text-[11px] text-slate-400">
              Stress-test your payment webhooks against slow internet, lost connections, and double-payment glitches
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-xs text-slate-400 hover:text-cyan-300 flex items-center gap-1 transition-colors px-2.5 py-1 rounded-lg bg-slate-900/60 border border-slate-800"
        >
          {isOpen ? (
            <>
              Hide Instructions <ChevronUp className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              Show Instructions <ChevronDown className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>

      {isOpen && (
        <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-4 animate-in fade-in duration-150">
          {/* 3 Step Visual Columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px] font-bold flex items-center justify-center font-mono">
                    1
                  </span>
                  <span className="text-xs font-semibold text-slate-200">1. Send a Test Message</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Click the <strong>&quot;⚡ Send Test Webhook to Your Website&quot;</strong> button above (supports Stripe, Paystack, GitHub, etc.), or paste your unique test address into your real payment dashboard.
                </p>
              </div>
              <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between">
                <span className="text-[10px] font-mono text-cyan-300 truncate max-w-[180px]">
                  {ingressUrl}
                </span>
                <button
                  onClick={copyIngress}
                  disabled={!selectedEndpoint}
                  className="text-[10px] text-slate-400 hover:text-cyan-300 flex items-center gap-1 font-medium"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 text-[10px] font-bold flex items-center justify-center font-mono">
                    2
                  </span>
                  <span className="text-xs font-semibold text-slate-200">2. We Stress-Test It</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  AetherWeave deliberately <strong>adds delay (lag)</strong> or <strong>sends the notification TWICE</strong> to your website. This mimics real-world network lag and payment provider retries.
                </p>
              </div>
              <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center gap-2 text-[10px] text-purple-300">
                <Zap className="w-3 h-3" />
                <span>Simulates real network problems &amp; double-clicks</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center justify-center font-mono">
                    3
                  </span>
                  <span className="text-xs font-semibold text-slate-200">3. Check Your Website</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Your website receives both messages. Check your website: Did it add votes or credit the user <strong>only ONCE</strong> (Safe ✅)? Or did it give free extra votes (Bug ❌)?
                </p>
              </div>
              <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center gap-2 text-[10px] text-emerald-300 font-medium">
                <ShieldCheck className="w-3 h-3" />
                <span>Protects you from free double-votes or double-charges</span>
              </div>
            </div>
          </div>

          {/* How to Test with cURL or External Providers */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Terminal className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <span>
                Want to test from your terminal or another service? Send a POST to:
              </span>
              <code className="bg-slate-900 text-cyan-300 px-2 py-0.5 rounded font-mono text-[11px] border border-slate-800 truncate max-w-sm">
                curl -X POST {ingressUrl} -H &quot;Content-Type: application/json&quot; -d &apos;&#123;&quot;hello&quot;:&quot;world&quot;&#125;&apos;
              </code>
            </div>
            <button
              onClick={() => {
                const cmd = `curl -X POST ${ingressUrl} -H "Content-Type: application/json" -d '{"event":"test","timestamp":"${new Date().toISOString()}"}'`;
                navigator.clipboard.writeText(cmd);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="text-[11px] text-slate-400 hover:text-cyan-300 flex items-center gap-1 flex-shrink-0 font-medium"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied Command" : "Copy cURL"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
