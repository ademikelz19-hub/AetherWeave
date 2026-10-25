import { NextResponse } from "next/server";
import { prisma, ensureTablesExist } from "@/lib/prisma";
import { ChaosProfile, DEFAULT_CHAOS_PROFILE } from "@/lib/types";


export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await ensureTablesExist();
    const endpoint = await prisma.webhookEndpoint.findUnique({
      where: { id },
      include: {
        events: {
          orderBy: { receivedAt: "desc" },
          take: 50,
          include: { attempts: { orderBy: { createdAt: "asc" } } },
        },
      },
    });
    if (!endpoint) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    let profile: ChaosProfile = DEFAULT_CHAOS_PROFILE;
    try {
      profile = JSON.parse(endpoint.chaosProfile);
    } catch {}

    const parsedEvents = endpoint.events.map((ev) => {
      let headers: Record<string, string> = {};
      try {
        headers = JSON.parse(ev.headers);
      } catch {}
      return {
        ...ev,
        headers,
      };
    });

    return NextResponse.json({
      ...endpoint,
      chaosProfile: profile,
      events: parsedEvents,
    });
  } catch (error) {
    console.error(`GET /api/endpoints/${id} error:`, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await ensureTablesExist();
    const body = await request.json();
    const { name, targetUrl, chaosProfile } = body as {
      name?: string;
      targetUrl?: string;
      chaosProfile?: ChaosProfile;
    };

    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = name;
    if (targetUrl) {
      try {
        new URL(targetUrl);
      } catch {
        return NextResponse.json({ error: "Invalid targetUrl" }, { status: 400 });
      }
      updateData.targetUrl = targetUrl;
    }
    if (chaosProfile) {
      updateData.chaosProfile = JSON.stringify(chaosProfile);
    }

    const updated = await prisma.webhookEndpoint.update({
      where: { id },
      data: updateData,
    });

    let profile: ChaosProfile = DEFAULT_CHAOS_PROFILE;
    try {
      profile = JSON.parse(updated.chaosProfile);
    } catch {}

    return NextResponse.json({
      ...updated,
      chaosProfile: profile,
    });
  } catch (error) {
    console.error(`PATCH /api/endpoints/${id} error:`, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await ensureTablesExist();
    await prisma.webhookEndpoint.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`DELETE /api/endpoints/${id} error:`, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
