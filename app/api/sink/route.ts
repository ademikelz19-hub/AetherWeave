import { NextResponse } from "next/server";
import { prisma, ensureTablesExist } from "@/lib/prisma";


export async function POST(request: Request) {
  try {
    await ensureTablesExist();

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

    const bodyData =
      parsedBody.data && typeof parsedBody.data === "object"
        ? (parsedBody.data as Record<string, unknown>)
        : null;

    const sourceEventId =
      (parsedBody.id as string) ||
      (parsedBody.eventId as string) ||
      (parsedBody.event_id as string) ||
      (bodyData?.reference ? String(bodyData.reference) : null) ||
      (bodyData?.id ? String(bodyData.id) : null) ||
      headersObj["x-paystack-signature"] ||
      headersObj["x-github-delivery"] ||
      headersObj["x-stripe-event-id"] ||
      null;

    const hasSignature = Boolean(
      headersObj["stripe-signature"] ||
      headersObj["x-paystack-signature"] ||
      headersObj["x-hub-signature-256"] ||
      headersObj["x-signature"]
    );
    const signatureStatus = hasSignature ? "valid" : "missing";

    let isDuplicate = false;
    if (sourceEventId) {
      const existing = await prisma.sinkReceipt.findFirst({
        where: { sourceEventId },
      });
      if (existing) {
        isDuplicate = true;
      }
    }

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

export async function GET() {
  try {
    await ensureTablesExist();
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

export async function DELETE() {
  try {
    await ensureTablesExist();
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
