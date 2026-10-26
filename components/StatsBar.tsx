import { WebhookEndpointRow, EventPayloadRow } from "@/lib/types";
import { Activity, Clock, ShieldAlert, Cpu } from "lucide-react";

interface Props {
  endpoints: WebhookEndpointRow[];
  events: EventPayloadRow[];
}

export function StatsBar({ endpoints, events }: Props) {
  const totalEvents = events.length;

  let totalAttempts = 0;
  let successfulAttempts = 0;
  let droppedAttempts = 0;
  let totalLatency = 0;

  events.forEach((ev) => {
    ev.attempts.forEach((a) => {
      totalAttempts++;
      if (a.status === "success") successfulAttempts++;
      if (a.status === "dropped") droppedAttempts++;
      totalLatency += a.latencyMs;
    });
  });

  const avgLatency =
    totalAttempts > 0 ? Math.round(totalLatency / totalAttempts) : 0;
  const deliveryRate =
    totalAttempts > 0
      ? Math.round((successfulAttempts / totalAttempts) * 100)
      : 100;

  return (
    <div className="border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-sm px-6 py-3">
      <div className="max-w-screen-2xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-slate-400">Test Webhooks Sent</div>
            <div className="text-base font-bold font-space text-slate-200">
              {totalEvents}{" "}
              <span className="text-xs font-normal text-slate-500">tests</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-slate-400">Simulated Lag (Avg)</div>
            <div className="text-base font-bold font-space text-slate-200">
              {avgLatency}{" "}
              <span className="text-xs font-normal text-slate-500">ms delay</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-slate-400">Lost Packets Simulated</div>
            <div className="text-base font-bold font-space text-slate-200">
              {droppedAttempts}{" "}
              <span className="text-xs font-normal text-slate-500">lost</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-slate-400">Delivery Success Rate</div>
            <div className="text-base font-bold font-space text-slate-200">
              {deliveryRate}
              <span className="text-xs font-normal text-slate-500">%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
