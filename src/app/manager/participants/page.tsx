import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Pagination } from "@/components/pagination";
import { ParticipantCatalogFilters } from "@/features/moderation/catalog-filters";
import { countryName } from "@/features/marketplace/options";
import { roleLabels } from "@/features/auth/access";
import {
  catalogUrl,
  needsNormalization,
  type SearchParams,
} from "@/features/marketplace/search";
import { getManagerParticipants } from "@/server/moderation/queries";
import { pageAccess } from "@/server/auth/page-access";

export default async function ParticipantsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { user, filters, errors, items, total, catalogTotal, page, pages } =
    await pageAccess(() => getManagerParticipants(params));
  if (
    needsNormalization(
      params,
      {
        role: filters.role,
        status: filters.status,
        country: filters.country,
        sort: filters.sort,
      },
      page,
    )
  )
    redirect(catalogUrl("/manager/participants", filters, page));
  const returnTo = catalogUrl("/manager/participants", filters, page);

  return (
    <AppShell user={user} current="/manager/participants">
      <div className="page-heading">
        <div>
          <p className="eyebrow">MANAGER WORKSPACE</p>
          <h1>Participants</h1>
          <p className="lead">
            Buyers and Sellers across all account statuses. Managers cannot be
            moderated.
          </p>
        </div>
        <Link href="/manager/assets" className="button button-secondary">
          All assets
        </Link>
      </div>
      <ParticipantCatalogFilters filters={filters} errors={errors} />
      {Object.keys(errors).length ? (
        <p className="form-error" role="alert">
          Correct the highlighted filters to search.
        </p>
      ) : (
        <>
          <p className="result-count" role="status">
            {total} {total === 1 ? "participant" : "participants"} found
          </p>
          {!items.length ? (
            <section className="empty-state">
              <h2>
                {catalogTotal
                  ? "No participants match your filters."
                  : "No participants yet."}
              </h2>
              <p>Try a broader search or reset your filters.</p>
              <Link
                href="/manager/participants"
                className="button button-secondary"
              >
                Reset filters
              </Link>
            </section>
          ) : (
            <div className="catalog-grid">
              {items.map((participant) => (
                <Link
                  key={participant.id}
                  className="asset-card participant-card"
                  href={`/manager/participants/${participant.id}?returnTo=${encodeURIComponent(returnTo)}`}
                >
                  <div className="card-tags">
                    <span>{roleLabels[participant.role]}</span>
                    <span>{participant.status}</span>
                  </div>
                  <h2>{participant.name}</h2>
                  <p className="buyer-company">
                    {participant.companyName ?? "Not provided"} ·{" "}
                    {countryName(participant.countryCode)}
                  </p>
                  <p className="field-hint">{participant.email}</p>
                  <span className="card-link">View participant →</span>
                </Link>
              ))}
            </div>
          )}
          <Pagination
            base="/manager/participants"
            filters={filters}
            page={page}
            pages={pages}
          />
        </>
      )}
    </AppShell>
  );
}
