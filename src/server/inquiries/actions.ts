"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/features/marketplace/form-state";
import type { InquiryTarget } from "@/features/inquiries/validation";
import { backToCatalog } from "@/features/marketplace/search";
import { formFailure } from "@/server/form-failure";
import { readCurrentInquiry, sendCurrentInquiry } from "./mutations";
import { IdempotencyConflict } from "./delivery";

export type SendInquiryState = FormState & {
  inquiryId?: string;
  idempotencyKey?: string;
  idempotencyConflict?: true;
};

export async function sendInquiry(
  target: InquiryTarget,
  _state: SendInquiryState,
  form: FormData,
): Promise<SendInquiryState> {
  const input = {
    body: form.get("body") ?? "",
    idempotencyKey: form.get("idempotencyKey") ?? "",
    assetId: target.kind === "buyer" ? (form.get("assetId") ?? "") : "",
  };
  let inquiryId;
  try {
    inquiryId = await sendCurrentInquiry(target, input);
  } catch (error) {
    return {
      ...formFailure(error),
      idempotencyKey: String(input.idempotencyKey),
      ...(error instanceof IdempotencyConflict
        ? { idempotencyConflict: true as const }
        : {}),
    };
  }
  revalidatePath("/inbox");
  revalidatePath("/sent");
  return {
    error: null,
    fields: {},
    inquiryId,
    idempotencyKey: String(input.idempotencyKey),
  };
}

export async function markInquiryRead(
  id: string,
  returnTo: string,
): Promise<FormState> {
  try {
    await readCurrentInquiry(id);
  } catch (error) {
    return formFailure(error);
  }
  for (const path of ["/inbox", "/sent", `/inquiries/${id}`])
    revalidatePath(path);
  const back = backToCatalog(returnTo, "/inbox");
  redirect(`/inquiries/${id}?read=1&returnTo=${encodeURIComponent(back)}`);
}
