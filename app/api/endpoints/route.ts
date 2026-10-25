import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_CHAOS_PROFILE, ChaosProfile } from "@/lib/types";
import { nanoid } from "nanoid";

export async function GET() {
  try {
    const endpoints = await prisma.webhookEndpoint.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { events: true } },
      },
    });

    const parsed = endpoints.map((ep) => {
      let profile: ChaosProfile = DEFAULT_CHAOS_PROFILE;
      try {
        profile = JSON.parse(ep.chaosProfile);
      } catch {}
      return {
        ...ep,
        chaosProfile: profile,
      };
    });

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("GET /api/endpoints error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, targetUrl, chaosProfile } = body;

    if (!name || !targetUrl) {
      return NextResponse.json(
        { error: "name and targetUrl are required" },
        { status: 400 }
      );
    }

    try {
      new URL(targetUrl);
    } catch {
      return NextResponse.json({ error: "Invalid targetUrl" }, { status: 400 });
    }

    const slug = nanoid(12);
    const profile = chaosProfile ?? DEFAULT_CHAOS_PROFILE;

    const endpoint = await prisma.webhookEndpoint.create({
      data: {
        name,
        slug,
        targetUrl,
        chaosProfile: JSON.stringify(profile),
      },
    });

    return NextResponse.json(
      {
        ...endpoint,
        chaosProfile: profile,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/endpoints error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
