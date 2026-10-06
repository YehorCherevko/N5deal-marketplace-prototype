import assert from "node:assert/strict";
import raw from "../prisma/seed-data.json";
import { Prisma } from "../src/generated/prisma/client";
import { createDatabaseClient } from "./database";

function normalize(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Prisma.Decimal) return value.toFixed(2);
  if (Array.isArray(value)) return value.map(normalize);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, normalize(entry)]),
    );
  }
  return value;
}

function sorted(rows: object[]) {
  return [...rows]
    .sort((a, b) => {
      const left = a as { id?: string; userId?: string };
      const right = b as { id?: string; userId?: string };
      return (left.id ?? left.userId ?? "").localeCompare(
        right.id ?? right.userId ?? "",
      );
    })
    .map(normalize);
}

const db = createDatabaseClient();
try {
  const rows = {
    users: await db.user.findMany(),
    buyerProfiles: await db.buyerProfile.findMany(),
    assets: await db.asset.findMany(),
    inquiries: await db.inquiry.findMany(),
    moderationEvents: await db.moderationEvent.findMany(),
  };
  for (const key of Object.keys(rows) as (keyof typeof rows)[]) {
    // Order by stable key, independent of object property ordering.
    const actual = sorted(rows[key]);
    const expected = sorted(raw[key]);
    assert.deepEqual(
      actual,
      expected,
      `${key} must match the original fixtures exactly`,
    );
    console.log(
      `PASS ${key}: ${rows[key].length} records match every original field`,
    );
  }
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
