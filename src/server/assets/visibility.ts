import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { AccountRole } from "@/features/auth/access";
import type { AssetFilters } from "@/features/assets/filters";

export const publicAssets: Prisma.AssetWhereInput = {
  publicationStatus: "PUBLISHED",
  seller: { role: "SELLER", status: "ACTIVE" },
};
export function assetDetailVisibility(user: {
  id: string;
  role: AccountRole;
}): Prisma.AssetWhereInput {
  if (user.role === "MANAGER") return {};
  return user.role === "SELLER"
    ? { OR: [publicAssets, { sellerId: user.id }] }
    : publicAssets;
}
export function assetCatalogWhere(
  filters: AssetFilters,
): Prisma.AssetWhereInput {
  const AND: Prisma.AssetWhereInput[] = [publicAssets];
  if (filters.q)
    AND.push({
      OR: [
        { title: { contains: filters.q, mode: "insensitive" } },
        { description: { contains: filters.q, mode: "insensitive" } },
      ],
    });
  if (filters.category)
    AND.push({
      businessCategory:
        filters.category as Prisma.AssetWhereInput["businessCategory"],
    });
  if (filters.jurisdiction) AND.push({ jurisdiction: filters.jurisdiction });
  if (filters.license)
    AND.push({
      licenseType:
        filters.license === "NONE"
          ? null
          : (filters.license as Prisma.AssetWhereInput["licenseType"]),
    });
  if (filters.min || filters.max)
    AND.push({
      priceType: "FIXED",
      askingPrice: {
        ...(filters.min ? { gte: filters.min } : {}),
        ...(filters.max ? { lte: filters.max } : {}),
      },
    });
  return { AND };
}
