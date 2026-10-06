import "server-only";
import { z } from "zod";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth/authorization";
import { validateModeration } from "@/features/moderation/validation";
import { RecordUnavailable } from "@/features/marketplace/form-state";
import { transitionParticipant } from "./transition";

export async function moderateCurrentParticipant(id: string, raw: unknown) {
  const manager = await requireUser(["MANAGER"]);
  if (!z.uuid().safeParse(id).success) throw new RecordUnavailable();
  await transitionParticipant(db, manager.id, id, validateModeration(raw));
}
