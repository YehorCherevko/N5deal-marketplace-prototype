import { z } from "zod";

export const moneyInput = z.string().trim().refine(
  (value) => value === "" || /^\d{1,16}(?:\.\d{1,2})?$/.test(value),
  "Enter a nonnegative EUR amount with at most 16 integer digits and two decimal places.",
).transform((value) => value || null);

export function minorUnits(value: string): bigint {
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
}

export function formatMoney(value: string): string {
  const [whole, fraction = ""] = value.split(".");
  return `€${BigInt(whole).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${fraction.padEnd(2, "0")}`;
}

export function formatBudget(minimum: string | null, maximum: string | null) {
  if (minimum === null && maximum === null) return "No budget restrictions";
  if (minimum === null) return `Up to ${formatMoney(maximum!)}`;
  if (maximum === null) return `From ${formatMoney(minimum)}`;
  return `${formatMoney(minimum)} – ${formatMoney(maximum)}`;
}
