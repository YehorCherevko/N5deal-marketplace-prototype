import "server-only";
import { z } from "zod";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth/authorization";
import { validateAsset } from "@/features/assets/validation";
import { RecordUnavailable } from "@/features/marketplace/form-state";

export async function saveSellerAsset(id: string | null, input: unknown, intent: "save" | "publish") {
  const user = await requireUser(["SELLER"]);
  if (id !== null && !z.uuid().safeParse(id).success) throw new RecordUnavailable();
  return db.$transaction(async (tx) => {
    const existing = id ? await tx.asset.findFirst({ where: { id, sellerId: user.id } }) : null;
    if (id && !existing) throw new RecordUnavailable();
    if (intent === "publish" && !existing) throw new RecordUnavailable("Save a draft before publishing it.");
    if (intent === "publish" && existing?.publicationStatus === "PUBLISHED") throw new RecordUnavailable("This asset is already published. Save changes instead.");
    const data = validateAsset(input, intent === "publish" || existing?.publicationStatus === "PUBLISHED");
    if (!existing) return (await tx.asset.create({ data: { ...data, sellerId: user.id } })).id;
    const result = await tx.asset.updateMany({
      where: { id: existing.id, sellerId: user.id, publicationStatus: existing.publicationStatus },
      data: { ...data, ...(intent === "publish" ? { publicationStatus: "PUBLISHED", publishedAt: new Date() } : {}) },
    });
    if (!result.count) throw new RecordUnavailable("The asset’s status changed. Refresh before saving.");
    return existing.id;
  });
}

export async function archiveSellerAsset(id: string) {
  const user = await requireUser(["SELLER"]);
  if (!z.uuid().safeParse(id).success) throw new RecordUnavailable();
  const result = await db.asset.updateMany({ where: { id, sellerId: user.id, publicationStatus: "PUBLISHED" }, data: { publicationStatus: "ARCHIVED" } });
  if (!result.count) throw new RecordUnavailable("This asset is unavailable or is no longer published.");
}
