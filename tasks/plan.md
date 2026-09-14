# FinFlow build task list

Full architecture/rationale: see the plan at
`/Users/chawut.sa/.claude/plans/finflow-line-oa-sleepy-pond.md` (not in-repo; ask Claude to
re-read/update it if needed — it currently still says "Prisma", superseded below).

## ⚠️ ORM decision history (read before touching the data layer)

1. Originally planned: Prisma + MariaDB. **Blocked**: Prisma 8 (npm `latest`) dropped
   MySQL/MariaDB entirely (Postgres/MongoDB only, tied to Prisma's own hosted Platform).
2. Re-planned: Prisma 8 + PostgreSQL (user already stood up a `postgres-db` Docker container
   on the NAS: `postgres:latest` image, **host port 5434**, volume
   `/volume1/docker/postgres/data`, reached over **NAS LAN IP:5434**, not a shared Docker
   network). **Blocked again**: Prisma 8's `orm init --target postgres` scaffolds a totally
   different query API (`db.orm.public.User.where().first()`, not classic `PrismaClient`) with
   **no Auth.js adapter support** — `@auth/prisma-adapter` only targets classic `PrismaClient`.
3. **Final decision (confirmed with user): PostgreSQL + Drizzle ORM.** `drizzle-orm@0.45.2` /
   `drizzle-kit@0.31.10` are the current stable `latest` (not an RC line, unlike Prisma right
   now), `@auth/drizzle-adapter@1.11.3` exists and is stable. All Prisma artifacts have been
   removed from the repo.

Tasks needing secrets/credentials only the user has (Google OAuth, LINE channel, Gemini key,
real DB credentials) are marked **[needs user input]**.

## Phase 0 — Infra & Drizzle scaffolding
- [x] 0.1 NAS provisioning — **done by user**: `postgres-db` container running on the NAS
      (postgres:latest, host port 5434). Cloudflare Tunnel + running the Next.js app itself in
      Docker on the NAS is still open — manual DSM work, not code.
- [x] 0.2a Save original mockup to `docs/mockup.html` as porting reference
- [x] 0.2b Install `drizzle-orm`, `pg`, `@types/pg`, `drizzle-kit`, `dotenv`, `server-only`;
      `drizzle.config.ts` at root; `db:generate`/`db:migrate`/`db:push`/`db:studio` scripts
- [x] 0.2c `.env.example` with all documented env vars (placeholder values)

## Phase 0.5 — Drizzle schema
- [x] 0.5a Write `lib/db/schema.ts` (users/categories/transactions/savingsGoals/appSettings +
      enums) and `lib/db/index.ts` (pg Pool + drizzle client singleton, global-cached).
      `pnpm db:generate` verified working — produced `drizzle/0000_hot_wild_child.sql`.
      **Auth.js tables (accounts/sessions/verificationTokens) deliberately deferred to Phase 1**
      — do not guess `@auth/drizzle-adapter`'s exact expected column shape; verify against the
      installed adapter version when Phase 1 actually starts, then extend `users` + add those
      tables + regenerate the migration.
- [ ] 0.5b **[needs user input]** Real `DATABASE_URL`: NAS LAN IP + the `postgres-db` container's
      actual `POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB` (Container Manager →
      postgres-db → General → Environment Variables — not visible in the screenshot shared so
      far). Once available: put in `.env`, run `pnpm db:push` (or generate+migrate) against the
      real NAS DB, `pnpm db:studio` to confirm tables exist.

## Phase 1 — Auth
- [ ] 1a Verify `@auth/drizzle-adapter`'s exact expected Postgres schema (don't assume from
      memory — this session already got burned twice assuming tool conventions); extend
      `lib/db/schema.ts` with `accounts`/`sessions`/`verificationTokens` + any required `users`
      columns (e.g. `emailVerified`), regenerate migration
- [ ] 1b `next-auth@beta` + `@auth/drizzle-adapter`, `/auth.ts` (Google provider, **JWT session
      strategy** — required so `/proxy.ts` never needs a DB call, allowlist `signIn` callback)
- [ ] 1c `/app/api/auth/[...nextauth]/route.ts`
- [ ] 1d `/proxy.ts` route gating, matcher excludes `/api/auth`, `/api/line/webhook`, `/liff`
- [ ] 1e **[needs user input]** `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`ADMIN_ALLOWED_EMAILS`/`AUTH_SECRET`/`AUTH_URL`

## Phase 2 — Port UI
- [ ] 2a DAL: `lib/data/{dashboard,transactions,goals}.ts` (`import 'server-only'`, wrap in
      React `cache()`, Drizzle query builder reads via `db.query.*` / `db.select()...`)
- [ ] 2b Server Actions: `lib/actions/{transactions,goals}.ts` (`'use server'`, zod-validated,
      re-check session — Proxy matcher exclusions also skip Proxy for Server Actions)
- [ ] 2c Dashboard page + MetricCards + charts (`'use client'`, react-chartjs-2)
- [ ] 2d Transactions page + table + modal
- [ ] 2e Goals page + GoalCard
- [ ] 2f Sidebar/nav + `(app)` layout, mobile-first pass

## Phase 3 — LINE integration **[needs user input: LINE channel secrets, LIFF ID]**
- [ ] 3a `@line/bot-sdk` + `/app/api/line/webhook/route.ts` (raw-body signature verify → text parse)
- [ ] 3b Image/slip handling in webhook (depends on Phase 4 OCR)
- [ ] 3c `/app/liff/page.tsx` + account-binding action
- [ ] 3d Settings: Rich Menu config + test-send push action

## Phase 4 — OCR **[needs user input: GCP Vision credentials]**
- [ ] 4a `lib/ocr.ts` pluggable interface + Google Cloud Vision implementation
- [ ] 4b Thai slip amount/merchant regex parser
- [ ] 4c Manual-correction UI for low-confidence results

## Phase 5 — Gemini coach **[needs user input: GEMINI_API_KEY]**
- [ ] 5a `lib/actions/coach.ts` Server Action + coach page (confirm current Gemini SDK package
      name/model at implementation time — don't carry forward the mockup's placeholder values)

## Phase 6 — Deploy
- [ ] 6a `Dockerfile` (multi-stage Next.js production build)
- [ ] 6b Cloudflare Tunnel wired to app container on the NAS

## Phase 7 — Seed
- [ ] 7a Seed script porting mockup sample data (categories/transactions/savingsGoals; no
      users/accounts — those come from real Google sign-in)
