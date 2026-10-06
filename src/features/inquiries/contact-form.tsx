"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Field } from "@/components/form-field";
import { SubmitButton } from "@/components/submit-button";
import { sendInquiry, type SendInquiryState } from "@/server/inquiries/actions";
import { emptyFormState } from "../marketplace/form-state";
import type { InquiryTarget } from "./validation";

export function ContactForm({
  target,
  attemptKey,
  assets = [],
}: {
  target: InquiryTarget;
  attemptKey: string;
  assets?: { id: string; title: string }[];
}) {
  const [key, setKey] = useState(attemptKey);
  const [body, setBody] = useState("");
  const [assetId, setAssetId] = useState("");
  const [state, action, pending] = useActionState<SendInquiryState, FormData>(
    async (previous, form) => {
      try {
        return await sendInquiry(target, previous, form);
      } catch (error) {
        if (!(error instanceof TypeError)) throw error;
        return {
          error: "We couldn’t confirm delivery. Retry with the same message; this attempt will be saved only once.",
          fields: {},
          idempotencyKey: String(form.get("idempotencyKey")),
        };
      }
    },
    emptyFormState,
  );
  const currentState: SendInquiryState = state.idempotencyKey === key ? state : emptyFormState;

  if (currentState.inquiryId) {
    return (
      <section className="contact-panel">
        <p className="success-message" role="status">Inquiry sent.</p>
        <p>Your saved inquiry is available in Sent.</p>
        <div className="form-actions">
          <Link href="/sent" className="button button-primary">Go to Sent</Link>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => {
              setKey(crypto.randomUUID());
              setBody("");
              setAssetId("");
            }}
          >
            Start a new inquiry
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="contact-panel" aria-labelledby="contact-heading">
      <h2 id="contact-heading">Contact {target.kind === "asset" ? "seller" : "buyer"}</h2>
      <p className="field-hint">Your message is saved in Sent and the recipient’s Inbox.</p>
      <form action={action} noValidate aria-busy={pending}>
        <input type="hidden" name="idempotencyKey" value={key} />
        {currentState.error && <p className="form-error" role="alert">{currentState.error}</p>}
        <fieldset disabled={pending}>
          {target.kind === "buyer" && (
            <Field
              name="assetId"
              label="Attach your published asset (optional)"
              hint={assets.length ? "Only your published assets can be attached." : "You have no published assets. You can send without one."}
              error={currentState.fields.assetId}
            >
              <select
                id="assetId"
                name="assetId"
                value={assetId}
                aria-invalid={!!currentState.fields.assetId}
                aria-describedby={currentState.fields.assetId ? "assetId-error" : undefined}
                onChange={(event) => setAssetId(event.target.value)}
              >
                <option value="">No asset attached</option>
                {assets.map((asset) => (
                  <option key={asset.id} value={asset.id}>{asset.title}</option>
                ))}
              </select>
            </Field>
          )}
          <Field
            name="body"
            label="Message *"
            hint="Plain text, 1–2,000 characters."
            error={currentState.fields.body}
          >
            <textarea
              id="body"
              name="body"
              rows={5}
              maxLength={2000}
              required
              value={body}
              aria-invalid={!!currentState.fields.body}
              aria-describedby={currentState.fields.body ? "body-error" : undefined}
              onChange={(event) => setBody(event.target.value)}
            />
          </Field>
          <SubmitButton pendingLabel="Sending…">Contact {target.kind === "asset" ? "seller" : "buyer"}</SubmitButton>
        </fieldset>
        {currentState.idempotencyConflict && (
          <div>
            <p className="field-hint">
              Your previous attempt was already saved. Starting a new inquiry keeps
              your edits and creates a separate message only when you submit.
            </p>
            <div className="form-actions">
              <Link href="/sent" className="button button-secondary">Go to Sent</Link>
              <button
                type="button"
                className="button button-secondary"
                disabled={pending}
                onClick={() => setKey(crypto.randomUUID())}
              >
                Start a new inquiry
              </button>
            </div>
          </div>
        )}
      </form>
    </section>
  );
}
