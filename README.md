# Shawarmao Na

Local development implementation of the supplied direct-ordering brief. Node 24+, Next.js App Router, React, TypeScript, and a local SQLite persistence adapter. The user chose to skip the existing Hatchable implementation. This is a standalone application and does not modify that deployment.

## Run

```sh
npm ci
cp .env.example .env.local
# Set ADMIN_PASSWORD to a random password with at least 16 characters.
npm run menu:import
npm run dev
```

Visit http://localhost:3000 and /admin. The supplied Google Maps menu is available through `npm run menu:import`: 23 entries across three categories, including separate chicken/veg momo prices. Re-running the import preserves staff edits. See [the transcription and source](docs/MENU_SOURCE.md). Add or edit items in the staff menu editor. No descriptions, photos, or promotions are invented. Place approved images under public/images and enter their /images/... paths.

Ordering starts disabled. Only enable ORDERING_ENABLED after verifying business details, menu, policies and fulfillment. Delivery additionally requires DELIVERY_ENABLED and an explicit DELIVERY_FEE_PAISE. Restart after changing environment values. All money is integer paise. The supplied menu states 5% GST extra; it is calculated on the food subtotal, shown separately, and saved with each order. Existing orders retain their original totals. Hours use Asia/Kolkata, noon inclusive to 5 AM exclusive.

## Validation

```sh
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run format:check
```

The browser suite uses an isolated temporary database and build directory on port 3100. It uses `/usr/bin/google-chrome` by default; set `CHROME_PATH` to your Chromium executable on other systems. Test-only fixtures and a fixed business-hours clock never enter the normal app database or production runtime. The Next.js Date-extension warning in this test server comes from that fixed clock; cache components are not enabled. Screenshots are written to `test-results/`.

Set `APP_ORIGIN` to the canonical HTTPS origin behind a reverse proxy. Serve production over HTTPS for secure staff session cookies.

## Architecture and launch boundary

`src/lib/domain.ts` owns input rules and transitions. `src/lib/db.ts` is a **local development SQLite adapter**, not a managed database integration. The user explicitly chose a standalone implementation. Native Next.js routes enforce access in handlers; Next does not support Hatchable's custom route export syntax. SQLite may be retained for a single persistent server or replaced with PostgreSQL before scaling.

Orders use server prices, availability checks, transactional idempotency, random private tracking links, unpaid COD state, and persisted status history. Staff APIs use expiring HttpOnly sessions, same-origin mutation checks, and rate limits. The local adapter applies service-wide rate limits because no trusted reverse-proxy contract exists yet. Configure trusted client identification and production identity before launch. Public tracking excludes customer contact/address/notes. Tracking links are bearer secrets; do not share them publicly. Staff list is bounded to the latest 200 orders; production needs pagination and database aggregation.

Do not deploy this local adapter to ephemeral/serverless storage. SQLite needs a persistent disk and single application instance. Review privacy retention, operational backups, production authentication, delivery service area, legal copy and real restaurant photography before launch. Payment gateways, notifications, live delivery, production deployment and QR/domain setup are intentionally pending.

Original requirements are in `docs/`. Implementation status is recorded in `docs/DEVELOPMENT.md`.
