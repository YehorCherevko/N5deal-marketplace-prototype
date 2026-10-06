import assert from "node:assert/strict";
import { test } from "node:test";
import { decodeJwt, SignJWT, type JWTPayload } from "jose";
import {
  AccessError,
  assertMarketplaceAccess,
} from "../src/features/auth/access";
import {
  signSessionToken,
  verifySessionToken,
} from "../src/server/auth/session-token";

const userId = "08e69f15-fc09-5f2a-94e0-26a88797e57d";
process.env.SESSION_SECRET = "test-only-key-".repeat(6);

test("a session verifies and contains only identity and expiration", async () => {
  const expires = new Date(Date.now() + 60_000);
  const token = await signSessionToken(userId, expires);
  assert.equal(await verifySessionToken(token), userId);
  assert.deepEqual(decodeJwt(token), {
    sub: userId,
    exp: Math.floor(expires.getTime() / 1000),
  });
});

test("missing, malformed, tampered, and expired cookies are unauthenticated", async () => {
  assert.equal(await verifySessionToken(undefined), null);
  assert.equal(await verifySessionToken("broken.cookie"), null);
  const token = await signSessionToken(userId, new Date(Date.now() + 60_000));
  const [header, payload, signature] = token.split(".");
  const changed = `${signature[0] === "A" ? "B" : "A"}${signature.slice(1)}`;
  assert.equal(
    await verifySessionToken(`${header}.${payload}.${changed}`),
    null,
  );
  assert.equal(
    await verifySessionToken(
      await signSessionToken(userId, new Date(Date.now() - 1_000)),
    ),
    null,
  );
});

test("wrong keys, unexpected algorithms, missing claims, and invalid identities are rejected", async () => {
  const wrongKey = new TextEncoder().encode("wrong-test-key-".repeat(6));
  const rightKey = new TextEncoder().encode(process.env.SESSION_SECRET);
  const sign = (claims: JWTPayload, alg: string, key: Uint8Array) =>
    new SignJWT(claims).setProtectedHeader({ alg }).sign(key);
  const exp = Math.floor(Date.now() / 1000) + 60;
  for (const token of [
    await sign({ sub: userId, exp }, "HS256", wrongKey),
    await sign({ sub: userId, exp }, "HS384", rightKey),
    await sign({ sub: userId }, "HS256", rightKey),
    await sign({ exp }, "HS256", rightKey),
    await sign({ sub: "not-a-user-id", exp }, "HS256", rightKey),
  ])
    assert.equal(await verifySessionToken(token), null);
});

test("marketplace access requires a session, current ACTIVE status, and the allowed role", () => {
  const expectDenied = (run: () => void, code: AccessError["code"]) =>
    assert.throws(
      run,
      (error) => error instanceof AccessError && error.code === code,
    );
  expectDenied(() => assertMarketplaceAccess(null), "UNAUTHENTICATED");
  for (const role of ["BUYER", "SELLER", "MANAGER"] as const) {
    assert.doesNotThrow(() =>
      assertMarketplaceAccess({ role, status: "ACTIVE" }),
    );
    assert.doesNotThrow(() =>
      assertMarketplaceAccess({ role, status: "ACTIVE" }, [role]),
    );
    for (const status of ["SUSPENDED", "REMOVED"] as const) {
      expectDenied(
        () => assertMarketplaceAccess({ role, status }),
        "ACCOUNT_UNAVAILABLE",
      );
    }
  }
  expectDenied(
    () =>
      assertMarketplaceAccess({ role: "BUYER", status: "ACTIVE" }, ["MANAGER"]),
    "FORBIDDEN",
  );
  expectDenied(
    () =>
      assertMarketplaceAccess({ role: "SELLER", status: "ACTIVE" }, ["BUYER"]),
    "FORBIDDEN",
  );
  expectDenied(
    () =>
      assertMarketplaceAccess({ role: "MANAGER", status: "ACTIVE" }, [
        "BUYER",
        "SELLER",
      ]),
    "FORBIDDEN",
  );
});
