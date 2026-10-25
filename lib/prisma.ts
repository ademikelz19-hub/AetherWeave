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
 * Configure SQLite for high concurrency:
 * - WAL (Write-Ahead Logging): Allows concurrent readers while writing.
 * - busy_timeout = 5000: Prevents instant SQLITE_BUSY errors during parallel burst writes.
 * - synchronous = NORMAL: Minimizes I/O barrier stalls in WAL mode.
 *
 * NOTE: SQLite PRAGMA commands return result rows, so Prisma requires $queryRawUnsafe instead of $executeRawUnsafe.
 */
export async function ensureSqlitePragmas(): Promise<void> {
  if (globalForPrisma.sqlitePragmasConfigured) return;
  try {
    await prisma.$queryRawUnsafe("PRAGMA journal_mode = WAL;");
    await prisma.$queryRawUnsafe("PRAGMA busy_timeout = 5000;");
    await prisma.$queryRawUnsafe("PRAGMA synchronous = NORMAL;");
    globalForPrisma.sqlitePragmasConfigured = true;
  } catch (err) {
    console.warn("Warning: Could not configure SQLite WAL pragmas:", err);
  }
}

// Initial configuration
ensureSqlitePragmas().catch(() => {});
