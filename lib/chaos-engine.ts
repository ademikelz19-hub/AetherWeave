import { ChaosProfile } from "./types";
import { prisma } from "./prisma";

/**
 * Simulates edge-compatible delay using setTimeout wrapped in a Promise.
 * Uses chunked delays to stay compatible with Edge runtime limits.
 */
export async function sleep(ms: number): Promise<void> {
  if (ms <= 0) return;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Determines if an event should be dropped based on drop probability.
 */
export function shouldDrop(profile: ChaosProfile): boolean {
  return Math.random() < profile.dropProb;
}

/**
 * Applies chaos to an event: latency, duplication, dropping.
 * Returns a list of forwarding tasks to execute (0 if dropped, 1+ if duplicated).
 */
export type ForwardTask = {
  delayMs: number;
  duplicate: boolean;
  scrambled: boolean;
};

export function buildForwardTasks(
  profile: ChaosProfile,
  scramble: boolean = false
): ForwardTask[] {
  // Drop check
  if (shouldDrop(profile)) {
    return []; // no tasks = dropped
  }

  const baseTask: ForwardTask = {
    delayMs: profile.latencyMs,
    duplicate: false,
    scrambled: scramble,
  };

  if (profile.duplicate) {
    // Fire twice: first immediately (or with delay), second shortly after
    const secondDelay = profile.latencyMs + Math.floor(Math.random() * 200 + 50);
    return [
      baseTask,
      { delayMs: secondDelay, duplicate: true, scrambled: scramble },
    ];
  }

  return [baseTask];
}

/**
 * Forwards a payload to the target URL after an optional delay.
 */
export async function forwardPayload(
  targetUrl: string,
  headers: Record<string, string>,
  body: string,
  delayMs: number
): Promise<{ ok: boolean; status: number; latencyMs: number }> {
  await sleep(delayMs);

  const start = Date.now();
  try {
    // Resolve relative URLs to host
    let resolvedUrl = targetUrl;
    if (resolvedUrl.startsWith("/")) {
      const host =
        process.env.NODE_ENV === "production"
          ? "https://aether-weave-eight.vercel.app"
          : "http://localhost:3000";
      resolvedUrl = `${host}${resolvedUrl}`;
    }

    // Strip hop-by-hop headers and host
    const forwardHeaders: Record<string, string> = {};
    const skipHeaders = new Set([
      "host",
      "connection",
      "transfer-encoding",
      "te",
      "trailer",
      "upgrade",
      "proxy-authorization",
      "proxy-authenticate",
    ]);
    for (const [key, value] of Object.entries(headers)) {
      if (!skipHeaders.has(key.toLowerCase())) {
        forwardHeaders[key] = value;
      }
    }
    forwardHeaders["content-type"] =
      forwardHeaders["content-type"] || "application/json";
    forwardHeaders["x-aetherweave-forwarded"] = "true";
    forwardHeaders["x-aetherweave-delay-ms"] = String(delayMs);

    // If target is internal sink, record directly to ensure instant, reliable duplicate tracking
    if (resolvedUrl.includes("/api/sink")) {
      try {
        const parsed = (() => {
          try {
            return JSON.parse(body);
          } catch {
            return {};
          }
        })();
        const sourceEventId =
          (parsed.id as string) ||
          (parsed.eventId as string) ||
          (parsed.event_id as string) ||
          (parsed.data?.reference ? String(parsed.data.reference) : null) ||
          (parsed.data?.id ? String(parsed.data.id) : null) ||
          forwardHeaders["x-stripe-signature"] ||
          null;

        let isDuplicate = false;
        if (sourceEventId) {
          const existing = await prisma.sinkReceipt.findFirst({
            where: { sourceEventId },
          });
          if (existing) isDuplicate = true;
        }

        await prisma.sinkReceipt.create({
          data: {
            sourceEventId,
            headers: JSON.stringify(forwardHeaders),
            body,
            isDuplicate,
            signatureStatus: "valid",
          },
        });

        const latencyMs = Date.now() - start + delayMs;
        return { ok: true, status: 200, latencyMs };
      } catch (err) {
        console.error("Direct sink write failed:", err);
      }
    }

    const res = await fetch(resolvedUrl, {
      method: "POST",
      headers: forwardHeaders,
      body,
      signal: AbortSignal.timeout(30_000),
    });

    const latencyMs = Date.now() - start + delayMs;
    return { ok: res.ok, status: res.status, latencyMs };
  } catch {
    const latencyMs = Date.now() - start + delayMs;
    return { ok: false, status: 0, latencyMs };
  }
}
