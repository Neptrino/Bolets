# Bolets VPS deployment

This deployment runs the Next.js application, the official self-hosted
Supabase stack and Umami analytics on one VPS. Caddy is the only public ingress.
The Supabase API gateway, database pooler, Studio and direct Umami port bind to
loopback.

The target is the VPS-2 class discussed for this project: 4 vCPU, 8 GB RAM and
at least 75 GB NVMe. Supabase currently recommends 4 cores, 8 GB RAM and 80 GB
SSD for the full small-to-medium production stack. Keep at least 15 GB free for
image updates, temporary dumps and database maintenance.

## Layout

Use these paths on the VPS:

```text
/opt/bolets/app       this repository
/opt/bolets/releases  immutable application releases keyed by Git commit
/opt/bolets/supabase  official Supabase self-hosted files
/opt/bolets/secrets   root-readable function, status, Umami, Instagram and optional observability environment files
/var/backups/bolets   short-lived local backups copied off the VPS
```

After GitHub deployment is enabled, `/opt/bolets/app` is an atomic symlink to
the active release. Supabase configuration, database volumes, function secrets
and backups remain outside the application release tree.

The Supabase deployment is deliberately not vendored here. It is pinned to an
official `self-hosted/v*` release and updated with Supabase's `update.sh`. The
Bolets Compose file is a narrow override, which keeps upstream upgrades
reviewable.

## 1. Prepare the host

Use a current Ubuntu or Debian LTS release. Install Docker Engine from Docker's
official repository, the Compose plugin, Git, `jq`, `curl`, `openssl`, and
`rclone`. Require SSH keys, disable password login, enable unattended security
updates, and allow only SSH, TCP 80, TCP/UDP 443 through both the provider
firewall and the host firewall. Do not expose 3001, 5432, 6543 or 8000
publicly.

Use a non-root administrative user that belongs to the `docker` group and owns
`/opt/bolets` for initial setup and manual maintenance. Treat membership in the
Docker group as root-equivalent. The automated deployment identity configured
later is separate and can invoke only the root-owned release receiver.

After confirming that a second public-key SSH session works, install the
supplied SSH policy and validate it before reloading the daemon:

```bash
sudo install -m 644 deploy/vps/sshd-hardening.conf \
  /etc/ssh/sshd_config.d/00-bolets-hardening.conf
sudo sshd -t
sudo systemctl reload ssh
sshd -T | grep -E 'passwordauthentication|permitrootlogin|pubkeyauthentication'
```

Keep the existing SSH session open until a fresh key-only login succeeds.

Point these DNS records at the VPS before starting Caddy:

```text
bolets.app      A/AAAA -> VPS
www.bolets.app  A/AAAA -> VPS
api.bolets.app  A/AAAA -> VPS
```

Create `analytics.bolets.app` only after the first rollout has changed Umami's
default administrator password. Keep it DNS-only when Cloudflare proxy IPs are
not suitable for the site's network path.

## 2. Install a pinned Supabase release

The version below matches the official documentation reviewed when this
deployment was added. Check the self-hosted changelog before changing it.

```bash
git clone --depth 1 --branch self-hosted/v0.8.0 \
  https://github.com/supabase/supabase /tmp/supabase-source
mkdir -p /opt/bolets/supabase /opt/bolets/secrets
cp -a /tmp/supabase-source/docker/. /opt/bolets/supabase/
printf 'ref=self-hosted/v0.8.0\n' > /opt/bolets/supabase/.supabase-version
cd /opt/bolets/supabase
cp .env.example .env
sh utils/generate-keys.sh
sh utils/add-new-auth-keys.sh
```

Inspect the two key-generation scripts before running them. Confirm that every
placeholder credential in `.env` was replaced. Do not commit `.env`, signing
keys, database dumps or `/opt/bolets/secrets`.

Merge the settings from `deploy/vps/bolets.env.example` into the generated
Supabase `.env`; do not replace the generated file with the example. Set a real
TLS email and domains. Keep `COMPOSE_FILE=docker-compose.yml`: the optional
Logflare/Vector stack is intentionally disabled on the initial 8 GB host.

The field notebook depends on passwordless email. Configure a transactional
SMTP account with SPF, DKIM and DMARC for the sending domain, keep its password
only in the root-owned Supabase `.env`, and leave phone and anonymous sign-in
disabled. `MAILER_TEMPLATES_MAGIC_LINK` points GoTrue at the version-controlled
template that displays `{{ .Token }}` as a six-digit code. Test delivery to at
least two unrelated mail providers before opening signups; the local Mailpit
flow is not evidence that production delivery works.

Passkeys are enabled by the Bolets Compose override and bound to the stable
`bolets.app` relying-party ID. Keep that ID unchanged after users start
enrolling credentials; both `https://bolets.app` and
`https://www.bolets.app` are accepted origins. Email codes remain available as
the recovery method while the Supabase passkey API is experimental.

Google sign-in stays hidden until `GOOGLE_ENABLED=true` and a client ID and
secret are stored in the root-owned Supabase `.env`. In Google Cloud, register
`https://bolets.app` and `https://www.bolets.app` as authorized JavaScript
origins and `https://api.bolets.app/auth/v1/callback` as the authorized redirect
URI. Never use the application callback URL as Google's provider callback;
GoTrue receives the provider response first and then returns to
`https://bolets.app/auth/callback`.

Copy `deploy/vps/functions.env.example` to
`/opt/bolets/secrets/functions.env`, populate the required Open-Meteo relay
values, and run `chmod 600` on the file. The direct AROME shadow credential is
still optional, but the parallel ingestion lanes require both relay URLs and
their distinct HMAC secrets.

Deploy one Cloudflare Worker zone before enabling the self-hosted cron jobs.
It is a narrow authenticated egress relay, not a cache or public proxy, and it
contains no Supabase credentials:

```bash
npm ci
npx --yes wrangler@4.125.0 login
relay_secret=$(openssl rand -hex 32)
printf '%s' "$relay_secret" | npx --yes wrangler@4.125.0 secret put RELAY_HMAC_SECRET \
  --config workers/open-meteo-relay/wrangler.jsonc
npm run worker:check
npm run worker:deploy
```

Copy the exact `https://...workers.dev/v1/fetch` URL printed by the deployment
and `relay_secret` into `/opt/bolets/secrets/functions.env`. Do not create more
Worker zones: the database deliberately coordinates one Cloudflare lane, one
AWS Lambda lane, and one VPS lane under one global provider budget. Rotate the relay secret by
installing the new Worker secret and updating the VPS file in the same
maintenance window, then restart the `functions` service.

Bootstrap `lambda/open-meteo-relay` once with the short-lived local AWS session,
then let the production GitHub environment assume the narrowly scoped OIDC
deployment role. Copy the stack's Function URL with `/v1/fetch` and its distinct
HMAC secret into `/opt/bolets/secrets/functions.env`. The Lambda has reserved
concurrency four, but PostgreSQL still leases only one shard to the AWS lane at
a time.

Copy `deploy/vps/umami.env.example` to
`/opt/bolets/secrets/umami.env`, generate the three service secrets and the
administrator password independently with `openssl rand -hex 32`, replace every
placeholder, choose the public-session heatmap sample rate, and run `chmod 600`
on the file. The default records click and scroll heatmaps for 15% of eligible
public sessions. The website UUID is public and versioned so the application
and idempotent Umami bootstrap agree before the first request is collected.

Create the independent private-status credential before the first rollout that
contains the operations page:

```bash
cp deploy/vps/status.env.example /opt/bolets/secrets/status.env
docker run --rm caddy:2.10.2-alpine \
  caddy hash-password --plaintext 'A-NEW-LONG-PASSWORD'
openssl rand -hex 32
```

Put the Caddy hash (quoted so its dollar signs remain literal) and the unrelated
random internal token in `status.env`, then run `chmod 600` on it. Keep the
plaintext Basic Auth password in the password manager; the internal token is
only a Caddy-to-Next.js and Alloy-to-Next.js credential and should never be used
in a browser. Caddy strips any client-supplied copy of that internal header.

### Instagram profile and daily prediction

The footer links through `/instagram`, which resolves the configured profile at
request time. The daily publisher sends the signed 1080 × 1350 feed card and
1080 × 1920 Story card to Buffer only when their verified observation belongs
to the current civil day in `Europe/Madrid`. Before creating either item, it
reads the channel's recent posts for the feed date marker and the dated Story
asset identity, ignoring refreshes to its signed prediction payload, so
restarting or manually invoking the timer does not publish the same day twice.
Missing, withheld and stale predictions fail closed.

The account must be an Instagram Professional account for automatic publishing.
In Buffer, use **New channel → Instagram → Connect with Instagram** and sign in
directly with the `bolets.app` Instagram account; a Facebook Page or Facebook
login is not required for this connection method. Confirm in Buffer that the
channel is connected and automatic publishing is enabled.

Create a personal API key in Buffer's developer area. Give it only
`accountRead`, `postsRead` and `postsWrite`, choose the shortest practical
expiry, and save the expiry date in the password manager. The publisher finds
the `bolets.app` Instagram channel automatically and refuses to publish if it is
missing, disconnected, locked or ambiguous.

Create the root-only configuration before enabling publication:

```bash
cp deploy/vps/instagram.env.example /opt/bolets/secrets/instagram.env
openssl rand -hex 32
chmod 600 /opt/bolets/secrets/instagram.env
```

Set the exact public profile URL, replacement Buffer API key, Buffer channel
name and the independently generated publish secret. Never paste the Buffer key
into source control, chat or shell history. Rotate it before its expiry; a failed
timer is intentionally visible in the system journal instead of silently
posting with a different account or stale credential.

After a rollout has loaded the file, invoke the root-only publishing script once
and confirm the returned Buffer post ID and the post on Instagram. The public
proxy deliberately blocks `/api/internal/*`; the script calls the authenticated
route from inside the application container. The endpoint serves the signed PNG
cards that Buffer can fetch from their public URLs. Then install the daily timer:

```bash
sudo /opt/bolets/app/deploy/vps/publish-instagram-daily.sh
sudo install -m 644 deploy/vps/bolets-instagram.service /etc/systemd/system/
sudo install -m 644 deploy/vps/bolets-instagram.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now bolets-instagram.timer
sudo systemctl status bolets-instagram.service bolets-instagram.timer
```

The timer runs at 07:00 Europe/Madrid, following daylight-saving time. The
publisher still requires the current Catalonia civil day's verified overview,
so it fails closed instead of posting stale data if the daily environment
refresh and condition-cache publication have not completed. It catches up after
host downtime. Inspect failures with
`journalctl -u bolets-instagram.service`; do not add blind POST retries because
an interrupted response can occur after Buffer has accepted the publication.

The growth schedule adds an educational carousel on Wednesday at 19:00 and a
short weekend Reel on Friday at 18:00. Both jobs use the same signed current-day
overview, reject off-schedule invocations and check a format-specific date
marker before publishing. Install them after the application image includes
`ffmpeg`, which renders the signed Reel frames into the public MP4 consumed by
Buffer:

```bash
sudo install -m 755 deploy/vps/publish-instagram-growth.sh /opt/bolets/app/deploy/vps/
sudo install -m 644 deploy/vps/bolets-instagram-growth@.service /etc/systemd/system/
sudo install -m 644 deploy/vps/bolets-instagram-education.timer /etc/systemd/system/
sudo install -m 644 deploy/vps/bolets-instagram-weekend.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now bolets-instagram-education.timer bolets-instagram-weekend.timer
sudo systemctl list-timers 'bolets-instagram*'
```

Do not start either growth service merely to test it: the endpoint intentionally
rejects the wrong weekday, while a successful scheduled call publishes at once.
Preview the signed image and Reel routes instead. The authenticated admin report
at `/admin/status/instagram` shows the latest 30-day metrics returned by Buffer.

## 3. Check out Bolets and validate Compose

```bash
git clone <BOLETS_REPOSITORY_URL> /opt/bolets/app
cd /opt/bolets/app
git switch main
cd /opt/bolets/supabase
set -a
. /opt/bolets/secrets/umami.env
. /opt/bolets/secrets/status.env
set +a
docker compose \
  -f docker-compose.yml \
  -f /opt/bolets/app/deploy/vps/compose.yaml \
  config --quiet
```

The override uses Compose's `!override` tag, so Docker Compose 2.24.4 or newer
is required. Its rendered configuration must show ports 3001, 5432, 6543 and
8000 bound only to `127.0.0.1`.

## 4. Restore the managed project

Keep the hosted project live while rehearsing this step. Follow Supabase's
platform-to-self-hosted procedure: use `supabase db dump`, not raw `pg_dump`, to
create separate roles, schema and data SQL files. Restore them into a disposable
self-hosted instance first and compare extensions, table counts, functions,
cron jobs, and representative prediction reads.

The project and the self-hosted image both target PostgreSQL 17. Check the live
project's exact major version and enabled extensions before the final dump.

The official shape of the export is:

```bash
supabase db dump --db-url "$MANAGED_DATABASE_URL" -f roles.sql --role-only
supabase db dump --db-url "$MANAGED_DATABASE_URL" -f schema.sql
supabase db dump --db-url "$MANAGED_DATABASE_URL" -f data.sql --use-copy --data-only
```

Restore with `ON_ERROR_STOP` and a single transaction as described by the
official guide. Never place database URLs or dumps in the repository. A managed
restore includes schema, rows, RLS, RPCs, triggers and Auth rows; it does not
carry over working JWT keys, service configuration, function files or object
bytes. Existing login tokens become invalid after the key change. Schedule a
visible maintenance window for the field notebook and tell users they will
need a new email code after cutover; never describe Auth rows as disposable.

For a deliberately fresh database instead, start Supabase and apply the
version-controlled migrations with the current Supabase CLI against the
loopback pooler. Do not do both a full managed schema restore and a fresh replay
into the same database.

The August 2026 rehearsal found a narrow version skew between the managed
project and `self-hosted/v0.8.0`: one newer Auth column, newer Storage columns,
and two platform-only role settings. After generating a dump, prepare the
restore copies with:

```bash
deploy/vps/prepare-platform-restore.sh /secure/path/to/dump
```

The script writes `roles.restore.sql` and `data.restore.sql`. It skips the
incompatible Auth/Storage blocks only when all eight affected blocks contain
zero rows, as they did in the pre-account rehearsal. Once the field notebook
has users or photographs, this compatibility shortcut is intentionally
unusable: rehearse a release-specific, data-preserving Auth/Storage transform
or use the verified production backup restore path instead. Start the pinned Supabase services once before the
restore so their release-owned roles and internal schemas are initialized, then
stop every service except `db` and restore `roles.restore.sql`, `schema.sql` and
`data.restore.sql` in one transaction. Re-check the official restore guide and
self-hosted changelog before relying on this compatibility step for a later
release.

## 5. Copy Storage correctly

Do not download managed objects and place them directly under
`volumes/storage`; the internal layout differs. Use Supabase's S3-to-S3 `rclone`
procedure. The database restore supplies bucket definitions, and `rclone copy`
transfers object bytes through the Storage API. Verify byte and object counts on
both sides. The `environment-shadow` bucket must remain private.

## 6. Install functions and configure scheduled ingestion

Start the stack once, copy the Bolets functions while preserving Supabase's
release-owned `main` router, and apply the database-specific Vault values:

```bash
/opt/bolets/app/deploy/vps/sync-functions.sh \
  /opt/bolets/app /opt/bolets/supabase

cd /opt/bolets/supabase
docker compose \
  -f docker-compose.yml \
  -f /opt/bolets/app/deploy/vps/compose.yaml \
  up -d --wait

anon_key=$(sed -n 's/^ANON_KEY=//p' .env)
ingestion_token=$(openssl rand -hex 32)
docker exec -i supabase-db psql --username postgres --dbname postgres \
  --variable project_url=http://api-gw:8000 \
  --variable anon_key="$anon_key" \
  --variable ingestion_token="$ingestion_token" \
  < /opt/bolets/app/deploy/vps/configure-vault.sql
```

Run the last command from a shell where the generated Supabase `.env` has been
loaded and store `ingestion_token` in the external secret manager before the
shell exits. This rotates the Vault values after restore because managed Vault
ciphertext must not be assumed decryptable with the new host's encryption key.
It also updates the independent hash checked by ingestion functions.

Rotate any optional named maintenance tokens (`spatial-import`,
`clms-soil-import`, `arome-shadow-stage`) separately before using those paths.
Service-role imports remain available to controlled maintenance workers.

The platform dump excludes the `cron` schema. Recreate the final versioned job
definitions after the restore:

```bash
docker exec -i supabase-db psql --username postgres --dbname postgres \
  < /opt/bolets/app/deploy/vps/configure-cron.sql
```

This installs eleven jobs but leaves them inactive so the managed project remains
the sole writer during rehearsal. After the final synchronized restore and
immediately before cutover, enable them explicitly:

```bash
docker exec -i supabase-db psql --username postgres --dbname postgres \
  < /opt/bolets/app/deploy/vps/enable-cron.sql
```

Verify `cron.job` contains exactly eleven active Bolets jobs and inspect
`cron.job_run_details` plus `ingestion_runs` after the first cycle.

## 7. Roll out the app

```bash
/opt/bolets/app/deploy/vps/rollout.sh \
  /opt/bolets/app /opt/bolets/supabase
```

The script loads the root-only Umami and private-status environments, validates the merged Compose
model, builds the standalone Next.js image, applies every pending SQL migration
in timestamp order through `supabase_migrations.schema_migrations`, and
synchronizes Edge Functions only after that schema is ready. It then waits
for healthy services, replaces Umami's default administrator password, creates
the fixed Bolets website record idempotently, and restarts the function
runtime. Before completing, it warms the server-side daily overview cache from
inside the candidate app container, so the first visitor after a rollout does
not wait for its bounded territorial aggregation. A failed warm is a failed
rollout and restores the previous application. On the first ledger-backed
rollout only, the runner verifies the fixed managed-project restore contract
and records its 121-migration baseline without replaying historical SQL. Every
later migration is discovered from `supabase/migrations`, applied atomically,
and recorded in that standard ledger. Missing files, remote-only versions,
non-contiguous history, partial untracked restores, and final inventory
mismatches all fail the rollout before Edge Functions or the app are replaced.
The app uses the internal gateway URL; its server credentials never travel
through public DNS.

After this first rollout succeeds, add the DNS-only
`analytics.bolets.app -> 51.255.40.179` record. Verify
`https://analytics.bolets.app/api/heartbeat`, sign in with `admin` and the
password stored in `/opt/bolets/secrets/umami.env`, then enable two-factor
authentication. The application loads Umami once from its root layout, accepts
only the production Bolets hostnames, respects Do Not Track, and excludes query
strings and fragments so map state is not collected. The bootstrap enables
click and scroll heatmaps but keeps session replay disabled. A browser-side
fail-closed filter strips query strings and fragments from heatmap events,
rejects recorder payloads on private routes, and drops any replay payload even
if the Umami setting is changed manually. The same bootstrap creates the
`User signup`, `Finding added`, `Infographic downloaded`, `Infographic shared`,
`Homepage video play`, `Map cell click` and `Map species change` saved goal
reports, together with goals for homepage video completion and map calls to
action, successful map geolocation, species-profile map opens and finding-form
starts. Their allowlisted events contain only the event name and a neutral
virtual path; they do not attach an account identifier, species, map cell,
coordinates, finding data or infographic metadata. It also creates `Signup
completion` and `Finding sync completion` funnels from the anonymous start and
completion events. Core Web Vitals are collected only for analytics-eligible
public pages through Umami's performance report.

The private operational dashboard is available at
`https://bolets.app/admin/status`. It reuses the normal Supabase Auth sign-in
and authorizes the server-validated user through the non-user-editable
`app_metadata.app_role` value. The `admin` role is required for every dashboard
read and mutation; the separate internal token remains reserved for the private
Prometheus endpoint. The page is not linked from the public site, returns
private/no-store and noindex headers, is excluded from Umami and is never cached
by the offline worker. It reads one service-role-only, `security invoker` RPC and
shows the latest published weather generation, rolling-state coverage, current
shards and lanes, shared provider budget, source health, generation cursors and
sanitized recent ingestion errors. It does not expose raw run metadata, Vault,
service keys or container logs.

The publication section separates the user-visible products: observed
atmosphere, observed soil moisture, the latest complete five-day forecast and
the score-map caches. It reports expected versus available point counts and the
forecast validity edge. Rolling AROME and rain state is kept in an explicitly
technical disclosure because it is input continuity for incremental ingestion,
not another published map product.

The same signed Supabase session exposes allowlisted manual controls for the complete
daily cycle, spatial atmosphere, soil plus forecast, regional summaries, XEMA
rain and condition caches. Commands cross a same-origin Next.js route and a
service-role-only database dispatcher; the browser never receives the ingestion
token. An incomplete generation resumes from its cursor, while a completed
selected generation is reset before it is queued again. The previous complete
observed condition cache remains published during reconstruction; a forecast
resync can temporarily withhold the forecast until all horizons are complete.

## Optional Grafana Cloud observability

The repository includes a digest-pinned Grafana Alloy collector. It stays off
until `/opt/bolets/secrets/observability.env` exists, so a missing external
Grafana account cannot break deployments. Create a Grafana Cloud Free stack and
an access-policy token with only `MetricsPublisher` and `LogsPublisher`, copy
`deploy/vps/observability.env.example` to that root-readable path, fill in the
Prometheus and Loki endpoints/instance IDs shown by Grafana, and set mode 0600.
The next normal rollout detects the file and starts Alloy automatically.

Alloy has no public listener and no Docker socket. It sends an allowlisted set
of host CPU, memory, load and network metrics; the authenticated bounded Bolets
pipeline metrics; and only new Docker JSON log lines. Its filesystem is
read-only and the image runs without Linux capabilities. Existing log history
is not uploaded during first boot.

Validate after enabling:

```bash
cd /opt/bolets/supabase
set -a
. /opt/bolets/secrets/umami.env
. /opt/bolets/secrets/status.env
. /opt/bolets/secrets/observability.env
set +a
docker compose -f docker-compose.yml \
  -f /opt/bolets/app/deploy/vps/compose.yaml \
  -f /opt/bolets/app/deploy/vps/compose.observability.yaml \
  ps alloy
docker compose -f docker-compose.yml \
  -f /opt/bolets/app/deploy/vps/compose.yaml \
  -f /opt/bolets/app/deploy/vps/compose.observability.yaml \
  logs --tail 100 alloy
```

Start with alerts for `up{job="bolets-operations"} == 0` for 5 minutes,
`bolets_operational_status{state="critical"} == 1` for 5 minutes,
`bolets_operational_status{state="attention"} == 1` for 30 minutes, host free
memory below 10%, and disk usage from the provider/VPS monitor. Add an external
synthetic check for `https://bolets.app/api/health`; do not use the Basic Auth
dashboard URL as a public check. Grafana's official Alloy component references
remain the source of truth for future upgrades:
<https://grafana.com/docs/alloy/latest/reference/components/>.

## 8. Deploy `main` automatically

`.github/workflows/deploy-vps.yaml` runs unit tests, linting, application and
Worker type checks, a Worker dry-run bundle, and a production build for every
push to `main`. It deploys the tested Worker bundle, then sends an archive of
that exact commit to a forced-command SSH identity. The receiver builds and checks
the candidate release before atomically updating `/opt/bolets/app`; a failed
rollout restores the preceding application and function release. Concurrent
production deployments are serialized on both GitHub and the VPS.

Create a dedicated Ed25519 key locally. Do not reuse a personal SSH key:

```bash
ssh-keygen -t ed25519 -f ./bolets-github-actions -N '' \
  -C 'github-actions:bolets.app'
scp ./bolets-github-actions.pub ubuntu@51.255.40.179:/tmp/
scp deploy/vps/install-github-deploy.sh deploy/vps/receive-release.sh \
  ubuntu@51.255.40.179:/tmp/
ssh ubuntu@51.255.40.179 \
  'sudo /tmp/install-github-deploy.sh /tmp/bolets-github-actions.pub'
```

Store the private key and the VPS's independently verified Ed25519 host-key
line as GitHub Actions repository or `production` environment secrets:

```bash
gh secret set VPS_SSH_PRIVATE_KEY < ./bolets-github-actions
ssh-keyscan -t ed25519 51.255.40.179 > ./bolets-known-hosts
# Verify this fingerprint through the provider console or an existing trusted
# SSH session before storing it; ssh-keyscan alone does not authenticate it.
ssh-keygen -lf ./bolets-known-hosts
gh secret set VPS_KNOWN_HOSTS < ./bolets-known-hosts
```

Also create production secrets `CLOUDFLARE_ACCOUNT_ID` and
`CLOUDFLARE_API_TOKEN`. Scope the token to Workers Scripts: Edit for only the
account that owns this Worker. The HMAC relay secret is intentionally not in
GitHub; Wrangler preserves the separately installed encrypted Worker secret
across code deployments.

Delete the local private-key copy after GitHub has accepted it. To rotate the
identity, rerun the installer with a new public key and replace the GitHub
secret. Reinstall the root-owned receiver manually after reviewing any future
change to `receive-release.sh`; application releases cannot modify it.

This workflow has no managed Supabase token or project reference. It deploys
the relay to Cloudflare and the Next.js app plus version-controlled Edge
Functions to the pinned self-hosted stack. Keep the old managed project intact during the
rollback window, but disable its scheduled writers once the self-hosted cron
cycle and restore procedure have been verified. Project deletion is a separate,
irreversible retirement operation.

Before changing production DNS, verify:

```bash
curl --fail https://bolets.app/api/health
curl --head https://api.bolets.app/functions/v1/read-environment
curl --head https://api.bolets.app/auth/v1/health
curl --fail --header "apikey: $ANON_KEY" \
  --header "Authorization: Bearer $anon_key" \
  "https://api.bolets.app/functions/v1/read-environment?region=prepirineus"
```

The unauthenticated function probe normally returns 401; that confirms TLS and
routing. The public proxy exposes only Functions, Auth, REST and Storage;
Realtime, GraphQL and Studio remain private. Before enabling the notebook,
send and redeem a passwordless code through the configured production SMTP,
enroll a passkey and use it in a new private window, and, when Google is
enabled, complete one Google sign-in through the production callback. Then
stage and resume a WebP upload, publish one test finding, verify that its public
response contains only a 10 km cell, and delete the test account. Verify map bucket reads, one occurrence read, current conditions,
scheduled pipeline audit rows and `pipeline_sources` before cutover. Lower DNS
TTL ahead of time, take a final dump during a short write freeze, restore it,
rerun the checks, then switch DNS. Keep the hosted project intact until at
least one complete ingestion cycle and a tested rollback window have passed.

## Studio and database access

Both services are loopback-only. Reach Studio through an SSH tunnel:

```bash
ssh -L 8000:127.0.0.1:8000 deploy@your-vps
```

Then open `http://127.0.0.1:8000` and use the generated dashboard credentials.
Forward 5432 similarly for temporary database maintenance; never change the
firewall to expose it globally.

## Backups and recovery

The provider's one-day VPS snapshot is useful but is not the database backup.
Run `deploy/vps/backup.sh` daily into `/var/backups/bolets`, encrypt and copy the
result off-host, and enforce retention in the off-host system. The script stores
custom-format dumps for Supabase and Umami, local Storage bytes, and checksums.
If Storage is moved to external S3, replace the local Storage archive with
bucket versioning and a second-region/object-lock policy.

Install the supplied systemd units for the local daily copy:

```bash
sudo install -m 644 deploy/vps/bolets-backup.service /etc/systemd/system/
sudo install -m 644 deploy/vps/bolets-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now bolets-backup.timer
sudo systemctl start bolets-backup.service
sudo systemctl status bolets-backup.service bolets-backup.timer
```

The timer runs once a day around 03:17 UTC with a randomized delay and catches
up after downtime. It deliberately does not delete local copies: configure
retention only after the encrypted off-host destination is working and tested.
Do not enable public notebook signups until the off-host system enforces a
documented maximum retention period and a restore drill confirms that expired
archives are no longer recoverable from either local or off-host storage.

At least monthly, restore the latest Supabase database dump and Storage archive
into an isolated Supabase instance, and restore `umami.dump` into a disposable
PostgreSQL 15 instance. Run migrations, invoke the read functions, load a
prediction map and verify the Umami website and pageview counts. A backup
without a successful restore drill is not considered valid.

Before every Supabase update:

1. Read the self-hosted changelog and breaking changes.
2. Take and verify an off-host backup.
3. Run `sh update.sh --dry-run` in `/opt/bolets/supabase`.
4. Test the update against a restored copy.
5. Update production, rerun the smoke checks, and record the deployed release.

Supabase's `update.sh` preserves `.env` and data but does not back up PostgreSQL
or Storage.
