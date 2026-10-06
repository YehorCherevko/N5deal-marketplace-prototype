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
