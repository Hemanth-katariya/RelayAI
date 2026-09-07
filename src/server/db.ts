import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

let connectionString = process.env.DIRECT_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL || "";

if (connectionString.startsWith("prisma+postgres://")) {
  try {
    const url = new URL(connectionString);
    const apiKey = url.searchParams.get("api_key");
    if (apiKey) {
      const decoded = JSON.parse(Buffer.from(apiKey, "base64").toString("utf-8"));
      if (decoded.databaseUrl) {
        connectionString = decoded.databaseUrl;
      }
    }
  } catch (e) {
    console.error("Failed to parse prisma+postgres url:", e);
  }
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: ["query"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
