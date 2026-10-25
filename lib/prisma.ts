import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  tablesVerified: boolean | undefined;
};

// Resolve database URL with fallbacks for Vercel Prisma Postgres integrations
const resolvedDatabaseUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL ||
  process.env.PRISMA_DATABASE_URL ||
  "file:./prisma/dev.db";

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: resolvedDatabaseUrl,
      },
    },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * Automatically ensures all required tables exist in the target database.
 * Executes on demand so builds do not require live database connections.
 */
export async function ensureTablesExist(): Promise<void> {
  if (globalForPrisma.tablesVerified) return;

  const dbUrl = resolvedDatabaseUrl.toLowerCase();
  const isPostgres = dbUrl.startsWith("postgres:") || dbUrl.startsWith("postgresql:") || dbUrl.startsWith("prisma+postgres:");

  try {
    if (isPostgres) {
      // PostgreSQL DDL schema auto-sync
      await prisma.$executeRawUnsafe(`
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

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "EventPayload" (
          "id" TEXT PRIMARY KEY,
          "endpointId" TEXT NOT NULL REFERENCES "WebhookEndpoint"("id") ON DELETE CASCADE,
          "headers" TEXT NOT NULL DEFAULT '{}',
          "body" TEXT NOT NULL,
          "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await prisma.$executeRawUnsafe(`
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

      await prisma.$executeRawUnsafe(`
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
    } else {
      // SQLite PRAGMAs for local concurrency
      try {
        await prisma.$queryRawUnsafe("PRAGMA journal_mode = WAL;");
        await prisma.$queryRawUnsafe("PRAGMA busy_timeout = 5000;");
        await prisma.$queryRawUnsafe("PRAGMA synchronous = NORMAL;");
      } catch {}
    }

    globalForPrisma.tablesVerified = true;
  } catch (err) {
    console.warn("Table auto-verification non-fatal notice:", err);
  }
}
