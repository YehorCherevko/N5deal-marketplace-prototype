"use client";

import { useActionState, useState } from "react";
import { saveAsset, archiveAsset } from "@/server/assets/actions";
import { SubmitButton } from "@/components/submit-button";
import { Field, SelectOptions } from "@/components/form-field";
import { emptyFormState } from "../marketplace/form-state";
import {
  assetTypes,
  businessStatuses,
  categories,
  countries,
  licenses,
  priceTypes,
} from "../marketplace/options";
import type { AssetValues } from "./validation";

export function AssetForm({
  id,
  initial,
  status,
}: {
  id: string | null;
  initial: AssetValues;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
}) {
  const [values, setValues] = useState(initial);
  const [state, action, pending] = useActionState(
    saveAsset.bind(null, id),
    emptyFormState,
  );
  const attributes = (name: keyof AssetValues) => ({
    id: name,
    name,
    value: values[name],
    "aria-invalid": !!state.fields[name],
    "aria-describedby": state.fields[name] ? `${name}-error` : undefined,
    onChange: (
      event: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) =>
      setValues((previous) => ({
        ...previous,
        [name]: event.target.value,
        ...(name === "priceType" && event.target.value !== "FIXED"
          ? { askingPrice: "" }
          : {}),
      })),
  });

  return (
    <form action={action} className="editor-form" noValidate aria-busy={pending}>
      <p className="editor-note">
        {status === "PUBLISHED"
          ? "Published assets must stay complete. Archive this asset before saving incomplete changes."
          : status === "ARCHIVED"
            ? "This asset is archived and hidden from the catalog. You may save incomplete changes before republishing."
            : "Save an incomplete draft with a title. Fields marked for publication can be completed later."}
      </p>
      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      <fieldset disabled={pending}>
        <Field name="title" label="Asset title *" error={state.fields.title}>
          <input {...attributes("title")} required maxLength={140} />
        </Field>
        <Field
          name="description"
          label="Description"
          hint="At least 30 characters to publish; maximum 5,000."
          error={state.fields.description}
        >
          <textarea {...attributes("description")} rows={6} maxLength={5000} />
        </Field>
        <div className="editor-grid">
          <Field
            name="businessCategory"
            label="Business category"
            error={state.fields.businessCategory}
          >
            <select {...attributes("businessCategory")}>
              <option value="">Select to publish</option>
              <SelectOptions values={categories} />
            </select>
          </Field>
          <Field name="assetType" label="Asset type" error={state.fields.assetType}>
            <select {...attributes("assetType")}>
              <option value="">Select to publish</option>
              <SelectOptions values={assetTypes} />
            </select>
          </Field>
          <Field
            name="jurisdiction"
            label="Jurisdiction"
            error={state.fields.jurisdiction}
          >
            <select {...attributes("jurisdiction")}>
              <option value="">Select to publish</option>
              {countries.map((country) => (
                <option key={country.value} value={country.value}>
                  {country.label}
                </option>
              ))}
            </select>
          </Field>
          <Field
            name="licenseType"
            label="License (optional)"
            error={state.fields.licenseType}
          >
            <select {...attributes("licenseType")}>
              <option value="">None</option>
              <SelectOptions values={licenses} />
            </select>
          </Field>
          <Field
            name="businessStatus"
            label="Business status"
            error={state.fields.businessStatus}
          >
            <select {...attributes("businessStatus")}>
              <option value="">Select to publish</option>
              <SelectOptions values={businessStatuses} />
            </select>
          </Field>
          <Field name="priceType" label="Price mode" error={state.fields.priceType}>
            <select {...attributes("priceType")}>
              <option value="">Select to publish</option>
              <SelectOptions values={priceTypes} />
            </select>
          </Field>
          {values.priceType === "FIXED" && (
            <Field
              name="askingPrice"
              label="Asking price (EUR)"
              hint="A positive amount to publish. Maximum two decimal places."
              error={state.fields.askingPrice}
            >
              <input {...attributes("askingPrice")} inputMode="decimal" />
            </Field>
          )}
        </div>
        <div className="form-actions">
          <SubmitButton name="intent" value="save" pendingLabel="Saving…">
            {status === "DRAFT" ? "Save draft" : "Save changes"}
          </SubmitButton>
          {id && status !== "PUBLISHED" && (
            <SubmitButton
              name="intent"
              value="publish"
              pendingLabel="Saving…"
              className="button button-secondary"
            >
              {status === "ARCHIVED" ? "Republish asset" : "Publish asset"}
            </SubmitButton>
          )}
        </div>
      </fieldset>
    </form>
  );
}

export function ArchiveAssetForm({ id }: { id: string }) {
  const [state, action] = useActionState(
    archiveAsset.bind(null, id),
    emptyFormState,
  );

  return (
    <form action={action} className="lifecycle-form">
      <p>
        Archiving hides the saved asset from the ordinary catalog and retains its
        publication date.
      </p>
      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      <SubmitButton className="button button-quiet" pendingLabel="Archiving…">
        Archive asset
      </SubmitButton>
    </form>
  );
}
