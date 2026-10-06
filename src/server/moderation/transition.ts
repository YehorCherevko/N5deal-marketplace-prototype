import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import { transitionStatus, type ModerationInput } from "@/features/moderation/validation";
import { FormError, RecordUnavailable } from "@/features/marketplace/form-state";

export async function transitionParticipant(
  database: Pick<PrismaClient, "$transaction">,
  managerId: string,
  targetId: string,
  input: ModerationInput,
) {
  await database.$transaction(async (tx) => {
    const target = await tx.user.findUnique({ where: { id: targetId }, select: { role: true, status: true } });
    if (!target || target.role === "MANAGER" || targetId === managerId) throw new RecordUnavailable();
    if (target.status !== input.expectedStatus) {
      throw new FormError({}, "The participant’s status changed. Refresh before trying again.");
    }
    const toStatus = transitionStatus(target.status, input.action);
    const result = await tx.user.updateMany({
      where: { id: targetId, status: target.status, role: { in: ["BUYER", "SELLER"] } },
      data: { status: toStatus },
    });
    if (!result.count) throw new FormError({}, "The participant’s status changed. Refresh before trying again.");
    await tx.moderationEvent.create({
      data: { managerId, targetUserId: targetId, fromStatus: target.status, toStatus, reason: input.reason },
    });
  });
}
