import { PrismaClient } from "@prisma/client";

// Global cache for in-memory resilience when external Postgres is unconfigured or in cold-start
interface MemEndpoint {
  id: string;
  name: string;
  slug: string;
  targetUrl: string;
  chaosProfile: string;
  createdAt: Date;
  updatedAt: Date;
}

interface MemEvent {
  id: string;
  endpointId: string;
  headers: string;
  body: string;
  receivedAt: Date;
}

interface MemAttempt {
  id: string;
  payloadId: string;
  status: string;
  latencyMs: number;
  duplicate: boolean;
  scrambled: boolean;
  createdAt: Date;
  completedAt: Date | null;
}

interface MemSinkReceipt {
  id: string;
  sourceEventId: string | null;
  headers: string;
  body: string;
  isDuplicate: boolean;
  signatureStatus: string;
  receivedAt: Date;
}

const globalForStore = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  tablesVerified: boolean | undefined;
  useFallbackStore: boolean | undefined;
  memEndpoints: MemEndpoint[] | undefined;
  memEvents: MemEvent[] | undefined;
  memAttempts: MemAttempt[] | undefined;
  memSinkReceipts: MemSinkReceipt[] | undefined;
};

// Initialize in-memory store with default active endpoint so dashboard is immediately functional
if (!globalForStore.memEndpoints) {
  const target = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}/api/sink`
    : "http://localhost:3000/api/sink";

  globalForStore.memEndpoints = [
    {
      id: "ep_stripe_gateway",
      name: "Example 1: Payment Notification (Demo Sandbox)",
      slug: "stripe-gateway-sim",
      targetUrl: target,
      chaosProfile: JSON.stringify({
        latencyMs: 1200,
        dropProb: 0,
        duplicate: true,
        scramble: false,
      }),
      createdAt: new Date(Date.now() + 1000),
      updatedAt: new Date(Date.now() + 1000),
    },
    {
      id: "ep_paystack_gateway",
      name: "Example 2: Checkout Notification (Demo Sandbox)",
      slug: "paystack-gateway-sim",
      targetUrl: target,
      chaosProfile: JSON.stringify({
        latencyMs: 1500,
        dropProb: 0,
        duplicate: true,
        scramble: false,
      }),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
}
if (!globalForStore.memEvents) globalForStore.memEvents = [];
if (!globalForStore.memAttempts) globalForStore.memAttempts = [];
if (!globalForStore.memSinkReceipts) globalForStore.memSinkReceipts = [];

// Resolve database URL
const rawDbUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL ||
  process.env.PRISMA_DATABASE_URL;

const hasValidPostgres =
  Boolean(rawDbUrl) &&
  (rawDbUrl!.startsWith("postgres:") ||
    rawDbUrl!.startsWith("postgresql:") ||
    rawDbUrl!.startsWith("prisma+postgres:"));

let realPrisma: PrismaClient | null = null;
if (hasValidPostgres) {
  try {
    realPrisma =
      globalForStore.prisma ??
      new PrismaClient({
        datasources: { db: { url: rawDbUrl } },
        log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
      });
    if (process.env.NODE_ENV !== "production") globalForStore.prisma = realPrisma;
  } catch {
    realPrisma = null;
  }
}

// In-Memory store implementation
const memStore = {
  webhookEndpoint: {
    async findMany(args?: { orderBy?: Record<string, string>; include?: { _count?: { select?: { events?: boolean } } } }) {
      const endpoints = [...(globalForStore.memEndpoints ?? [])];
      endpoints.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return endpoints.map((ep) => {
        const count = (globalForStore.memEvents ?? []).filter((e) => e.endpointId === ep.id).length;
        return {
          ...ep,
          ...(args?.include?._count ? { _count: { events: count } } : {}),
        };
      });
    },
    async findUnique(args: { where: { id?: string; slug?: string }; include?: { events?: unknown } }) {
      const ep = (globalForStore.memEndpoints ?? []).find(
        (e) => (args.where.id && e.id === args.where.id) || (args.where.slug && e.slug === args.where.slug)
      );
      if (!ep) return null;

      if (args.include?.events) {
        const events = (globalForStore.memEvents ?? [])
          .filter((e) => e.endpointId === ep.id)
          .sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime())
          .slice(0, 50)
          .map((ev) => ({
            ...ev,
            attempts: (globalForStore.memAttempts ?? [])
              .filter((a) => a.payloadId === ev.id)
              .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
          }));
        return { ...ep, events };
      }
      return ep;
    },
    async create(args: { data: { id?: string; name: string; slug: string; targetUrl: string; chaosProfile: string } }) {
      const ep: MemEndpoint = {
        id: args.data.id || `ep_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        name: args.data.name,
        slug: args.data.slug,
        targetUrl: args.data.targetUrl,
        chaosProfile: args.data.chaosProfile,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      globalForStore.memEndpoints = [ep, ...(globalForStore.memEndpoints ?? [])];
      return ep;
    },
    async update(args: { where: { id: string }; data: Partial<MemEndpoint> }) {
      const list = globalForStore.memEndpoints ?? [];
      const idx = list.findIndex((e) => e.id === args.where.id);
      if (idx === -1) throw new Error("Endpoint not found");
      const updated: MemEndpoint = {
        ...list[idx],
        ...args.data,
        updatedAt: new Date(),
      };
      list[idx] = updated;
      return updated;
    },
    async delete(args: { where: { id: string } }) {
      globalForStore.memEndpoints = (globalForStore.memEndpoints ?? []).filter((e) => e.id !== args.where.id);
      return { id: args.where.id };
    },
  },

  eventPayload: {
    async findMany(args?: {
      where?: { endpointId?: string };
      orderBy?: Record<string, string>;
      take?: number;
      include?: { attempts?: boolean; endpoint?: { select?: Record<string, boolean> } };
    }) {
      let events = [...(globalForStore.memEvents ?? [])];
      if (args?.where?.endpointId) {
        events = events.filter((e) => e.endpointId === args.where?.endpointId);
      }
      events.sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime());
      if (args?.take) events = events.slice(0, args.take);

      return events.map((ev) => {
        const attempts = (globalForStore.memAttempts ?? [])
          .filter((a) => a.payloadId === ev.id)
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        const ep = (globalForStore.memEndpoints ?? []).find((e) => e.id === ev.endpointId);
        return {
          ...ev,
          ...(args?.include?.attempts ? { attempts } : {}),
          ...(args?.include?.endpoint
            ? {
                endpoint: {
                  name: ep?.name ?? "Unknown",
                  slug: ep?.slug ?? "unknown",
                  chaosProfile: ep?.chaosProfile ?? "{}",
                },
              }
            : {}),
        };
      });
    },
    async create(args: { data: { id: string; endpointId: string; headers: string; body: string } }) {
      const ev: MemEvent = {
        id: args.data.id,
        endpointId: args.data.endpointId,
        headers: args.data.headers,
        body: args.data.body,
        receivedAt: new Date(),
      };
      globalForStore.memEvents = [ev, ...(globalForStore.memEvents ?? [])];
      return ev;
    },
  },

  deliveryAttempt: {
    async create(args: {
      data: {
        payloadId: string;
        status: string;
        latencyMs: number;
        duplicate?: boolean;
        scrambled?: boolean;
        completedAt?: Date | null;
      };
    }) {
      const att: MemAttempt = {
        id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        payloadId: args.data.payloadId,
        status: args.data.status,
        latencyMs: args.data.latencyMs,
        duplicate: args.data.duplicate ?? false,
        scrambled: args.data.scrambled ?? false,
        createdAt: new Date(),
        completedAt: args.data.completedAt ?? null,
      };
      globalForStore.memAttempts = [...(globalForStore.memAttempts ?? []), att];
      return att;
    },
    async update(args: { where: { id: string }; data: Partial<MemAttempt> }) {
      const list = globalForStore.memAttempts ?? [];
      const idx = list.findIndex((a) => a.id === args.where.id);
      if (idx === -1) return null;
      list[idx] = { ...list[idx], ...args.data };
      return list[idx];
    },
  },

  sinkReceipt: {
    async create(args: {
      data: {
        sourceEventId: string | null;
        headers: string;
        body: string;
        isDuplicate: boolean;
        signatureStatus: string;
      };
    }) {
      const rec: MemSinkReceipt = {
        id: `rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        sourceEventId: args.data.sourceEventId,
        headers: args.data.headers,
        body: args.data.body,
        isDuplicate: args.data.isDuplicate,
        signatureStatus: args.data.signatureStatus,
        receivedAt: new Date(),
      };
      globalForStore.memSinkReceipts = [rec, ...(globalForStore.memSinkReceipts ?? [])];
      return rec;
    },
    async findFirst(args: { where: { sourceEventId: string } }) {
      return (
        (globalForStore.memSinkReceipts ?? []).find(
          (r) => r.sourceEventId === args.where.sourceEventId
        ) ?? null
      );
    },
    async findMany(args?: { orderBy?: Record<string, string>; take?: number }) {
      let receipts = [...(globalForStore.memSinkReceipts ?? [])];
      receipts.sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime());
      if (args?.take) receipts = receipts.slice(0, args.take);
      return receipts;
    },
    async deleteMany(_args?: unknown) {
      globalForStore.memSinkReceipts = [];
      return { count: 0 };
    },
  },

  async $executeRawUnsafe(_sql: string) {
    return 1;
  },
  async $queryRawUnsafe(_sql: string) {
    return [];
  },
};

// Resilient proxy: delegates to PostgreSQL if functional, otherwise seamlessly falls back
export const prisma = new Proxy({} as unknown as PrismaClient, {
  get(_target, prop: string) {
    if (globalForStore.useFallbackStore || !realPrisma) {
      return (memStore as unknown as Record<string, unknown>)[prop];
    }

    const realVal = (realPrisma as unknown as Record<string, unknown>)[prop];
    if (typeof realVal === "object" && realVal !== null) {
      return new Proxy(realVal, {
        get(subTarget, subProp: string) {
          const fn = (subTarget as Record<string, unknown>)[subProp];
          if (typeof fn === "function") {
            return async (...args: unknown[]) => {
              try {
                return await fn.apply(subTarget, args);
              } catch (err) {
                console.warn(
                  `Prisma operation '${prop}.${subProp}' failed, activating resilient store fallback:`,
                  err
                );
                globalForStore.useFallbackStore = true;
                const fallbackSub = (memStore as unknown as Record<string, Record<string, Function>>)[prop];
                if (fallbackSub && fallbackSub[subProp]) {
                  return await fallbackSub[subProp](...args);
                }
                throw err;
              }
            };
          }
          return fn;
        },
      });
    }

    if (typeof realVal === "function") {
      return async (...args: unknown[]) => {
        try {
          return await (realVal as Function).apply(realPrisma, args);
        } catch (err) {
          console.warn(`Prisma call '${prop}' failed, using fallback:`, err);
          globalForStore.useFallbackStore = true;
          const fallbackFn = (memStore as unknown as Record<string, Function>)[prop];
          if (fallbackFn) return await fallbackFn(...args);
          return null;
        }
      };
    }

    return realVal;
  },
});

export async function ensureTablesExist(): Promise<void> {
  if (globalForStore.tablesVerified || globalForStore.useFallbackStore || !realPrisma) return;

  try {
    await realPrisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "WebhookEndpoint" (
        "id" TEXT PRIMARY KEY,
        "name" TEXT NOT NULL,
        "slug" TEXT UNIQUE NOT NULL,
        "targetUrl" TEXT NOT NULL,
        "chaosProfile" TEXT NOT NULL DEFAULT '{"latencyMs":0,"dropProb":0,"duplicate":false,"scramble":false}',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await realPrisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "EventPayload" (
        "id" TEXT PRIMARY KEY,
        "endpointId" TEXT NOT NULL REFERENCES "WebhookEndpoint"("id") ON DELETE CASCADE,
        "headers" TEXT NOT NULL DEFAULT '{}',
        "body" TEXT NOT NULL,
        "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await realPrisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "DeliveryAttempt" (
        "id" TEXT PRIMARY KEY,
        "payloadId" TEXT NOT NULL REFERENCES "EventPayload"("id") ON DELETE CASCADE,
        "status" TEXT NOT NULL,
        "latencyMs" INTEGER NOT NULL,
        "duplicate" BOOLEAN NOT NULL DEFAULT false,
        "scrambled" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "completedAt" TIMESTAMP(3)
      );
    `);

    await realPrisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "SinkReceipt" (
        "id" TEXT PRIMARY KEY,
        "sourceEventId" TEXT,
        "headers" TEXT NOT NULL DEFAULT '{}',
        "body" TEXT NOT NULL,
        "isDuplicate" BOOLEAN NOT NULL DEFAULT false,
        "signatureStatus" TEXT NOT NULL,
        "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    globalForStore.tablesVerified = true;
  } catch (err) {
    console.warn("Table auto-verification note (resilient fallback active):", err);
    globalForStore.useFallbackStore = true;
  }
}
