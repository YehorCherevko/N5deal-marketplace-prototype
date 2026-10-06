import { Field, SelectOptions } from "@/components/form-field";
import { FilterPanel } from "@/components/filter-panel";
import { categories, countries } from "../marketplace/options";
import { catalogUrl } from "../marketplace/search";
import type { BuyerFilters } from "./filters";

export function BuyerCatalogFilters({
  filters,
  errors,
}: {
  filters: BuyerFilters;
  errors: Record<string, string[]>;
}) {
  const attributes = (name: keyof BuyerFilters) => ({
    name,
    id: name,
    defaultValue: filters[name],
    "aria-invalid": !!errors[name],
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
  });

  return (
    <FilterPanel action="/buyers" key={catalogUrl("/buyers", filters)}>
      <Field name="q" label="Search buyers" error={errors.q}>
        <input {...attributes("q")} placeholder="Name, company, or thesis" />
      </Field>
      <Field name="category" label="Target category">
        <select {...attributes("category")}>
          <option value="">All categories</option>
          <SelectOptions values={categories} />
        </select>
      </Field>
      <Field name="jurisdiction" label="Target jurisdiction">
        <select {...attributes("jurisdiction")}>
          <option value="">Any jurisdiction</option>
          {countries.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      <Field name="min" label="Minimum budget (EUR)" error={errors.min}>
        <input {...attributes("min")} inputMode="decimal" />
      </Field>
      <Field name="max" label="Maximum budget (EUR)" error={errors.max}>
        <input {...attributes("max")} inputMode="decimal" />
      </Field>
      <Field name="sort" label="Sort by">
        <select {...attributes("sort")}>
          <option value="newest">Newest publication</option>
          <option value="name">Name: A to Z</option>
        </select>
      </Field>
      <p className="field-hint filter-note">
        Budget ranges must overlap. Any-market profiles also match a selected
        jurisdiction.
      </p>
    </FilterPanel>
  );
}
