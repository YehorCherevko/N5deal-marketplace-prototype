"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/features/marketplace/form-state";
import { formFailure } from "@/server/form-failure";
import { backToCatalog } from "@/features/marketplace/search";
import { moderateCurrentParticipant } from "./mutations";

export async function moderateParticipant(
  id: string,
  expectedStatus: string,
  returnTo: string,
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const input = {
    expectedStatus,
    action: form.get("action") ?? "",
    reason: form.get("reason") ?? "",
    confirmRemove: form.get("confirmRemove") === "on",
  };
  try {
    await moderateCurrentParticipant(id, input);
  } catch (error) {
    return formFailure(error);
  }
  revalidatePath("/", "layout");
  const back = backToCatalog(returnTo, "/manager/participants");
  redirect(
    `/manager/participants/${id}?saved=moderated&returnTo=${encodeURIComponent(back)}`,
  );
}
