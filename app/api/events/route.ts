import { NextResponse } from "next/server";
import { prisma, ensureTablesExist } from "@/lib/prisma";
import { ChaosProfile, DEFAULT_CHAOS_PROFILE } from "@/lib/types";


export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const endpointId = searchParams.get("endpointId");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);

  try {
    await ensureTablesExist();
    const where = endpointId ? { endpointId } : {};

    const events = await prisma.eventPayload.findMany({
      where,
      orderBy: { receivedAt: "desc" },
      take: limit,
      include: {
        attempts: { orderBy: { createdAt: "asc" } },
        endpoint: { select: { name: true, slug: true, chaosProfile: true } },
      },
    });

    const parsedEvents = events.map((ev) => {
      let headers: Record<string, string> = {};
      try {
        headers = JSON.parse(ev.headers);
      } catch {}

      let endpointProfile: ChaosProfile = DEFAULT_CHAOS_PROFILE;
      try {
        endpointProfile = JSON.parse(ev.endpoint.chaosProfile);
      } catch {}

      return {
        ...ev,
        headers,
        endpoint: {
          ...ev.endpoint,
          chaosProfile: endpointProfile,
        },
      };
    });

    return NextResponse.json(parsedEvents);
  } catch (error) {
    console.error("GET /api/events error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
