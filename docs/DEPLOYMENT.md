# Deploying the stable branch

Branch: `deploy/stable`. This deployment runs **one app container on one persistent Linux VM**. SQLite and uploaded photos live in the `restaurant_data` Docker volume; redeploying the container preserves them. Do not scale this configuration to multiple app instances or use an ephemeral filesystem.

## Free hosting recommendation

Use an **Oracle Cloud Always Free Ubuntu VM**, preferably Ampere A1 with 2 OCPUs and 6 GB RAM, subject to capacity and your account's remaining allowance. Build the Docker image on that VM so native dependencies match its ARM architecture. The Dockerfile also works on x86-64; local verification used x86-64.

Oracle's documented A1 allowance is currently 2 OCPUs and 12 GB memory across instances, with 200 GB combined boot/block storage. Choose only Always Free resources in your home region, account for any resources you already use, and check the console's eligibility and cost estimate before creating anything. Trial credits are separate from Always Free. Account verification can require a payment card. Capacity is not guaranteed, and idle instances may be reclaimed. See [Always Free resources](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm) and [signup FAQ](https://www.oracle.com/cloud/free/faq/).

This is a free starting point, not a high-availability service. Keep backups outside the VM. Render Free cannot retain this app's SQLite database or uploaded files across restarts; see [Render Free filesystem limits](https://render.com/docs/free).

## Initial setup

1. Create the eligible Ubuntu VM with persistent boot storage and an SSH key. Allow TCP 80/443 publicly; restrict SSH to your IP. Apply these rules both in the cloud network and host firewall. Port 3000 stays bound to loopback.
2. Install Docker Engine and the Compose plugin using [Docker's Ubuntu instructions](https://docs.docker.com/engine/install/ubuntu/). Compose 2.30 or newer is required for raw env-file handling. Install Caddy using its [official package instructions](https://caddyserver.com/docs/install#debian-ubuntu-raspbian).
3. Point a hostname you control to the VM's public IP. An existing domain or a free DNS hostname works; buying a domain is optional. HTTPS is required for staff session cookies. A purchased domain is not included in free hosting.
4. Copy the branch to the VM. Do not transfer `.env.local`, local `data/`, or `outputs/` as source code. If retaining existing menu edits or photos, use the migration procedure below.

From the repository root on the VM:

```bash
cp deploy/production.env.example .env.production
chmod 600 .env.production
```

Edit `.env.production`:

- Set `ADMIN_PASSWORD` to a fresh random value of at least 16 characters. Values are literal: do not surround them with quotes. Never commit this file.
- Set `APP_ORIGIN` to your exact HTTPS origin, e.g. `https://orders.example.com`, without a trailing slash.
- Keep `ORDERING_ENABLED=false` until the menu and staff workflow have been checked.
- Keep `DELIVERY_ENABLED=false` for pickup only. Enabling delivery requires a fee in paise and a real delivery arrangement.
- `IMPORT_SOURCE_MENU=true` adds missing bundled menu items on startup and preserves edits to existing items. Set it to `false` if you want to start with an empty menu.

Start the app:

```bash
docker compose up -d --build --wait
curl --fail http://127.0.0.1:3000/api/health
```

Copy `deploy/Caddyfile` to `/etc/caddy/Caddyfile`, replace `orders.example.com` with your hostname, then validate and reload:

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Caddy obtains HTTPS certificates for the hostname when DNS and ports 80/443 are correctly configured. Visit the HTTPS site, sign in at `/admin`, verify item prices/photos and edit a test item. Then set `ORDERING_ENABLED=true` and run `docker compose up -d --wait` to recreate the app with the updated settings. During opening hours, submit a pickup and confirm it appears in staff orders and tracking. Cancel the test order afterward.

## Backups and restoration

Create a consistent SQLite snapshot plus uploaded photos while the app is running:

```bash
docker compose exec -T app node scripts/backup.mjs
mkdir -p backups
chmod 700 backups
docker compose cp app:/app/data/backups/. ./backups/
```

The command prints the timestamped backup path. A valid backup folder contains `restaurant.sqlite`, `uploads/`, and `COMPLETE.json`. Keep the folder private: it includes customer data and staff sessions. Copy it to a separate machine or private object storage. A backup on the same VM alone does not protect against loss of that VM. Delete old local copies only after checking the off-server copy, and monitor disk space.

Schedule the backup command with cron or a systemd timer (for example hourly), and arrange an off-server copy. Automation of the external copy depends on the storage account you choose; no external backup is configured by this repository.

Restore a selected complete snapshot with the app stopped. First make a backup of the current state. Replace `BACKUP_FOLDER` below with the absolute path to the selected folder. **Restoration replaces the current orders, menu, sessions, and photos with the snapshot.**

```bash
docker compose stop app
docker compose run --rm --no-deps -v /absolute/path/BACKUP_FOLDER:/restore:ro app node -e '
const fs = require("node:fs");
const { DatabaseSync } = require("node:sqlite");
if (!fs.existsSync("/restore/COMPLETE.json")) throw Error("Incomplete backup");
const db = new DatabaseSync("/restore/restaurant.sqlite", {readOnly:true});
if (db.prepare("PRAGMA integrity_check").get().integrity_check !== "ok") throw Error("Invalid database");
db.close();
for (const suffix of ["", "-wal", "-shm"]) fs.rmSync("/app/data/restaurant.sqlite" + suffix, {force:true});
fs.copyFileSync("/restore/restaurant.sqlite", "/app/data/restaurant.sqlite");
fs.rmSync("/app/data/uploads", {recursive:true, force:true});
fs.cpSync("/restore/uploads", "/app/data/uploads", {recursive:true});
'
docker compose up -d --wait
```

The container runs as UID 1000. Ensure that user can read the selected backup folder; do not make backups publicly readable. If importing a local snapshot, transfer a backup created with `DATABASE_PATH` and `MENU_UPLOAD_DIR` pointing to the local live data, then use the same restore procedure. This preserves staff changes that are not part of the bundled source menu.

Never use `docker compose down -v` on the live deployment: `-v` deletes the persistent volume. Do not copy only the raw SQLite file while the app is running; committed changes may still be in the WAL file.

## Updates, rollback and monitoring

Before an update, create and export a backup. Tag the current image with its commit identifier, then build the new version:

```bash
docker image tag shawarmao-na:local shawarmao-na:previous
docker compose up -d --build --wait
docker compose ps
docker compose logs --tail=100 app
```

If an update fails, restore the previous image without rebuilding:

```bash
APP_TAG=previous docker compose up -d --no-build --wait
```

This rolls back application code only. If a future release changes the database incompatibly, restore the pre-update data snapshot too. The initial deployment changes do not migrate existing order data.

`GET /api/health` checks SQLite writes and photo-directory writes. It returns 503 without internal details on failure. Docker records health and restarts a crashed process; an unhealthy result alone does **not** cause a restart. Monitor the HTTPS health URL, container status, free disk space and backup completion. Staff must keep the order dashboard open; courier integration, online payment collection and external order notifications are not configured.

## Checks before releasing a revision

```bash
npm ci
npm run typecheck
npm test
npm run test:e2e
docker build -t shawarmao-na:stable-test .
node tests/deployment-smoke.mjs shawarmao-na:stable-test
```

Browser tests need Chrome (or `CHROME_PATH`). The container smoke test uses disposable data and verifies menu bootstrap, login, phone photo upload, pickup orders, duplicate prevention, persistence after restart, optimized image serving and backup restoration. It never uses the real local restaurant database. GitHub Actions runs these checks when the code is later pushed; this task does not push or deploy anything.

PowerPoint deliverables remain under ignored `outputs/` and are excluded from both Git and the Docker build context.
