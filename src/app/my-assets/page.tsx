import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { formatMoney } from "@/features/marketplace/money";
import { getMyAssets } from "@/server/assets/queries";
import { pageAccess } from "@/server/auth/page-access";

export default async function MyAssetsPage() {
  const { user, assets } = await pageAccess(getMyAssets);

  return (
    <AppShell user={user} current="/my-assets">
      <div className="page-heading">
        <div>
          <p className="eyebrow">SELLER WORKSPACE</p>
          <h1>My assets</h1>
          <p className="lead">
            Create drafts, publish complete opportunities, and archive listings.
          </p>
        </div>
        <Link href="/my-assets/new" className="button button-primary">
          Create asset
        </Link>
      </div>
      {!assets.length ? (
        <section className="empty-state">
          <h2>Your first opportunity starts here.</h2>
          <p>
            Create a draft with a title and complete the details when you’re
            ready.
          </p>
        </section>
      ) : (
        <div className="owned-assets">
          {assets.map((asset) => (
            <article key={asset.id} className="owned-asset">
              <div>
                <span
                  className={`status-badge status-${asset.publicationStatus.toLowerCase()}`}
                >
                  {asset.publicationStatus}
                </span>
                <h2>
                  <Link href={`/my-assets/${asset.id}/edit`}>
                    {asset.title}
                  </Link>
                </h2>
                <p>
                  {asset.askingPrice
                    ? formatMoney(asset.askingPrice.toString())
                    : asset.priceType === "ON_REQUEST"
                      ? "Price on request"
                      : "Price not set"}
                </p>
              </div>
              <div className="account-controls">
                <Link
                  href={`/assets/${asset.id}`}
                  className="button button-quiet"
                >
                  View
                </Link>
                <Link
                  href={`/my-assets/${asset.id}/edit`}
                  className="button button-secondary"
                >
                  Edit
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </AppShell>
  );
}
