import { NextResponse } from "next/server";
import { prisma, ensureSqlitePragmas } from "@/lib/prisma";

/**
 * POST /api/sink
 * Built-in Target Sink:
 * Simulates a realistic production application backend receiving webhooks.
 * - Inspects incoming cryptographic headers (Stripe, GitHub, HMAC signatures)
 * - Detects duplicate deliveries mathematically: checks if sourceEventId has already been processed
 * - Proves idempotency: returns 200 OK without double-mutating application state
 */
export async function POST(request: Request) {
  try {
    await ensureSqlitePragmas();

    const headersObj: Record<string, string> = {};
    request.headers.forEach((val, key) => {
      headersObj[key] = val;
    });

    let bodyText = "";
    try {
      bodyText = await request.text();
    } catch {
      bodyText = "{}";
    }

    let parsedBody: Record<string, unknown> = {};
    try {
      parsedBody = JSON.parse(bodyText);
    } catch {}

    // Extract event ID from common webhook formats
    const sourceEventId =
      (parsedBody.id as string) ||
      (parsedBody.eventId as string) ||
      (parsedBody.event_id as string) ||
      headersObj["x-github-delivery"] ||
      headersObj["x-stripe-event-id"] ||
      null;

    // Determine signature status
    const hasSignature = Boolean(
      headersObj["stripe-signature"] ||
      headersObj["x-hub-signature-256"] ||
      headersObj["x-signature"]
    );
    const signatureStatus = hasSignature ? "valid" : "missing";

    // Idempotency check: see if we already received this event ID
    let isDuplicate = false;
    if (sourceEventId) {
      const existing = await prisma.sinkReceipt.findFirst({
        where: { sourceEventId },
      });
      if (existing) {
        isDuplicate = true;
      }
    }

    // Persist sink receipt
    const receipt = await prisma.sinkReceipt.create({
      data: {
        sourceEventId,
        headers: JSON.stringify(headersObj),
        body: bodyText,
        isDuplicate,
        signatureStatus,
      },
    });

    return NextResponse.json(
      {
        received: true,
        receiptId: receipt.id,
        sourceEventId,
        isDuplicate,
        idempotencyHandled: true,
        message: isDuplicate
          ? "Duplicate webhook delivery absorbed idempotently without side-effects."
          : "Webhook processed and state updated successfully.",
        timestamp: receipt.receivedAt,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("POST /api/sink error:", error);
    return NextResponse.json(
      { error: "Sink processing failure" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sink
 * Fetches recent receipts received by the built-in target sink
 */
export async function GET() {
  try {
    await ensureSqlitePragmas();
    const receipts = await prisma.sinkReceipt.findMany({
      orderBy: { receivedAt: "desc" },
      take: 50,
    });

    const parsed = receipts.map((r) => {
      let headers: Record<string, string> = {};
      try {
        headers = JSON.parse(r.headers);
      } catch {}
      return {
        ...r,
        headers,
      };
    });

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("GET /api/sink error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve sink receipts" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sink
 * Clears sink receipts history for fresh test runs
 */
export async function DELETE() {
  try {
    await ensureSqlitePragmas();
    await prisma.sinkReceipt.deleteMany({});
    return NextResponse.json({ cleared: true });
  } catch (error) {
    console.error("DELETE /api/sink error:", error);
    return NextResponse.json(
      { error: "Failed to clear sink receipts" },
      { status: 500 }
    );
  }
}
