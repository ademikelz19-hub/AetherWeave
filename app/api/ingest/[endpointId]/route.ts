import { NextResponse } from "next/server";
import { prisma, ensureTablesExist } from "@/lib/prisma";
import { ChaosProfile, DEFAULT_CHAOS_PROFILE } from "@/lib/types";
import { buildForwardTasks, forwardPayload } from "@/lib/chaos-engine";
import { nanoid } from "nanoid";


interface QueueTask {
  eventId: string;
  endpointId: string;
  targetUrl: string;
  headersObj: Record<string, string>;
  body: string;
  profile: ChaosProfile;
}

const ingestionQueue: QueueTask[] = [];
let isProcessingQueue = false;

async function processQueue() {
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  try {
    await ensureTablesExist();

    while (ingestionQueue.length > 0) {
      const task = ingestionQueue.shift();
      if (!task) break;

      try {
        let retries = 3;
        let eventCreated = false;

        while (retries > 0 && !eventCreated) {
          try {
            await prisma.eventPayload.create({
              data: {
                id: task.eventId,
                endpointId: task.endpointId,
                headers: JSON.stringify(task.headersObj),
                body: task.body,
              },
            });
            eventCreated = true;
          } catch (dbErr: unknown) {
            retries--;
            if (retries === 0) throw dbErr;
            await new Promise((r) => setTimeout(r, 50 + Math.random() * 100));
          }
        }

        const forwardTasks = buildForwardTasks(task.profile);

        if (forwardTasks.length === 0) {
          await prisma.deliveryAttempt.create({
            data: {
              payloadId: task.eventId,
              status: "dropped",
              latencyMs: 0,
              duplicate: false,
              scrambled: false,
              completedAt: new Date(),
            },
          });
          continue;
        }

        const attempts = await Promise.all(
          forwardTasks.map((ft) =>
            prisma.deliveryAttempt.create({
              data: {
                payloadId: task.eventId,
                status: "pending",
                latencyMs: ft.delayMs,
                duplicate: ft.duplicate,
                scrambled: ft.scrambled,
              },
            })
          )
        );

        Promise.all(
          forwardTasks.map(async (ft, idx) => {
            const attempt = attempts[idx];
            const result = await forwardPayload(
              task.targetUrl,
              task.headersObj,
              task.body,
              ft.delayMs
            );

            await prisma.deliveryAttempt.update({
              where: { id: attempt.id },
              data: {
                status: result.ok ? "success" : "failed",
                latencyMs: result.latencyMs,
                completedAt: new Date(),
              },
            });
          })
        ).catch((dispatchErr) => {
          console.error("Delayed forward dispatch error:", dispatchErr);
        });
      } catch (itemErr) {
        console.error("Queue item execution error:", itemErr);
      }
    }
  } finally {
    isProcessingQueue = false;
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ endpointId: string }> }
) {
  const { endpointId } = await params;

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

  await ensureTablesExist();

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

  const eventId = `evt_${nanoid(16)}`;

  ingestionQueue.push({
    eventId,
    endpointId: endpoint.id,
    targetUrl: endpoint.targetUrl,
    headersObj,
    body,
    profile,
  });

  processQueue().catch((err) => {
    console.error("Ingestion queue worker error:", err);
  });

  return NextResponse.json(
    {
      accepted: true,
      eventId,
      endpointId: endpoint.id,
      chaosApplied: {
        latencyMs: profile.latencyMs,
        dropProb: profile.dropProb,
        duplicate: profile.duplicate,
        scramble: profile.scramble,
      },
      queueState: {
        queued: true,
        pendingItems: ingestionQueue.length,
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
  await ensureTablesExist();

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
    queuePending: ingestionQueue.length,
  });
}
