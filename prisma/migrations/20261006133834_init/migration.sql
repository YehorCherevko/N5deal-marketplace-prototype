-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('BUYER', 'SELLER', 'MANAGER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'REMOVED');

-- CreateEnum
CREATE TYPE "BusinessCategory" AS ENUM ('BANK', 'FINTECH', 'PAYMENTS', 'CRYPTO', 'OTHER_FINANCIAL');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('OPERATING_BUSINESS', 'LICENSED_ENTITY', 'TECHNOLOGY_ASSET', 'OTHER_FINANCIAL_ASSET');

-- CreateEnum
CREATE TYPE "BusinessStatus" AS ENUM ('OPERATING', 'NOT_OPERATING', 'NEVER_OPERATED', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "LicenseType" AS ENUM ('BANKING', 'EMI', 'PI', 'PSP', 'SPI', 'MSB', 'CASP', 'OTHER');

-- CreateEnum
CREATE TYPE "PriceType" AS ENUM ('FIXED', 'ON_REQUEST');

-- CreateEnum
CREATE TYPE "PublicationStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "company_name" VARCHAR(140),
    "country_code" VARCHAR(2),
    "role" "UserRole" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buyer_profiles" (
    "user_id" UUID NOT NULL,
    "thesis" VARCHAR(2000),
    "target_categories" "BusinessCategory"[] DEFAULT ARRAY[]::"BusinessCategory"[],
    "target_jurisdictions" VARCHAR(2)[] DEFAULT ARRAY[]::VARCHAR(2)[],
    "budget_min" DECIMAL(18,2),
    "budget_max" DECIMAL(18,2),
    "published_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "buyer_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" UUID NOT NULL,
    "seller_id" UUID NOT NULL,
    "title" VARCHAR(140) NOT NULL,
    "description" VARCHAR(5000),
    "business_category" "BusinessCategory",
    "asset_type" "AssetType",
    "jurisdiction" VARCHAR(2),
    "license_type" "LicenseType",
    "business_status" "BusinessStatus",
    "price_type" "PriceType",
    "asking_price" DECIMAL(18,2),
    "publication_status" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inquiries" (
    "id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "recipient_id" UUID NOT NULL,
    "asset_id" UUID,
    "body" VARCHAR(2000) NOT NULL,
    "idempotency_key" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMPTZ(3),

    CONSTRAINT "inquiries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moderation_events" (
    "id" UUID NOT NULL,
    "manager_id" UUID NOT NULL,
    "target_user_id" UUID NOT NULL,
    "from_status" "UserStatus" NOT NULL,
    "to_status" "UserStatus" NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "buyer_profiles_catalog_idx" ON "buyer_profiles"("published_at" DESC, "user_id" DESC);

-- CreateIndex
CREATE INDEX "assets_catalog_idx" ON "assets"("publication_status", "published_at" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "assets_seller_idx" ON "assets"("seller_id", "created_at" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "inquiries_inbox_idx" ON "inquiries"("recipient_id", "created_at" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "inquiries_sent_idx" ON "inquiries"("sender_id", "created_at" DESC, "id" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "inquiries_sender_request_key" ON "inquiries"("sender_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "moderation_target_idx" ON "moderation_events"("target_user_id", "created_at" DESC, "id" DESC);

-- AddForeignKey
ALTER TABLE "buyer_profiles" ADD CONSTRAINT "buyer_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "moderation_events" ADD CONSTRAINT "moderation_events_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "moderation_events" ADD CONSTRAINT "moderation_events_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
-- Design supplement, not a standalone migration: tables must exist first.
-- Append to the generated initial migration BEFORE applying that migration.
-- No triggers, extensions, additional tables, or additional indexes.
-- Trim POSIX whitespace for text length checks: btrim(text) alone trims spaces only.
-- Unicode normalization and complete email validation remain application rules.

ALTER TABLE "users"
  ADD CONSTRAINT "users_email_normalized_ck"
    CHECK (email = lower(btrim(email)) AND char_length(email) > 0
      AND email !~ '[[:space:]]'),
  ADD CONSTRAINT "users_name_ck"
    CHECK (char_length(regexp_replace(name, '^[[:space:]]+|[[:space:]]+$', '', 'g')) BETWEEN 2 AND 100),
  ADD CONSTRAINT "users_company_ck"
    CHECK (company_name IS NULL OR
      char_length(regexp_replace(company_name, '^[[:space:]]+|[[:space:]]+$', '', 'g')) BETWEEN 2 AND 140),
  ADD CONSTRAINT "users_country_ck"
    CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{2}$');

-- Prisma scalar lists use SQL arrays. Explicitly reject a NULL array too.
ALTER TABLE "buyer_profiles"
  ALTER COLUMN target_categories SET NOT NULL,
  ALTER COLUMN target_jurisdictions SET NOT NULL,
  ADD CONSTRAINT "buyer_profiles_categories_ck"
    CHECK ((cardinality(target_categories) = 0 OR array_ndims(target_categories) = 1)
      AND array_position(target_categories, NULL) IS NULL),
  ADD CONSTRAINT "buyer_profiles_jurisdictions_ck"
    CHECK ((cardinality(target_jurisdictions) = 0 OR array_ndims(target_jurisdictions) = 1)
      AND array_position(target_jurisdictions, NULL) IS NULL),
  ADD CONSTRAINT "buyer_profiles_budget_ck"
    CHECK ((budget_min IS NULL OR (budget_min >= 0 AND budget_min <> 'NaN'::numeric))
      AND (budget_max IS NULL OR (budget_max >= 0 AND budget_max <> 'NaN'::numeric))
      AND (budget_min IS NULL OR budget_max IS NULL OR budget_min <= budget_max)),
  ADD CONSTRAINT "buyer_profiles_published_ck"
    CHECK (published_at IS NULL OR
      (thesis IS NOT NULL AND
        char_length(regexp_replace(thesis, '^[[:space:]]+|[[:space:]]+$', '', 'g')) >= 30
        AND cardinality(target_categories) >= 1));

ALTER TABLE "assets"
  ADD CONSTRAINT "assets_title_ck"
    CHECK (char_length(regexp_replace(title, '^[[:space:]]+|[[:space:]]+$', '', 'g')) BETWEEN 3 AND 140),
  ADD CONSTRAINT "assets_jurisdiction_ck"
    CHECK (jurisdiction IS NULL OR jurisdiction ~ '^[A-Z]{2}$'),
  ADD CONSTRAINT "assets_price_ck"
    CHECK (
      (price_type IS NULL AND asking_price IS NULL)
      OR (price_type IS NOT NULL AND price_type = 'ON_REQUEST' AND asking_price IS NULL)
      OR (price_type IS NOT NULL AND price_type = 'FIXED' AND
        (asking_price IS NULL OR (asking_price > 0 AND asking_price <> 'NaN'::numeric)))
    ),
  ADD CONSTRAINT "assets_published_ck"
    CHECK (publication_status <> 'PUBLISHED' OR (
      description IS NOT NULL AND
      char_length(regexp_replace(description, '^[[:space:]]+|[[:space:]]+$', '', 'g')) >= 30
      AND business_category IS NOT NULL
      AND asset_type IS NOT NULL
      AND jurisdiction IS NOT NULL
      AND business_status IS NOT NULL
      AND price_type IS NOT NULL
      AND (price_type <> 'FIXED' OR asking_price IS NOT NULL)
      AND published_at IS NOT NULL
    )),
  ADD CONSTRAINT "assets_publication_date_ck"
    CHECK (
      (publication_status = 'DRAFT' AND published_at IS NULL)
      OR (publication_status IN ('PUBLISHED', 'ARCHIVED') AND published_at IS NOT NULL)
    );

ALTER TABLE "inquiries"
  ADD CONSTRAINT "inquiries_distinct_users_ck" CHECK (sender_id <> recipient_id),
  ADD CONSTRAINT "inquiries_body_ck"
    CHECK (char_length(regexp_replace(body, '^[[:space:]]+|[[:space:]]+$', '', 'g')) BETWEEN 1 AND 2000),
  ADD CONSTRAINT "inquiries_read_at_ck" CHECK (read_at IS NULL OR read_at >= created_at);

ALTER TABLE "moderation_events"
  ADD CONSTRAINT "moderation_distinct_users_ck" CHECK (manager_id <> target_user_id),
  ADD CONSTRAINT "moderation_reason_ck"
    CHECK (char_length(regexp_replace(reason, '^[[:space:]]+|[[:space:]]+$', '', 'g')) BETWEEN 1 AND 500),
  ADD CONSTRAINT "moderation_transition_ck" CHECK (
    (from_status = 'ACTIVE' AND to_status IN ('SUSPENDED', 'REMOVED'))
    OR (from_status = 'SUSPENDED' AND to_status IN ('ACTIVE', 'REMOVED'))
  );
