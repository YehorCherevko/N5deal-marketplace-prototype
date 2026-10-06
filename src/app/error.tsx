"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main-content" className="page-container error-page">
      <p className="eyebrow">SOMETHING WENT WRONG</p>
      <h1>We couldn’t load this page.</h1>
      <p className="lead">
        Please try again. Your saved demo data hasn’t been reset.
      </p>
      <div className="account-controls">
        <button className="button button-primary" onClick={reset}>
          Try again
        </button>
        <Link href="/sign-in" className="button button-secondary">
          Choose a demo account
        </Link>
      </div>
    </main>
  );
}
