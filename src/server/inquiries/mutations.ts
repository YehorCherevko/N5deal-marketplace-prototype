import "server-only";
import { z } from "zod";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth/authorization";
import { validateInquiry, type InquiryTarget } from "@/features/inquiries/validation";
import { RecordUnavailable } from "@/features/marketplace/form-state";
import { deliverInquiry, markRecipientRead } from "./delivery";

export async function sendCurrentInquiry(target: InquiryTarget, raw: unknown) {
  const sender = await requireUser(["BUYER", "SELLER"]);
  if (!z.uuid().safeParse(target.id).success) throw new RecordUnavailable();
  return deliverInquiry(db, sender, target, validateInquiry(raw));
}

export async function readCurrentInquiry(id: string) {
  const user = await requireUser(["BUYER", "SELLER"]);
  if (!z.uuid().safeParse(id).success) throw new RecordUnavailable();
  await markRecipientRead(db, user.id, id);
}
