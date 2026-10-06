import "server-only";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth/authorization";
import { parseParticipantFilters, parseManagerAssetFilters } from "@/features/moderation/filters";
import type { SearchParams } from "@/features/marketplace/search";

const participantFields = { id: true, name: true, email: true, companyName: true, countryCode: true, role: true, status: true, createdAt: true } as const;

export async function getManagerParticipants(params: SearchParams) {
  const user = await requireUser(["MANAGER"]);
  const parsed = parseParticipantFilters(params);
  if (Object.keys(parsed.errors).length) return { user, ...parsed, items: [], total: 0, catalogTotal: 0, pages: 1 };
  const { filters } = parsed;
  const AND: Prisma.UserWhereInput[] = [{ role: { in: ["BUYER", "SELLER"] } }];
  if (filters.q) AND.push({ OR: ["name", "companyName", "email"].map((field) => ({ [field]: { contains: filters.q, mode: "insensitive" } })) });
  if (filters.role) AND.push({ role: filters.role as "BUYER" | "SELLER" });
  if (filters.status) AND.push({ status: filters.status as "ACTIVE" | "SUSPENDED" | "REMOVED" });
  if (filters.country) AND.push({ countryCode: filters.country });
  const where = { AND };
  const [total, catalogTotal] = await Promise.all([db.user.count({ where }), db.user.count({ where: { role: { in: ["BUYER", "SELLER"] } } })]);
  const pages = Math.max(1, Math.ceil(total / 12));
  const page = Math.min(parsed.page, pages);
  const orderBy: Prisma.UserOrderByWithRelationInput[] = filters.sort === "name" ? [{ name: "asc" }, { id: "asc" }] : [{ createdAt: "desc" }, { id: "desc" }];
  const items = await db.user.findMany({ where, select: participantFields, orderBy, skip: (page - 1) * 12, take: 12 });
  return { user, ...parsed, items, total, catalogTotal, pages, page };
}

export async function getManagerParticipant(id: string) {
  const user = await requireUser(["MANAGER"]);
  const participant = z.uuid().safeParse(id).success ? await db.user.findFirst({
    where: { id, role: { in: ["BUYER", "SELLER"] } },
    select: {
      ...participantFields,
      buyerProfile: true,
      assets: { orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { id: true, title: true, publicationStatus: true } },
      moderationReceived: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: { id: true, fromStatus: true, toStatus: true, reason: true, createdAt: true, manager: { select: { name: true } } },
      },
    },
  }) : null;
  return { user, participant };
}

export async function getManagerAssets(params: SearchParams) {
  const user = await requireUser(["MANAGER"]);
  const sellers = await db.user.findMany({ where: { role: "SELLER" }, select: { id: true, name: true, status: true }, orderBy: [{ name: "asc" }, { id: "asc" }] });
  const parsed = parseManagerAssetFilters(params, sellers.map((seller) => seller.id));
  if (Object.keys(parsed.errors).length) return { user, sellers, ...parsed, items: [], total: 0, catalogTotal: 0, pages: 1 };
  const { filters } = parsed;
  const AND: Prisma.AssetWhereInput[] = [];
  if (filters.q) AND.push({ OR: [{ title: { contains: filters.q, mode: "insensitive" } }, { description: { contains: filters.q, mode: "insensitive" } }] });
  if (filters.category) AND.push({ businessCategory: filters.category as Prisma.AssetWhereInput["businessCategory"] });
  if (filters.jurisdiction) AND.push({ jurisdiction: filters.jurisdiction });
  if (filters.status) AND.push({ publicationStatus: filters.status as "DRAFT" | "PUBLISHED" | "ARCHIVED" });
  if (filters.seller) AND.push({ sellerId: filters.seller });
  const where = { AND };
  const [total, catalogTotal] = await Promise.all([db.asset.count({ where }), db.asset.count()]);
  const pages = Math.max(1, Math.ceil(total / 12));
  const page = Math.min(parsed.page, pages);
  const orderBy: Prisma.AssetOrderByWithRelationInput[] = filters.sort === "title" ? [{ title: "asc" }, { id: "asc" }] : [{ createdAt: "desc" }, { id: "desc" }];
  const items = await db.asset.findMany({ where, select: { id: true, title: true, businessCategory: true, jurisdiction: true, publicationStatus: true, askingPrice: true, priceType: true, seller: { select: { id: true, name: true, status: true } } }, orderBy, skip: (page - 1) * 12, take: 12 });
  return { user, sellers, ...parsed, items, total, catalogTotal, pages, page };
}
