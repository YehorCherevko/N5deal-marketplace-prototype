import { categories, countryCodes } from "../marketplace/options";
import { choice, pageNumber, parameter, searchErrors, type SearchParams } from "../marketplace/search";
export type BuyerFilters = { q: string; category: string; jurisdiction: string; min: string; max: string; sort: "newest" | "name" };
export function parseBuyerFilters(params: SearchParams) {
  const filters: BuyerFilters = {
    q: parameter(params, "q").trim(), category: choice(parameter(params, "category"), ["", ...Object.keys(categories)], ""),
    jurisdiction: choice(parameter(params, "jurisdiction"), ["", ...countryCodes], ""),
    min: parameter(params, "min").trim(), max: parameter(params, "max").trim(), sort: choice(parameter(params, "sort"), ["newest", "name"], "newest"),
  };
  const errors = searchErrors(filters.q, filters.min, filters.max);
  return { filters, errors, page: pageNumber(parameter(params, "page")) };
}
