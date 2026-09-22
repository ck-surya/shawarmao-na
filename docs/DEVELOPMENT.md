# Development log

- Imported the original brief unchanged.
- Created a standalone implementation. The user explicitly requested skipping the existing Hatchable app/source.
- Never seed unverified restaurant content. Test fixtures must be visibly synthetic and isolated from normal app data.
- Milestones: foundation and domain; storefront and bag; checkout and tracking; staff management; integration QA.
- Launch pending: owner-approved menu/images/contact/hours, fulfillment/fees/service area, final policies, production persistence/hosting setup, production auth/rate limits, domain and deployment smoke test.

## Completed milestones

1. Requirements imported and committed unchanged.
2. Next.js/TypeScript foundation, SQLite storage, strict input validation, server totals, overnight hours, idempotent order creation and audited status transitions.
3. Responsive storefront, menu search/categories, verified content, unavailable/empty/error states, persistent bag, quantity controls and accessible native bag dialog.
4. Guest pickup/delivery checkout, private tracking, status polling, support links and legal drafts.
5. Password-protected staff sessions, order filters, acceptance/rejection/status actions, daily order summaries and menu editing/availability.
6. Integration QA, same-origin fix, mobile bag accessible name, self-hosted fonts and source formatting.

## Validation

- Production build: passed.
- TypeScript: passed.
- Domain and persistence suite: 7 tests passed.
- Browser suite: 2 scenarios passed, covering staff menu creation, guest pickup, delivery fee calculation, private tracking after reload, full pickup status progression, concurrent idempotent requests, client total tampering, nonexistent/unavailable items, admin access denial, cross-origin rejection, sign-out and menu outage recovery.
- Storefront horizontal overflow checks: 320, 375, 390, 430, 768, 1024 and 1440 px passed. Mobile and desktop screenshots reviewed.
- Package installation audit: zero reported vulnerabilities at installation time.
- No real restaurant orders placed; browser fixtures use a temporary isolated database that is removed on exit.

## Remaining launch work

This is a working local MVP, not a production launch. Real menu/prices/photos, business/contact verification, delivery service area and process, approved policies, production authentication/rate limiting, backups, retention, hosting and domain setup remain. Online payments and notifications are not implemented. Ordering defaults to disabled; no fictional menu is seeded. Staff setup is documented in README.md.

## Supplied menu update

- Imported the user-supplied Google Maps menu: 8 Signature Lebanese items, 10 momo variants and 5 Indulgences. Exact transcription and reference image are in MENU_SOURCE.md and references/.
- Added a repeatable, transactional import with stable IDs that preserves all existing staff edits. Imported 23 items into the local development database.
- Added the printed 5% GST extra to the bag, checkout, server totals, staff order details and tracking. Saved order tax snapshots and preserved legacy totals.
- Did not infer ingredients, portion counts or unlabelled dietary claims. The original photo is retained as development evidence, not republished as product photography.
- Validation: 10 domain/persistence/import tests and 3 browser scenarios pass, including populated menu layout checks at 320–1440 px and ₹190 + ₹9.50 GST = ₹199.50. Mobile screenshot reviewed.
- Current stock/prices and delivery tax treatment still need confirmation before launch. Ordering remains disabled by default.

## Dish image update

- Added six original gouache-style dish illustrations to seven matching menu entries: Chicken Shawarma, Hummus - Pita, both Steam Momos variants, French Fries, Choco Lava Cake and Walnut Brownie.
- Generated with the built-in imagegen tool; optimized and saved as local WebP assets under public/images/dishes. Final prompts and paths are recorded in DISH_IMAGES.md.
- Cards clearly label representative art as “Dish illustration”. Staff-supplied photos take priority; fallbacks also check the dish name to avoid incorrect artwork after a rename. No database values or staff edits are overwritten.
- Adjusted menu cards to compact image-and-text layouts, two columns on desktop and one on mobile. Added responsive Next.js image delivery, intrinsic dimensions and deferred loading below the first menu row.
- Validation: TypeScript and all three existing browser scenarios passed; checked image-file mappings and photo precedence; reviewed mobile and desktop screenshots. Final production build checked before commit.

## Complete menu imagery

- Added 12 more built-in imagegen illustrations for the remaining 16 menu entries. All 23 dishes now have matching visuals across 18 distinct local WebP assets.
- Added separate images for paneer/falafel wraps, hummus with falafel, chicken/paneer platters, doner chicken bowl, fried/peri-peri/kurkure/wheat momos, peri-peri fries and vegetable spring rolls.
- Kept existing assets and staff-photo precedence. Final prompts and saved file paths are recorded in DISH_IMAGES.md.
- Verified all 23 images successfully decode in the actual running storefront, checked horizontal overflow at 320, 375, 390, 430, 768, 1024 and 1440 px, and reviewed desktop Signature Lebanese and mobile Momos screenshots. TypeScript passed.
