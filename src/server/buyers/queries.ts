import "server-only";
import { z } from "zod";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth/authorization";
import { parseBuyerFilters } from "@/features/buyers/filters";
import type { SearchParams } from "@/features/marketplace/search";
import type { Prisma } from "@/generated/prisma/client";
import { buyerCatalogWhere, buyerDetailVisibility, publicBuyers } from "./visibility";

const publicFields = { userId: true, thesis: true, targetCategories: true, targetJurisdictions: true, budgetMin: true, budgetMax: true, publishedAt: true, user: { select: { name: true, companyName: true, countryCode: true } } } as const;
export async function getBuyerCatalog(params: SearchParams) {
  const user = await requireUser(["SELLER", "MANAGER"]);
  const parsed = parseBuyerFilters(params);
  if (Object.keys(parsed.errors).length) return { user, ...parsed, items: [], total: 0, catalogTotal: 0, pages: 1 };
  const where = buyerCatalogWhere(parsed.filters);
  const [total, catalogTotal] = await Promise.all([db.buyerProfile.count({ where }), db.buyerProfile.count({ where: publicBuyers })]);
  const pages = Math.max(1, Math.ceil(total / 12));
  const page = Math.min(parsed.page, pages);
  const orderBy: Prisma.BuyerProfileOrderByWithRelationInput[] = parsed.filters.sort === "name" ? [{ user: { name: "asc" } }, { userId: "asc" }] : [{ publishedAt: "desc" }, { userId: "desc" }];
  const items = await db.buyerProfile.findMany({ where, select: publicFields, orderBy, skip: (page - 1) * 12, take: 12 });
  return { user, ...parsed, page, items, total, catalogTotal, pages };
}
export async function getMyProfile() {
  const user = await requireUser(["BUYER"]);
  const profile = await db.buyerProfile.findUnique({ where: { userId: user.id } });
  return { user, profile };
}
export async function getBuyerDetail(id: string) {
  const user = await requireUser();
  const visibility = buyerDetailVisibility(user, id);
  const profile = visibility !== null && z.uuid().safeParse(id).success ? await db.buyerProfile.findFirst({ where: { AND: [{ userId: id }, visibility] }, select: publicFields }) : null;
  return { user, profile, canEdit: user.role === "BUYER" && user.id === id };
}
