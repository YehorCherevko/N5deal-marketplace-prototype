import type { Metadata } from "next";
import Link from "next/link";
import { getSessionUser } from "@/server/auth/authorization";
import { getDemoAccounts } from "@/server/auth/personas";
import { SignInForm } from "@/features/auth/sign-in-form";
import { AccountControls } from "@/components/account-controls";

export const metadata: Metadata = { title: "Choose your demo account" };

export default async function SignInPage() {
  const [accounts, currentUser] = await Promise.all([
    getDemoAccounts(),
    getSessionUser(),
  ]);
  return (
    <div className="page-container sign-in-page">
      <header className="public-header">
        <Link href="/" className="brand" aria-label="N5Deal home">
          N5Deal<span>.</span>
        </Link>
        <span className="demo-pill">Shared demo</span>
      </header>
      <main id="main-content">
        <div className="entry-heading">
          <p className="eyebrow">
            A NEW PERSPECTIVE ON FINANCIAL OPPORTUNITIES
          </p>
          <h1>
            {currentUser
              ? "Try a different perspective."
              : "Find your place in the marketplace."}
          </h1>
          <p className="lead">
            Step into a buyer, seller, or manager account to explore the
            prototype.
          </p>
        </div>
        {currentUser && (
          <div className="current-account">
            <p>
              Currently signed in as <strong>{currentUser.name}</strong>.{" "}
              <Link
                href={
                  currentUser.status === "ACTIVE"
                    ? "/workspace"
                    : "/account-unavailable"
                }
              >
                Return to your account
              </Link>
            </p>
            <AccountControls showSwitch={false} />
          </div>
        )}
        <section className="selection-panel" aria-label="Demo sign-in">
          <SignInForm accounts={accounts} currentUserId={currentUser?.id} />
        </section>
        <aside className="demo-note">
          <strong>A shared demo, with fictional data.</strong>
          <p>
            Anyone can choose these accounts, including the manager. Changes are
            shared between visitors. This is demo access, not production
            authentication.
          </p>
        </aside>
      </main>
    </div>
  );
}
