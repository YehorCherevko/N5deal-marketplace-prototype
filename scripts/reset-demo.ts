import { createDatabaseClient, requireLocalDatabase } from "./database";
import { seedRecords } from "../prisma/seed-records";

// The guard runs before establishing a connection or issuing any SQL.
requireLocalDatabase("reset");
const db = createDatabaseClient();
try {
  const inserted = await db.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(50303)`;
      await tx.moderationEvent.deleteMany();
      await tx.inquiry.deleteMany();
      await tx.asset.deleteMany();
      await tx.buyerProfile.deleteMany();
      await tx.user.deleteMany();
      return seedRecords(tx);
    },
    { timeout: 30_000 },
  );
  console.log("Local demo reset complete. Restored:", inserted);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
