import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { createDatabaseClient, requireLocalDatabase } from "./database";
import { validateInquiry } from "../src/features/inquiries/validation";
import { deliverInquiry, IdempotencyConflict, markRecipientRead } from "../src/server/inquiries/delivery";
import { FormError, RecordUnavailable } from "../src/features/marketplace/form-state";

const url = new URL(process.env.DATABASE_URL ?? "");
url.pathname = "/n5deal_test";
process.env.DATABASE_URL = url.toString();
requireLocalDatabase("test");

test("inquiry input trims plain text and rejects invalid attempts", () => {
  const idempotencyKey = randomUUID();
  assert.equal(validateInquiry({ body: "  A multiline\nmessage  ", idempotencyKey, assetId: "" }).body, "A multiline\nmessage");
  for (const body of [" \n ", "x".repeat(2001)]) {
    assert.throws(() => validateInquiry({ body, idempotencyKey, assetId: "" }), FormError);
  }
  assert.throws(() => validateInquiry({ body: "hello", idempotencyKey: "invalid", assetId: "" }), FormError);
});

test("PostgreSQL inquiry delivery handles duplicate races, conflicts, eligibility, and recipient-only read updates", async () => {
  const db = createDatabaseClient();
  const userIds = Array.from({ length: 4 }, () => randomUUID());
  const assetIds = Array.from({ length: 3 }, () => randomUUID());
  try {
    const seller = await db.user.create({ data: { id: userIds[0], name: "Inquiry test seller", email: `${userIds[0]}@example.com`, role: "SELLER" } });
    const buyer = await db.user.create({ data: { id: userIds[1], name: "Inquiry test buyer", email: `${userIds[1]}@example.com`, role: "BUYER", companyName: "Private fictional investor", countryCode: "GB" } });
    const other = await db.user.create({ data: { id: userIds[2], name: "Another test seller", email: `${userIds[2]}@example.com`, role: "SELLER" } });
    const manager = await db.user.create({ data: { id: userIds[3], name: "Inquiry test manager", email: `${userIds[3]}@example.com`, role: "MANAGER" } });
    await db.buyerProfile.create({ data: { userId: buyer.id, thesis: "A complete fictional private investment thesis for inquiry verification.", targetCategories: ["FINTECH"] } });
    for (const [index, id] of assetIds.entries()) {
      await db.asset.create({ data: { id, sellerId: index === 2 ? other.id : seller.id, title: "Isolated inquiry asset", description: "A complete fictional asset used for inquiry integration verification.", businessCategory: "FINTECH", assetType: "TECHNOLOGY_ASSET", jurisdiction: "GB", businessStatus: "OPERATING", priceType: "ON_REQUEST", publicationStatus: index === 1 ? "ARCHIVED" : "PUBLISHED", publishedAt: new Date() } });
    }
    const target = { kind: "asset", id: assetIds[0] } as const;
    const input = validateInquiry({ body: "  Test private-profile inquiry  ", assetId: "", idempotencyKey: randomUUID() });
    const ids = await Promise.all(Array.from({ length: 3 }, () => deliverInquiry(db, buyer, target, input)));
    assert.equal(new Set(ids).size, 1);
    assert.equal(await db.inquiry.count({ where: { senderId: buyer.id, idempotencyKey: input.idempotencyKey } }), 1);
    assert.notEqual(await deliverInquiry(db, buyer, target, { ...input, idempotencyKey: randomUUID() }), ids[0]);
    await assert.rejects(deliverInquiry(db, buyer, target, { ...input, body: "Changed content" }), IdempotencyConflict);
    await assert.rejects(deliverInquiry(db, buyer, { kind: "asset", id: assetIds[2] }, input), IdempotencyConflict);
    await assert.rejects(deliverInquiry(db, manager, target, input), RecordUnavailable);
    const original = await db.inquiry.findUniqueOrThrow({ where: { id: ids[0] } });
    assert.equal(original.readAt, null);
    await assert.rejects(markRecipientRead(db, buyer.id, ids[0]), RecordUnavailable);
    await assert.rejects(markRecipientRead(db, other.id, ids[0]), RecordUnavailable);
    await markRecipientRead(db, seller.id, ids[0]);
    const firstRead = (await db.inquiry.findUniqueOrThrow({ where: { id: ids[0] } })).readAt;
    await markRecipientRead(db, seller.id, ids[0]);
    assert.deepEqual((await db.inquiry.findUniqueOrThrow({ where: { id: ids[0] } })).readAt, firstRead);

    await db.user.update({ where: { id: seller.id }, data: { status: "SUSPENDED" } });
    await db.asset.update({ where: { id: assetIds[0] }, data: { publicationStatus: "ARCHIVED" } });
    await db.buyerProfile.update({ where: { userId: buyer.id }, data: { thesis: null } });
    assert.equal(await deliverInquiry(db, buyer, target, input), ids[0]);
    await assert.rejects(deliverInquiry(db, buyer, target, { ...input, idempotencyKey: randomUUID() }), RecordUnavailable);

    await db.user.update({ where: { id: seller.id }, data: { status: "ACTIVE" } });
    await db.buyerProfile.update({ where: { userId: buyer.id }, data: { thesis: "A complete fictional published investment thesis for inquiry verification.", publishedAt: new Date() } });
    const sellerInput = { ...input, idempotencyKey: randomUUID() };
    const buyerTarget = { kind: "buyer", id: buyer.id } as const;
    await deliverInquiry(db, seller, buyerTarget, sellerInput);
    await assert.rejects(deliverInquiry(db, seller, buyerTarget, { ...sellerInput, assetId: assetIds[0] }), IdempotencyConflict);
    await assert.rejects(deliverInquiry(db, seller, buyerTarget, { ...sellerInput, assetId: assetIds[2], idempotencyKey: randomUUID() }), FormError);
    await assert.rejects(deliverInquiry(db, seller, buyerTarget, { ...sellerInput, assetId: assetIds[1], idempotencyKey: randomUUID() }), FormError);
    await db.asset.update({ where: { id: assetIds[0] }, data: { publicationStatus: "PUBLISHED" } });
    await deliverInquiry(db, seller, buyerTarget, { ...sellerInput, assetId: assetIds[0], idempotencyKey: randomUUID() });
    await db.buyerProfile.update({ where: { userId: buyer.id }, data: { publishedAt: null } });
    await assert.rejects(deliverInquiry(db, seller, buyerTarget, { ...sellerInput, idempotencyKey: randomUUID() }), RecordUnavailable);
    assert.ok(await db.inquiry.count({ where: { recipientId: buyer.id } }) >= 2);
  } finally {
    await db.inquiry.deleteMany({ where: { senderId: { in: userIds } } });
    await db.asset.deleteMany({ where: { id: { in: assetIds } } });
    await db.buyerProfile.deleteMany({ where: { userId: { in: userIds } } });
    await db.user.deleteMany({ where: { id: { in: userIds } } });
    await db.$disconnect();
  }
});
