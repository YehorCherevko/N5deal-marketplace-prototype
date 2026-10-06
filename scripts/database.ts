import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

// CLI entrypoints have their own short-lived pool; they do not import Next's server-only module.
export function createDatabaseClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required.");
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString, connectionTimeoutMillis: 5000, max: 5 }),
  });
}

export function requireLocalDatabase(kind: "reset" | "test") {
  const url = new URL(process.env.DATABASE_URL ?? "");
  const name = url.pathname.slice(1);
  const localHost = ["db", "localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  const expectedName = kind === "reset" ? "n5deal_demo" : "n5deal_test";
  if (process.env.NODE_ENV === "production" || !localHost ||
      !["postgres:", "postgresql:"].includes(url.protocol) || name !== expectedName ||
      (kind === "reset" && process.env.LOCAL_DEMO_RESET !== "true")) {
    throw new Error(kind === "reset"
      ? "Reset refused: require LOCAL_DEMO_RESET=true, non-production mode, and local n5deal_demo DATABASE_URL."
      : "Verification refused: require a non-production, local n5deal_test DATABASE_URL.");
  }
}
