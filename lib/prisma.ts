import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  sqlitePragmasConfigured: boolean | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * Configure SQLite for high concurrency (if running against local SQLite).
 * If running on PostgreSQL (e.g. Prisma Postgres on Vercel), this is a no-op.
 */
export async function ensureSqlitePragmas(): Promise<void> {
  if (globalForPrisma.sqlitePragmasConfigured) return;

  const dbUrl = process.env.DATABASE_URL || "";
  // Only execute SQLite pragmas if running on SQLite (file: protocol)
  if (!dbUrl.startsWith("file:") && !dbUrl.includes(".db")) {
    globalForPrisma.sqlitePragmasConfigured = true;
    return;
  }

  try {
    await prisma.$queryRawUnsafe("PRAGMA journal_mode = WAL;");
    await prisma.$queryRawUnsafe("PRAGMA busy_timeout = 5000;");
    await prisma.$queryRawUnsafe("PRAGMA synchronous = NORMAL;");
    globalForPrisma.sqlitePragmasConfigured = true;
  } catch (err) {
    console.warn("Warning: Could not configure SQLite WAL pragmas:", err);
  }
}

// Initial check
ensureSqlitePragmas().catch(() => {});
