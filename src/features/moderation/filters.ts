import { categories, countryCodes } from "../marketplace/options";
import {
  choice,
  pageNumber,
  parameter,
  searchErrors,
  type SearchParams,
} from "../marketplace/search";

export type ParticipantFilters = {
  q: string;
  role: string;
  status: string;
  country: string;
  sort: "newest" | "name";
};
export type ManagerAssetFilters = {
  q: string;
  category: string;
  jurisdiction: string;
  status: string;
  seller: string;
  sort: "newest" | "title";
};

export function parseParticipantFilters(params: SearchParams) {
  const filters: ParticipantFilters = {
    q: parameter(params, "q").trim(),
    role: choice(parameter(params, "role"), ["", "BUYER", "SELLER"], ""),
    status: choice(
      parameter(params, "status"),
      ["", "ACTIVE", "SUSPENDED", "REMOVED"],
      "",
    ),
    country: choice(parameter(params, "country"), ["", ...countryCodes], ""),
    sort: choice(parameter(params, "sort"), ["newest", "name"], "newest"),
  };
  return {
    filters,
    errors: searchErrors(filters.q, "", ""),
    page: pageNumber(parameter(params, "page")),
  };
}

export function parseManagerAssetFilters(
  params: SearchParams,
  sellerIds: string[],
) {
  const filters: ManagerAssetFilters = {
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
    status: choice(
      parameter(params, "status"),
      ["", "DRAFT", "PUBLISHED", "ARCHIVED"],
      "",
    ),
    seller: choice(parameter(params, "seller"), ["", ...sellerIds], ""),
    sort: choice(parameter(params, "sort"), ["newest", "title"], "newest"),
  };
  return {
    filters,
    errors: searchErrors(filters.q, "", ""),
    page: pageNumber(parameter(params, "page")),
  };
}
