import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import {
  assetTypes,
  businessStatuses,
  categories,
  countryName,
} from "@/features/marketplace/options";
import { formatMoney } from "@/features/marketplace/money";
import {
  backToCatalog,
  parameter,
  type SearchParams,
} from "@/features/marketplace/search";
import { getAssetDetail } from "@/server/assets/queries";
import { pageAccess } from "@/server/auth/page-access";
import { randomUUID } from "node:crypto";
import { ContactForm } from "@/features/inquiries/contact-form";
import { getAssetContact } from "@/server/inquiries/queries";

export default async function AssetDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { id } = await params;
  const { user, asset, canEdit } = await pageAccess(() => getAssetDetail(id));
  if (!asset) notFound();
  const contact =
    user.role === "BUYER" ? await pageAccess(() => getAssetContact(id)) : null;
  const returnTo = parameter(await searchParams, "returnTo");
  const managerReturn =
    user.role === "MANAGER" && returnTo.startsWith("/manager/assets");
  const back = backToCatalog(
    returnTo,
    managerReturn ? "/manager/assets" : "/assets",
  );

  return (
    <AppShell
      user={user}
      current={managerReturn ? "/manager/assets" : "/assets"}
    >
      <Link href={back} className="back-link">
        ← {managerReturn ? "Back to Manager assets" : "Back to assets"}
      </Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{asset.publicationStatus}</p>
          <h1>{asset.title}</h1>
        </div>
        {canEdit && (
          <Link
            href={`/my-assets/${id}/edit`}
            className="button button-secondary"
          >
            Edit asset
          </Link>
        )}
      </div>
      <div className="detail-grid">
        <section className="detail-panel">
          <h2>About this asset</h2>
          <p className="long-text">
            {asset.description ?? "No description has been provided."}
          </p>
          <dl className="detail-facts">
            {[
              [
                "Category",
                asset.businessCategory
                  ? categories[asset.businessCategory]
                  : "Not provided",
              ],
              [
                "Asset type",
                asset.assetType ? assetTypes[asset.assetType] : "Not provided",
              ],
              ["Jurisdiction", countryName(asset.jurisdiction)],
              ["License", asset.licenseType ?? "None"],
              [
                "Business status",
                asset.businessStatus
                  ? businessStatuses[asset.businessStatus]
                  : "Not provided",
              ],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>
        <aside className="detail-panel">
          <h2>Asking price</h2>
          <p className="card-price detail-price">
            {asset.askingPrice
              ? formatMoney(asset.askingPrice.toString())
              : asset.priceType === "ON_REQUEST"
                ? "Price on request"
                : "Not set"}
          </p>
          <h2>Seller</h2>
          <p>
            <strong>{asset.seller.name}</strong>
            <br />
            {asset.seller.companyName ?? "Company not provided"}
            <br />
            {countryName(asset.seller.countryCode)}
          </p>
          {asset.publishedAt && (
            <p className="field-hint">
              Published{" "}
              {asset.publishedAt.toLocaleDateString("en-GB", {
                timeZone: "UTC",
              })}
            </p>
          )}
        </aside>
      </div>
      {contact &&
        (contact.complete ? (
          <ContactForm
            target={{ kind: "asset", id }}
            attemptKey={randomUUID()}
          />
        ) : (
          <section className="contact-panel">
            <h2>Complete your profile to contact this seller</h2>
            <p>
              Provide your name, company or investor designation, registration
              country, an investment thesis of at least 30 characters, and a
              target category. Budgets and target markets are optional. Your
              profile may remain private.
            </p>
            <Link href="/my-profile" className="button button-secondary">
              Complete my profile
            </Link>
          </section>
        ))}
    </AppShell>
  );
}
