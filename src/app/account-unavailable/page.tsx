import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountControls } from "@/components/account-controls";
import { roleLabels } from "@/features/auth/access";
import { db } from "@/server/db";
import { getSessionUser } from "@/server/auth/authorization";

export const metadata: Metadata = { title: "Account unavailable" };

export default async function AccountUnavailablePage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  if (user.status === "ACTIVE") redirect("/workspace");
  // The authenticated participant may see their own reason, never another account's history.
  const event = await db.moderationEvent.findFirst({
    where: { targetUserId: user.id, toStatus: user.status },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { reason: true },
  });

  return <div className="page-container">
    <header className="public-header"><Link href="/" className="brand" aria-label="N5Deal home">N5Deal<span>.</span></Link><span className="demo-pill">Shared demo</span></header>
    <main id="main-content" className="unavailable-main">
      <section className="unavailable-card">
        <p className="eyebrow">ACCOUNT UNAVAILABLE</p>
        <h1>{user.status === "SUSPENDED" ? "This account is suspended." : "This account has been removed."}</h1>
        <p className="selected-account"><strong>{user.name}</strong> · {roleLabels[user.role]}</p>
        <p className="lead">This account can’t access the marketplace. You can still choose another demo account or sign out.</p>
        {event && <div className="moderation-reason"><h2>Reason for this account</h2><p>{event.reason}</p></div>}
        <AccountControls />
      </section>
      <p className="footer-note">This is a shared demo with fictional participants. Account availability reflects its current saved state.</p>
    </main>
  </div>;
}
