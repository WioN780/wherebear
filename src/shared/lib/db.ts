import { PrismaClient } from "@/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { config } from "./config";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const createPrismaClient = () => {
  const connectionString = config.database.url;

  // Note: The Pool will initialize even if the DB is unreachable,
  // only throwing errors once queries are run, which our actions catch.
  const pool = new Pool({
    connectionString,
    connectionTimeoutMillis: 3000, // Quick timeout to fail fast and trigger fallbacks
  });

  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: config.app.isDev ? ["error", "warn"] : ["error"],
  });
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (!config.app.isProd) globalForPrisma.prisma = prisma;
export default prisma;
