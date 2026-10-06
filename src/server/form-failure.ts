import "server-only";
import { redirect } from "next/navigation";
import { AccessError } from "@/features/auth/access";
import { FormError, RecordUnavailable, type FormState } from "@/features/marketplace/form-state";

export function formFailure(error: unknown): FormState {
  if (error instanceof AccessError) {
    if (error.code === "UNAUTHENTICATED") redirect("/sign-in");
    if (error.code === "ACCOUNT_UNAVAILABLE") redirect("/account-unavailable");
    return { error: "This operation isn’t available to this account.", fields: {} };
  }
  if (error instanceof FormError) return { error: error.message, fields: error.fields };
  if (error instanceof RecordUnavailable) return { error: error.message, fields: {} };
  console.error("Form submission failed", error);
  return { error: "We couldn’t save your changes. Your entries are still here; please try again.", fields: {} };
}
