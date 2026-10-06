import { minorUnits, moneyInput } from "./money";

export type SearchParams = Record<string, string | string[] | undefined>;
export function parameter(params: SearchParams, name: string) {
  const value = params[name];
  return typeof value === "string" ? value : value?.[0] ?? "";
}
export function choice<T extends string>(value: string, choices: readonly T[], fallback: T): T {
  return choices.includes(value as T) ? value as T : fallback;
}
export function pageNumber(value: string) {
  return /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value)) ? Number(value) : 1;
}
export function searchErrors(q: string, min: string, max: string) {
  const errors: Record<string, string[]> = {};
  if (q.length > 100) errors.q = ["Search text must be 100 characters or fewer."];
  if (!moneyInput.safeParse(min).success) errors.min = ["Enter a nonnegative EUR amount with at most two decimal places."];
  if (!moneyInput.safeParse(max).success) errors.max = ["Enter a nonnegative EUR amount with at most two decimal places."];
  if (!errors.min && !errors.max && min && max && minorUnits(min) > minorUnits(max)) errors.max = ["The maximum must be at least the minimum."];
  return errors;
}
export function needsNormalization(params: SearchParams, choices: Record<string, string>, page: number) {
  return Object.entries(choices).some(([key, normalized]) => parameter(params, key) !== "" && parameter(params, key) !== normalized)
    || !!parameter(params, "page") && parameter(params, "page") !== String(page);
}
export function catalogUrl(base: string, fields: Record<string, string>, page = 1) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(fields)) if (value) params.set(key, value);
  if (page > 1) params.set("page", String(page));
  return params.size ? `${base}?${params}` : base;
}
export function backToCatalog(value: string, base: string) {
  try {
    const url = new URL(value, "http://local");
    return url.origin === "http://local" && url.pathname === base ? url.pathname + url.search : base;
  } catch { return base; }
}
