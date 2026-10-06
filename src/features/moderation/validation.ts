import { z } from "zod";
import { FormError, validationError } from "../marketplace/form-state";

const schema = z.object({
  action: z.enum(["suspend", "reactivate", "remove"]),
  expectedStatus: z.enum(["ACTIVE", "SUSPENDED"]),
  reason: z
    .string()
    .trim()
    .min(1, "Provide a reason.")
    .max(500, "Use at most 500 characters."),
  confirmRemove: z.boolean(),
});

export type ModerationInput = z.output<typeof schema>;

export function validateModeration(raw: unknown) {
  const result = schema.safeParse(raw);
  if (!result.success) throw validationError(result.error);
  if (result.data.action === "remove" && !result.data.confirmRemove) {
    throw new FormError({
      confirmRemove: [
        "Confirm the removal and preservation of related records.",
      ],
    });
  }
  return result.data;
}

export function transitionStatus(
  current: "ACTIVE" | "SUSPENDED" | "REMOVED",
  action: ModerationInput["action"],
) {
  if (current === "ACTIVE" && action === "suspend") return "SUSPENDED";
  if (current === "SUSPENDED" && action === "reactivate") return "ACTIVE";
  if (current !== "REMOVED" && action === "remove") return "REMOVED";
  throw new FormError(
    {},
    "This transition is no longer available. Refresh the participant before trying again.",
  );
}
