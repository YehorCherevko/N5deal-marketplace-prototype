import type { Prisma } from "../src/generated/prisma/client";
import { fixtures } from "./fixtures";

function conflict(model: string, id: string, field: string): never {
  throw new Error(
    `Seed conflict: ${model} ${id} has a different ${field}. No records were changed; resolve the identity/relationship conflict explicitly.`,
  );
}

// Used by seed, reset, and integration checks inside an explicit transaction.
export async function seedRecords(tx: Prisma.TransactionClient) {
  // Serialize seed/reset operations without adding a table or index.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(50303)`;
  const inserted = {
    users: (
      await tx.user.createMany({ data: fixtures.users, skipDuplicates: true })
    ).count,
    buyerProfiles: 0,
    assets: 0,
    inquiries: 0,
    moderationEvents: 0,
  };
  for (const fixture of fixtures.users) {
    const row = await tx.user.findUnique({ where: { id: fixture.id } });
    if (!row) conflict("User", fixture.id, "email owned by another UUID");
    if (row.email !== fixture.email) conflict("User", fixture.id, "email");
    if (row.role !== fixture.role) conflict("User", fixture.id, "role");
  }

  inserted.buyerProfiles = (
    await tx.buyerProfile.createMany({
      data: fixtures.buyerProfiles,
      skipDuplicates: true,
    })
  ).count;
  inserted.assets = (
    await tx.asset.createMany({ data: fixtures.assets, skipDuplicates: true })
  ).count;
  for (const fixture of fixtures.assets) {
    const row = await tx.asset.findUniqueOrThrow({ where: { id: fixture.id } });
    if (row.sellerId !== fixture.sellerId)
      conflict("Asset", fixture.id, "sellerId");
  }

  inserted.inquiries = (
    await tx.inquiry.createMany({
      data: fixtures.inquiries,
      skipDuplicates: true,
    })
  ).count;
  for (const fixture of fixtures.inquiries) {
    const row = await tx.inquiry.findUnique({ where: { id: fixture.id } });
    if (!row)
      conflict("Inquiry", fixture.id, "submission key owned by another UUID");
    for (const field of [
      "senderId",
      "recipientId",
      "assetId",
      "idempotencyKey",
    ] as const) {
      if (row[field] !== fixture[field]) conflict("Inquiry", fixture.id, field);
    }
  }

  inserted.moderationEvents = (
    await tx.moderationEvent.createMany({
      data: fixtures.moderationEvents,
      skipDuplicates: true,
    })
  ).count;
  for (const fixture of fixtures.moderationEvents) {
    const row = await tx.moderationEvent.findUniqueOrThrow({
      where: { id: fixture.id },
    });
    for (const field of [
      "managerId",
      "targetUserId",
      "fromStatus",
      "toStatus",
    ] as const) {
      if (row[field] !== fixture[field])
        conflict("ModerationEvent", fixture.id, field);
    }
  }
  return inserted;
}
