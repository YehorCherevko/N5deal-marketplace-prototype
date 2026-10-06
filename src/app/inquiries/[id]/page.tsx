import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ReadInquiryForm } from "@/features/inquiries/read-form";
import { backToCatalog, parameter, type SearchParams } from "@/features/marketplace/search";
import { getInquiryDetail } from "@/server/inquiries/queries";
import { pageAccess } from "@/server/auth/page-access";

export default async function InquiryPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { id } = await params;
  const { user, inquiry } = await pageAccess(() => getInquiryDetail(id));
  if (!inquiry) notFound();
  const received = inquiry.recipientId === user.id;
  const base = received ? "/inbox" : "/sent";
  const search = await searchParams;
  const back = backToCatalog(parameter(search, "returnTo"), base);

  return (
    <AppShell user={user} current={base}>
      <Link href={back} className="back-link">← Back to {received ? "Inbox" : "Sent"}</Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{received ? "INCOMING INQUIRY" : "SENT INQUIRY"}</p>
          <h1>{received ? "From" : "To"} {inquiry.counterparty.name}</h1>
          <p className="lead">{inquiry.counterparty.companyName ?? "Investor or company designation not provided"}</p>
        </div>
      </div>
      {parameter(search, "read") === "1" && inquiry.readAt && (
        <p className="success-message" role="status">Inquiry marked as read.</p>
      )}
      <section className="detail-panel">
        <p className="long-text">{inquiry.body}</p>
        <dl className="detail-facts">
          <div>
            <dt>Sent</dt>
            <dd>
              <time dateTime={inquiry.createdAt.toISOString()}>
                {inquiry.createdAt.toLocaleString("en-GB", { timeZone: "UTC" })} UTC
              </time>
            </dd>
          </div>
          <div>
            <dt>Read state</dt>
            <dd>
              {inquiry.readAt
                ? `Read ${inquiry.readAt.toLocaleString("en-GB", { timeZone: "UTC" })} UTC`
                : "Unread"}. Read does not mean replied.
            </dd>
          </div>
          <div>
            <dt>Asset</dt>
            <dd>
              {inquiry.asset ? (
                <Link href={`/assets/${inquiry.asset.id}`}>{inquiry.asset.title}</Link>
              ) : inquiry.assetId ? "Asset unavailable" : "No asset attached"}
            </dd>
          </div>
          {inquiry.profileHref && (
            <div>
              <dt>Buyer profile</dt>
              <dd><Link href={inquiry.profileHref}>View published profile</Link></dd>
            </div>
          )}
        </dl>
        {received && !inquiry.readAt && (
          <div className="form-actions"><ReadInquiryForm id={id} returnTo={back} /></div>
        )}
      </section>
    </AppShell>
  );
}
