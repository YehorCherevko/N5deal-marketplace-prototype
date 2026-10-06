import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Pagination } from "@/components/pagination";
import { BuyerCatalogFilters } from "@/features/buyers/catalog-filters";
import { categories, countryName } from "@/features/marketplace/options";
import { formatBudget } from "@/features/marketplace/money";
import {
  catalogUrl,
  needsNormalization,
  type SearchParams,
} from "@/features/marketplace/search";
import { getBuyerCatalog } from "@/server/buyers/queries";
import { pageAccess } from "@/server/auth/page-access";

export default async function BuyersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { user, filters, errors, items, total, catalogTotal, page, pages } =
    await pageAccess(() => getBuyerCatalog(params));
  if (
    needsNormalization(
      params,
      {
        category: filters.category,
        jurisdiction: filters.jurisdiction,
        sort: filters.sort,
      },
      page,
    )
  )
    redirect(catalogUrl("/buyers", filters, page));
  const returnTo = catalogUrl("/buyers", filters, page);

  return (
    <AppShell user={user} current="/buyers">
      <div className="page-heading">
        <div>
          <p className="eyebrow">INVESTMENT INTERESTS</p>
          <h1>Explore buyers</h1>
          <p className="lead">
            Published profiles from active buyers, with their investment interests
            and target markets.
          </p>
        </div>
      </div>
      <BuyerCatalogFilters filters={filters} errors={errors} />
      {Object.keys(errors).length ? (
        <p className="form-error" role="alert">
          Correct the highlighted filters to search.
        </p>
      ) : (
        <>
          <p className="result-count" role="status">
            {total} {total === 1 ? "buyer" : "buyers"} found
          </p>
          {!items.length ? (
            <section className="empty-state">
              <h2>
                {catalogTotal
                  ? "No buyers match your filters."
                  : "No published buyer profiles yet."}
              </h2>
              <p>
                {catalogTotal
                  ? "Try broader interests or reset your filters."
                  : "Published profiles from active buyers will appear here."}
              </p>
              <Link href="/buyers" className="button button-secondary">
                Reset filters
              </Link>
            </section>
          ) : (
            <div className="catalog-grid">
              {items.map((profile) => (
                <Link
                  className="asset-card buyer-card"
                  key={profile.userId}
                  href={`/buyers/${profile.userId}?returnTo=${encodeURIComponent(returnTo)}`}
                  aria-labelledby={`buyer-${profile.userId}`}
                >
                  <div className="card-tags">
                    {profile.targetCategories.map((category) => (
                      <span key={category}>{categories[category]}</span>
                    ))}
                  </div>
                  <h2 id={`buyer-${profile.userId}`}>{profile.user.name}</h2>
                  <p className="buyer-company">
                    {profile.user.companyName} · {countryName(profile.user.countryCode)}
                  </p>
                  <p className="card-price buyer-budget">
                    {formatBudget(
                      profile.budgetMin?.toString() ?? null,
                      profile.budgetMax?.toString() ?? null,
                    )}
                  </p>
                  <p className="field-hint">
                    Target markets: {profile.targetJurisdictions.length
                      ? profile.targetJurisdictions.map(countryName).join(", ")
                      : "Any market"}
                  </p>
                  <p className="card-excerpt">{profile.thesis?.slice(0, 160)}</p>
                  <span className="card-link">
                    View buyer <span aria-hidden="true">→</span>
                  </span>
                </Link>
              ))}
            </div>
          )}
          <Pagination base="/buyers" filters={filters} page={page} pages={pages} />
        </>
      )}
    </AppShell>
  );
}
