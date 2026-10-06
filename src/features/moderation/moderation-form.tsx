"use client";

import { useActionState, useState } from "react";
import { Field } from "@/components/form-field";
import { SubmitButton } from "@/components/submit-button";
import { moderateParticipant } from "@/server/moderation/actions";
import { emptyFormState } from "../marketplace/form-state";

export function ModerationForm({
  id,
  status,
  returnTo,
}: {
  id: string;
  status: "ACTIVE" | "SUSPENDED";
  returnTo: string;
}) {
  const [intent, setIntent] = useState(
    status === "ACTIVE" ? "suspend" : "reactivate",
  );
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [state, action, pending] = useActionState(
    moderateParticipant.bind(null, id, status, returnTo),
    emptyFormState,
  );

  return (
    <form
      action={action}
      className="editor-form moderation-form"
      noValidate
      aria-busy={pending}
    >
      <h2>Change participant access</h2>
      <p className="editor-note">
        Every change requires a reason. Assets, profiles, and inquiry history
        are preserved.
      </p>
      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      <fieldset disabled={pending}>
        <Field name="action" label="Action" error={state.fields.action}>
          <select
            id="action"
            name="action"
            value={intent}
            onChange={(event) => {
              setIntent(event.target.value);
              setConfirmed(false);
            }}
          >
            {status === "ACTIVE" ? (
              <option value="suspend">Suspend</option>
            ) : (
              <option value="reactivate">Reactivate</option>
            )}
            <option value="remove">Remove</option>
          </select>
        </Field>
        <Field
          name="reason"
          label="Reason *"
          hint="1–500 characters. Visible only to Managers and the affected participant."
          error={state.fields.reason}
        >
          <textarea
            id="reason"
            name="reason"
            rows={4}
            maxLength={500}
            value={reason}
            required
            aria-invalid={!!state.fields.reason}
            aria-describedby={state.fields.reason ? "reason-error" : undefined}
            onChange={(event) => setReason(event.target.value)}
          />
        </Field>
        {intent === "remove" && (
          <div className="remove-confirmation">
            <p>
              Removal permanently blocks this participant’s marketplace access
              in this prototype. Related profiles, assets, and inquiries remain
              stored. Removed participants cannot be restored here.
            </p>
            <label>
              <input
                type="checkbox"
                name="confirmRemove"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
                aria-invalid={!!state.fields.confirmRemove}
                aria-describedby={
                  state.fields.confirmRemove ? "confirmRemove-error" : undefined
                }
              />
              I confirm removal while preserving related records.
            </label>
            {state.fields.confirmRemove && (
              <p id="confirmRemove-error" className="field-error">
                {state.fields.confirmRemove.join(" ")}
              </p>
            )}
          </div>
        )}
        <div className="form-actions">
          <SubmitButton
            pendingLabel="Saving status…"
            className={`button ${intent === "remove" ? "button-danger" : "button-primary"}`}
          >
            {intent === "remove"
              ? "Remove participant"
              : intent === "suspend"
                ? "Suspend participant"
                : "Reactivate participant"}
          </SubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
