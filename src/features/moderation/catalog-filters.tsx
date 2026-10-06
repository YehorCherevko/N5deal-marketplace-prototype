import { Field, SelectOptions } from "@/components/form-field";
import { FilterPanel } from "@/components/filter-panel";
import { categories, countries } from "../marketplace/options";
import { catalogUrl } from "../marketplace/search";
import type { ParticipantFilters, ManagerAssetFilters } from "./filters";

export function ParticipantCatalogFilters({
  filters,
  errors,
}: {
  filters: ParticipantFilters;
  errors: Record<string, string[]>;
}) {
  const attributes = (name: keyof ParticipantFilters) => ({
    name,
    id: name,
    defaultValue: filters[name],
  });
  return (
    <FilterPanel
      action="/manager/participants"
      key={catalogUrl("/manager/participants", filters)}
    >
      <Field name="q" label="Search participants" error={errors.q}>
        <input
          {...attributes("q")}
          placeholder="Name, company, or email"
          aria-invalid={!!errors.q}
          aria-describedby={errors.q ? "q-error" : undefined}
        />
      </Field>
      <Field name="role" label="Role">
        <select {...attributes("role")}>
          <option value="">Buyers and Sellers</option>
          <option value="BUYER">Buyer</option>
          <option value="SELLER">Seller</option>
        </select>
      </Field>
      <Field name="status" label="Account status">
        <select {...attributes("status")}>
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="REMOVED">Removed</option>
        </select>
      </Field>
      <Field name="country" label="Registration country">
        <select {...attributes("country")}>
          <option value="">All countries</option>
          {countries.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      <Field name="sort" label="Sort by">
        <select {...attributes("sort")}>
          <option value="newest">Newest registration</option>
          <option value="name">Name: A to Z</option>
        </select>
      </Field>
    </FilterPanel>
  );
}

export function ManagerAssetCatalogFilters({
  filters,
  errors,
  sellers,
}: {
  filters: ManagerAssetFilters;
  errors: Record<string, string[]>;
  sellers: { id: string; name: string; status: string }[];
}) {
  const attributes = (name: keyof ManagerAssetFilters) => ({
    name,
    id: name,
    defaultValue: filters[name],
  });
  return (
    <FilterPanel
      action="/manager/assets"
      key={catalogUrl("/manager/assets", filters)}
    >
      <Field name="q" label="Search all assets" error={errors.q}>
        <input
          {...attributes("q")}
          placeholder="Title or description"
          aria-invalid={!!errors.q}
          aria-describedby={errors.q ? "q-error" : undefined}
        />
      </Field>
      <Field name="category" label="Category">
        <select {...attributes("category")}>
          <option value="">All categories</option>
          <SelectOptions values={categories} />
        </select>
      </Field>
      <Field name="jurisdiction" label="Jurisdiction">
        <select {...attributes("jurisdiction")}>
          <option value="">All jurisdictions</option>
          {countries.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      <Field name="status" label="Publication status">
        <select {...attributes("status")}>
          <option value="">All publication statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </Field>
      <Field name="seller" label="Seller">
        <select {...attributes("seller")}>
          <option value="">All Sellers</option>
          {sellers.map((seller) => (
            <option key={seller.id} value={seller.id}>
              {seller.name} ({seller.status})
            </option>
          ))}
        </select>
      </Field>
      <Field name="sort" label="Sort by">
        <select {...attributes("sort")}>
          <option value="newest">Newest creation</option>
          <option value="title">Title: A to Z</option>
        </select>
      </Field>
    </FilterPanel>
  );
}
