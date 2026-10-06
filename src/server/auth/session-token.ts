import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { z } from "zod";

export const SESSION_SECONDS = 8 * 60 * 60;

function signingKey() {
  const key = new TextEncoder().encode(process.env.SESSION_SECRET);
  if (key.byteLength < 32) throw new Error("SESSION_SECRET must contain at least 32 bytes.");
  return key;
}

export async function signSessionToken(userId: string, expiresAt: Date) {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setExpirationTime(expiresAt)
    .sign(signingKey());
}

export async function verifySessionToken(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  const key = signingKey();
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"], requiredClaims: ["sub", "exp"],
    });
    const identity = z.uuid().safeParse(payload.sub);
    return identity.success ? identity.data : null;
  } catch {
    return null;
  }
}
