# Deploy FinFlow to the Synology NAS (PM2, no Docker)

Runbook for running the production instance directly on the NAS via SSH + PM2, wired to the
existing `fim-family-app` Cloudflare Tunnel. Everything below runs **on the NAS**, over SSH,
unless a step says otherwise.

## 0. Before you start

- **`ENCRYPTION_KEY` must be copied byte-for-byte from the working `.env` on this Mac** — do
  NOT generate a new one. The LINE OA and Gemini credentials already saved by real families in
  the production DB are encrypted with the current key; a different key on the NAS makes every
  one of them silently undecryptable (features quietly report "not configured," no error to
  point at why).
- Check port `4005` (or whatever you pick) is free on the NAS — it already runs several other
  tunneled apps (`cfh-lms-app`, `ems-app`, `digital-hygiene`, etc.). If it's taken, change the
  port in **both** `ecosystem.config.cjs` and the Cloudflare Tunnel ingress rule in step 5.
- Node.js (18+) and `pnpm` need to be available on the NAS (via Synology's Node.js package, or
  however you already run other Node apps there).

## 1. Get the code

```bash
git clone https://github.com/MarchChawut/finflow-app.git
cd finflow-app
# or, if already cloned:
git pull origin main

pnpm install
```

## 2. Production `.env`

Copy `.env.example` to `.env` and fill in real values:

| Var | Value |
|---|---|
| `DATABASE_URL` | Same value as the working `.env` on this Mac (Tailscale IP to `postgres-db`). Optional: since the app now runs on the same NAS as Postgres, `postgresql://<user>:<password>@localhost:5434/<db>` removes the Tailscale dependency for this traffic — not required, only do this if you want the optimization. |
| `AUTH_SECRET` | Same value as the working `.env`. |
| `AUTH_URL` | `https://finflow.code-n-fun-house.top` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Same values as the working `.env` — no Google Cloud Console change needed, the domain doesn't change. |
| `ENCRYPTION_KEY` | **The exact same value as the working `.env`** — see the warning above. |
| `CRON_SECRET` | Same value as the working `.env` (only matters if you set up step 6). |
| `GEMINI_API_KEY`, `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_CHANNEL_SECRET`, `NEXT_PUBLIC_LIFF_ID*` | Leave unset — the app no longer reads these; every family configures its own LINE OA / Gemini key in Settings, stored in the DB. |
| `GOOGLE_APPLICATION_CREDENTIALS` | Only if you want slip OCR working — path to a service-account JSON key file. Leave unset otherwise. |

## 3. Build and migrate

```bash
pnpm build
pnpm db:migrate    # safe to re-run — this DB is already at the latest migration from this Mac's earlier work
```

## 4. Run under PM2

```bash
# if pm2 isn't already installed on the NAS:
pnpm add -g pm2

pm2 start ecosystem.config.cjs
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4005/login   # expect 200

pm2 save
pm2 startup   # prints a one-time command to run as root so PM2 survives a NAS reboot — run that printed command
```

## 5. Point the Cloudflare Tunnel at the app

The `fim-family-app` tunnel already has a live connector running on this NAS. Find its config —
it's one of these three, depending on how it was originally set up:

- **Manual/systemd `cloudflared` install**: look for `config.yml` under `~/.cloudflared/` for
  the user that runs the `cloudflared` service, or check `systemctl status cloudflared` /
  `synoservicecfg` for the config path it was started with.
- **Synology "Cloudflare Tunnel" package** (if installed via Package Center): its config is
  managed through that package's own UI/settings, not a plain YAML file.
- **`cloudflared` running as a Docker container** (via Container Manager): check the
  container's mounted volumes for a `config.yml`, or its environment for `TUNNEL_TOKEN` (token
  mode manages ingress remotely via the Cloudflare Zero Trust dashboard instead of a local
  file — in that case, edit the ingress rule at **Zero Trust → Networks → Tunnels →
  fim-family-app → Public Hostname** instead).

Either way, the hostname `finflow.code-n-fun-house.top` most likely already has an ingress rule
here (this tunnel served this domain before it was temporarily moved to a dev tunnel) — update
its target to:

```yaml
service: http://localhost:4005
```

Then reload/restart whichever mechanism runs the connector (`systemctl restart cloudflared`,
restart the Docker container, or the package's own restart action) so the new rule takes effect.

**Verify from the NAS itself** before going further:
```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4005/login   # expect 200 (from step 4)
```

Once this is done, let the person running the deploy from the Mac side know — the DNS record for
`finflow.code-n-fun-house.top` still points at the dev tunnel and needs to be flipped over to
`fim-family-app` (done from that side, not here — flipping it before this step is confirmed would
break the live domain in between).

## 6. Optional — automate the monthly savings reminder

The feature already works via the manual "ส่งตอนนี้เลย" button in Settings regardless of this step.
To make it actually automatic, add a Synology **Task Scheduler** job (Control Panel → Task
Scheduler → Create → Scheduled Task → User-defined script), monthly, running:

```bash
curl -X GET https://finflow.code-n-fun-house.top/api/cron/savings-reminder \
  -H "X-Cron-Secret: <same value as CRON_SECRET in .env>"
```

## Troubleshooting

- **App won't start / `pm2 logs finflow` shows errors**: check `.env` is actually present and
  readable in the app's working directory — `pm2`'s `cwd` must match where `.env` lives.
- **LINE OA / Gemini coach report "not configured" for a family that already set one up**:
  almost certainly `ENCRYPTION_KEY` doesn't match — go back to step 0.
- **`https://finflow.code-n-fun-house.top` doesn't reach the NAS at all after the DNS switch**:
  confirm the tunnel's ingress rule (step 5) was actually reloaded, not just edited on disk.
