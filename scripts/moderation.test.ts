import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { createDatabaseClient, requireLocalDatabase } from "./database";
import { transitionStatus, validateModeration } from "../src/features/moderation/validation";
import { transitionParticipant } from "../src/server/moderation/transition";
import { FormError, RecordUnavailable } from "../src/features/marketplace/form-state";

const url = new URL(process.env.DATABASE_URL ?? "");
url.pathname = "/n5deal_test";
process.env.DATABASE_URL = url.toString();
requireLocalDatabase("test");

test("moderation permits only the agreed transitions and requires a trimmed reason and removal confirmation", () => {
  assert.equal(transitionStatus("ACTIVE", "suspend"), "SUSPENDED");
  assert.equal(transitionStatus("SUSPENDED", "reactivate"), "ACTIVE");
  for (const status of ["ACTIVE", "SUSPENDED"] as const) assert.equal(transitionStatus(status, "remove"), "REMOVED");
  for (const action of ["remove", "suspend", "reactivate"] as const) assert.throws(() => transitionStatus("REMOVED", action), FormError);
  assert.throws(() => transitionStatus("ACTIVE", "reactivate"), FormError);
  assert.throws(() => transitionStatus("SUSPENDED", "suspend"), FormError);
  const input = { action: "suspend", expectedStatus: "ACTIVE", reason: "  Fictional reason  ", confirmRemove: false };
  assert.equal(validateModeration(input).reason, "Fictional reason");
  for (const reason of [" \n ", "x".repeat(501)]) assert.throws(() => validateModeration({ ...input, reason }), FormError);
  assert.throws(() => validateModeration({ ...input, action: "remove" }), FormError);
});

test("PostgreSQL moderation conditionally transitions once, protects Managers, preserves records, and rolls back failed events", async () => {
  const db = createDatabaseClient();
  const ids = Array.from({ length: 4 }, () => randomUUID());
  const assetIds = Array.from({ length: 3 }, () => randomUUID());
  try {
    for (const [index, role] of ["MANAGER", "MANAGER", "SELLER", "BUYER"].entries()) {
      await db.user.create({ data: { id: ids[index], email: `${ids[index]}@example.com`, name: "Isolated moderation participant", role: role as "MANAGER" | "SELLER" | "BUYER" } });
    }
    for (const [index, publicationStatus] of ["PUBLISHED", "DRAFT", "ARCHIVED"].entries()) {
      await db.asset.create({ data: { id: assetIds[index], sellerId: ids[2], title: "Isolated moderation asset", description: "A complete fictional asset to verify moderation preserves publication states.", businessCategory: "FINTECH", assetType: "TECHNOLOGY_ASSET", jurisdiction: "GB", businessStatus: "OPERATING", priceType: "ON_REQUEST", publicationStatus: publicationStatus as "PUBLISHED" | "DRAFT" | "ARCHIVED", publishedAt: publicationStatus === "DRAFT" ? null : new Date() } });
    }
    const input = validateModeration({ action: "suspend", expectedStatus: "ACTIVE", reason: "  Fictional suspension reason  ", confirmRemove: false });
    const results = await Promise.allSettled(Array.from({ length: 2 }, () => transitionParticipant(db, ids[0], ids[2], input)));
    assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
    assert.equal(await db.moderationEvent.count({ where: { targetUserId: ids[2] } }), 1);
    assert.equal((await db.user.findUniqueOrThrow({ where: { id: ids[2] } })).status, "SUSPENDED");
    const event = await db.moderationEvent.findFirstOrThrow({ where: { targetUserId: ids[2] } });
    assert.deepEqual([event.managerId, event.fromStatus, event.toStatus, event.reason], [ids[0], "ACTIVE", "SUSPENDED", "Fictional suspension reason"]);
    await assert.rejects(transitionParticipant(db, ids[0], ids[2], input), FormError);
    for (const targetId of [ids[0], ids[1]]) await assert.rejects(transitionParticipant(db, ids[0], targetId, input), RecordUnavailable);
    await assert.rejects(transitionParticipant(db, randomUUID(), ids[3], input));
    assert.equal((await db.user.findUniqueOrThrow({ where: { id: ids[3] } })).status, "ACTIVE");
    assert.equal(await db.moderationEvent.count({ where: { targetUserId: ids[3] } }), 0);

    await transitionParticipant(db, ids[0], ids[2], validateModeration({ ...input, action: "reactivate", expectedStatus: "SUSPENDED" }));
    assert.equal((await db.user.findUniqueOrThrow({ where: { id: ids[2] } })).status, "ACTIVE");
    for (const [index, status] of ["PUBLISHED", "DRAFT", "ARCHIVED"].entries()) assert.equal((await db.asset.findUniqueOrThrow({ where: { id: assetIds[index] } })).publicationStatus, status);
    await transitionParticipant(db, ids[0], ids[2], validateModeration({ ...input, action: "remove", confirmRemove: true }));
    assert.equal((await db.user.findUniqueOrThrow({ where: { id: ids[2] } })).status, "REMOVED");
    assert.equal(await db.asset.count({ where: { sellerId: ids[2] } }), 3);
    assert.equal(await db.moderationEvent.count({ where: { targetUserId: ids[2] } }), 3);
    await assert.rejects(transitionParticipant(db, ids[0], ids[2], input), FormError);
    assert.equal(await db.moderationEvent.count({ where: { targetUserId: ids[2] } }), 3);
  } finally {
    await db.moderationEvent.deleteMany({ where: { targetUserId: { in: ids } } });
    await db.asset.deleteMany({ where: { id: { in: assetIds } } });
    await db.user.deleteMany({ where: { id: { in: ids } } });
    await db.$disconnect();
  }
});
