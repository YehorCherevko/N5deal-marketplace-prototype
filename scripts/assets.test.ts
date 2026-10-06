import assert from "node:assert/strict";
import { test } from "node:test";
import { validateAsset, emptyAsset } from "../src/features/assets/validation";
import { FormError } from "../src/features/marketplace/form-state";
import { minorUnits, formatMoney } from "../src/features/marketplace/money";
import { parseAssetFilters } from "../src/features/assets/filters";
import {
  assetCatalogWhere,
  assetDetailVisibility,
  publicAssets,
} from "../src/server/assets/visibility";

test("incomplete drafts are valid, publication is complete, and monetary precision is retained", () => {
  const draft = { ...emptyAsset, title: "Valid draft" };
  assert.equal(validateAsset(draft, false).description, null);
  assert.throws(() => validateAsset(draft, true), FormError);
  const complete = {
    ...draft,
    description: "A complete fictional description for publication.",
    businessCategory: "FINTECH",
    assetType: "TECHNOLOGY_ASSET",
    jurisdiction: "GB",
    businessStatus: "OPERATING",
    priceType: "FIXED",
    askingPrice: "9999999999999999.99",
  };
  assert.equal(validateAsset(complete, true).askingPrice, complete.askingPrice);
  assert.equal(minorUnits(complete.askingPrice), 999999999999999999n);
  assert.equal(formatMoney(complete.askingPrice), "€9,999,999,999,999,999.99");
  for (const amount of ["-1", "0", "1.001", "NaN", "abc", "10000000000000000"])
    assert.throws(
      () => validateAsset({ ...complete, askingPrice: amount }, true),
      FormError,
    );
  assert.equal(
    validateAsset({ ...complete, priceType: "ON_REQUEST" }, true).askingPrice,
    null,
  );
});
test("catalog and detail visibility share the active published condition", () => {
  assert.deepEqual(
    assetDetailVisibility({ id: "buyer", role: "BUYER" }),
    publicAssets,
  );
  assert.deepEqual(assetDetailVisibility({ id: "seller", role: "SELLER" }), {
    OR: [publicAssets, { sellerId: "seller" }],
  });
  assert.deepEqual(
    assetDetailVisibility({ id: "manager", role: "MANAGER" }),
    {},
  );
  const parsed = parseAssetFilters({
    license: "NONE",
    min: "0",
    max: "100",
    category: "FINTECH",
  });
  const where = assetCatalogWhere(parsed.filters);
  assert.deepEqual(where.AND, [
    publicAssets,
    { businessCategory: "FINTECH" },
    { licenseType: null },
    { priceType: "FIXED", askingPrice: { gte: "0", lte: "100" } },
  ]);
});
test("filters normalize invalid choices and pages, and reject invalid searches", () => {
  const parsed = parseAssetFilters({
    category: "WRONG",
    sort: "unknown",
    page: "-4",
  });
  assert.equal(parsed.page, 1);
  assert.equal(parsed.filters.category, "");
  assert.equal(parsed.filters.sort, "newest");
  for (const params of [
    { min: "-1" },
    { min: "10", max: "9" },
    { max: "abc" },
    { q: "x".repeat(101) },
  ])
    assert.ok(Object.keys(parseAssetFilters(params).errors).length);
});
