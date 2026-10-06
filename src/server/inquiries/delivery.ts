import "server-only";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { InquiryInput, InquiryTarget } from "@/features/inquiries/validation";
import type { AccountRole } from "@/features/auth/access";
import { FormError, RecordUnavailable } from "@/features/marketplace/form-state";
import { publicAssets } from "@/server/assets/visibility";
import { publicBuyers } from "@/server/buyers/visibility";
import { hasCompleteBuyerProfile } from "./eligibility";

type InquiryDatabase = Pick<PrismaClient, "inquiry" | "asset" | "buyerProfile">;
type Sender = { id: string; role: AccountRole; name: string; companyName: string | null; countryCode: string | null };
type Payload = { recipientId: string; assetId: string | null; body: string };

export class IdempotencyConflict extends FormError {
  constructor() {
    super({}, "This submission key was already used for a different inquiry. Start a new inquiry.");
  }
}

function repeatedResult(existing: Payload & { id: string }, payload: Payload) {
  if (existing.body !== payload.body || existing.recipientId !== payload.recipientId || existing.assetId !== payload.assetId) {
    throw new IdempotencyConflict();
  }
  return existing.id;
}

// Sender comes from fresh authorization; a persisted retry skips new-delivery eligibility.
export async function deliverInquiry(database: InquiryDatabase, sender: Sender, target: InquiryTarget, input: InquiryInput) {
  if ((sender.role !== "BUYER" || target.kind !== "asset") && (sender.role !== "SELLER" || target.kind !== "buyer")) {
    throw new RecordUnavailable("This account cannot send this inquiry.");
  }
  const asset = target.kind === "asset"
    ? await database.asset.findUnique({ where: { id: target.id }, select: { sellerId: true } })
    : null;
  if (target.kind === "asset" && !asset) throw new RecordUnavailable("This asset is no longer available for contact.");
  const payload: Payload = {
    recipientId: target.kind === "asset" ? asset!.sellerId : target.id,
    assetId: target.kind === "asset" ? target.id : input.assetId,
    body: input.body,
  };
  if (sender.id === payload.recipientId) throw new RecordUnavailable("You cannot contact your own account.");
  const key = { senderId_idempotencyKey: { senderId: sender.id, idempotencyKey: input.idempotencyKey } };
  const existing = await database.inquiry.findUnique({ where: key });
  if (existing) return repeatedResult(existing, payload);

  if (sender.role === "BUYER") {
    const profile = await database.buyerProfile.findUnique({ where: { userId: sender.id } });
    if (!hasCompleteBuyerProfile(sender, profile)) {
      throw new RecordUnavailable("Complete your investment profile before contacting a seller. It may remain private.");
    }
    if (!await database.asset.count({ where: { AND: [{ id: target.id }, publicAssets] } })) {
      throw new RecordUnavailable("This asset or its seller is no longer available for contact.");
    }
  } else {
    if (!await database.buyerProfile.count({ where: { AND: [{ userId: target.id }, publicBuyers] } })) {
      throw new RecordUnavailable("This buyer is no longer available for contact. Their profile may have been hidden.");
    }
    if (input.assetId && !await database.asset.count({ where: { AND: [{ id: input.assetId, sellerId: sender.id }, publicAssets] } })) {
      throw new FormError({ assetId: ["Attach only your own currently published asset, or send without an asset."] });
    }
  }

  try {
    return (await database.inquiry.create({ data: { ...payload, senderId: sender.id, idempotencyKey: input.idempotencyKey } })).id;
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
    // create has rolled back before this lookup; no queries run in an aborted transaction.
    const winner = await database.inquiry.findUnique({ where: key });
    if (!winner) throw error;
    return repeatedResult(winner, payload);
  }
}

export async function markRecipientRead(database: Pick<PrismaClient, "inquiry">, recipientId: string, id: string) {
  const inquiry = await database.inquiry.findFirst({ where: { id, recipientId }, select: { createdAt: true } });
  if (!inquiry) throw new RecordUnavailable();
  await database.inquiry.updateMany({
    where: { id, recipientId, readAt: null },
    data: { readAt: new Date(Math.max(Date.now(), inquiry.createdAt.getTime())) },
  });
}
