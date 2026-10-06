import { z } from "zod";
import { categories, countryCodes } from "../marketplace/options";
import { minorUnits, moneyInput } from "../marketplace/money";
import { FormError, validationError } from "../marketplace/form-state";

export type BuyerValues = {
  name: string;
  companyName: string;
  countryCode: string;
  thesis: string;
  targetCategories: string[];
  targetJurisdictions: string[];
  budgetMin: string;
  budgetMax: string;
};
const category = z
  .string()
  .trim()
  .toUpperCase()
  .pipe(z.enum(Object.keys(categories) as (keyof typeof categories)[]));
const jurisdiction = z.string().trim().toUpperCase().pipe(z.enum(countryCodes));
const schema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Use at least 2 characters.")
    .max(100, "Use at most 100 characters."),
  companyName: z
    .string()
    .trim()
    .refine(
      (value) => !value || value.length >= 2,
      "Use at least 2 characters or leave this field empty.",
    )
    .max(140, "Use at most 140 characters.")
    .transform((value) => value || null),
  countryCode: z
    .string()
    .trim()
    .toUpperCase()
    .pipe(z.enum(["", ...countryCodes]))
    .transform((value) => value || null),
  thesis: z
    .string()
    .trim()
    .max(2000, "Use at most 2,000 characters.")
    .transform((value) => value || null),
  targetCategories: z
    .array(category)
    .transform((values) => [...new Set(values)]),
  targetJurisdictions: z
    .array(jurisdiction)
    .transform((values) => [...new Set(values)]),
  budgetMin: moneyInput,
  budgetMax: moneyInput,
});
export function validateBuyer(input: unknown, publication: boolean) {
  const result = schema.safeParse(input);
  if (!result.success) throw validationError(result.error);
  const errors: Record<string, string[]> = {};
  const data = result.data;
  if (
    data.budgetMin !== null &&
    data.budgetMax !== null &&
    minorUnits(data.budgetMin) > minorUnits(data.budgetMax)
  )
    errors.budgetMax = ["Maximum budget must be at least the minimum budget."];
  if (publication) {
    if (!data.companyName)
      errors.companyName = [
        "Provide your company or investor designation to publish.",
      ];
    if (!data.countryCode)
      errors.countryCode = ["Select your registration country to publish."];
    if (!data.thesis || data.thesis.length < 30)
      errors.thesis = [
        "Publication requires an investment thesis of at least 30 characters.",
      ];
    if (!data.targetCategories.length)
      errors.targetCategories = [
        "Select at least one target category to publish.",
      ];
  }
  if (Object.keys(errors).length) throw new FormError(errors);
  return data;
}
