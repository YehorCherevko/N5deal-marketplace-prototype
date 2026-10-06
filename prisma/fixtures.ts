import raw from "./seed-data.json";
import {
  AssetType, BusinessCategory, BusinessStatus, LicenseType, PriceType,
  PublicationStatus, UserRole, UserStatus,
} from "../src/generated/prisma/enums";

function enumValue<T extends string>(values: Record<string, T>, value: string): T {
  const parsed = Object.values(values).find((entry) => entry === value);
  if (!parsed) throw new Error(`Unknown fixture enum: ${value}`);
  return parsed;
}

function date(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) {
    throw new Error(`Invalid fixture timestamp: ${value}`);
  }
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== value) {
    throw new Error(`Invalid fixture timestamp: ${value}`);
  }
  return parsed;
}

function money(value: string | null): string | null {
  if (value !== null && (typeof value !== "string" || !/^\d{1,16}(\.\d{1,2})?$/.test(value))) {
    throw new Error(`Money must be a decimal string: ${value}`);
  }
  return value;
}

export const fixtures = {
  users: raw.users.map((row) => ({ ...row,
    role: enumValue(UserRole, row.role), status: enumValue(UserStatus, row.status),
    createdAt: date(row.createdAt), updatedAt: date(row.updatedAt),
  })),
  buyerProfiles: raw.buyerProfiles.map((row) => ({ ...row,
    targetCategories: row.targetCategories.map((value) => enumValue(BusinessCategory, value)),
    budgetMin: money(row.budgetMin), budgetMax: money(row.budgetMax),
    publishedAt: row.publishedAt ? date(row.publishedAt) : null,
    createdAt: date(row.createdAt), updatedAt: date(row.updatedAt),
  })),
  assets: raw.assets.map((row) => ({ ...row,
    businessCategory: row.businessCategory ? enumValue(BusinessCategory, row.businessCategory) : null,
    assetType: row.assetType ? enumValue(AssetType, row.assetType) : null,
    licenseType: row.licenseType ? enumValue(LicenseType, row.licenseType) : null,
    businessStatus: row.businessStatus ? enumValue(BusinessStatus, row.businessStatus) : null,
    priceType: row.priceType ? enumValue(PriceType, row.priceType) : null,
    publicationStatus: enumValue(PublicationStatus, row.publicationStatus),
    askingPrice: money(row.askingPrice), publishedAt: row.publishedAt ? date(row.publishedAt) : null,
    createdAt: date(row.createdAt), updatedAt: date(row.updatedAt),
  })),
  inquiries: raw.inquiries.map((row) => ({ ...row,
    createdAt: date(row.createdAt), readAt: row.readAt ? date(row.readAt) : null,
  })),
  moderationEvents: raw.moderationEvents.map((row) => ({ ...row,
    fromStatus: enumValue(UserStatus, row.fromStatus), toStatus: enumValue(UserStatus, row.toStatus),
    createdAt: date(row.createdAt),
  })),
};

if (raw.formatVersion !== 1) throw new Error("Unsupported seed fixture format.");

export const expectedCounts = { users: 13, buyerProfiles: 7, assets: 20, inquiries: 5, moderationEvents: 2 };
for (const key of Object.keys(expectedCounts) as (keyof typeof expectedCounts)[]) {
  if (fixtures[key].length !== expectedCounts[key]) throw new Error(`Unexpected fixture count: ${key}`);
}
