"use client";

import { useActionState } from "react";
import { signIn } from "@/server/auth/actions";
import type { getDemoAccounts } from "@/server/auth/personas";
import { SubmitButton } from "@/components/submit-button";
import { roleLabels } from "./access";

type DemoAccount = Awaited<ReturnType<typeof getDemoAccounts>>[number];

export function SignInForm({
  accounts,
  currentUserId,
}: {
  accounts: DemoAccount[];
  currentUserId?: string;
}) {
  const [state, action, pending] = useActionState(signIn, { error: null });
  const selectedId =
    currentUserId ??
    accounts.find((account) => account.user?.status === "ACTIVE")?.userId;

  return (
    <form action={action} className="sign-in-form" aria-busy={pending}>
      <fieldset
        disabled={pending}
        aria-describedby={state.error ? "sign-in-error" : undefined}
      >
        <legend>Choose a demo account</legend>
        <div className="persona-grid">
          {accounts.map(({ userId, label, user }) => (
            <label
              key={userId}
              className={`persona-option${!user ? " persona-missing" : ""}`}
            >
              <input
                type="radio"
                name="personaId"
                value={userId}
                required
                disabled={!user}
                defaultChecked={userId === selectedId}
              />
              <span className="persona-content">
                <span className="persona-heading">
                  <span className="persona-name">{user?.name ?? label}</span>
                  {user && (
                    <span
                      className={`role-badge role-${user.role.toLowerCase()}`}
                    >
                      {roleLabels[user.role]}
                    </span>
                  )}
                </span>
                <span className="persona-company">
                  {user
                    ? (user.companyName ?? "Company not provided")
                    : "Demo account unavailable"}
                  {user?.countryCode ? ` · ${user.countryCode}` : ""}
                </span>
                <span className="persona-label">
                  {label}
                  {user && user.status !== "ACTIVE"
                    ? " · Account unavailable"
                    : ""}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      {state.error && (
        <p id="sign-in-error" className="form-error" role="alert">
          {state.error}
        </p>
      )}
      <div className="sign-in-footer">
        <p>No registration or password needed.</p>
        <SubmitButton pendingLabel="Signing in…">
          Continue with selected account <span aria-hidden="true">→</span>
        </SubmitButton>
      </div>
      <span className="sr-only" role="status">
        {pending ? "Signing in. Please wait." : ""}
      </span>
    </form>
  );
}
