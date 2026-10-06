import Link from "next/link";
import { signOut } from "@/server/auth/actions";
import { SubmitButton } from "./submit-button";

export function AccountControls({
  showSwitch = true,
}: {
  showSwitch?: boolean;
}) {
  return (
    <div className="account-controls">
      {showSwitch && (
        <Link href="/sign-in" className="button button-secondary">
          Switch account
        </Link>
      )}
      <form action={signOut}>
        <SubmitButton
          className="button button-quiet"
          pendingLabel="Signing out…"
        >
          Sign out
        </SubmitButton>
      </form>
    </div>
  );
}
