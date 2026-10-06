import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Pagination } from "@/components/pagination";
import { AssetCatalogFilters } from "@/features/assets/catalog-filters";
import { categories, countryName } from "@/features/marketplace/options";
import { formatMoney } from "@/features/marketplace/money";
import {
  catalogUrl,
  needsNormalization,
  type SearchParams,
} from "@/features/marketplace/search";
import { getAssetCatalog } from "@/server/assets/queries";
import { pageAccess } from "@/server/auth/page-access";

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const result = await pageAccess(() => getAssetCatalog(params));
  const { user, filters, errors, items, total, catalogTotal, page, pages } = result;
  if (
    needsNormalization(
      params,
      {
        category: filters.category,
        jurisdiction: filters.jurisdiction,
        license: filters.license,
        sort: filters.sort,
      },
      page,
    )
  )
    redirect(catalogUrl("/assets", filters, page));
  const returnTo = catalogUrl("/assets", filters, page);

  return (
    <AppShell user={user} current="/assets">
      <div className="page-heading">
        <div>
          <p className="eyebrow">FINANCIAL OPPORTUNITIES</p>
          <h1>Explore assets</h1>
          <p className="lead">
            Published opportunities from active sellers. All listings are
            fictional demo data.
          </p>
        </div>
        {user.role === "SELLER" && (
          <Link href="/my-assets/new" className="button button-primary">
            Create asset
          </Link>
        )}
      </div>
      <AssetCatalogFilters filters={filters} errors={errors} />
      {Object.keys(errors).length ? (
        <p className="form-error" role="alert">
          Correct the highlighted filters to search.
        </p>
      ) : (
        <>
          <p className="result-count" role="status">
            {total} {total === 1 ? "asset" : "assets"} found
          </p>
          {!items.length ? (
            <section className="empty-state">
              <h2>
                {catalogTotal
                  ? "No assets match your filters."
                  : "No published assets yet."}
              </h2>
              <p>
                {catalogTotal
                  ? "Try a broader search or reset your filters."
                  : "Published assets from active sellers will appear here."}
              </p>
              <Link href="/assets" className="button button-secondary">
                Reset filters
              </Link>
            </section>
          ) : (
            <div className="catalog-grid">
              {items.map((asset) => (
                <Link
                  className="asset-card"
                  href={`/assets/${asset.id}?returnTo=${encodeURIComponent(returnTo)}`}
                  key={asset.id}
                  aria-labelledby={`asset-${asset.id}`}
                >
                  <div className="card-tags">
                    <span>
                      {asset.businessCategory
                        ? categories[asset.businessCategory]
                        : ""}
                    </span>
                    <span>{countryName(asset.jurisdiction)}</span>
                    {asset.licenseType && <span>{asset.licenseType}</span>}
                  </div>
                  <h2 id={`asset-${asset.id}`}>{asset.title}</h2>
                  <p className="card-price">
                    {asset.askingPrice
                      ? formatMoney(asset.askingPrice.toString())
                      : "Price on request"}
                  </p>
                  <p className="card-excerpt">
                    {asset.description?.slice(0, 160)}
                  </p>
                  <span className="card-link">
                    View asset <span aria-hidden="true">→</span>
                  </span>
                </Link>
              ))}
            </div>
          )}
          <Pagination base="/assets" filters={filters} page={page} pages={pages} />
        </>
      )}
    </AppShell>
  );
}
