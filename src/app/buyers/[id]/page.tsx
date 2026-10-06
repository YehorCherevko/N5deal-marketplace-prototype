import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { categories, countryName } from "@/features/marketplace/options";
import { formatBudget } from "@/features/marketplace/money";
import {
  backToCatalog,
  parameter,
  type SearchParams,
} from "@/features/marketplace/search";
import { getBuyerDetail } from "@/server/buyers/queries";
import { pageAccess } from "@/server/auth/page-access";

export default async function BuyerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { id } = await params;
  const { user, profile, canEdit } = await pageAccess(() => getBuyerDetail(id));
  if (!profile) notFound();
  const back =
    user.role === "BUYER"
      ? "/my-profile"
      : backToCatalog(parameter(await searchParams, "returnTo"), "/buyers");

  return (
    <AppShell
      user={user}
      current={user.role === "BUYER" ? "/my-profile" : "/buyers"}
    >
      <Link href={back} className="back-link">
        ← {user.role === "BUYER" ? "Back to my profile" : "Back to buyers"}
      </Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            {profile.publishedAt ? "PUBLISHED BUYER PROFILE" : "PRIVATE DRAFT"}
          </p>
          <h1>{profile.user.name}</h1>
          <p className="lead">
            {profile.user.companyName ?? "Investor designation not provided"}
          </p>
        </div>
        {canEdit && (
          <Link href="/my-profile" className="button button-secondary">
            Edit my profile
          </Link>
        )}
      </div>
      <div className="detail-grid">
        <section className="detail-panel">
          <h2>Investment thesis</h2>
          <p className="long-text">
            {profile.thesis ?? "No investment thesis has been provided."}
          </p>
          <dl className="detail-facts">
            <div>
              <dt>Registration country</dt>
              <dd>{countryName(profile.user.countryCode)}</dd>
            </div>
            <div>
              <dt>Target categories</dt>
              <dd>
                {profile.targetCategories.length
                  ? profile.targetCategories
                      .map((category) => categories[category])
                      .join(", ")
                  : "Not provided"}
              </dd>
            </div>
            <div>
              <dt>Target markets</dt>
              <dd>
                {profile.targetJurisdictions.length
                  ? profile.targetJurisdictions.map(countryName).join(", ")
                  : "Any market"}
              </dd>
            </div>
          </dl>
        </section>
        <aside className="detail-panel">
          <h2>Investment budget</h2>
          <p className="card-price buyer-budget">
            {formatBudget(
              profile.budgetMin?.toString() ?? null,
              profile.budgetMax?.toString() ?? null,
            )}
          </p>
          <p className="field-hint">
            Budget bounds are inclusive. An empty minimum or maximum imposes no
            restriction at that end.
          </p>
        </aside>
      </div>
    </AppShell>
  );
}
