import assert from "node:assert/strict";
import { test } from "node:test";
import { validateBuyer } from "../src/features/buyers/validation";
import { FormError } from "../src/features/marketplace/form-state";
import { parseBuyerFilters } from "../src/features/buyers/filters";
import {
  buyerDetailVisibility,
  publicBuyers,
} from "../src/server/buyers/visibility";
import {
  backToCatalog,
  needsNormalization,
} from "../src/features/marketplace/search";

const draft = {
  name: "New buyer",
  companyName: "",
  countryCode: "",
  thesis: "",
  targetCategories: [],
  targetJurisdictions: [],
  budgetMin: "",
  budgetMax: "",
};
test("buyer drafts allow incomplete investment data and nullable unbounded budgets", () => {
  const data = validateBuyer(draft, false);
  assert.equal(data.budgetMin, null);
  assert.equal(data.budgetMax, null);
  assert.deepEqual(data.targetJurisdictions, []);
  assert.throws(() => validateBuyer(draft, true), FormError);
});
test("publication requires complete common fields and normalizes interest arrays", () => {
  const complete = {
    ...draft,
    companyName: "Private investor",
    countryCode: "gb",
    thesis: "We seek fictional financial businesses for a local demonstration.",
    targetCategories: ["fintech", " FINTECH ", "PAYMENTS"],
    targetJurisdictions: ["us", " US "],
  };
  const data = validateBuyer(complete, true);
  assert.deepEqual(data.targetCategories, ["FINTECH", "PAYMENTS"]);
  assert.deepEqual(data.targetJurisdictions, ["US"]);
  assert.equal(data.countryCode, "GB");
  assert.throws(
    () => validateBuyer({ ...complete, companyName: "" }, true),
    FormError,
  );
  assert.throws(
    () => validateBuyer({ ...complete, targetCategories: [] }, true),
    FormError,
  );
});
test("budget bounds reject invalid values and compare precisely without Number", () => {
  assert.equal(
    validateBuyer(
      { ...draft, budgetMin: "0", budgetMax: "9999999999999999.99" },
      false,
    ).budgetMin,
    "0",
  );
  for (const budgets of [
    { budgetMin: "-1" },
    { budgetMax: "1.001" },
    { budgetMin: "NaN" },
    { budgetMin: "9999999999999999.99", budgetMax: "9999999999999999.98" },
  ])
    assert.throws(
      () => validateBuyer({ ...draft, ...budgets }, false),
      FormError,
    );
  assert.ok(
    Object.keys(parseBuyerFilters({ min: "100", max: "99" }).errors).length,
  );
});
test("buyers can view only their own profile; seller visibility stays published and active", () => {
  assert.equal(
    buyerDetailVisibility({ id: "me", role: "BUYER" }, "other"),
    null,
  );
  assert.deepEqual(buyerDetailVisibility({ id: "me", role: "BUYER" }, "me"), {
    userId: "me",
  });
  assert.deepEqual(
    buyerDetailVisibility({ id: "seller", role: "SELLER" }, "other"),
    publicBuyers,
  );
  assert.deepEqual(
    buyerDetailVisibility({ id: "manager", role: "MANAGER" }, "other"),
    {},
  );
  assert.equal(
    backToCatalog("https://outside.example/buyers", "/buyers"),
    "/buyers",
  );
  assert.ok(
    needsNormalization({ page: "-2", sort: "wrong" }, { sort: "newest" }, 1),
  );
});
