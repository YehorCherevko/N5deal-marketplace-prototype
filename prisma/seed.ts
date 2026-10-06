import { createDatabaseClient } from "../scripts/database";
import { seedRecords } from "./seed-records";

const db = createDatabaseClient();
try {
  const inserted = await db.$transaction(seedRecords, { timeout: 30_000 });
  console.log("Seed complete. Inserted:", inserted);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
