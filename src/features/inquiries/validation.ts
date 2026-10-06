import { z } from "zod";
import { validationError } from "../marketplace/form-state";

const schema = z.object({
  body: z.string().trim().min(1, "Enter a message.").max(2000, "Use at most 2,000 characters."),
  idempotencyKey: z.uuid("This submission attempt is invalid. Refresh the page."),
  assetId: z.uuid("Choose an available asset.").or(z.literal("")).transform((value) => value || null),
});

export type InquiryTarget = { kind: "asset" | "buyer"; id: string };
export type InquiryInput = z.output<typeof schema>;

export function validateInquiry(raw: unknown) {
  const result = schema.safeParse(raw);
  if (!result.success) throw validationError(result.error);
  return result.data;
}
