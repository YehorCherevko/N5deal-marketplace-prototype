import { Field, SelectOptions } from "@/components/form-field";
import { FilterPanel } from "@/components/filter-panel";
import { categories, countries, licenses } from "../marketplace/options";
import { catalogUrl } from "../marketplace/search";
import type { AssetFilters } from "./filters";

export function AssetCatalogFilters({
  filters,
  errors,
}: {
  filters: AssetFilters;
  errors: Record<string, string[]>;
}) {
  const attributes = (name: keyof AssetFilters) => ({
    name,
    id: name,
    defaultValue: filters[name],
    "aria-invalid": !!errors[name],
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
  });

  return (
    <FilterPanel action="/assets" key={catalogUrl("/assets", filters)}>
      <Field name="q" label="Search assets" error={errors.q}>
        <input {...attributes("q")} placeholder="Title or description" />
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
      <Field name="license" label="License">
        <select {...attributes("license")}>
          <option value="">All licenses</option>
          <option value="NONE">None</option>
          <SelectOptions values={licenses} />
        </select>
      </Field>
      <Field name="min" label="Minimum price (EUR)" error={errors.min}>
        <input {...attributes("min")} inputMode="decimal" />
      </Field>
      <Field name="max" label="Maximum price (EUR)" error={errors.max}>
        <input {...attributes("max")} inputMode="decimal" />
      </Field>
      <Field name="sort" label="Sort by">
        <select {...attributes("sort")}>
          <option value="newest">Newest publication</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
        </select>
      </Field>
      <p className="field-hint filter-note">
        Any price bound excludes assets priced on request.
      </p>
    </FilterPanel>
  );
}
