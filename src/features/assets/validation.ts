import { z } from "zod";
import {
  assetTypes,
  businessStatuses,
  categories,
  countryCodes,
  licenses,
  priceTypes,
} from "../marketplace/options";
import { minorUnits, moneyInput } from "../marketplace/money";
import { FormError, validationError } from "../marketplace/form-state";

export type AssetValues = {
  title: string;
  description: string;
  businessCategory: string;
  assetType: string;
  jurisdiction: string;
  licenseType: string;
  businessStatus: string;
  priceType: string;
  askingPrice: string;
};
export const emptyAsset: AssetValues = {
  title: "",
  description: "",
  businessCategory: "",
  assetType: "",
  jurisdiction: "",
  licenseType: "",
  businessStatus: "",
  priceType: "",
  askingPrice: "",
};
const assetSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Use at least 3 characters.")
    .max(140, "Use at most 140 characters."),
  description: z
    .string()
    .trim()
    .max(5000, "Use at most 5,000 characters.")
    .transform((value) => value || null),
  businessCategory: z
    .enum(Object.keys(categories) as (keyof typeof categories)[])
    .or(z.literal(""))
    .transform((value) => value || null),
  assetType: z
    .enum(Object.keys(assetTypes) as (keyof typeof assetTypes)[])
    .or(z.literal(""))
    .transform((value) => value || null),
  jurisdiction: z
    .enum(["", ...countryCodes])
    .transform((value) => value || null),
  licenseType: z
    .enum(Object.keys(licenses) as (keyof typeof licenses)[])
    .or(z.literal(""))
    .transform((value) => value || null),
  businessStatus: z
    .enum(Object.keys(businessStatuses) as (keyof typeof businessStatuses)[])
    .or(z.literal(""))
    .transform((value) => value || null),
  priceType: z
    .enum(Object.keys(priceTypes) as (keyof typeof priceTypes)[])
    .or(z.literal(""))
    .transform((value) => value || null),
  askingPrice: moneyInput,
});

export function validateAsset(raw: unknown, publication: boolean) {
  const values = raw as AssetValues;
  const result = assetSchema.safeParse(
    values?.priceType === "ON_REQUEST" ? { ...values, askingPrice: "" } : raw,
  );
  if (!result.success) throw validationError(result.error);
  const errors: Record<string, string[]> = {};
  if (
    result.data.askingPrice !== null &&
    minorUnits(result.data.askingPrice) <= 0n
  )
    errors.askingPrice = ["The asking price must be greater than zero."];
  if (result.data.askingPrice !== null && result.data.priceType === null)
    errors.priceType = ["Select a price mode before entering an amount."];
  if (publication) {
    if (!result.data.description || result.data.description.length < 30)
      errors.description = [
        "Publication requires a description of at least 30 characters.",
      ];
    for (const key of [
      "businessCategory",
      "assetType",
      "jurisdiction",
      "businessStatus",
      "priceType",
    ] as const) {
      if (!result.data[key])
        errors[key] = ["Select a value to publish this asset."];
    }
    if (result.data.priceType === "FIXED" && result.data.askingPrice === null)
      errors.askingPrice = ["Enter a positive fixed price to publish."];
  }
  if (Object.keys(errors).length) throw new FormError(errors);
  return result.data;
}
