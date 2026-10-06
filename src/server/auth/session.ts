import "server-only";
import { cookies } from "next/headers";
import {
  SESSION_SECONDS,
  signSessionToken,
  verifySessionToken,
} from "./session-token";

export const SESSION_COOKIE = "n5deal_session";

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure:
      process.env.SESSION_COOKIE_SECURE === undefined
        ? process.env.NODE_ENV === "production"
        : process.env.SESSION_COOKIE_SECURE === "true",
  };
}

export async function readSessionUserId() {
  return verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
}

export async function createSession(userId: string) {
  const expires = new Date(Date.now() + SESSION_SECONDS * 1000);
  const token = await signSessionToken(userId, expires);
  (await cookies()).set(SESSION_COOKIE, token, {
    ...cookieOptions(),
    expires,
    maxAge: SESSION_SECONDS,
  });
}

export async function clearSession() {
  (await cookies()).set(SESSION_COOKIE, "", {
    ...cookieOptions(),
    expires: new Date(0),
    maxAge: 0,
  });
}
