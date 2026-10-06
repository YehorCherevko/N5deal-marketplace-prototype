# Step 3 verification

Executed on 6 October 2026 using Docker Desktop 4.70.0, Docker Engine 29.4.0, and Docker Compose 5.1.2 on Apple Silicon. Containers used Node 22.22.2 and PostgreSQL 18.3. Prisma CLI, generated client, and PostgreSQL adapter were all 7.10.0. This report records actual local checks, not deployment or future product acceptance.

## Results

| Check | Actual result |
| --- | --- |
| Dependency installation | `npm ci` succeeded inside the Docker image; `package-lock.json` is included |
| Schema validation/client generation | `prisma validate` and `prisma generate` succeeded |
| Lint | `npm run lint` passed inside Docker |
| Strict TypeScript | `npm run typecheck` passed inside Docker |
| Production build | `npm run build` passed inside Docker; `/` and `/_not-found` were generated |
| Docker startup | Application and PostgreSQL started; PostgreSQL health check passed |
| Landing page | HTTP 200 with the expected page content |
| Hot reload | A temporary marker added to `src/app/page.tsx` appeared through the bind mount without restarting the container; marker removed afterward |
| Initial migration | Generated with `migrate dev --create-only`; supplied `constraints.sql` appended before first application; `migrate deploy` succeeded on empty demo and test databases |
| Schema inventory | Exactly 5 business tables, 13 indexes, 7 foreign keys, and 19 CHECK constraints; Prisma's migration metadata table excluded from business inventory |
| Initial seed | Inserted 13 users, 7 buyer profiles, 20 assets, 5 inquiries, 2 moderation events |
| Repeat seed | Inserted zero records in every table; fixture counts unchanged |
| Preserve edits | Deliberately edited name and its `updatedAt` remained exactly unchanged after reseeding |
| Identity conflict | Changed fixture email colliding with another UUID was reported and rejected |
| Relationship conflict/atomicity | Changed inquiry asset reference caused a descriptive conflict; the earlier missing-profile insertion in that seed transaction was rolled back |
| Persistence | A deliberate demo name edit survived `docker compose down` followed by `docker compose up -d`; volumes were retained |
| Reset guard | `reset-demo` refused to run with default `LOCAL_DEMO_RESET=false` before issuing SQL |
| Explicit reset | `LOCAL_DEMO_RESET=true` reset restored all original records and timestamps; every field in all five tables matched the supplied JSON afterward |
| Reproducible verification | Final `docker compose run --rm app npm run verify:local-db` passed after dependency overrides were installed; it recreated only `n5deal_test`, migrated, checked behavior, and compared all original fixtures |
| Next.js database integration | A temporary server route imported `src/server/db.ts`, successfully queried PostgreSQL, and confirmed the client was cached on the development global; route removed afterward |
| Server/client boundary | A temporary Client Component importing the database module was rejected by Next.js with a `server-only` error; component removed afterward |
| Browser bundles | Inspected 18 production JavaScript bundles; no `DATABASE_URL`, local demo password, `PrismaClient`, or `@prisma` references found |

The build initially exposed Compose forcing `NODE_ENV=development` during production builds. That setting was removed; the final production build passed with Next.js choosing its normal mode. A verification expectation for deleting a referenced user was also corrected to PostgreSQL's `23001` RESTRICT error. No database model or supplied constraints were changed.

## PostgreSQL negative checks

The focused script checked the expected SQLSTATE and, where applicable, the named constraint. Each negative SQL statement ran inside a transaction that was rolled back. All checks ran against the separate `n5deal_test` database, not demo data:

- Negative, zero, and NaN prices; prices on ON_REQUEST and without a price type.
- Negative minimum/maximum budgets, reversed budget bounds, and NaN budgets.
- Published assets missing description, business category, asset type, jurisdiction, business status, or a required fixed price.
- Published buyer profiles missing thesis or categories.
- Whitespace-only names, companies, email, titles, published descriptions, published theses, inquiry bodies, and moderation reasons, including tabs/newlines.
- NULL arrays, NULL array elements, and multidimensional category/jurisdiction arrays.
- Duplicate sender/submission keys and duplicate email identities.
- All seven foreign keys with missing referenced records; deletion of a referenced user.
- Self inquiries, read dates before creation, self moderation, and invalid moderation transitions.

Positive controls accepted multiline inquiry text and a Cyrillic name, then rolled back. Final `verify:fixtures` confirmed the entire test dataset matched the originals. The demo was reset and its originals were verified separately after the persistence check.

## Dependency audit and limits

`npm audit` initially reported nine high-severity dependency findings. Scoped overrides updated Prisma's `deepmerge-ts` to 8.0.2 and `mysql2` to 3.24.5; schema configuration, generation, migration, seed, lint, type checking, production build, and final integration checks passed with these overrides.

The final full audit still reports **five high-severity findings** in the development lint dependency chain (`eslint-config-next` → `@next/eslint-plugin-next` → `fast-glob` → `micromatch` → `braces`). The registry's latest `braces` was 3.0.3 and remained flagged; the suggested automated fix downgraded the Next.js lint configuration to a different major version and was not applied. `npm audit --omit=dev` reported **zero findings** after the overrides. ESLint 9.39.5 also emits an upstream end-of-support notice. These tooling limitations remain documented for follow-up; the local checks pass.

`N5Deal-Scope-and-Acceptance.md` was missing and no applicable `AGENTS.md` was found. The supplied Step 3 brief and existing database design defined this implementation. Agreement with the absent scope document cannot be independently checked. The original schema, constraint supplement, fixtures, and design document were preserved and moved to their appropriate directories.

No cloud infrastructure, deployment, Figma work, authentication, catalogs, business CRUD, inquiry handlers, moderation use cases, or AI features were implemented. Role/ownership/visibility business rules described in the design remain responsibilities of those future use cases. No PGlite checks were used as evidence for Docker or PostgreSQL operation.
