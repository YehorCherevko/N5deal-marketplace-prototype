import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ModerationForm } from "@/features/moderation/moderation-form";
import { categories, countryName } from "@/features/marketplace/options";
import { formatBudget } from "@/features/marketplace/money";
import {
  backToCatalog,
  parameter,
  type SearchParams,
} from "@/features/marketplace/search";
import { roleLabels } from "@/features/auth/access";
import { getManagerParticipant } from "@/server/moderation/queries";
import { pageAccess } from "@/server/auth/page-access";

export default async function ParticipantPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { id } = await params;
  const { user, participant } = await pageAccess(() =>
    getManagerParticipant(id),
  );
  if (!participant) notFound();
  const search = await searchParams;
  const back = backToCatalog(
    parameter(search, "returnTo"),
    "/manager/participants",
  );
  const profile = participant.buyerProfile;

  return (
    <AppShell user={user} current="/manager/participants">
      <Link href={back} className="back-link">
        ← Back to participants
      </Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            {roleLabels[participant.role].toUpperCase()} · {participant.status}
          </p>
          <h1>{participant.name}</h1>
          <p className="lead">
            {participant.companyName ??
              "Company or investor designation not provided"}
          </p>
        </div>
      </div>
      {parameter(search, "saved") === "moderated" && (
        <p className="success-message" role="status">
          Participant status updated. Related records are preserved.
        </p>
      )}
      <section className="detail-panel">
        <h2>Account details</h2>
        <dl className="detail-facts">
          <div>
            <dt>Email</dt>
            <dd>{participant.email}</dd>
          </div>
          <div>
            <dt>Country</dt>
            <dd>{countryName(participant.countryCode)}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{participant.status}</dd>
          </div>
          <div>
            <dt>Registered</dt>
            <dd>
              {participant.createdAt.toLocaleDateString("en-GB", {
                timeZone: "UTC",
              })}
            </dd>
          </div>
        </dl>
      </section>
      <section className="detail-panel participant-records">
        <h2>
          {participant.role === "BUYER" ? "Buyer profile" : "Owned assets"}
        </h2>
        {participant.role === "BUYER" ? (
          profile ? (
            <>
              <p className="status-badge">
                {profile.publishedAt ? "PUBLISHED" : "PRIVATE DRAFT"}
              </p>
              <p className="long-text">
                {profile.thesis ?? "No investment thesis provided."}
              </p>
              <p>
                Categories:{" "}
                {profile.targetCategories.length
                  ? profile.targetCategories
                      .map((category) => categories[category])
                      .join(", ")
                  : "Not provided"}
              </p>
              <p>
                Target markets:{" "}
                {profile.targetJurisdictions.length
                  ? profile.targetJurisdictions.map(countryName).join(", ")
                  : "Any market"}
              </p>
              <p>
                {formatBudget(
                  profile.budgetMin?.toString() ?? null,
                  profile.budgetMax?.toString() ?? null,
                )}
              </p>
              <Link href={`/buyers/${id}`} className="button button-secondary">
                View full profile
              </Link>
            </>
          ) : (
            <p>This Buyer has not created an investment profile.</p>
          )
        ) : participant.assets.length ? (
          <ul className="record-links">
            {participant.assets.map((asset) => (
              <li key={asset.id}>
                <span className="status-badge">{asset.publicationStatus}</span>
                <Link
                  href={`/assets/${asset.id}?returnTo=${encodeURIComponent(`/manager/assets?seller=${id}`)}`}
                >
                  {asset.title}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p>This Seller has no assets.</p>
        )}
      </section>
      {participant.status === "REMOVED" ? (
        <p className="read-only-note">
          Removed participants cannot be restored in this prototype.
        </p>
      ) : (
        <ModerationForm
          key={participant.status}
          id={id}
          status={participant.status}
          returnTo={back}
        />
      )}
      <section className="detail-panel moderation-history">
        <h2>Moderation history</h2>
        {!participant.moderationReceived.length ? (
          <p>No status changes recorded.</p>
        ) : (
          <ol className="event-list">
            {participant.moderationReceived.map((event) => (
              <li key={event.id}>
                <h3>
                  {event.fromStatus} → {event.toStatus}
                </h3>
                <p className="field-hint">
                  {event.manager.name} ·{" "}
                  <time dateTime={event.createdAt.toISOString()}>
                    {event.createdAt.toLocaleString("en-GB", {
                      timeZone: "UTC",
                    })}{" "}
                    UTC
                  </time>
                </p>
                <p className="long-text">{event.reason}</p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </AppShell>
  );
}
