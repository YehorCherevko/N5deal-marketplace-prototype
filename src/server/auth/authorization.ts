import "server-only";
import { db } from "@/server/db";
import { assertMarketplaceAccess, type AccountRole } from "@/features/auth/access";
import { readSessionUserId } from "./session";

export async function getSessionUser() {
  const id = await readSessionUserId();
  if (!id) return null;
  // Read current role/status on every request, including after moderation.
  return db.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, companyName: true, countryCode: true, role: true, status: true },
  });
}

export async function requireUser(allowedRoles?: readonly AccountRole[]) {
  const user = await getSessionUser();
  assertMarketplaceAccess(user, allowedRoles);
  return user!;
}
