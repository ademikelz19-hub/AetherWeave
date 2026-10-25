import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forwardPayload } from "@/lib/chaos-engine";

export async function POST(request: Request) {
  try {
    const { payloadId, targetUrl, delayMs = 0 } = await request.json();

    if (!payloadId) {
      return NextResponse.json(
        { error: "payloadId is required" },
        { status: 400 }
      );
    }

    const payload = await prisma.eventPayload.findUnique({
      where: { id: payloadId },
      include: { endpoint: true },
    });

    if (!payload) {
      return NextResponse.json(
        { error: "Event payload not found" },
        { status: 404 }
      );
    }

    const destination = targetUrl || payload.endpoint.targetUrl;

    let headers: Record<string, string> = {};
    try {
      headers = JSON.parse(payload.headers);
    } catch {}

    const attempt = await prisma.deliveryAttempt.create({
      data: {
        payloadId: payload.id,
        status: "pending",
        latencyMs: delayMs,
        duplicate: false,
        scrambled: false,
      },
    });

    const result = await forwardPayload(destination, headers, payload.body, delayMs);

    const updatedAttempt = await prisma.deliveryAttempt.update({
      where: { id: attempt.id },
      data: {
        status: result.ok ? "success" : "failed",
        latencyMs: result.latencyMs,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({
      dispatched: true,
      attemptId: updatedAttempt.id,
      status: updatedAttempt.status,
      latencyMs: updatedAttempt.latencyMs,
      targetUrl: destination,
    });
  } catch (error) {
    console.error("POST /api/forward error:", error);
    return NextResponse.json(
      { error: "Failed to dispatch payload forwarding" },
      { status: 500 }
    );
  }
}
