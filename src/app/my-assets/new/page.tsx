import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { AssetForm } from "@/features/assets/asset-form";
import { emptyAsset } from "@/features/assets/validation";
import { requireUser } from "@/server/auth/authorization";
import { pageAccess } from "@/server/auth/page-access";

export default async function NewAssetPage() {
  const user = await pageAccess(() => requireUser(["SELLER"]));

  return (
    <AppShell user={user} current="/my-assets">
      <Link className="back-link" href="/my-assets">
        ← Back to my assets
      </Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">DRAFT ASSET</p>
          <h1>Create an asset</h1>
          <p className="lead">
            Start with a title. Saving a draft does not publish it.
          </p>
        </div>
      </div>
      <AssetForm id={null} initial={emptyAsset} status="DRAFT" />
    </AppShell>
  );
}
