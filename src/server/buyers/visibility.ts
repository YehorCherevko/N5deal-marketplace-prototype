import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { AccountRole } from "@/features/auth/access";
import type { BuyerFilters } from "@/features/buyers/filters";

export const publicBuyers: Prisma.BuyerProfileWhereInput = { publishedAt: { not: null }, user: { role: "BUYER", status: "ACTIVE" } };
export function buyerDetailVisibility(user: { id: string; role: AccountRole }, targetId: string): Prisma.BuyerProfileWhereInput | null {
  if (user.role === "BUYER") return user.id === targetId ? { userId: user.id } : null;
  return user.role === "MANAGER" ? {} : publicBuyers;
}
export function buyerCatalogWhere(filters: BuyerFilters): Prisma.BuyerProfileWhereInput {
  const AND: Prisma.BuyerProfileWhereInput[] = [publicBuyers];
  if (filters.q) AND.push({ OR: [{ thesis: { contains: filters.q, mode: "insensitive" } }, { user: { name: { contains: filters.q, mode: "insensitive" } } }, { user: { companyName: { contains: filters.q, mode: "insensitive" } } }] });
  if (filters.category) AND.push({ targetCategories: { has: filters.category as keyof typeof import("@/features/marketplace/options").categories } });
  if (filters.jurisdiction) AND.push({ OR: [{ targetJurisdictions: { isEmpty: true } }, { targetJurisdictions: { has: filters.jurisdiction } }] });
  // Inclusive interval intersection: a NULL endpoint is unbounded.
  if (filters.min) AND.push({ OR: [{ budgetMax: null }, { budgetMax: { gte: filters.min } }] });
  if (filters.max) AND.push({ OR: [{ budgetMin: null }, { budgetMin: { lte: filters.max } }] });
  return { AND };
}
