# N5Deal marketplace prototype

A small marketplace for fictional financial businesses and assets. Sellers manage listings and find buyers; Buyers maintain investment profiles and contact Sellers; a Platform Manager moderates participant access. Built with Next.js App Router, strict TypeScript, PostgreSQL, and Prisma 7.

[Source repository](https://github.com/YehorCherevko/N5deal-marketplace-prototype)

## Try the demo

Open `/sign-in`, select a demo account, and continue. No registration or password is required. Use **Switch account** to try another role; **Sign out** clears the session.

| Persona | Role | Starting point |
| --- | --- | --- |
| Alex Morgan | Buyer | Existing published profile |
| Jamie Chen | Buyer | Second participant for access checks |
| Sam Rivera | Buyer | No investment profile yet |
| Avery Reed | Seller | Primary asset owner |
| Cameron Ellis | Seller | Second asset owner |
| Demo Manager | Platform Manager | Participant and asset administration |

- **Seller:** open My assets, create a draft with a title, complete it, and publish. Edit or archive it later. Filter Buyers, open a profile, and send an inquiry with or without one of your published assets. Open Sent or Inbox to inspect saved inquiries.
- **Buyer:** open My profile, enter your investor designation, registration country, thesis, and target categories. Save privately or publish, then browse and filter Assets. A complete private profile can contact Sellers. Open Inbox and explicitly mark incoming inquiries as read.
- **Platform Manager:** search Participants and All assets, inspect related records and moderation history, and suspend/reactivate a Buyer or Seller with a reason. Removal requires confirmation and is terminal. Prefer reversible suspension when evaluating the shared demo; do not remove the required sign-in personas.

All demo visitors share persistent data and can choose the Manager persona. Account boundaries enforce application roles and ownership, but this open persona selection is **not production authentication or confidentiality between visitors**. Use fictional data only.

## Run locally

Prerequisite: Docker Desktop or Docker Engine with Docker Compose, with its daemon running. Docker runs **both the application and PostgreSQL**. Host Node.js and PostgreSQL are optional. Docker and `.nvmrc` pin Node 22.22.2; npm and `package-lock.json` manage dependencies.

```sh
cp .env.example .env
docker compose build app
docker compose run --rm --no-deps --entrypoint node app -e 'console.log(require("node:crypto").randomBytes(48).toString("base64url"))'
```

Set `SESSION_SECRET` in `.env` to the generated value. Keep the fictional local PostgreSQL credentials consistent with `DATABASE_URL`, and leave `SESSION_COOKIE_SECURE=false` for local HTTP. Never commit `.env` or reuse its local credentials on a hosted database.

```sh
docker compose up -d db
docker compose run --rm app npm run db:migrate
docker compose run --rm app npm run db:seed
docker compose up -d app
```

Open [localhost:3000](http://localhost:3000). Inspect services with `docker compose ps` and `docker compose logs -f app db`.

The repository is bind-mounted for development with Webpack polling. Dependencies and `.next` use separate named volumes. The entrypoint synchronizes dependencies when the lockfile changes and generates Prisma Client; it never migrates, seeds, or resets business data automatically. If using VS Code on the host, run `npm ci` with the Node version in `.nvmrc` so its TypeScript service can resolve dependencies.

| Environment variable | Purpose |
| --- | --- |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Local Compose database configuration |
| `DATABASE_URL` | Application PostgreSQL connection; local Compose host is `db` |
| `DATABASE_URL_UNPOOLED` | Optional direct connection for Prisma CLI; empty locally |
| `SESSION_SECRET` | Server-only signing secret, at least 32 bytes |
| `SESSION_COOKIE_SECURE` | `false` for local HTTP; `true` for hosted HTTPS |
| `LOCAL_DEMO_RESET` | Normally `false`; enables the guarded local reset only |

### Local production build and start

Stop development before building or starting production: they share build output.

```sh
docker compose stop app
docker compose run --rm --no-deps app npm run build
docker compose run --rm --service-ports app npm run start
```

The foreground production process serves port 3000. Stop it with Ctrl+C, then restore development with `docker compose up -d app`.

### Tests and checks

Initialize the separate local test database before running database-backed tests:

```sh
docker compose run --rm app npm run verify:local-db
docker compose run --rm app sh -c 'npm run test:auth && npm run test:marketplace && npm run test:catalogs && npm run test:inquiries && npm run test:moderation'
docker compose run --rm app sh -c 'npm run format:check && npm run lint && npm run typecheck'
```

**`verify:local-db` drops and recreates only `n5deal_test`**, applies migrations, and verifies seeding and database constraints. It preserves `n5deal_demo`. Subsequent tests use isolated records in `n5deal_test` and clean them up. Database test guards reject remote hosts and production mode. Never run this suite against the hosted demo database.

The five test commands cover session verification/access, asset and buyer validation/visibility, PostgreSQL catalog predicates, inquiry idempotency/read permissions, and atomic moderation. `npm run format` formats maintained sources; Markdown and generated files are excluded.

### Persistence, seeding, and reset

`docker compose stop` / `docker compose start`, or `docker compose down` / `docker compose up -d`, retain data in `postgres_data`. **Do not use `docker compose down -v`** when retaining data. Keep the same Compose project name/directory.

`db:migrate` explicitly applies committed migrations, including supplemental CHECK constraints and indexes. `db:seed` inserts missing fictional fixtures and preserves existing edits; identity/relationship conflicts abort the seed instead of reassigning ownership. Initial fixtures contain 13 users, 7 buyer profiles, 20 assets, 5 inquiries, and 2 moderation events. `verify:fixtures` compares every field and is expected to fail after intentional demo edits.

For an intentional local reset only:

```sh
docker compose run --rm -e LOCAL_DEMO_RESET=true app npm run reset-demo
```

**This deletes all business rows in local `n5deal_demo`, including user-created records**, then restores fixtures. The command refuses remote databases and production mode. There is no public reset endpoint.

## Architecture and decisions

- `src/app` contains routes and server-rendered pages; `src/features` groups forms, validation, and pure policies by business feature. Server Actions parse input and call `src/server` mutations/queries, which check the current session, role, status, ownership, and visibility.
- PostgreSQL is the source of truth. URL parameters hold filters and pagination; React holds unsaved form values; an eight-hour signed HttpOnly cookie holds identity. Role and ACTIVE status are read again on protected requests so moderation affects the next request.
- Five tables keep the model focused: users, buyer profiles, assets, inquiries, and moderation events. Profiles share their owner's primary key. Decimal EUR amounts avoid floating-point money errors; UTC timestamps and stable identifiers support predictable history and ordering.
- Buyer profile visibility and asset publication are separate from participant moderation. Suspension hides published records without rewriting their publication state. Removal is soft and preserves relationships and inquiry history. Managers cannot moderate Managers or access others' inquiries.
- Contacts are saved, immutable inquiries, not chat or email. Only the recipient can mark one read; retries preserve the first read timestamp. A unique sender/attempt key prevents duplicates. Reusing a key with edited content returns a conflict; explicit recovery preserves edits and creates a separate inquiry only on submission.
- Buyer account/profile edits and moderation/audit updates are transactional. PostgreSQL enforces foreign keys, uniqueness, and publication constraints; shared server policies enforce permissions and cross-record eligibility. No generic CRUD layer or DI container is needed for this scope.
- `prisma/` includes the schema, committed migrations, supplemental constraints, fixtures, and explicit seed. Generated Client files are ignored. [Scope and acceptance](docs/N5Deal-Scope-and-Acceptance.md) and [database design](docs/DATABASE-DESIGN.md) record the original specification and design rationale.

## Deployment

The dedicated `n5deal-marketplace-prototype` project uses **Vercel Hobby** and **Neon Free** PostgreSQL, both in Frankfurt (`fra1` / `eu-central-1`). The local Docker workflow remains independent.

1. Link the repository's `main` branch to the dedicated Vercel project. Use Node 22 and `npm run build`, which generates Prisma Client before building Next.js.
2. Provision Neon through Vercel Marketplace using the Free plan, authentication disabled, and a nearby region. Connect it to **production only**; previews must not inherit write access to the production database.
3. Configure only production's server-only `DATABASE_URL` (pooled runtime), `DATABASE_URL_UNPOOLED` (direct Prisma CLI connection), a newly generated `SESSION_SECRET`, and `SESSION_COOKIE_SECURE=true`. Both connection URLs use `sslmode=verify-full`; credentials are stored as Vercel secrets. Preview deployments require a separate database before they can run.
4. Confirm the connection targets this application's dedicated database, then run `db:migrate` and `db:seed` explicitly against that connection. Never run reset/test commands there or seed on every deployment.
5. Deploy the verified source revision and check the public HTTPS sign-in, role read/write flows, contacts, persistence, and reversible moderation from a browser without a Vercel login. The public production URL is added here only after verification.

Provider references: [Vercel CLI integrations](https://vercel.com/docs/cli/integration), [Vercel Node versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions), and [Neon with Prisma](https://neon.com/docs/guides/prisma).

## Limitations and development tools

This is a technical-assignment prototype: one role per account, English, EUR, and fictional shared data. No registration, passwords, verified companies/licenses, uploads, payments, email delivery, conversation threads, or AI product features. Editing permits last-write-wins; moderation does not promise a global ordering of already-running concurrent requests. Unsaved inputs may be lost on refresh; Save draft preserves them. Free hosting/database quotas and cold starts can affect latency and availability.

With more time: replace open persona selection with production authentication, isolate evaluator data, expand browser regression coverage, improve operational monitoring, and measure query performance before adding indexes or a search service.

OpenAI Codex assisted with implementation, focused fixes, formatting, documentation, and local verification. Its output was checked through source/diff review, TypeScript, ESLint, existing Node/PostgreSQL tests, production builds, and real Chrome acceptance flows. AI assistance in development does not mean the application contains AI functionality.
