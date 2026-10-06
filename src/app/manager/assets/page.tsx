import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Pagination } from "@/components/pagination";
import { ManagerAssetCatalogFilters } from "@/features/moderation/catalog-filters";
import { categories, countryName } from "@/features/marketplace/options";
import { formatMoney } from "@/features/marketplace/money";
import { catalogUrl, needsNormalization, type SearchParams } from "@/features/marketplace/search";
import { getManagerAssets } from "@/server/moderation/queries";
import { pageAccess } from "@/server/auth/page-access";

export default async function ManagerAssetsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const { user, filters, errors, items, sellers, total, catalogTotal, page, pages } = await pageAccess(() => getManagerAssets(params));
  if (needsNormalization(params, { category: filters.category, jurisdiction: filters.jurisdiction, status: filters.status, seller: filters.seller, sort: filters.sort }, page)) redirect(catalogUrl("/manager/assets", filters, page));
  const returnTo = catalogUrl("/manager/assets", filters, page);

  return (
    <AppShell user={user} current="/manager/assets">
      <div className="page-heading">
        <div>
          <p className="eyebrow">MANAGER WORKSPACE</p>
          <h1>Manager assets</h1>
          <p className="lead">Read-only asset content across all publication and Seller statuses.</p>
        </div>
        <Link href="/manager/participants" className="button button-secondary">Participants</Link>
      </div>
      <ManagerAssetCatalogFilters filters={filters} errors={errors} sellers={sellers} />
      {Object.keys(errors).length ? (
        <p className="form-error" role="alert">Correct the highlighted filters to search.</p>
      ) : (
        <>
          <p className="result-count" role="status">{total} {total === 1 ? "asset" : "assets"} found</p>
          {!items.length ? (
            <section className="empty-state">
              <h2>{catalogTotal ? "No assets match your filters." : "No assets yet."}</h2>
              <p>Try a broader search or reset your filters.</p>
              <Link href="/manager/assets" className="button button-secondary">Reset filters</Link>
            </section>
          ) : (
            <div className="catalog-grid">
              {items.map((asset) => (
                <Link
                  key={asset.id}
                  className="asset-card manager-asset-card"
                  href={`/assets/${asset.id}?returnTo=${encodeURIComponent(returnTo)}`}
                >
                  <div className="card-tags">
                    <span>{asset.publicationStatus}</span>
                    {asset.businessCategory && <span>{categories[asset.businessCategory]}</span>}
                    <span>{countryName(asset.jurisdiction)}</span>
                  </div>
                  <h2>{asset.title}</h2>
                  <p className="card-price">
                    {asset.askingPrice
                      ? formatMoney(asset.askingPrice.toString())
                      : asset.priceType === "ON_REQUEST" ? "Price on request" : "Price not set"}
                  </p>
                  <p className="buyer-company">{asset.seller.name} · {asset.seller.status}</p>
                  <span className="card-link">View asset →</span>
                </Link>
              ))}
            </div>
          )}
          <Pagination base="/manager/assets" filters={filters} page={page} pages={pages} />
        </>
      )}
    </AppShell>
  );
}
