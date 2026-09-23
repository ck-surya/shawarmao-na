# Shawarmao Na

Standalone implementation of the supplied direct-ordering brief. Node 24, Next.js App Router, React, TypeScript, and SQLite persistence. The user chose to skip the existing Hatchable implementation. This is a standalone application and does not modify that deployment.

The `deploy/stable` branch includes Docker packaging, persistent storage, health checks, startup validation and backup tooling. Follow [the deployment guide](docs/DEPLOYMENT.md) for the recommended Oracle Cloud Always Free VM setup. Hosting accounts, DNS and off-server backup storage still need to be configured.

## Run

```sh
npm ci
cp .env.example .env.local
# Set ADMIN_PASSWORD to a random password with at least 16 characters.
npm run menu:import
npm run dev
```

Visit http://localhost:3000 and /admin. The supplied Google Maps menu is available through `npm run menu:import`: 23 entries across three categories, including separate chicken/veg momo prices. Re-running the import preserves staff edits. See [the transcription and source](docs/MENU_SOURCE.md). Add or edit items in the staff menu editor. Use **Menu photo** to choose an image from a phone or computer, preview it, then select **Save item** to upload it. JPG, PNG and WebP files up to 10 MB and 50 megapixels are supported; export HEIC photos as JPG first. Existing photos can be replaced or removed from the menu item.

Uploaded photos are validated, automatically oriented, resized to fit within 1600 × 1600, and saved as WebP without embedded metadata using [Sharp](https://sharp.pixelplumbing.com/api-output/). Files live in an `uploads/` directory alongside `DATABASE_PATH` (`data/uploads` by default), or in `MENU_UPLOAD_DIR` if configured. They are served through `/images/uploads/<generated-name>.webp`, including files added after a production build. Back up this directory together with the database and retain it across deploys. Replaced/removed photos remain on disk to preserve existing URLs; removing a photo detaches it from the item. Failed database saves roll back the new file. Staff-uploaded photos take precedence over built-in illustrations.

Ordering defaults to disabled in a new installation. Set `ORDERING_ENABLED=true` to accept pickup orders independently of delivery. With `DELIVERY_ENABLED=false`, customers can submit pickup orders, staff confirm and update them in `/admin/orders`, and customers track their status and pay at collection. No courier or online payment integration is needed for this flow. Delivery additionally requires `DELIVERY_ENABLED=true`, an explicit `DELIVERY_FEE_PAISE`, and a restaurant delivery process. Restart after changing environment values. All money is integer paise. The supplied menu states 5% GST extra; it is calculated on the food subtotal, shown separately, and saved with each order. Existing orders retain their original totals. Hours use Asia/Kolkata, noon inclusive to 5 AM exclusive.

## Validation

```sh
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run format:check
```

The browser suite uses an isolated temporary database, upload directory and build directory on port 3100. It uses `/usr/bin/google-chrome` by default; set `CHROME_PATH` to your Chromium executable on other systems. Test-only fixtures and a fixed business-hours clock never enter the normal app database or production runtime. The Next.js Date-extension warning in this test server comes from that fixed clock; cache components are not enabled. Screenshots are written to `test-results/`.

Set `APP_ORIGIN` to the canonical HTTPS origin behind a reverse proxy. Serve production over HTTPS for secure staff session cookies.

For an ngrok development preview, set `DEV_ALLOWED_ORIGINS` in `.env.local` to your tunnel hostname (for example, `your-tunnel.ngrok-free.app`, without `https://` or a port), then restart `npm run dev`. Multiple hostnames can be comma-separated. Next.js blocks the development live connection from unlisted hosts, which can leave the menu loading without images. Update this setting when the tunnel URL changes. Set `APP_ORIGIN` to the full HTTPS tunnel origin when testing staff or checkout submissions through that URL.

## Architecture and launch boundary

`src/lib/domain.ts` owns input rules and transitions. `src/lib/db.ts` uses SQLite on a persistent disk for a single application instance. The user explicitly chose a standalone implementation. Native Next.js routes enforce access in handlers; Next does not support Hatchable's custom route export syntax. Replace SQLite with a shared database before scaling to multiple instances.

Orders use server prices, availability checks, transactional idempotency, random private tracking links, unpaid COD state, and persisted status history. Staff APIs use expiring HttpOnly sessions, same-origin mutation checks, and rate limits. The local adapter applies service-wide rate limits because no trusted reverse-proxy contract exists yet. Configure trusted client identification and production identity before launch. Public tracking excludes customer contact/address/notes. Tracking links are bearer secrets; do not share them publicly. Staff list is bounded to the latest 200 orders; production needs pagination and database aggregation.

Do not deploy this adapter to ephemeral/serverless storage. SQLite needs a persistent disk and single application instance. Review privacy retention, operational backups, production authentication, delivery service area, legal copy and real restaurant photography before launch. Payment gateways, notifications, live delivery, actual hosting and QR/domain setup are pending.

Original requirements are in `docs/`. Implementation status is recorded in `docs/DEVELOPMENT.md`.
