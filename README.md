# Shawarmao Na

Local development implementation of the supplied direct-ordering brief. Node 24+, Next.js App Router, React, TypeScript, and a local SQLite persistence adapter. The user chose to skip the existing Hatchable implementation. This is a standalone application and does not modify that deployment.

## Run

```sh
npm install
cp .env.example .env.local
# Set ADMIN_PASSWORD to a random password with at least 16 characters.
npm run dev
```

Visit http://localhost:3000 and /admin. Add owner-approved menu items in the staff menu editor. No invented menu, prices, photos, or promotions are seeded. Place approved images under public/images and enter their /images/... paths.

Ordering starts disabled. Only enable ORDERING_ENABLED after verifying business details, menu, policies and fulfillment. Delivery additionally requires DELIVERY_ENABLED and an explicit DELIVERY_FEE_PAISE. Restart after changing environment values. All money is integer paise. Hours use Asia/Kolkata, noon inclusive to 5 AM exclusive.

## Validation

```sh
npm run typecheck
npm test
npm run build
npm run test:e2e
```

## Architecture and launch boundary

`src/lib/domain.ts` owns input rules and transitions. `src/lib/db.ts` is a **local development SQLite adapter**, not a managed database integration. The user explicitly chose a standalone implementation. Native Next.js routes enforce access in handlers; Next does not support Hatchable's custom route export syntax. SQLite may be retained for a single persistent server or replaced with PostgreSQL before scaling.

Orders use server prices, availability checks, transactional idempotency, random private tracking links, unpaid COD state, and persisted status history. Staff APIs use expiring HttpOnly sessions, same-origin mutation checks, and rate limits. The local adapter applies service-wide rate limits because no trusted reverse-proxy contract exists yet. Configure trusted client identification and production identity before launch. Public tracking excludes customer contact/address/notes. Tracking links are bearer secrets; do not share them publicly. Staff list is bounded to the latest 200 orders; production needs pagination and database aggregation.

Do not deploy this local adapter to ephemeral/serverless storage. SQLite needs a persistent disk and single application instance. Review privacy retention, operational backups, production authentication, delivery service area, legal copy and real restaurant photography before launch. Payment gateways, notifications, live delivery, production deployment and QR/domain setup are intentionally pending.

Original requirements are in `docs/`. Implementation status is recorded in `docs/DEVELOPMENT.md`.
