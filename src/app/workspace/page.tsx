import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountControls } from "@/components/account-controls";
import { AccessError, roleLabels } from "@/features/auth/access";
import { getWorkspace } from "@/server/workspace";

export const metadata: Metadata = { title: "Your workspace" };

const introductions = {
  BUYER: "A place for your investment profile and your next financial opportunity.",
  SELLER: "A place for the financial assets you own and the buyers you’ll connect with.",
  MANAGER: "A place to oversee the participants in the shared marketplace.",
};

export default async function WorkspacePage() {
  let workspace;
  try { workspace = await getWorkspace(); } catch (error) {
    if (!(error instanceof AccessError)) throw error;
    if (error.code === "UNAUTHENTICATED") redirect("/sign-in");
    if (error.code === "ACCOUNT_UNAVAILABLE") redirect("/account-unavailable");
    throw error;
  }
  const { user, summary } = workspace;

  return <div className="page-container">
    <header className="app-header">
      <Link href="/workspace" className="brand" aria-label="N5Deal home">N5Deal<span>.</span></Link>
      <nav aria-label="Main navigation"><Link href="/workspace" aria-current="page">Workspace</Link></nav>
      <AccountControls />
    </header>
    <main id="main-content" className="workspace-main">
      <div className="workspace-heading">
        <p className="eyebrow">{roleLabels[user.role].toUpperCase()} WORKSPACE</p>
        <h1>Welcome, {user.name}.</h1>
        <p className="lead">{introductions[user.role]}</p>
      </div>
      <div className="workspace-grid">
        <section className="account-card" aria-labelledby="account-heading">
          <div className="card-heading"><h2 id="account-heading">Your selected account</h2><span className={`role-badge role-${user.role.toLowerCase()}`}>{roleLabels[user.role]}</span></div>
          <p className="account-name">{user.name}</p>
          <dl className="account-details">
            <div><dt>Company</dt><dd>{user.companyName ?? "Not provided"}</dd></div>
            <div><dt>Country</dt><dd>{user.countryCode ?? "Not provided"}</dd></div>
            <div><dt>Demo email</dt><dd>{user.email}</dd></div>
          </dl>
          <span className="active-status"><span aria-hidden="true" />Active account</span>
        </section>
        <section className="summary-card" aria-labelledby="summary-heading">
          <h2 id="summary-heading">{summary.label}</h2>
          <p className="summary-value">{summary.value}</p>
          <p>{summary.detail}</p>
        </section>
      </div>
      <aside className="stage-note"><h2>Your demo access is ready</h2><p>You can sign out or switch accounts above. Catalogs, profile editing, asset management, inquiries, and moderation tools will be added in later steps.</p></aside>
      <p className="footer-note">Shared demo · Fictional accounts and data · Demo access is not production authentication</p>
    </main>
  </div>;
}
