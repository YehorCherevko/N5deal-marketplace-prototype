import "server-only";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth/authorization";
import { validateBuyer } from "@/features/buyers/validation";
import { RecordUnavailable } from "@/features/marketplace/form-state";

export async function saveOwnProfile(input: unknown, intent: "save" | "publish") {
  const user = await requireUser(["BUYER"]);
  return db.$transaction(async (tx) => {
    const current = await tx.buyerProfile.findUnique({ where: { userId: user.id }, select: { publishedAt: true } });
    if (intent === "publish" && current?.publishedAt) throw new RecordUnavailable("This profile is already published. Save changes instead.");
    const data = validateBuyer(input, intent === "publish" || !!current?.publishedAt);
    const { name, companyName, countryCode, ...profileData } = data;
    if (current) {
      const result = await tx.buyerProfile.updateMany({
        where: { userId: user.id, publishedAt: current.publishedAt },
        data: { ...profileData, ...(intent === "publish" ? { publishedAt: new Date() } : {}) },
      });
      if (!result.count) throw new RecordUnavailable("Profile visibility changed. Refresh before saving.");
    } else await tx.buyerProfile.create({ data: { ...profileData, userId: user.id, publishedAt: intent === "publish" ? new Date() : null } });
    await tx.user.update({ where: { id: user.id }, data: { name, companyName, countryCode } });
  });
}
export async function hideOwnProfile() {
  const user = await requireUser(["BUYER"]);
  const result = await db.buyerProfile.updateMany({ where: { userId: user.id, publishedAt: { not: null } }, data: { publishedAt: null } });
  if (!result.count) throw new RecordUnavailable("This profile is unavailable or already private.");
}
