# N5Deal marketplace prototype

A marketplace for fictional financial businesses and assets. Sellers publish listings, Buyers maintain investment profiles, and a Platform Manager moderates participants. Built with Next.js App Router, React, strict TypeScript, PostgreSQL, and Prisma 7; dependencies use npm and `package-lock.json`.

[Public demo](https://n5deal-marketplace-prototype-ashy.vercel.app) · [Source repository](https://github.com/YehorCherevko/N5deal-marketplace-prototype)

## Try the demo

Open [sign-in](https://n5deal-marketplace-prototype-ashy.vercel.app/sign-in), select an account, and continue without a password. Use **Switch account** to change roles or **Sign out** to clear the session.

- **Seller:** create a draft in My assets, complete and publish it, then browse Buyers and send an inquiry, optionally attaching your published asset. Inspect saved messages in Sent or Inbox.
- **Buyer:** complete My profile and save privately or publish. Browse and filter Assets, contact a Seller, then inspect Inbox and explicitly mark incoming inquiries as read. A complete private profile can send inquiries.
- **Platform Manager:** search Participants and All assets, inspect history, and suspend/reactivate a participant with a reason. Prefer reversible suspension in the shared demo: removal is terminal and requires confirmation.

All visitors share persistent data and can select the Manager. This is demo sign-in, not production authentication or confidentiality between visitors. Use fictional data and preserve the sign-in accounts.

## Run locally

Install Docker Desktop or Docker Engine with Docker Compose and start its daemon. Docker runs both services.

```sh
cp .env.example .env
docker compose build app
docker compose run --rm --no-deps --entrypoint node app -e 'console.log(require("node:crypto").randomBytes(48).toString("base64url"))'
```

Set `SESSION_SECRET` in `.env` to the generated value. Keep the example database credentials consistent with `DATABASE_URL`; leave `DATABASE_URL_UNPOOLED` empty and `SESSION_COOKIE_SECURE=false` for local HTTP. Never commit `.env`.

```sh
docker compose up -d db
docker compose run --rm app npm run db:migrate
docker compose run --rm app npm run db:seed
docker compose up -d app
```

Open [localhost:3000](http://localhost:3000). Diagnose startup with `docker compose logs -f app db`.

### Production build and start

Stop development first because both modes share build output:

```sh
docker compose stop app
docker compose run --rm --no-deps app npm run build
docker compose run --rm --service-ports app npm run start
```

Production serves port 3000 in the foreground. Stop with Ctrl+C and restore development with `docker compose up -d app`.

### Tests and checks

Initialize the separate test database before database-backed tests:

```sh
docker compose run --rm app npm run verify:local-db
docker compose run --rm app sh -c 'npm run test:auth && npm run test:marketplace && npm run test:catalogs && npm run test:inquiries && npm run test:moderation'
docker compose run --rm app sh -c 'npm run format:check && npm run lint && npm run typecheck'
```

**`verify:local-db` drops and recreates local `n5deal_test`**, applies migrations, and checks fixtures and constraints. It preserves `n5deal_demo`. Tests cover sessions, asset/profile validation, catalog visibility, inquiry permissions/idempotency, and moderation. Never point tests at the hosted database. `npm run format` formats maintained sources; Markdown and generated files are excluded.

### Persistence

The `postgres_data` volume survives ordinary stops and `docker compose down`. **`docker compose down -v` deletes volumes and their data.** Keep the same Compose project directory/name. Seeding inserts missing fixtures while preserving edits; startup and builds never migrate, seed, or reset automatically.

## Architecture decisions

- **Feature organization:** routes live in `src/app`, forms and policies in `src/features`, and database operations in `src/server`. This keeps business responsibilities together without a generic CRUD abstraction.
- **PostgreSQL/Prisma:** five tables—users, buyer profiles, assets, inquiries, and moderation events—keep the model focused. Foreign keys and constraints protect relationships; decimal EUR values avoid floating-point money errors.
- **Server authorization:** a signed HttpOnly session identifies the account; protected server operations recheck role, current status, ownership, and visibility. UI restrictions alone cannot authorize access.
- **Persistent inquiries:** messages survive refreshes. A unique sender/attempt key prevents duplicate retries; changed content with that key conflicts. Explicitly starting a new inquiry preserves edits and requires another submission.
- **Transactional moderation:** participant status and audit history update together. Soft removal preserves relationships and messages; suspension hides published records without changing publication state, allowing reactivation.

See [scope and acceptance](docs/N5Deal-Scope-and-Acceptance.md) and [database design](docs/DATABASE-DESIGN.md) for requirements and schema rationale.

## Deployment

The public demo uses Vercel Hobby and Neon Free in Frankfurt. Vercel builds `main` with Node 22 and `npm run build`. Configure production-only `DATABASE_URL` (pooled runtime), `DATABASE_URL_UNPOOLED` (direct Prisma CLI), a fresh `SESSION_SECRET`, and `SESSION_COOKIE_SECURE=true`; hosted connection URLs use `sslmode=verify-full`. Apply committed migrations with `npm run db:migrate` and seed explicitly with `npm run db:seed` against the intended database, never during every build. Preview deployments require a separate database and must not inherit production database access.

## Assumptions and limitations

One role per account, English, EUR, and shared fictional data. Inquiries are saved messages rather than chat or email. Edits use last-write-wins; unsaved inputs may be lost on refresh. Free-tier quotas and cold starts can affect availability.

With more time, replace open persona selection with production authentication, isolate evaluator data, expand browser regression coverage, and improve monitoring and measured query performance.

## AI tools

OpenAI Codex and Claude Code were used during development. AI-assisted changes were reviewed and validated through type checking, linting, automated tests, production builds, and browser checks.
