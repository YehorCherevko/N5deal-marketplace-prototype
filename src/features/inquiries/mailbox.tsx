import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Pagination } from "@/components/pagination";
import { catalogUrl, needsNormalization, type SearchParams } from "../marketplace/search";
import { getInquiryList } from "@/server/inquiries/queries";
import { pageAccess } from "@/server/auth/page-access";

export async function Mailbox({ box, params }: { box: "inbox" | "sent"; params: SearchParams }) {
  const { user, items, total, page, pages } = await pageAccess(() => getInquiryList(box, params));
  const base = `/${box}`;
  if (needsNormalization(params, {}, page)) redirect(catalogUrl(base, {}, page));
  const returnTo = catalogUrl(base, {}, page);

  return (
    <AppShell user={user} current={base}>
      <div className="page-heading">
        <div>
          <p className="eyebrow">CONTACT REQUESTS</p>
          <h1>{box === "inbox" ? "Inbox" : "Sent"}</h1>
          <p className="lead">{box === "inbox" ? "Inquiries sent to your account." : "Contact requests you have sent."} Read means viewed, not replied.</p>
        </div>
      </div>
      <p className="result-count" role="status">{total} {total === 1 ? "inquiry" : "inquiries"}</p>
      {!items.length ? (
        <section className="empty-state">
          <h2>{box === "inbox" ? "No incoming inquiries yet." : "You haven’t sent an inquiry yet."}</h2>
          <p>Contact requests are saved here, including after a listing becomes unavailable.</p>
          <Link href={user.role === "BUYER" ? "/assets" : "/buyers"} className="button button-secondary">
            {user.role === "BUYER" ? "Explore assets" : "Explore buyers"}
          </Link>
        </section>
      ) : (
        <div className="inquiry-list">
          {items.map((inquiry) => (
            <Link
              key={inquiry.id}
              className="asset-card inquiry-card"
              href={`/inquiries/${inquiry.id}?returnTo=${encodeURIComponent(returnTo)}`}
            >
              <div className="card-tags"><span>{inquiry.readAt ? "Read" : "Unread"}</span></div>
              <h2>{box === "inbox" ? "From" : "To"} {inquiry.counterparty.name}</h2>
              <p className="buyer-company">{inquiry.counterparty.companyName ?? "Investor or company designation not provided"}</p>
              <p className="long-text">{inquiry.body}</p>
              <p className="field-hint">
                {inquiry.asset?.title ?? (inquiry.assetId ? "Asset unavailable" : "No asset attached")}
              </p>
              <time dateTime={inquiry.createdAt.toISOString()} className="field-hint">
                {inquiry.createdAt.toLocaleString("en-GB", { timeZone: "UTC" })} UTC
              </time>
              <span className="card-link">View inquiry →</span>
            </Link>
          ))}
        </div>
      )}
      <Pagination base={base} filters={{}} page={page} pages={pages} />
    </AppShell>
  );
}
