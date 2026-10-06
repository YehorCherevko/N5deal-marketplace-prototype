import { categories, countryCodes, licenses } from "../marketplace/options";
import {
  choice,
  pageNumber,
  parameter,
  searchErrors,
  type SearchParams,
} from "../marketplace/search";

export type AssetFilters = {
  q: string;
  category: string;
  jurisdiction: string;
  license: string;
  min: string;
  max: string;
  sort: "newest" | "price-asc" | "price-desc";
};
export function parseAssetFilters(params: SearchParams) {
  const filters: AssetFilters = {
    q: parameter(params, "q").trim(),
    category: choice(
      parameter(params, "category"),
      ["", ...Object.keys(categories)],
      "",
    ),
    jurisdiction: choice(
      parameter(params, "jurisdiction"),
      ["", ...countryCodes],
      "",
    ),
    license: choice(
      parameter(params, "license"),
      ["", "NONE", ...Object.keys(licenses)],
      "",
    ),
    min: parameter(params, "min").trim(),
    max: parameter(params, "max").trim(),
    sort: choice(
      parameter(params, "sort"),
      ["newest", "price-asc", "price-desc"],
      "newest",
    ),
  };
  const errors = searchErrors(filters.q, filters.min, filters.max);
  return { filters, errors, page: pageNumber(parameter(params, "page")) };
}
