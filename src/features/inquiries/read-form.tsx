"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { markInquiryRead } from "@/server/inquiries/actions";
import { emptyFormState } from "../marketplace/form-state";

export function ReadInquiryForm({
  id,
  returnTo,
}: {
  id: string;
  returnTo: string;
}) {
  const [state, action] = useActionState(
    markInquiryRead.bind(null, id, returnTo),
    emptyFormState,
  );
  return (
    <form action={action}>
      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      <SubmitButton pendingLabel="Marking read…">Mark as read</SubmitButton>
    </form>
  );
}
