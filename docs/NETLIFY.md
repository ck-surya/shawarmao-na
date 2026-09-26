# Free Netlify and Supabase deployment

The app can use either local SQLite/photos or hosted PostgreSQL and Supabase Storage. Setting `DATABASE_URL` selects cloud persistence. Netlify refuses to fall back to local SQLite when this variable is missing.

## Current status

Deployed on 24 September 2026 at **https://shawarmao-na.netlify.app**, with staff access at **https://shawarmao-na.netlify.app/admin**. Source is published at **https://github.com/ck-surya/shawarmao-na** on `main` and `deploy/stable`; deployment uses a clean local source export through Netlify CLI. GitHub Actions validates source changes; Netlify continuous deployment is not configured. Presentation files remain local.

The restaurant Supabase project is `bongxxvdlrlfmzyuqqgq` (Singapore, Free). Netlify project ID: `4ccddad3-f066-499c-a732-edb5c0bce618`. Pickup ordering is enabled; delivery is disabled. Orders open at noon and close at 5 AM in Asia/Kolkata. The existing staff password is configured privately in hosting settings.

The existing Netlify account is on a Free Legacy plan. Keep that plan; do not change subscriptions. Use a separate Supabase Free project for this restaurant. Existing unrelated projects must remain untouched. Free plans have quotas and availability limits; monitor usage in both dashboards.

## Required server settings

Store these as hosting environment variables; never use `NEXT_PUBLIC_` names. The existing Free Legacy plan requires **All scopes**; selecting only Functions returns HTTP 403. Set values for the production context and keep credential values private. [Standard Netlify variables are encrypted at rest](https://docs.netlify.com/build/environment-variables/secrets-controller/); the separate Secrets Controller setting is optional. Verify variable keys and contexts after saving, without printing their values:

- `DATABASE_URL`: the Supabase transaction-pooler connection URI, with the database password percent-encoded. Copy it from Connect; do not construct the pooler hostname. The driver uses one connection and disables prepared statements.
- `DATABASE_CA_CERT`: the project's root certificate PEM, if needed by the certificate chain. TLS verification is enabled; do not disable it to work around a certificate error.
- `SUPABASE_URL`: the project's HTTPS API URL.
- `SUPABASE_SERVICE_ROLE_KEY`: the server-only legacy service-role JWT used by Storage. This key must never be exposed to visitors.
- `SUPABASE_STORAGE_BUCKET=menu-photos`.
- `ADMIN_PASSWORD`: a long random staff password.
- `APP_ORIGIN`: the exact canonical HTTPS site origin, with no trailing slash.
- `ORDERING_ENABLED=true`, `DELIVERY_ENABLED=false` for pickup. Set ordering false during initial setup, then enable it after verification.

Use the transaction-pooler connection settings described in [Supabase's connection guide](https://supabase.com/docs/guides/database/connecting-to-postgres). Locally, put secrets in ignored `.env.cloud.local` with file mode 600. Do not upload that file as a public artifact.

## Database and photo setup

After configuring `.env.cloud.local`, initialize the new project:

```bash
node --env-file=.env.cloud.local --import tsx scripts/cloud-setup.ts
```

This applies `deploy/postgres.sql`, imports missing bundled menu items and creates a private photo bucket. Repeating it preserves existing menu edits. Tables live in a private `restaurant` schema with row security enabled and no public grants. All app access goes through authenticated server handlers; do not expose that schema through the Supabase Data API.

On 24 September 2026, the local menu (23 items), two existing orders and ten status-history entries were transferred to the new cloud project in one transaction. Current staff prices were preserved. There were no local uploaded photos. A local SQLite backup was saved under ignored `data/backups/`. Staff sessions and rate-limit counters were not migrated. Do not rerun the initial migration over live data.

Photo URLs remain `/images/uploads/<uuid>.webp`. Server handlers retrieve them from the private bucket. Staff uploads still undergo image decoding, resizing and metadata removal. Large phone photos are resized in the browser before upload to fit serverless request limits.

## Publish and verify

`netlify.toml` configures the Next.js build. Netlify uses its Next.js adapter; the Docker image is for persistent VM hosting and is not uploaded to Netlify.

Authenticate the Netlify CLI, create a restaurant project in the existing free team, set its environment variables, and publish from `deploy/stable`. Use a clean copy of tracked source for builds, excluding `.env.local`, local databases, backups and `outputs/`. Confirm that the deployment contains no local secrets or presentation files. Always run the Next.js adapter for a release with `netlify deploy --prod --context production`; do not use `--no-build` with the restored raw `.next` directory, which contains server artifacts rather than the adapter's prepared public output.

Verify the HTTPS storefront, all menu images, staff login, phone photo upload, a clearly marked test pickup, its staff status updates and private tracking. Confirm storage persists after a redeploy. Cancel the test order. Do not call the deployment complete until these checks pass against the actual hosted service.

Local checks:

```bash
npm run typecheck
npm test
npm run test:e2e
npm run build
TEST_DATABASE_URL=postgres://USER:PASSWORD@127.0.0.1:5432/DISPOSABLE_TEST_DB node --import tsx --test tests/postgres.integration.ts
```

The integration test writes synthetic records and requires a disposable database. It checks concurrent duplicate submissions, authoritative prices, invalid transitions, audit history, sessions and atomic rate limits.

## Backups

The SQLite backup script only covers local/VM data. For this deployment, export PostgreSQL with `pg_dump` and back up the Storage bucket separately; verify a restore and keep copies outside Supabase. Do not assume the free plan provides recoverable backups. Protect exports because they contain customer information and sessions.

## Verification record

- Local checks: TypeScript, 16 unit/persistence tests, four browser scenarios, production build and PostgreSQL concurrency integration test passed.
- Live checks: database/storage health, the 23-item menu with existing prices, all 23 rendered dish images, protected staff endpoints, secure staff login, multipart photo upload, original and optimized uploaded-image URLs passed.
- The live checkout correctly rejected a new order during closed hours. An explicitly marked synthetic pickup was seeded through the cloud repository with an open-hours test clock, then verified through the hosted APIs: staff visibility, duplicate retry, private tracking and confirmed → preparing → cancelled transitions. The production clock and opening hours were never changed. A fresh public checkout during opening hours remains a manual follow-up.
- Redeployment persistence passed for the staff session, saved menu item/photo metadata, uploaded image bytes, order status/history and current menu prices. The hidden test item and its storage object were removed afterward; the synthetic order remains cancelled for audit. Public access to server artifacts, local environment files and SQLite files returned 404.
- Final verified deployment: `6ab4a9bd250461fd7735980a`, application commit `8ae796f`. Deployment notes may be committed separately without changing the live application.
