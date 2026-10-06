"use client";

import { useActionState, useState } from "react";
import { saveProfile, hideProfile } from "@/server/buyers/actions";
import { Field } from "@/components/form-field";
import { SubmitButton } from "@/components/submit-button";
import { emptyFormState } from "../marketplace/form-state";
import { categories, countries } from "../marketplace/options";
import type { BuyerValues } from "./validation";

export function ProfileForm({
  initial,
  published,
}: {
  initial: BuyerValues;
  published: boolean;
}) {
  const [values, setValues] = useState(initial);
  const [state, action, pending] = useActionState(saveProfile, emptyFormState);
  const attributes = (
    name: "name" | "companyName" | "countryCode" | "thesis" | "budgetMin" | "budgetMax",
  ) => ({
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
      })),
  });

  return (
    <form action={action} className="editor-form" noValidate aria-busy={pending}>
      <p className="editor-note">
        {published
          ? "Your profile is published. Keep it complete, or hide it before saving incomplete changes."
          : "Save a private draft at any time. Publication requires your name, investor designation, registration country, thesis, and a target category."}
      </p>
      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      <fieldset disabled={pending}>
        <div className="editor-grid">
          <Field name="name" label="Name *" error={state.fields.name}>
            <input {...attributes("name")} required maxLength={100} />
          </Field>
          <Field
            name="companyName"
            label="Company or investor designation"
            hint="For a private investor, describe your investor designation."
            error={state.fields.companyName}
          >
            <input {...attributes("companyName")} maxLength={140} />
          </Field>
          <Field
            name="countryCode"
            label="Registration country"
            error={state.fields.countryCode}
          >
            <select {...attributes("countryCode")}>
              <option value="">Select to publish</option>
              {countries.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field
          name="thesis"
          label="Investment thesis"
          hint="At least 30 characters to publish; maximum 2,000."
          error={state.fields.thesis}
        >
          <textarea {...attributes("thesis")} rows={6} maxLength={2000} />
        </Field>
        <fieldset
          id="targetCategories"
          className="interest-group"
          aria-describedby={
            state.fields.targetCategories ? "targetCategories-error" : undefined
          }
        >
          <legend>Target categories</legend>
          <div className="checkbox-options">
            {Object.entries(categories).map(([value, label]) => (
              <label key={value}>
                <input
                  type="checkbox"
                  name="targetCategories"
                  value={value}
                  checked={values.targetCategories.includes(value)}
                  onChange={(event) =>
                    setValues((previous) => ({
                      ...previous,
                      targetCategories: event.target.checked
                        ? [...previous.targetCategories, value]
                        : previous.targetCategories.filter(
                            (entry) => entry !== value,
                          ),
                    }))
                  }
                />
                {label}
              </label>
            ))}
          </div>
          {state.fields.targetCategories && (
            <p id="targetCategories-error" className="field-error">
              {state.fields.targetCategories.join(" ")}
            </p>
          )}
        </fieldset>
        <Field
          name="targetJurisdictions"
          label="Target jurisdictions"
          hint="No selection means Any market. These are your investment markets, separate from your registration country. Use Ctrl/⌘ or Shift to select multiple markets."
          error={state.fields.targetJurisdictions}
        >
          <select
            id="targetJurisdictions"
            name="targetJurisdictions"
            multiple
            size={6}
            value={values.targetJurisdictions}
            aria-invalid={!!state.fields.targetJurisdictions}
            onChange={(event) =>
              setValues((previous) => ({
                ...previous,
                targetJurisdictions: Array.from(
                  event.target.selectedOptions,
                  (option) => option.value,
                ),
              }))
            }
          >
            {countries.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <div className="editor-grid">
          <Field
            name="budgetMin"
            label="Minimum budget (EUR)"
            hint="Optional. Empty means no lower restriction."
            error={state.fields.budgetMin}
          >
            <input {...attributes("budgetMin")} inputMode="decimal" />
          </Field>
          <Field
            name="budgetMax"
            label="Maximum budget (EUR)"
            hint="Optional. Empty means no upper restriction."
            error={state.fields.budgetMax}
          >
            <input {...attributes("budgetMax")} inputMode="decimal" />
          </Field>
        </div>
        <div className="form-actions">
          <SubmitButton name="intent" value="save" pendingLabel="Saving…">
            {published ? "Save changes" : "Save draft"}
          </SubmitButton>
          {!published && (
            <SubmitButton
              name="intent"
              value="publish"
              pendingLabel="Saving…"
              className="button button-secondary"
            >
              Publish profile
            </SubmitButton>
          )}
        </div>
      </fieldset>
    </form>
  );
}

export function HideProfileForm() {
  const [state, action] = useActionState(hideProfile, emptyFormState);

  return (
    <form action={action} className="lifecycle-form">
      <p>
        Hide your saved profile from the buyer catalog. Your profile and account
        details are kept.
      </p>
      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      <SubmitButton className="button button-quiet" pendingLabel="Hiding…">
        Hide profile
      </SubmitButton>
    </form>
  );
}
