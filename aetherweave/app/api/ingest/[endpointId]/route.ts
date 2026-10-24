import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ChaosProfile, DEFAULT_CHAOS_PROFILE } from "@/lib/types";
import { buildForwardTasks, forwardPayload } from "@/lib/chaos-engine";

/**
 * POST /api/ingest/[endpointId]
 * Primary webhook receiver:
 * 1. Synchronously returns HTTP 202 Accepted within <50ms
 * 2. Asynchronously applies Chaos Profile (latency, duplication, packet drops, scramble)
 * 3. Dispatches forwarded HTTP requests to target application
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ endpointId: string }> }
) {
  const { endpointId } = await params;

  // Extract headers
  const headersObj: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headersObj[key] = value;
  });

  let body = "";
  try {
    body = await request.text();
  } catch {
    body = "{}";
  }

  // Lookup endpoint
  const endpoint = await prisma.webhookEndpoint.findUnique({
    where: { id: endpointId },
  });

  if (!endpoint) {
    return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
  }

  let profile: ChaosProfile = DEFAULT_CHAOS_PROFILE;
  try {
    profile = JSON.parse(endpoint.chaosProfile);
  } catch {}

  const targetUrl = endpoint.targetUrl;

  // Persist incoming event immediately
  const event = await prisma.eventPayload.create({
    data: {
      endpointId: endpoint.id,
      headers: JSON.stringify(headersObj),
      body,
    },
  });

  // Calculate degradation tasks
  const tasks = buildForwardTasks(profile);

  // Asynchronous background execution
  const processChaos = async () => {
    try {
      if (tasks.length === 0) {
        // Event dropped by chaos rule
        await prisma.deliveryAttempt.create({
          data: {
            payloadId: event.id,
            status: "dropped",
            latencyMs: 0,
            duplicate: false,
            scrambled: false,
            completedAt: new Date(),
          },
        });
        return;
      }

      // Create pending attempt rows
      const attempts = await Promise.all(
        tasks.map((task) =>
          prisma.deliveryAttempt.create({
            data: {
              payloadId: event.id,
              status: "pending",
              latencyMs: task.delayMs,
              duplicate: task.duplicate,
              scrambled: task.scrambled,
            },
          })
        )
      );

      // Execute dispatch with artificial delay
      await Promise.all(
        tasks.map(async (task, i) => {
          const attempt = attempts[i];
          const result = await forwardPayload(targetUrl, headersObj, body, task.delayMs);

          await prisma.deliveryAttempt.update({
            where: { id: attempt.id },
            data: {
              status: result.ok ? "success" : "failed",
              latencyMs: result.latencyMs,
              completedAt: new Date(),
            },
          });
        })
      );
    } catch (err) {
      console.error("Background chaos processing error:", err);
    }
  };

  // Launch background promise
  processChaos();

  return NextResponse.json(
    {
      accepted: true,
      eventId: event.id,
      endpointId: endpoint.id,
      chaosApplied: {
        latencyMs: profile.latencyMs,
        dropProb: profile.dropProb,
        duplicate: profile.duplicate,
        scramble: profile.scramble,
      },
    },
    { status: 202 }
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ endpointId: string }> }
) {
  const { endpointId } = await params;
  const endpoint = await prisma.webhookEndpoint.findUnique({
    where: { id: endpointId },
  });
  if (!endpoint) {
    return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
  }

  let profile: ChaosProfile = DEFAULT_CHAOS_PROFILE;
  try {
    profile = JSON.parse(endpoint.chaosProfile);
  } catch {}

  return NextResponse.json({
    status: "active",
    endpoint: {
      ...endpoint,
      chaosProfile: profile,
    },
    ingestUrl: `/api/ingest/${endpointId}`,
  });
}
