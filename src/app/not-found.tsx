import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main-content" className="page-container unavailable-main">
      <section className="unavailable-card">
        <p className="eyebrow">RECORD UNAVAILABLE</p>
        <h1>This page isn’t available.</h1>
        <p className="lead">
          The record may be missing or unavailable to this account.
        </p>
        <Link href="/workspace" className="button button-primary">
          Return to workspace
        </Link>
      </section>
    </main>
  );
}
