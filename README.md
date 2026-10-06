# N5Deal marketplace prototype

Step 3 provides a local Next.js App Router + strict TypeScript application, PostgreSQL in Docker, Prisma 7 migrations, and an executable seed. The landing page describes the current foundation. Authentication, catalogs, business CRUD, inquiries, moderation, AI, and the complete UI remain for later steps. Deployment is postponed until the end of the project.

All fixtures are fictional. The planned demo-persona selection is not production authentication; no login or account selection is implemented now.

## Clean checkout startup

Install Docker Desktop (macOS/Windows) or Docker Engine with Docker Compose (Linux), and start its daemon. Host Node.js and PostgreSQL are not required. Run these commands from the repository root:

```sh
cp .env.example .env
docker compose build app
docker compose up -d db
docker compose run --rm app npm run db:migrate
docker compose run --rm app npm run db:seed
docker compose up -d app
```

Open [localhost:3000](http://localhost:3000). Inspect startup with `docker compose logs -f app db` and service state with `docker compose ps`.

Migrations and seeds are explicit one-off commands. Application startup, HTTP requests, hot reload, and container restarts never migrate, seed, or reset data.

## Configuration

`.env.example` contains fictional local-only credentials; `.env` is ignored by Git and Docker image builds. Docker Compose loads it into the app and uses its PostgreSQL settings for the database. Prisma CLI and standalone scripts load it with dotenv.

| Variable | Purpose |
| --- | --- |
| `POSTGRES_USER` | Local database owner, initially `n5deal` |
| `POSTGRES_PASSWORD` | Local demo password, initially `local-demo-only` |
| `POSTGRES_DB` | Local demo database, `n5deal_demo` |
| `DATABASE_URL` | Direct PostgreSQL connection string; inside Compose the host is `db` and port is `5432` |
| `LOCAL_DEMO_RESET` | Defaults to `false`; must be explicitly `true` to reset the local demo |
| `NODE_ENV` | Next.js selects development/build mode automatically; reset and database tests reject `production` |

Keep `DATABASE_URL` credentials consistent with `POSTGRES_*`. Passwords with URL-reserved characters must be URL encoded in the connection string. PostgreSQL initialization variables take effect only on the first creation of its data volume; changing `.env` does not change an existing database password.

The app binds to host loopback only. PostgreSQL is available within the Compose network and is not published to a host port. Server secrets must not use `NEXT_PUBLIC_` names. The database module is marked `server-only`, so Next.js rejects its use from Client Components. ESLint also restricts direct Prisma/pg imports in application files outside `src/server/`.

## Database commands

```sh
docker compose run --rm app npm run db:validate
docker compose run --rm app npm run db:generate
docker compose run --rm app npm run db:migrate
docker compose run --rm app npm run db:seed
docker compose run --rm app npm run verify:fixtures
```

`db:migrate` uses `prisma migrate deploy` with the versioned migrations. The initial migration was generated using `prisma migrate dev --create-only --name init`; the exact supplied `constraints.sql` was appended before its first application. It includes the supplemental CHECK constraints and array NOT NULL constraints. Do not use `db push` or run `constraints.sql` separately on startup. Future constraint changes belong in new migrations; do not edit an applied migration.

To create subsequent migrations while developing:

```sh
docker compose run --rm app npx prisma migrate dev --create-only --name describe_change
# Review the generated migration, including any required SQL constraints.
docker compose run --rm app npm run db:migrate
docker compose run --rm app npm run db:generate
```

The seed preserves supplied UUIDs, decimal strings, and UTC timestamps. It inserts in dependency order in one transaction, skips existing records, and preserves mutable data, including `updatedAt`. Existing UUID/email/role identities, asset ownership, inquiry participants/asset/submission key, and moderation participants/transitions must agree with the fixtures. Conflicts abort the whole seed with a descriptive error; the seed does not reassign references. Buyer profiles use the supplied shared user UUID as their identity. Seed/reset commands serialize through a PostgreSQL transaction advisory lock.

Expected fixture counts: 13 users, 7 buyer profiles, 20 assets, 5 inquiries, and 2 moderation events. `verify:fixtures` compares every stored field to the originals; it is expected to fail after intentional demo edits until reset.

## Explicit demo reset

This command deletes all rows in the five demo tables, including user-created rows, and restores the original fixtures atomically:

```sh
docker compose run --rm -e LOCAL_DEMO_RESET=true app npm run reset-demo
docker compose run --rm app npm run verify:fixtures
```

Reset requires all three conditions: `LOCAL_DEMO_RESET=true`, a non-production environment, and a local PostgreSQL URL for exactly `n5deal_demo`. Allowed hosts are `db`, `localhost`, `127.0.0.1`, and IPv6 loopback. Keep the guard disabled in `.env`; the command above enables it only for that invocation. Reset does not recreate the schema or alter migration history.

## Verification

Run code checks in Docker. Stop the dev app first because build and dev share a `.next` volume:

```sh
docker compose stop app
docker compose run --rm app sh -c 'npm run lint && npm run typecheck && npm run build'
docker compose up -d app
```

Run the focused PostgreSQL integration checks:

```sh
docker compose run --rm app npm run verify:local-db
```

This command recreates **only `n5deal_test`**, applies the committed migrations to the empty test database, and checks fixture counts, duplicate-free reseeding, preservation of edits, identity conflicts, transaction rollback on relationship conflicts, SQL constraints, and exact final fixtures. It requires a local PostgreSQL connection and a database owner able to create/drop the test database. It refuses production mode or a remote host. Negative SQL checks run inside rolled-back transactions; test setup changes stay in the separate test database. No test mutations remain in demo data.

`verify:db` is the underlying check script and expects an empty, migrated `n5deal_test` database. `verify:local-db` recreates that database to make reruns reproducible. Results actually executed are recorded in [docs/LOCAL-VERIFICATION.md](docs/LOCAL-VERIFICATION.md).

## Stop and restart without losing data

```sh
docker compose stop
docker compose start
```

Or recreate the containers while retaining volumes:

```sh
docker compose down
docker compose up -d
```

The named `postgres_data` volume preserves data. Do not pass `--volumes`/`-v` to `docker compose down` when retaining data. Use the same project directory/project name to reuse the same volumes. PostgreSQL 18 stores data under the mounted `/var/lib/postgresql` directory.

Source is bind-mounted for development. Webpack polling makes hot reload work across Docker Desktop. Container `node_modules` and `.next` each have their own named volume, isolating them from host dependencies and build artifacts. The entrypoint compares the dependency lockfile hash and runs `npm ci` when it changes, then generates the Prisma client. Rebuild the image after dependency changes with `docker compose build app`. Run dependency commands inside the container; host Node is optional and must match `.nvmrc` if used.

## Structure and decisions

```text
docs/                         Design and verification documentation
prisma/
  schema.prisma               Original five-table data model
  constraints.sql             Original supplement included in initial migration
  migrations/                 Versioned PostgreSQL DDL
  seed-data.json              Original fictional fixtures and planned demo personas
  fixtures.ts                 Timestamp, enum, and decimal-string parsing
  seed-records.ts              Transaction-scoped insertion and conflict checks
  seed.ts                     Explicit seed entrypoint
scripts/                      Docker entrypoint, reset, and focused verification
src/app/                      Minimal App Router landing page
src/server/db.ts              Server-only Prisma client, cached across dev hot reload
src/generated/prisma/         Generated client; ignored and recreated by Prisma
prisma.config.ts              Prisma 7 schema, migrations, seed, and URL configuration
Dockerfile / compose.yaml     Local application and persistent PostgreSQL services
```

The existing database files were moved into `prisma/`, and `DATABASE-DESIGN.md` into `docs/`, without changing their contents or the data model. No extra business tables, indexes, repositories, service layers, or DI container were introduced.

Node **22.22.2** is declared in `.nvmrc`, `package.json`, and the Docker base image. Next.js **16.3.8**, React **19.3.0**, TypeScript **5.9.3**, and Prisma CLI/client/PostgreSQL adapter **7.10.0** are locked by `package-lock.json`. Prisma 7 uses its generated TypeScript client and the PostgreSQL driver adapter. Separate CLI connections close their pools when finished; the server module caches one client during development hot reload.

Compatibility references: [Prisma 7 upgrade guide](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7) and [Next.js installation requirements](https://nextjs.org/docs/app/getting-started/installation). Scoped dependency overrides for Prisma's `deepmerge-ts` and `mysql2` address available transitive advisory fixes while retaining Prisma 7; their compatibility is checked by generation, migration, seed, and build commands. Remaining dependency advisories are recorded in the verification report.

`N5Deal-Scope-and-Acceptance.md` was not supplied and was not found in the repository. Its contents have not been reconstructed. The supplied Step 3 brief and [database design](docs/DATABASE-DESIGN.md) were used for this foundation; add the missing agreed scope document under `docs/` when available. No applicable `AGENTS.md` was present.
