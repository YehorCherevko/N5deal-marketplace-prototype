import type { z } from "zod";
export type FormState = { error: string | null; fields: Record<string, string[]> };
export const emptyFormState: FormState = { error: null, fields: {} };
export class FormError extends Error {
  constructor(public readonly fields: Record<string, string[]>, message = "Check the highlighted fields.") { super(message); }
}
export class RecordUnavailable extends Error {
  constructor(message = "This record is unavailable or you don’t have permission to change it.") { super(message); }
}
export function validationError(error: z.ZodError): FormError {
  const fields: Record<string, string[]> = {};
  for (const issue of error.issues) (fields[String(issue.path[0] ?? "form")] ??= []).push(issue.message);
  return new FormError(fields);
}
