import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AssetForm, ArchiveAssetForm } from "@/features/assets/asset-form";
import { parameter, type SearchParams } from "@/features/marketplace/search";
import { getOwnedAsset } from "@/server/assets/queries";
import { pageAccess } from "@/server/auth/page-access";

const messages: Record<string, string> = {
  created: "Draft created.",
  updated: "Changes saved.",
  published: "Asset published.",
  archived: "Asset archived.",
};

export default async function EditAssetPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { id } = await params;
  const { user, asset } = await pageAccess(() => getOwnedAsset(id));
  if (!asset) notFound();
  const saved = parameter(await searchParams, "saved");
  const message = Object.hasOwn(messages, saved) ? messages[saved] : undefined;
  const initial = {
    title: asset.title,
    description: asset.description ?? "",
    businessCategory: asset.businessCategory ?? "",
    assetType: asset.assetType ?? "",
    jurisdiction: asset.jurisdiction ?? "",
    licenseType: asset.licenseType ?? "",
    businessStatus: asset.businessStatus ?? "",
    priceType: asset.priceType ?? "",
    askingPrice: asset.askingPrice?.toString() ?? "",
  };

  return (
    <AppShell user={user} current="/my-assets">
      <Link className="back-link" href="/my-assets">
        ← Back to my assets
      </Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{asset.publicationStatus}</p>
          <h1>Edit asset</h1>
        </div>
        <Link href={`/assets/${id}`} className="button button-secondary">
          View asset
        </Link>
      </div>
      {message && (
        <p className="success-message" role="status">
          {message}
        </p>
      )}
      <AssetForm
        key={asset.updatedAt.toISOString()}
        id={id}
        initial={initial}
        status={asset.publicationStatus}
      />
      {asset.publicationStatus === "PUBLISHED" && <ArchiveAssetForm id={id} />}
    </AppShell>
  );
}
