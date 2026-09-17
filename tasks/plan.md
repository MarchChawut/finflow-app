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
- [~] 0.5b **NAS DB still blocked** (`ad_finfam_user` role: `53300 too_many_connections`,
      confirmed even after killing this session's own dev server, so it's NAS-side, not a
      leaked local pool). Root-caused live during a real Google sign-in attempt: Auth.js
      wraps any adapter DB error into a generic `error=Configuration` page, which is why it
      first looked like an unrelated bug. **Workaround for local dev (in place now):** a
      local Postgres 16 container (`docker run --name finfam-postgres-local ...`, started via
      OrbStack since Docker Desktop isn't installed — `docker` CLI's context is `orbstack`)
      on port 5432, `DATABASE_URL` in `.env` points there with the NAS URL kept commented
      below it for the real deploy. Migrations applied (`pnpm db:migrate`, not `db:push` —
      `push`'s interactive confirmation needs a TTY this environment doesn't have) and
      `pnpm db:seed` run successfully against it. **Still needed for real deploy:** get the
      NAS role's connection limit fixed (`SELECT rolname, rolconnlimit FROM pg_roles WHERE
      rolname='ad_finfam_user';`) and swap `DATABASE_URL` back.

## Phase 1 — Auth
- [x] 1a Verified against the **installed** `@auth/drizzle-adapter@1.11.3`'s own
      `lib/pg.js`/`pg.d.ts` (not memory): extended `lib/db/schema.ts` with `accounts`/`sessions`/
      `verificationTokens` + `users.emailVerified`. `users.id` keeps `.defaultRandom()` — the
      adapter checks `hasDefault` on the id column and omits `id` from its insert when true,
      letting Postgres generate the uuid itself, so no id-format mismatch. Migration regenerated:
      `drizzle/0001_romantic_rocket_raccoon.sql` (schema-only, not yet applied — see 0.5b).
- [x] 1b `next-auth@beta` (5.0.0-beta.32, confirmed still the live `beta` dist-tag) +
      `@auth/drizzle-adapter`, `/auth.ts` (Google provider, JWT session strategy, allowlist
      `signIn` callback against `ADMIN_ALLOWED_EMAILS`)
- [x] 1c `/app/api/auth/[...nextauth]/route.ts`
- [x] 1d `/proxy.ts` (Next.js 16 renamed `middleware.ts` → `proxy.ts`, verified in
      `node_modules/next/dist/docs`) — optimistic JWT-cookie-only redirect gate, matcher excludes
      `/api/auth`, `/api/line`, `/liff`, static assets
- [x] 1e Fixed a real bug: `.env`'s `AUTH_URL` was missing its scheme
      (`"finfam.code-n-fun-house.top"`), which crashed *every* request (`TypeError: Invalid
      URL`). Set to `http://localhost:4005` for local dev (NAS/Tunnel domain kept commented
      below for the real deploy — Tunnel isn't wired up yet, Phase 6b). Confirmed via a raw
      `/api/auth/signin/google` call that Google's OAuth `redirect_uri` now correctly resolves
      to `http://localhost:4005/api/auth/callback/google`, and the flow gets a valid `code`
      back from Google. **User still needs to confirm** that exact URI is registered as an
      authorized redirect URI in Google Cloud Console (it returned a real `code` when tested,
      so it's most likely already there, but not 100% confirmed from this session).

## Phase 2 — Port UI
- [x] 2a DAL: `lib/data/{dashboard,transactions,goals}.ts` + `lib/dal.ts` (`verifySession`) +
      `lib/session.ts` (`getSession`, React-`cache()`-deduped per request)
- [x] 2b Server Actions: `lib/actions/{transactions,goals}.ts` (zod v4, re-checks session)
- [x] 2c Dashboard page + MetricCards + charts (`react-chartjs-2`: income/expense bar +
      category doughnut)
- [x] 2d Transactions page + table (client-side search/filter) + modal
- [x] 2e Goals page + GoalCard (progress bar + inline "add funds" form)
- [x] 2f Sidebar/nav + `(app)` layout (mobile-first, all 6 mockup tabs present — line-sim/
      ai-advisor/settings stubbed as "coming in Phase N" per their real phase)
- [x] "LINE OA Simulator" nav item + its stub page (`app/(app)/line-sim/`) **removed** —
      the real LINE integration (Phase 3) already does what this fake in-browser simulator
      was a placeholder for, so the stub became redundant. The sidebar's "LINE Official
      Status" card's "ลองส่งข้อความทดสอบ" button, which linked here, now points to `/settings`
      (the real, working test-push feature) instead.
- [x] Tailwind v4 `@theme` in `app/globals.css` ported from the mockup's inline `tailwind.config`
      (line/pastel colors, soft shadows); Prompt/Inter self-hosted via `next/font/google`; Font
      Awesome self-hosted via `@fortawesome/fontawesome-free` (no CDN dependency for Docker/Phase 6)
- [x] **Verified live in the browser** — user logged in via Google (as "mindDEV") against the
      local dev Postgres and confirmed the Goals page renders real + seeded data correctly.
- [x] 2e-followup: edit/delete on `GoalCard` — `lib/actions/goals.ts` gained `updateGoal`/
      `deleteGoal`; `components/GoalModal.tsx`'s form extracted into a shared `GoalFormModal`
      (reused by both create and the new `components/EditGoalButton.tsx`) so the two forms
      can't drift apart. Icons are deliberately quiet (muted gray, no background, hover-only
      color) per the user's explicit "ไม่ขวางสายตา" request; delete has a `confirm()` guard
      since it permanently loses the goal's accumulated `currentAmount`. `pnpm build`/`lint`/
      `tsc --noEmit` all clean.

## Phase 3 — LINE integration **[needs user input: LINE channel secrets, LIFF ID]**
Code written and verified against the **actual installed `@line/bot-sdk@11.2.0` API**
(fetched real `.d.ts` from unpkg first — this SDK had a major rewrite from the
`Client`/`middleware()` shape older docs describe; current API is
`messagingApi.MessagingApiClient` + top-level `validateSignature`). Real end-to-end testing
(an actual LINE account messaging the bot) still needs the 3 credentials below — `.env` has
them empty — but everything is proven working via a synthetic signed request (see 3a).
- [x] 3a `@line/bot-sdk` + `/app/api/line/webhook/route.ts` (`lib/line/client.ts`,
      `lib/line/parseMessage.ts`). Verified live: hand-built a `CallbackRequest` JSON body,
      signed it with `LINE_CHANNEL_SECRET` via Node's `crypto` HMAC-SHA256, POSTed to the
      running dev server — got `200 {"ok":true}`, and the parsed transaction (title
      "ข้าวผัดกะเพรา", 60.00, EXPENSE, channel LINE_CHAT, `line_user_id` set) landed in the DB
      correctly. Also verified an invalid signature correctly gets `401`, and that a fake
      `LINE_CHANNEL_ACCESS_TOKEN` makes `replyMessage` fail *without* crashing the webhook
      (caught, logged, still returns 200 — required by LINE).
- [x] 3b Completed by Phase 4 — real slip OCR now runs here instead of the "coming soon" stub.
- [x] 3c `/app/liff/page.tsx` + `components/LiffBinder.tsx` + `bindLineAccount` action.
      `/liff` is excluded from `proxy.ts`'s matcher (opened in LINE's in-app browser — a
      separate cookie context from the user's normal browser session) so the page gates
      itself via `getSession()`. Small side-improvement: `/login` now accepts
      `?callbackUrl=` (open-redirect-guarded to relative paths only) so `/liff`'s
      "please sign in first" link returns here after Google auth instead of always landing
      on `/`.
- [x] 3d — **now fully done, including Rich Menu.** Webhook URL (derived from the real
      request's `Host` header, correct on localhost/tunnel/real deploy) + copy button,
      bound-account status + link to `/liff`, working test-push form, **and** a "ตั้งค่า Rich
      Menu" button that builds + uploads + sets a real 2500×1686 Rich Menu:
      `lib/line/richMenuImage.ts` renders it as SVG→PNG via `sharp` (no hand-designed asset
      existed, so this generates one — 3 columns, app's existing purple/pink/emerald
      palette, simple vector icons, Thai text; **rendering confirmed by actually viewing the
      output PNG**, including that Thai glyphs render correctly via sharp/libvips on this
      machine — worth re-checking if this script ever runs on a different OS/container).
      `lib/actions/line.ts`'s `setupRichMenu()` wires `messagingApiClient.createRichMenu` →
      `messagingApiBlobClient.setRichMenuImage` → `messagingApiClient.setDefaultRichMenu`
      (verified each of these against the actual installed SDK's `.d.ts`, not memory).
      The menu's two "message" quick-actions ("สรุปยอดวันนี้"/"เป้าหมายออมเงิน") aren't just
      decorative — the webhook now recognizes those exact phrases before the money parser
      and replies with a real today's-income/expense summary or goals-progress list
      (verified live: sent both through the running webhook, got 200s, confirmed via the log
      that the underlying DB queries ran without error). The third area deep-links to
      `https://liff.line.me/<LIFF_ID>`. Verified `setupRichMenu()`'s failure path too:
      `createRichMenu` against the still-invalid access token correctly throws 401, caught,
      surfaces the friendly error — doesn't crash.

**Live-wiring status (this session):**
- `LINE_CHANNEL_SECRET` (32 chars) and `NEXT_PUBLIC_LIFF_ID` (19 chars) are in `.env` and
  the right shape.
- `LINE_CHANNEL_ACCESS_TOKEN`: **confirmed invalid** — called `messagingApiClient.getBotInfo()`
  directly (needs only this token, no live message required) and got `401 "Authentication
  failed. Confirm that the access token in the authorization header is valid."` It's 10
  characters; a real one is a long (100+ char) opaque string issued via its own **"Issue"**
  button on the Messaging API tab in the LINE Developers Console — likely the numeric
  Channel ID got pasted into the wrong field. Receiving/parsing messages doesn't need this
  token (only replies/pushes do), so webhook testing below isn't blocked by it.
- Started a `cloudflared` quick tunnel: `https://usa-fig-calgary-montana.trycloudflare.com`
  → confirmed it reaches the dev server (`/login` 200), confirmed the webhook rejects a bad
  signature through it (401) *and* accepts a validly-signed request through it end-to-end
  (200, correct row landed in `transactions`) — so the tunnel + signature verification both
  work against the public internet, not just localhost. **That tunnel later died** (its log
  showed a repeating `"control stream encountered a failure while serving"` retry loop, URL
  stopped resolving) — restarted it, current live URL is
  `https://platforms-coupons-aud-perspective.trycloudflare.com` (re-confirmed `/login` 200
  through it). These URLs change on every restart — fine for today's testing, not the
  permanent Phase 6b setup; if it dies again just ask to restart it.
- **Update:** `LINE_CHANNEL_ACCESS_TOKEN` is now real (172 chars) — verified via
  `messagingApiClient.getBotInfo()` returning the actual bot identity
  (`displayName: "FinFlow"`, `basicId: "@431ghotj"`).
- **Permanent tunnel now live** (no more re-pasting a `trycloudflare.com` URL every
  restart): found this machine already has `cloudflared` authenticated to the user's
  Cloudflare account, and a tunnel named `fim-family-app` with an active connector already
  running **on the NAS** — that one's reserved for the real Phase 6 deployment, left alone.
  Created a *separate* new tunnel, `fin-fam-local-dev` (config:
  `~/.cloudflared/fin-fam-local-dev.yml`, ingress → `http://localhost:4005`), and routed
  `finflow.code-n-fun-house.top`'s DNS to it (`--overwrite-dns`, confirmed with the user
  first since it moves that hostname off `fim-family-app`). Verified live: the domain now
  reaches this dev server (`/login` 200), and `AUTH_URL` was updated to it — confirmed via a
  raw `/api/auth/signin/google` call that Google's `redirect_uri` now correctly resolves to
  `https://finflow.code-n-fun-house.top/api/auth/callback/google`.
- **`DATABASE_URL` also changed independently** (by the user, outside this session) to the
  real NAS Postgres over its Tailscale IP (`100.125.86.64:5434`) with the original
  `ad_finfam_user` credentials — probed it directly: reachable, `finfam_db` exists with all
  8 tables already present. The earlier NAS connection-limit blocker (0.5b) appears
  resolved; the local Docker Postgres (`finfam-postgres-local`) is no longer what the app
  points at as of this restart. Worth confirming with the user whether real data should be
  (re-)seeded on the NAS DB, since it wasn't confirmed whether `pnpm db:seed` has been run
  against it yet.
- **Still needs the user's phone / LINE Developers Console access:** add the OA as a friend
  and send it a real message; open the LIFF link once from inside LINE to test account
  binding; visit `/settings` and click "ตั้งค่า Rich Menu". Also worth updating the LINE
  Console's Webhook URL to `https://finflow.code-n-fun-house.top/api/line/webhook` (currently
  still the old `trycloudflare.com` one from before this domain was fixed) so everything
  sits on one stable domain and the quick tunnel can be shut down. **New required manual
  step:** add `https://finflow.code-n-fun-house.top/api/auth/callback/google` as an
  Authorized redirect URI in the Google Cloud Console OAuth client — the previous
  `localhost:4005` one won't match anymore now that `AUTH_URL` points here.

**3e (new) — "move money into a savings goal" via LINE chat.** `lib/line/matchGoal.ts`
(`findMatchingGoal`, longest-common-Thai-substring fuzzy match, unit-tested against real
goal titles) + `handleSavingsTransfer` in `app/api/line/webhook/route.ts`, triggered by
`เงินออม`/`ออมเงิน`/`เป้าหมาย` appearing in a text message. Records the normal EXPENSE
transaction either way; on a confident goal match, also adds the amount to that goal's
`current_amount` (same SQL as `contributeToGoal`, written directly since the webhook has no
session) and confirms both in the reply; on no confident match, still records the expense
but replies asking the user to name a goal more clearly, listing current goal titles.
**Verified live** against the real dev DB (not just unit tests): sent the user's exact
example message through a signed synthetic webhook request — a -250 EXPENSE landed *and*
"ค่าประกันรถยนต์"'s `current_amount` went from 0 → 250; a no-goal-named variant recorded its
expense but left both goals untouched. Test rows cleaned up afterward; the real +250 goal
contribution was left in place since it's the actual correct state for the user's own
earlier message.

**Operational note:** at the user's request, this session's own background `next dev`
process was stopped — they now run `pnpm dev` themselves in their own VS Code terminal.
`DATABASE_URL` already points at the real NAS Postgres over Tailscale (not the local Docker
one, which was also stopped). The `fin-fam-local-dev` Cloudflare Tunnel (→
`finflow.code-n-fun-house.top`) is still kept running in the background by this session
(separate from their terminal) — ask if it should be turned into a persistent `launchd`
service instead of depending on this session staying alive.

## Phase 4 — OCR **[needs user input: GCP Vision credentials]**
Code written and verified against `@google-cloud/vision@6.1.0`'s real API (`ImageAnnotatorClient`
auto-loads `GOOGLE_APPLICATION_CREDENTIALS` via standard Google ADC; `.documentTextDetection`
→ `fullTextAnnotation.text`/`.pages[0].confidence`). `GOOGLE_APPLICATION_CREDENTIALS` is still
empty in `.env`, so real OCR accuracy is unverified — but the whole pipeline (webhook → OCR
call → parse → DB insert → reply, and the graceful-failure path) is proven. Also completes
**Phase 3b**, replacing its "OCR coming soon" stub with real processing.

Decision: **not persisting slip images** — no object storage exists yet (would mean files on
the NAS disk with no volume-mount story before Phase 6); `transactions.rawSlipUrl` stays
`null`. OCR runs on in-memory bytes, discarded after.

- [x] 4a `lib/ocr.ts` (pluggable `OcrProvider` interface + `googleVisionOcr`), wired into
      `app/api/line/webhook/route.ts`'s image-message handler via `lib/line/client.ts`'s new
      `messagingApiBlobClient` (downloads the slip photo via `getMessageContent`).
- [x] 4b `lib/line/parseSlip.ts` — keyword-anchored amount regex (slips have several numbers;
      anchors on "จำนวนเงิน"/"จำนวน"/lines with "บาท" rather than "first number"). Unit-tested
      with 3 realistic samples: correctly extracted 1,250 and 85, correctly returned `null`
      for a receipt with no clear amount.
- [x] 4c **No schema change** — reused the already-existing (previously unused)
      `transactions.ocrConfidence` column instead of adding a review-queue table. Added
      `updateTransaction` (`lib/actions/transactions.ts`) + extracted `TransactionFormModal`
      (same refactor `GoalModal`→`GoalFormModal` already went through) + `EditTransactionButton`,
      so transactions can finally be edited (previously create+delete only). `TransactionsTable`
      now shows a "ตรวจสอบยอด" (please check) badge on any `SLIP_OCR` row with confidence below
      0.6 — that badge + the new edit button together are the correction UI.

**Verified live (no real GCP credentials needed for these):**
- `parseSlipText()` unit test: 3/3 samples correct.
- Sent a synthetic signed image-message webhook event → confirmed it degrades gracefully:
  `[line webhook] slip OCR failed: 401 Unauthorized` (expected — blob download needs the
  *also still invalid* `LINE_CHANNEL_ACCESS_TOKEN`, tracked in Phase 3) was caught, the
  webhook still replied `200 {"ok":true}` rather than 500.
- Inserted one example low-confidence (`ocrConfidence: 0.42`) `SLIP_OCR` transaction
  directly so the "ตรวจสอบยอด" badge is visible on `/transactions` right now, before any
  real slip has ever been processed.

**Still needed for real OCR accuracy:** a GCP service account with Vision API enabled,
`GOOGLE_APPLICATION_CREDENTIALS` pointing at its JSON key file, plus the still-outstanding
real `LINE_CHANNEL_ACCESS_TOKEN` from Phase 3 (slip download needs it too).

## Phase 5 — Gemini coach **[needs user input: Gemini API key, per family via Settings]**
- [x] 5a `lib/actions/coach.ts` Server Action + `/ai-advisor` page. Built on top of the
      multi-tenant/per-family-credential pattern from Phase 2 (LINE OA): each family's host
      enters their own Gemini API key at `/settings` (encrypted at rest, same
      `lib/crypto/encryption.ts` as LINE credentials) — **no shared/global fallback key**, a
      family with no key configured simply can't use the coach yet (role-aware message: ADMIN
      gets a link to Settings, MEMBER is told to ask their admin).
      SDK: `@google/genai@2.23.0` (current official unified SDK, confirmed via docs — not the
      deprecated `@google/generative-ai`, and not the mockup's placeholder
      `gemini-3-flash-preview`, which isn't a real model). Model: `gemini-2.5-flash`
      (`lib/gemini/client.ts`'s `COACH_MODEL` constant), thinking budget disabled
      (`thinkingConfig.thinkingBudget: 0`) since a few short paragraphs of advice doesn't need
      it. `lib/gemini/prompt.ts`'s `buildFinancialContextText()` feeds the model real,
      current family data (dashboard totals, category breakdown, recent transactions, savings
      goals, budget ratio, recurring bills) instead of the mockup's fake in-memory sum — one
      explicit prompt-injection boundary line added since transaction titles/notes are
      free-text and user-controlled. A 15s per-family cooldown (stored in `app_settings`,
      reusing its existing key/value upsert helper) protects the ADMIN's own key/quota from
      being hammered by other members. Renamed `getFamilyLineCredentialsById` →
      `getFamilySecretsById` in `lib/data/families.ts` since it now carries Gemini's
      encrypted column too, not just LINE's (3 call sites updated).
      `pnpm build`/`lint`/`tsc --noEmit` all clean; migration `drizzle/0008_concerned_bushwacker.sql`
      (single nullable column, `families.gemini_api_key_encrypted`) applied to the real DB.
      **Not yet done:** entering a real Gemini API key and clicking through `/ai-advisor` in
      a real logged-in browser session — no real key was available this session.

## Phase 6 — Deploy
Decided against the originally-sketched Dockerfile: the user chose to SSH into the NAS
directly, `git pull` from GitHub, and run under **PM2** instead of a container. No SSH access
to the NAS exists from this Mac, so the actual deploy commands have to be run by the user —
this session prepared everything needed as a copy-paste runbook instead.
- [x] 6a `ecosystem.config.cjs` (PM2 process definition, port 4005 matching the existing dev
      convention) + `docs/deploy-synology.md` (full runbook: get the code, production `.env`
      checklist — with a loud warning that `ENCRYPTION_KEY` must be copied byte-for-byte from
      the working `.env`, since it's what already-saved family LINE OA/Gemini credentials in
      the real DB are encrypted with — build, migrate, PM2 start/save/startup, an optional
      Task Scheduler recipe for the monthly savings reminder, and troubleshooting notes).
- [ ] 6b Cloudflare Tunnel wired to the app on the NAS. Confirmed via `cloudflared tunnel
      list`/`info` (same Cloudflare account, run from this Mac) that a tunnel named
      `fim-family-app` already has a live connector running **on the NAS itself** — this is
      the one earlier phases' notes called "reserved for the real Phase 6 deployment," and
      `finflow.code-n-fun-house.top` was routed to it before being deliberately moved to the
      dev tunnel (`fin-fam-local-dev`) for local testing. **Not yet done:** the user still
      needs to run `docs/deploy-synology.md`'s steps on the NAS (start the app under PM2,
      point `fim-family-app`'s ingress at `http://localhost:4005`, reload the connector) —
      once confirmed working locally on the NAS, the DNS switch itself
      (`cloudflared tunnel route dns fim-family-app finflow.code-n-fun-house.top
      --overwrite-dns`) is a single command this Mac can run directly, deliberately saved for
      last so the live domain never points at a tunnel with no correct route in between.

## Phase 7 — Seed
- [x] 7a `lib/db/seed.ts` (`pnpm db:seed`) — 4 categories, 5 transactions, 3 savings goals ported
      from `docs/mockup.html`'s sample `state` object; no users/accounts (those come from real
      Google sign-in). Fixed a real bug found on first run: the script imported `lib/db/index.ts`,
      which has `import "server-only"` — that package throws when run under plain `tsx`/Node
      (only Next's bundler special-cases it), so `seed.ts` now opens its own `pg`/drizzle
      connection instead. **Successfully run** against the local dev Postgres (see 0.5b).

## Phase 8 — Settings self-configuration
User asked the Settings page to actually let them self-manage things: categories, an
app-wide usage/license period, plus three self-picked extras (family roles, LINE savings
reminders, CSV export).

- [x] 8a **Categories — full CRUD.** `transactions.categoryId`'s FK had no `onDelete`
      behavior (defaulted to restrict) — deleting an in-use category would have hard-failed;
      changed to `onDelete: "set null"` (migration `drizzle/0002_ordinary_toad_men.sql`).
      `lib/actions/categories.ts` (`createCategory`/`updateCategory`/`deleteCategory`,
      zod-validated, same shape as `goals.ts`), `components/CategoryModal.tsx` (shared
      create+edit form), `EditCategoryButton.tsx`, `CategoriesManager.tsx` (grouped by
      INCOME/EXPENSE) on `/settings`.
- [x] 8b **Usage period.** `app_settings` rows `usage_period_type` (`MONTH`|`YEAR`) and
      `usage_period_expires_at`, read/written via `lib/data/appSettings.ts` +
      `lib/actions/appSettings.ts`. `renewUsagePeriod()` extends by one unit from
      `max(today, currentExpiry)`; `UsagePeriodCard.tsx` also exposes a direct date-edit
      form so shortening the period is just as self-service as extending it. Defaults to
      `MONTH`, 1 month from today, if no row exists yet.
- [x] 8c **Family member roles.** `lib/data/users.ts` / `lib/actions/users.ts`
      (`updateUserRole`), `FamilyMembersManager.tsx`. Deliberately **not** admin-gated —
      consistent with this app's existing unscoped-data precedent, and the only user
      (`chawut.sa@gmail.com`) was still `role: MEMBER` before this feature, so gating would
      have locked the owner out of their own request. Fixed that row to `ADMIN` directly as
      a one-time data correction.
- [x] 8d **CSV export.** `app/api/export/transactions/route.ts` — plain `GET` Route Handler,
      `verifySession()`-gated, UTF-8 BOM + `Content-Disposition: attachment` (no client JS
      needed, browser just downloads on click).
- [x] 8e **Monthly LINE savings reminder — code + manual trigger; real automatic scheduling
      still needs an external caller.** `app_settings.savings_reminder_enabled` toggle,
      `lib/line/reminder.ts`'s `sendSavingsReminder()` (pushes `buildGoalsSummaryText()` —
      extracted from the webhook route into shared `lib/line/summaries.ts` — to every
      LINE-bound user), `app/api/cron/savings-reminder/route.ts` gated by a shared secret
      (`CRON_SECRET` in `.env`) instead of a session, plus a "ส่งตอนนี้เลย" button on
      `SavingsReminderCard.tsx` that calls the same logic directly so the feature works by
      hand today regardless of automation. **Still needed for true monthly automation:**
      something outside this Next.js app calling that route on a schedule (NAS cron once
      Phase 6 ships, or a local `launchd`/cron stand-in in the meantime) — not yet set up.

**Real bugs found and fixed while verifying (not just the intended feature work):**
- `pnpm db:migrate` (drizzle-kit CLI) failed against the real NAS DB with only a swallowed
  spinner error (`ELIFECYCLE ... exit code 1`, no real message). Root-caused by running the
  same migration through `drizzle-orm`'s migrator directly (bypasses the CLI's spinner) —
  real error was `type "channel" already exists`: the DB's tables/types already existed
  (applied via some earlier method that didn't use `drizzle-kit migrate`), but
  `drizzle.__drizzle_migrations` was completely empty, so the migrator tried to replay
  migration `0000` from scratch and immediately conflicted. Fixed by inserting the 3
  correct tracking rows (sha256 hash of each `.sql` file + its `_journal.json` timestamp,
  matching exactly what `drizzle-orm`'s own migrator writes) so the CLI's bookkeeping
  matches the schema's real, already-correct state. `pnpm db:migrate` now runs clean.
- `proxy.ts`'s auth-gate matcher excluded `api/auth`/`api/line`/`liff` but not the new
  `api/cron` route — so the cron endpoint (meant to be called by an external scheduler with
  no session cookie, authenticating via its own `CRON_SECRET` instead) was being redirected
  to `/login` for every request, even with a correct secret, making it completely
  unreachable from outside a browser. Added `api/cron` to the matcher's exclusion list.

**Verified:**
- `pnpm build && pnpm lint && tsc --noEmit` all clean.
- `pnpm db:migrate` runs clean against the real NAS DB (after the bookkeeping fix above);
  the FK `onDelete: set null` change is live.
- Seeded the 4 example categories (เงินเดือน & โบนัส / อาหาร & เครื่องดื่ม / เดินทาง & น้ำมัน /
  ช้อปปิ้ง & ความบันเทิง) directly into the real NAS DB — deliberately **not** the rest of
  `seed.ts` (sample transactions/goals), since that would mix fabricated data into the
  user's real financial records.
- `chawut.sa@gmail.com`'s role confirmed updated to `ADMIN` in the real DB.
- `/api/cron/savings-reminder`: confirmed 401 with no/wrong secret, 200 with the correct
  secret (both as an `X-Cron-Secret` header and as a URL-encoded `?secret=` query param —
  the raw base64 secret contains `+`/`=` characters that need URL-encoding if passed
  unencoded in a query string, since `+` decodes to a literal space; noting this for
  whoever sets up the NAS cron job later), correctly returns `{"skipped":true,"reason":
  "reminder disabled"}` right now since the toggle defaults off.
- `/api/export/transactions` and `/settings` both correctly redirect to `/login` when
  unauthenticated (proxy.ts's normal session gate, as intended for these two — unlike the
  cron route, they're meant to be browser-only).
- **Not yet done:** clicking through the actual UI in a real logged-in browser session (add/
  edit/delete a category, renew/edit the usage period, change a role, download the CSV,
  toggle the reminder + send-now) — the Claude-in-Chrome browser extension was not
  connected this session, so this final visual pass is still the user's to do themselves.
