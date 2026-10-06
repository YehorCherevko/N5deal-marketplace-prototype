import "server-only";
import type { BuyerProfile, User } from "@/generated/prisma/client";
import { validateBuyer } from "@/features/buyers/validation";
import { FormError } from "@/features/marketplace/form-state";

export function hasCompleteBuyerProfile(
  user: Pick<User, "name" | "companyName" | "countryCode">,
  profile: BuyerProfile | null,
) {
  if (!profile) return false;
  try {
    validateBuyer(
      {
        name: user.name,
        companyName: user.companyName ?? "",
        countryCode: user.countryCode ?? "",
        thesis: profile.thesis ?? "",
        targetCategories: profile.targetCategories,
        targetJurisdictions: profile.targetJurisdictions,
        budgetMin: profile.budgetMin?.toString() ?? "",
        budgetMax: profile.budgetMax?.toString() ?? "",
      },
      true,
    );
    return true;
  } catch (error) {
    if (error instanceof FormError) return false;
    throw error;
  }
}
