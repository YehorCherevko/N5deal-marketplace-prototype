import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { createDatabaseClient, requireLocalDatabase } from "./database";
import { expectedCounts, fixtures } from "../prisma/fixtures";
import { seedRecords } from "../prisma/seed-records";

requireLocalDatabase("test");
const db = createDatabaseClient();
const sql = new pg.Client({ connectionString: process.env.DATABASE_URL });

async function counts() {
  return {
    users: await db.user.count(),
    buyerProfiles: await db.buyerProfile.count(),
    assets: await db.asset.count(),
    inquiries: await db.inquiry.count(),
    moderationEvents: await db.moderationEvent.count(),
  };
}

async function rejected(
  label: string,
  query: string,
  code: string,
  constraint?: string,
) {
  await sql.query("BEGIN");
  try {
    await assert.rejects(
      sql.query(query),
      (error: unknown) => {
        const result = error as { code?: string; constraint?: string };
        assert.equal(result.code, code, `${label}: SQLSTATE`);
        if (constraint) assert.equal(result.constraint, constraint, label);
        return true;
      },
      `${label}: invalid SQL was accepted`,
    );
  } finally {
    await sql.query("ROLLBACK");
  }
  console.log(`PASS ${label}`);
}

try {
  await sql.connect();
  assert.deepEqual(
    await counts(),
    {
      users: 0,
      buyerProfiles: 0,
      assets: 0,
      inquiries: 0,
      moderationEvents: 0,
    },
    "Run on a freshly created/migrated n5deal_test database.",
  );
  assert.deepEqual(
    await db.$transaction(seedRecords, { timeout: 30_000 }),
    expectedCounts,
  );
  assert.deepEqual(await counts(), expectedCounts);
  assert.deepEqual(await db.$transaction(seedRecords, { timeout: 30_000 }), {
    users: 0,
    buyerProfiles: 0,
    assets: 0,
    inquiries: 0,
    moderationEvents: 0,
  });
  console.log("PASS fixture counts and duplicate-free reseeding");

  const user = fixtures.users[0];
  const original = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  await db.user.update({
    where: { id: user.id },
    data: { name: "Deliberately edited demo name" },
  });
  const edited = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  await db.$transaction(seedRecords, { timeout: 30_000 });
  assert.deepEqual(
    await db.user.findUniqueOrThrow({ where: { id: user.id } }),
    edited,
  );
  await db.user.update({
    where: { id: user.id },
    data: { name: original.name, updatedAt: original.updatedAt },
  });
  console.log("PASS edited record and updatedAt preserved");

  // A late relationship conflict must roll back a profile inserted earlier in the seed.
  const profile = fixtures.buyerProfiles[0];
  const inquiry = fixtures.inquiries[0];
  await db.buyerProfile.delete({ where: { userId: profile.userId } });
  await db.inquiry.update({
    where: { id: inquiry.id },
    data: { assetId: null },
  });
  try {
    await assert.rejects(
      db.$transaction(seedRecords, { timeout: 30_000 }),
      /Seed conflict: Inquiry .* assetId/,
    );
    assert.equal(
      await db.buyerProfile.findUnique({ where: { userId: profile.userId } }),
      null,
    );
  } finally {
    await db.inquiry.update({
      where: { id: inquiry.id },
      data: { assetId: inquiry.assetId },
    });
    await db.buyerProfile.create({ data: profile });
  }
  console.log("PASS relationship conflict is clear and seed is atomic");

  // Identity collision on a fixture email under a different UUID.
  const newUserId = randomUUID();
  await db.user.create({
    data: {
      ...fixtures.users[7],
      id: newUserId,
      email: "collision@example.com",
    },
  });
  const collisionFixture = fixtures.users[7];
  await db.user.update({
    where: { id: collisionFixture.id },
    data: { email: "changed@example.com" },
  });
  await db.user.update({
    where: { id: newUserId },
    data: { email: collisionFixture.email },
  });
  try {
    await assert.rejects(
      db.$transaction(seedRecords, { timeout: 30_000 }),
      /Seed conflict: User .* email/,
    );
  } finally {
    await db.user.delete({ where: { id: newUserId } });
    await db.user.update({
      where: { id: collisionFixture.id },
      data: {
        email: collisionFixture.email,
        updatedAt: collisionFixture.updatedAt,
      },
    });
  }
  console.log("PASS identity conflict rejected");

  const assetId = fixtures.assets[0].id;
  const userId = fixtures.users[0].id;
  const profileId = fixtures.buyerProfiles[0].userId;
  const inquiryId = fixtures.inquiries[0].id;
  const eventId = fixtures.moderationEvents[0].id;
  const checks: [string, string, string][] = [
    [
      "negative price",
      `UPDATE assets SET asking_price=-1 WHERE id='${assetId}'`,
      "assets_price_ck",
    ],
    [
      "zero price",
      `UPDATE assets SET asking_price=0 WHERE id='${assetId}'`,
      "assets_price_ck",
    ],
    [
      "NaN price",
      `UPDATE assets SET asking_price='NaN' WHERE id='${assetId}'`,
      "assets_price_ck",
    ],
    [
      "on-request amount",
      `UPDATE assets SET price_type='ON_REQUEST' WHERE id='${assetId}'`,
      "assets_price_ck",
    ],
    [
      "amount without price type",
      `UPDATE assets SET price_type=NULL WHERE id='${assetId}'`,
      "assets_price_ck",
    ],
    [
      "negative minimum budget",
      `UPDATE buyer_profiles SET budget_min=-1 WHERE user_id='${profileId}'`,
      "buyer_profiles_budget_ck",
    ],
    [
      "negative maximum budget",
      `UPDATE buyer_profiles SET budget_max=-1 WHERE user_id='${profileId}'`,
      "buyer_profiles_budget_ck",
    ],
    [
      "reversed budget",
      `UPDATE buyer_profiles SET budget_min=3000000 WHERE user_id='${profileId}'`,
      "buyer_profiles_budget_ck",
    ],
    [
      "NaN budget",
      `UPDATE buyer_profiles SET budget_min='NaN' WHERE user_id='${profileId}'`,
      "buyer_profiles_budget_ck",
    ],
    ...[
      "description",
      "business_category",
      "asset_type",
      "jurisdiction",
      "business_status",
      "asking_price",
    ].map((column): [string, string, string] => [
      `published asset missing ${column}`,
      `UPDATE assets SET ${column}=NULL WHERE id='${assetId}'`,
      "assets_published_ck",
    ]),
    [
      "incomplete buyer publication",
      `UPDATE buyer_profiles SET thesis=NULL WHERE user_id='${profileId}'`,
      "buyer_profiles_published_ck",
    ],
    [
      "published buyer without categories",
      `UPDATE buyer_profiles SET target_categories='{}' WHERE user_id='${profileId}'`,
      "buyer_profiles_published_ck",
    ],
    [
      "whitespace name",
      `UPDATE users SET name=E' \\t\\n ' WHERE id='${userId}'`,
      "users_name_ck",
    ],
    [
      "whitespace company",
      `UPDATE users SET company_name=E' \\t\\n ' WHERE id='${userId}'`,
      "users_company_ck",
    ],
    [
      "whitespace email",
      `UPDATE users SET email=E' \\t\\n ' WHERE id='${userId}'`,
      "users_email_normalized_ck",
    ],
    [
      "whitespace title",
      `UPDATE assets SET title=E' \\t\\n ' WHERE id='${assetId}'`,
      "assets_title_ck",
    ],
    [
      "whitespace description",
      `UPDATE assets SET description=E' \\t\\n ' WHERE id='${assetId}'`,
      "assets_published_ck",
    ],
    [
      "whitespace thesis",
      `UPDATE buyer_profiles SET thesis=E' \\t\\n ' WHERE user_id='${profileId}'`,
      "buyer_profiles_published_ck",
    ],
    [
      "whitespace body",
      `UPDATE inquiries SET body=E' \\t\\n ' WHERE id='${inquiryId}'`,
      "inquiries_body_ck",
    ],
    [
      "whitespace moderation reason",
      `UPDATE moderation_events SET reason=E' \\t\\n ' WHERE id='${eventId}'`,
      "moderation_reason_ck",
    ],
    [
      "NULL category element",
      `UPDATE buyer_profiles SET target_categories=ARRAY['PAYMENTS'::"BusinessCategory",NULL] WHERE user_id='${profileId}'`,
      "buyer_profiles_categories_ck",
    ],
    [
      "NULL jurisdiction element",
      `UPDATE buyer_profiles SET target_jurisdictions=ARRAY['PL',NULL] WHERE user_id='${profileId}'`,
      "buyer_profiles_jurisdictions_ck",
    ],
    [
      "multidimensional categories",
      `UPDATE buyer_profiles SET target_categories=ARRAY[['PAYMENTS'::"BusinessCategory"]] WHERE user_id='${profileId}'`,
      "buyer_profiles_categories_ck",
    ],
    [
      "multidimensional jurisdictions",
      `UPDATE buyer_profiles SET target_jurisdictions=ARRAY[['PL']] WHERE user_id='${profileId}'`,
      "buyer_profiles_jurisdictions_ck",
    ],
    [
      "self inquiry",
      `UPDATE inquiries SET recipient_id=sender_id WHERE id='${inquiryId}'`,
      "inquiries_distinct_users_ck",
    ],
    [
      "read before creation",
      `UPDATE inquiries SET read_at=created_at-INTERVAL '1 second' WHERE id='${inquiryId}'`,
      "inquiries_read_at_ck",
    ],
    [
      "self moderation",
      `UPDATE moderation_events SET manager_id=target_user_id WHERE id='${eventId}'`,
      "moderation_distinct_users_ck",
    ],
    [
      "invalid moderation transition",
      `UPDATE moderation_events SET to_status=from_status WHERE id='${eventId}'`,
      "moderation_transition_ck",
    ],
  ];
  for (const [label, query, constraint] of checks)
    await rejected(label, query, "23514", constraint);
  for (const column of ["target_categories", "target_jurisdictions"]) {
    await rejected(
      `NULL ${column}`,
      `UPDATE buyer_profiles SET ${column}=NULL WHERE user_id='${profileId}'`,
      "23502",
    );
  }
  const secondInquiry = fixtures.inquiries[1];
  await rejected(
    "duplicate submission key",
    `UPDATE inquiries SET sender_id='${fixtures.inquiries[0].senderId}', idempotency_key='${fixtures.inquiries[0].idempotencyKey}' WHERE id='${secondInquiry.id}'`,
    "23505",
    "inquiries_sender_request_key",
  );
  await rejected(
    "duplicate email",
    `UPDATE users SET email='${fixtures.users[0].email}' WHERE id='${fixtures.users[1].id}'`,
    "23505",
    "users_email_key",
  );
  for (const [table, column, key, id] of [
    ["buyer_profiles", "user_id", "user_id", profileId],
    ["assets", "seller_id", "id", assetId],
    ["inquiries", "sender_id", "id", inquiryId],
    ["inquiries", "recipient_id", "id", inquiryId],
    ["inquiries", "asset_id", "id", inquiryId],
    ["moderation_events", "manager_id", "id", eventId],
    ["moderation_events", "target_user_id", "id", eventId],
  ]) {
    await rejected(
      `FK ${table}.${column}`,
      `UPDATE ${table} SET ${column}='${randomUUID()}' WHERE ${key}='${id}'`,
      "23503",
      `${table}_${column}_fkey`,
    );
  }
  await rejected(
    "referenced user deletion",
    `DELETE FROM users WHERE id='${userId}'`,
    "23001",
  );

  await sql.query("BEGIN");
  try {
    await sql.query(
      `UPDATE inquiries SET body=E'First line\\nSecond line' WHERE id='${inquiryId}'`,
    );
    await sql.query(`UPDATE users SET name='Алексей' WHERE id='${userId}'`);
  } finally {
    await sql.query("ROLLBACK");
  }
  console.log("PASS multiline text and Unicode names accepted");

  const inventory = await sql.query(`SELECT
    (SELECT count(*)::int FROM pg_tables WHERE schemaname='public' AND tablename <> '_prisma_migrations') AS tables,
    (SELECT count(*)::int FROM pg_indexes WHERE schemaname='public' AND tablename <> '_prisma_migrations') AS indexes,
    (SELECT count(*)::int FROM pg_constraint WHERE contype='f' AND connamespace='public'::regnamespace) AS foreign_keys,
    (SELECT count(*)::int FROM pg_constraint WHERE contype='c' AND connamespace='public'::regnamespace) AS checks`);
  assert.deepEqual(inventory.rows[0], {
    tables: 5,
    indexes: 13,
    foreign_keys: 7,
    checks: 19,
  });
  assert.deepEqual(await counts(), expectedCounts);
  console.log("PASS five-table schema inventory and unchanged fixture counts");
  console.log(
    "Database verification complete; negative SQL changes rolled back in n5deal_test.",
  );
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await sql.end();
  await db.$disconnect();
}
