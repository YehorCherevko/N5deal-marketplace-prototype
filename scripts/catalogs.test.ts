import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { createDatabaseClient, requireLocalDatabase } from "./database";
import { buyerCatalogWhere } from "../src/server/buyers/visibility";
import { assetCatalogWhere } from "../src/server/assets/visibility";
import { parseBuyerFilters } from "../src/features/buyers/filters";
import { parseAssetFilters } from "../src/features/assets/filters";

const url = new URL(process.env.DATABASE_URL ?? "");
url.pathname = "/n5deal_test";
process.env.DATABASE_URL = url.toString();
requireLocalDatabase("test");

test("PostgreSQL catalog predicates preserve unbounded intersection, visibility, and null-last price order", async () => {
  const db = createDatabaseClient();
  const rollback = new Error("Rollback isolated catalog fixtures");
  const prefix = `Catalog verification ${randomUUID()}`;
  try {
    await assert.rejects(db.$transaction(async (tx) => {
      const profiles = [
        { label: "unbounded", min: null, max: null, markets: [] },
        { label: "touching", min: "200.00", max: "300.00", markets: ["US"] },
        { label: "lower boundary", min: null, max: "100.00", markets: ["US"] },
        { label: "below", min: null, max: "99.99", markets: ["US"] },
        { label: "above", min: "200.01", max: null, markets: ["US"] },
        { label: "another market", min: null, max: null, markets: ["LT"] },
      ];
      for (const profile of profiles) {
        const userId = randomUUID();
        await tx.user.create({ data: { id: userId, name: `${prefix} ${profile.label}`, email: `${userId}@example.com`, role: "BUYER", companyName: "Fictional investor", countryCode: "GB" } });
        await tx.buyerProfile.create({ data: { userId, thesis: "Fictional interests for isolated catalog predicate verification.", targetCategories: ["FINTECH"], targetJurisdictions: profile.markets, budgetMin: profile.min, budgetMax: profile.max, publishedAt: new Date() } });
      }
      const matches = await tx.buyerProfile.findMany({ where: buyerCatalogWhere(parseBuyerFilters({ q: prefix, jurisdiction: "US", min: "100", max: "200", category: "FINTECH" }).filters), select: { user: { select: { name: true } } } });
      assert.deepEqual(matches.map((profile) => profile.user.name).sort(), [`${prefix} touching`, `${prefix} lower boundary`, `${prefix} unbounded`].sort());
      const touching = await tx.user.findFirstOrThrow({ where: { name: `${prefix} touching` } });
      await tx.user.update({ where: { id: touching.id }, data: { status: "SUSPENDED" } });
      assert.equal(await tx.buyerProfile.count({ where: buyerCatalogWhere(parseBuyerFilters({ q: prefix, jurisdiction: "US", min: "100", max: "200" }).filters) }), 2);
      const seller = await tx.user.create({ data: { name: "Fictional test seller", email: `${randomUUID()}@example.com`, role: "SELLER" } });
      for (const price of ["2.00", "100.00", null]) await tx.asset.create({ data: { sellerId: seller.id, title: prefix, description: "A complete fictional asset for isolated SQL ordering verification.", businessCategory: "FINTECH", assetType: "TECHNOLOGY_ASSET", jurisdiction: "GB", businessStatus: "OPERATING", priceType: price === null ? "ON_REQUEST" : "FIXED", askingPrice: price, publicationStatus: "PUBLISHED", publishedAt: new Date() } });
      const assetWhere = assetCatalogWhere(parseAssetFilters({ q: prefix }).filters);
      for (const sort of ["asc", "desc"] as const) {
        const assets = await tx.asset.findMany({ where: assetWhere, orderBy: [{ askingPrice: { sort, nulls: "last" } }, { id: "desc" }] });
        assert.deepEqual(assets.map((asset) => asset.askingPrice?.toString() ?? null), sort === "asc" ? ["2", "100", null] : ["100", "2", null]);
      }
      assert.equal(await tx.asset.count({ where: assetCatalogWhere(parseAssetFilters({ q: prefix, min: "0", license: "NONE" }).filters) }), 2);
      await tx.user.update({ where: { id: seller.id }, data: { status: "REMOVED" } });
      assert.equal(await tx.asset.count({ where: assetWhere }), 0);
      throw rollback;
    }, { timeout: 30_000 }), (error) => error === rollback);
  } finally { await db.$disconnect(); }
});
