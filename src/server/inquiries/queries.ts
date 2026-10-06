import "server-only";
import { z } from "zod";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth/authorization";
import {
  publicAssets,
  assetDetailVisibility,
} from "@/server/assets/visibility";
import { publicBuyers } from "@/server/buyers/visibility";
import {
  pageNumber,
  parameter,
  type SearchParams,
} from "@/features/marketplace/search";
import type { AccountRole } from "@/features/auth/access";
import type { Prisma } from "@/generated/prisma/client";
import { hasCompleteBuyerProfile } from "./eligibility";

const identifyingFields = {
  id: true,
  name: true,
  companyName: true,
  role: true,
} as const;
const inquiryFields = {
  id: true,
  senderId: true,
  recipientId: true,
  body: true,
  assetId: true,
  createdAt: true,
  readAt: true,
  sender: { select: identifyingFields },
  recipient: { select: identifyingFields },
} as const;
type InquiryRow = Prisma.InquiryGetPayload<{ select: typeof inquiryFields }>;

async function withVisibleContext(
  rows: InquiryRow[],
  user: { id: string; role: AccountRole },
) {
  const assetIds = rows.flatMap((row) => (row.assetId ? [row.assetId] : []));
  const buyerIds = rows.flatMap((row) =>
    [row.sender, row.recipient]
      .filter((person) => person.id !== user.id && person.role === "BUYER")
      .map((person) => person.id),
  );
  const [assets, profiles] = await Promise.all([
    assetIds.length
      ? db.asset.findMany({
          where: {
            AND: [{ id: { in: assetIds } }, assetDetailVisibility(user)],
          },
          select: { id: true, title: true },
        })
      : [],
    user.role === "SELLER" && buyerIds.length
      ? db.buyerProfile.findMany({
          where: { AND: [{ userId: { in: buyerIds } }, publicBuyers] },
          select: { userId: true },
        })
      : [],
  ]);
  const visibleAssets = new Map(assets.map((asset) => [asset.id, asset]));
  const visibleProfiles = new Set(profiles.map((profile) => profile.userId));
  return rows.map((row) => {
    const counterparty = row.senderId === user.id ? row.recipient : row.sender;
    return {
      ...row,
      counterparty,
      asset: row.assetId ? (visibleAssets.get(row.assetId) ?? null) : null,
      profileHref: visibleProfiles.has(counterparty.id)
        ? `/buyers/${counterparty.id}`
        : null,
    };
  });
}

export async function getInquiryList(
  box: "inbox" | "sent",
  params: SearchParams,
) {
  const user = await requireUser(["BUYER", "SELLER"]);
  const where =
    box === "inbox" ? { recipientId: user.id } : { senderId: user.id };
  const total = await db.inquiry.count({ where });
  const pages = Math.max(1, Math.ceil(total / 12));
  const page = Math.min(pageNumber(parameter(params, "page")), pages);
  const rows = await db.inquiry.findMany({
    where,
    select: inquiryFields,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * 12,
    take: 12,
  });
  return {
    user,
    total,
    pages,
    page,
    items: await withVisibleContext(rows, user),
  };
}

export async function getInquiryDetail(id: string) {
  const user = await requireUser(["BUYER", "SELLER"]);
  const inquiry = z.uuid().safeParse(id).success
    ? await db.inquiry.findFirst({
        where: { id, OR: [{ senderId: user.id }, { recipientId: user.id }] },
        select: inquiryFields,
      })
    : null;
  return {
    user,
    inquiry: inquiry ? (await withVisibleContext([inquiry], user))[0] : null,
  };
}

export async function getAssetContact(id: string) {
  const user = await requireUser(["BUYER"]);
  if (!(await db.asset.count({ where: { AND: [{ id }, publicAssets] } })))
    return null;
  const profile = await db.buyerProfile.findUnique({
    where: { userId: user.id },
  });
  return { complete: hasCompleteBuyerProfile(user, profile) };
}

export async function getBuyerContact(id: string) {
  const user = await requireUser(["SELLER"]);
  if (
    !(await db.buyerProfile.count({
      where: { AND: [{ userId: id }, publicBuyers] },
    }))
  )
    return null;
  return {
    assets: await db.asset.findMany({
      where: { AND: [{ sellerId: user.id }, publicAssets] },
      orderBy: [{ title: "asc" }, { id: "asc" }],
      select: { id: true, title: true },
    }),
  };
}
