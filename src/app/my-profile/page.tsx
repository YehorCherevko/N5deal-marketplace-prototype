import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ProfileForm, HideProfileForm } from "@/features/buyers/profile-form";
import { parameter, type SearchParams } from "@/features/marketplace/search";
import { getMyProfile } from "@/server/buyers/queries";
import { pageAccess } from "@/server/auth/page-access";

const messages: Record<string, string> = {
  published: "Profile published.",
  updated: "Profile and account details saved.",
  hidden: "Profile hidden. It is now a private draft.",
};

export default async function MyProfilePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { user, profile } = await pageAccess(getMyProfile);
  const initial = {
    name: user.name,
    companyName: user.companyName ?? "",
    countryCode: user.countryCode ?? "",
    thesis: profile?.thesis ?? "",
    targetCategories: profile?.targetCategories ?? [],
    targetJurisdictions: profile?.targetJurisdictions ?? [],
    budgetMin: profile?.budgetMin?.toString() ?? "",
    budgetMax: profile?.budgetMax?.toString() ?? "",
  };
  const saved = parameter(await searchParams, "saved");
  const message = Object.hasOwn(messages, saved) ? messages[saved] : undefined;
  return (
    <AppShell user={user} current="/my-profile">
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            {profile?.publishedAt
              ? "PUBLISHED PROFILE"
              : profile
                ? "PRIVATE DRAFT"
                : "BUYER ONBOARDING"}
          </p>
          <h1>My investment profile</h1>
          <p className="lead">
            {profile
              ? "Keep your investment interests and account details up to date."
              : "You haven’t created a profile yet. Complete it here or save an incomplete draft."}
          </p>
        </div>
        {profile && (
          <Link href={`/buyers/${user.id}`} className="button button-secondary">
            Preview profile
          </Link>
        )}
      </div>
      <p className="read-only-note">
        Demo email: {user.email}. Your email and Buyer role are not editable.
      </p>
      {message && (
        <p className="success-message" role="status">
          {message}
        </p>
      )}
      <ProfileForm
        key={profile?.updatedAt.toISOString() ?? "new"}
        initial={initial}
        published={!!profile?.publishedAt}
      />
      {profile?.publishedAt && <HideProfileForm />}
    </AppShell>
  );
}
