"use client";

import { useState } from "react";
import { WebhookEndpointRow } from "@/lib/types";
import { Send, Zap, CheckCircle2, AlertCircle, Code, Shield } from "lucide-react";

interface Props {
  endpoint: WebhookEndpointRow | null;
  onSent?: () => void;
}

const TEMPLATES = [
  {
    id: "paystack_vote",
    name: "Paystack (Votes)",
    type: "payment",
    headers: {
      "Content-Type": "application/json",
      "x-paystack-signature": "5257a869e7ecebeda32affa62cdca3fa51cad7e77a0e56ff536d0ce8e108d8bd",
    },
    body: JSON.stringify(
      {
        event: "charge.success",
        data: {
          id: Math.floor(Math.random() * 899999 + 100000),
          domain: "test",
          status: "success",
          reference: `vote_ref_${Math.floor(Math.random() * 899999 + 100000)}`,
          amount: 50000,
          gateway_response: "Successful",
          paid_at: new Date().toISOString(),
          channel: "card",
          currency: "NGN",
          metadata: {
            candidate_id: "cand_winner_01",
            contestant: "Candidate Alex",
            votes_purchased: 50,
            voter_email: "voter@example.com",
          },
          customer: {
            id: 84392,
            email: "voter@example.com",
          },
        },
      },
      null,
      2
    ),
  },
  {
    id: "stripe_payment",
    name: "Stripe (Votes)",
    type: "payment",
    headers: {
      "Content-Type": "application/json",
      "Stripe-Signature": "t=1730000000,v1=5257a869e7ecebeda32affa62cdca3fa51cad7e77a0e56ff536d0ce8e108d8bd",
    },
    body: JSON.stringify(
      {
        id: `evt_test_${Math.floor(Math.random() * 899999 + 100000)}`,
        object: "event",
        type: "payment_intent.succeeded",
        created: Math.floor(Date.now() / 1000),
        data: {
          object: {
            id: `pi_test_${Math.floor(Math.random() * 899999 + 100000)}`,
            amount: 2500,
            currency: "usd",
            status: "succeeded",
            metadata: {
              candidate_id: "cand_winner_01",
              contestant: "Candidate Alex",
              votes_purchased: 25,
              voter_email: "voter@example.com",
            },
          },
        },
      },
      null,
      2
    ),
  },
  {
    id: "github_push",
    name: "GitHub",
    type: "git",
    headers: {
      "Content-Type": "application/json",
      "X-GitHub-Event": "push",
      "X-GitHub-Delivery": `72h901b0-${Math.floor(Math.random() * 8999 + 1000)}`,
      "X-Hub-Signature-256": "sha256=757107f926665b4f1f86dd3b82aa94f9c0b07eb7937b4625b9d799f4e8252e69",
    },
    body: JSON.stringify(
      {
        ref: "refs/heads/main",
        repository: {
          name: "aetherweave-core",
          full_name: "ademikelz19-hub/aetherweave-core",
        },
        pusher: {
          name: "ademikelz",
          email: "dev@aetherweave.io",
        },
        commits: [
          {
            id: `c361e44${Math.floor(Math.random() * 8999 + 1000)}`,
            message: "fix: resolve SQLite concurrent lock contention",
            timestamp: new Date().toISOString(),
          },
        ],
      },
      null,
      2
    ),
  },
  {
    id: "custom",
    name: "Custom",
    type: "custom",
    headers: {
      "Content-Type": "application/json",
      "X-Chaos-Test": "aetherweave-vortex",
    },
    body: JSON.stringify(
      {
        id: `custom_evt_${Date.now()}`,
        action: "vote.cast",
        contestant: "Candidate Alex",
        votes: 10,
        verified: true,
      },
      null,
      2
    ),
  },
];

export function LiveWebhookSender({ endpoint, onSent }: Props) {
  const [selectedTemplate, setSelectedTemplate] = useState(0);
  const [bodyText, setBodyText] = useState(TEMPLATES[0].body);
  const [headersText, setHeadersText] = useState(
    JSON.stringify(TEMPLATES[0].headers, null, 2)
  );
  const [isSending, setIsSending] = useState(false);
  const [responseLog, setResponseLog] = useState<{
    status: number;
    data: unknown;
    timestamp: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectTemplate = (index: number) => {
    setSelectedTemplate(index);
    const tmpl = TEMPLATES[index];
    setBodyText(tmpl.body);
    setHeadersText(JSON.stringify(tmpl.headers, null, 2));
    setResponseLog(null);
    setError(null);
  };

  const handleSend = async () => {
    if (!endpoint) {
      setError("Please select or create an endpoint first.");
      return;
    }

    let parsedHeaders: Record<string, string> = {};
    try {
      parsedHeaders = JSON.parse(headersText);
    } catch {
      setError("Invalid headers format. Must be valid JSON.");
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      const ingestUrl = `/api/ingest/${endpoint.id}`;
      const res = await fetch(ingestUrl, {
        method: "POST",
        headers: parsedHeaders,
        body: bodyText,
      });

      const data = await res.json();
      setResponseLog({
        status: res.status,
        data,
        timestamp: new Date().toLocaleTimeString(),
      });

      if (onSent) onSent();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to emit webhook.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="glass-panel p-6 space-y-5 border-cyan-500/20">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold font-space neon-text-cyan flex items-center gap-2">
            <Send className="w-4 h-4 text-cyan-400" />
            Live Webhook Emitter & Ingress Simulator
          </h3>
          <p className="text-xs text-slate-400">
            Transmit real payloads with cryptographic signatures directly into the AetherWeave vortex
          </p>
        </div>

        <div className="flex gap-1.5 bg-slate-900/60 p-1 rounded-lg border border-slate-800">
          {TEMPLATES.map((tmpl, idx) => (
            <button
              key={tmpl.id}
              onClick={() => selectTemplate(idx)}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                selectedTemplate === idx
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tmpl.name.split(":")[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Target Destination Indicator */}
      <div className="flex items-center justify-between text-xs p-3 rounded-lg bg-slate-950/50 border border-slate-800/80">
        <div className="flex items-center gap-2 truncate">
          <Shield className="w-4 h-4 text-purple-400 flex-shrink-0" />
          <span className="text-slate-400">Ingress Target:</span>
          <span className="font-mono text-cyan-300 truncate">
            {endpoint ? `/api/ingest/${endpoint.id}` : "No endpoint selected"}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-slate-500">Destination:</span>
          <span className="font-mono text-slate-300 truncate max-w-xs">
            {endpoint?.targetUrl ?? "N/A"}
          </span>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Payload and Headers Editor */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Code className="w-3.5 h-3.5 text-slate-400" />
              Raw JSON Payload
            </span>
            <button
              onClick={() => {
                try {
                  const obj = JSON.parse(bodyText);
                  const rand = Math.floor(Math.random() * 899999 + 100000);
                  if (obj.data?.reference) {
                    obj.data.reference = `vote_ref_${rand}`;
                    if (obj.data.id) obj.data.id = rand;
                  }
                  if (obj.id) {
                    obj.id = `evt_test_${rand}`;
                    if (obj.data?.object?.id) obj.data.object.id = `pi_test_${rand}`;
                  }
                  setBodyText(JSON.stringify(obj, null, 2));
                } catch {}
              }}
              className="text-[10px] text-cyan-400 hover:text-cyan-300"
            >
              ↺ Regen Event / Reference ID
            </button>
          </label>
          <textarea
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            rows={8}
            className="input-field font-mono text-xs leading-relaxed"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            HTTP Request Headers (JSON)
          </label>
          <textarea
            value={headersText}
            onChange={(e) => setHeadersText(e.target.value)}
            rows={8}
            className="input-field font-mono text-xs leading-relaxed"
          />
        </div>
      </div>

      {/* Action and Response */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
        <button
          onClick={handleSend}
          disabled={isSending || !endpoint}
          className="btn-primary w-full sm:w-auto px-6 py-2.5 flex items-center justify-center gap-2 text-sm shadow-[0_0_15px_rgba(6,182,212,0.3)]"
        >
          <Zap className="w-4 h-4" />
          {isSending ? "Transmitting..." : "⚡ Transmit Live Webhook into Vortex"}
        </button>

        {responseLog && (
          <div className="flex items-center gap-3 text-xs bg-slate-900/80 px-4 py-2 rounded-lg border border-slate-700">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <div>
              <span className="font-semibold text-emerald-400">
                HTTP {responseLog.status} Accepted
              </span>
              <span className="text-slate-400 ml-2">at {responseLog.timestamp}</span>
            </div>
            <code className="text-cyan-300 font-mono text-[11px] bg-slate-950 px-2 py-0.5 rounded">
              {(responseLog.data as { eventId?: string })?.eventId ?? "Ack"}
            </code>
          </div>
        )}
      </div>
    </div>
  );
}
