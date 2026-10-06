import "server-only";
import { z } from "zod";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth/authorization";
import { parseAssetFilters } from "@/features/assets/filters";
import type { SearchParams } from "@/features/marketplace/search";
import { assetCatalogWhere, assetDetailVisibility, publicAssets } from "./visibility";
import type { Prisma } from "@/generated/prisma/client";

export async function getAssetCatalog(params: SearchParams) {
  const user = await requireUser();
  const parsed = parseAssetFilters(params);
  if (Object.keys(parsed.errors).length) return { user, ...parsed, items: [], total: 0, catalogTotal: 0, pages: 1 };
  const where = assetCatalogWhere(parsed.filters);
  const [total, catalogTotal] = await Promise.all([db.asset.count({ where }), db.asset.count({ where: publicAssets })]);
  const pages = Math.max(1, Math.ceil(total / 12));
  const page = Math.min(parsed.page, pages);
  const orderBy: Prisma.AssetOrderByWithRelationInput[] = parsed.filters.sort === "newest"
    ? [{ publishedAt: "desc" }, { id: "desc" }]
    : [{ askingPrice: { sort: parsed.filters.sort === "price-asc" ? "asc" : "desc", nulls: "last" } }, { id: "desc" }];
  const items = await db.asset.findMany({ where, orderBy, skip: (page - 1) * 12, take: 12,
    select: { id: true, title: true, businessCategory: true, jurisdiction: true, licenseType: true, askingPrice: true, priceType: true, description: true },
  });
  return { user, ...parsed, page, items, total, catalogTotal, pages };
}

export async function getMyAssets() {
  const user = await requireUser(["SELLER"]);
  const assets = await db.asset.findMany({ where: { sellerId: user.id }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
  return { user, assets };
}

export async function getOwnedAsset(id: string) {
  const user = await requireUser(["SELLER"]);
  const asset = z.uuid().safeParse(id).success ? await db.asset.findFirst({ where: { id, sellerId: user.id } }) : null;
  return { user, asset };
}

export async function getAssetDetail(id: string) {
  const user = await requireUser();
  const asset = z.uuid().safeParse(id).success ? await db.asset.findFirst({
    where: { AND: [{ id }, assetDetailVisibility(user)] },
    include: { seller: { select: { name: true, companyName: true, countryCode: true } } },
  }) : null;
  return { user, asset, canEdit: !!asset && user.role === "SELLER" && asset.sellerId === user.id };
}
