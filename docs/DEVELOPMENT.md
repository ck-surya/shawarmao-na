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

## Staff menu form layout fix

- Prevented the editor from stretching to match the entire menu list. With 23 items, the form previously grew to about 2,989 px and the name input to 154 px; fields now retain their natural height (about 47 px for the name input).
- Moved the form before the list in both visual and keyboard order: left column on desktop, above the list on mobile. Selecting Edit scrolls to the form below the sticky header and focuses the item name.
- Checked the populated staff page at 320, 390, 600, 768, 1024 and 1440 px with no horizontal overflow; reviewed desktop/mobile screenshots and verified edit focus, scrolling, cancellation and sign-out. Existing three browser scenarios, TypeScript and production build passed. Save verification used the isolated test database.

## Ngrok preview image loading

- Reproduced the public menu remaining in its loading state while Next.js rejected the tunnel's development WebSocket connection. The menu API and both original and optimized image endpoints returned successfully.
- Added the `DEV_ALLOWED_ORIGINS` environment setting for explicit development hostnames and configured the current tunnel in gitignored `.env.local`. Documented how to update it when the tunnel changes; no wildcard hosts are enabled by default.
- Verified all 23 dish images decode through the public tunnel on desktop and mobile after passing the normal ngrok welcome screen, without special request headers. Reviewed the mobile screenshot. Confirmed the configured hostname is accepted and an unrelated origin receives 403. TypeScript and production build passed.

## Staff photo uploads

- Replaced the manual photo-path field with a phone/computer file picker, preview and Remove photo control. Saving uploads the selected photo with the menu item; failed requests preserve the selection for retry. Existing photos remain unless replaced or removed.
- Added authenticated multipart menu saves with origin checks, bounded request/file sizes, decoded-format and pixel-limit validation, automatic orientation, resizing and metadata removal. JPEG/PNG/WebP inputs up to 10 MB and 50 megapixels are stored as WebP under generated filenames.
- Photos persist under `data/uploads` by default (alongside the configured SQLite database); `MENU_UPLOAD_DIR` can select another persistent directory. A runtime image route serves new files immediately, including after production builds. Failed menu persistence rolls back the new file; old photo files are retained for existing URLs.
- Validation: 12 unit/persistence tests, 4 browser scenarios, TypeScript and production build passed. Browser coverage includes unauthorized/cross-origin/invalid uploads, preview, retry, customer image decoding, replacement and removal. Reviewed the mobile screenshot, verified the picker through the actual ngrok staff page, and tested production upload plus image delivery after a server restart using isolated data.

## Extension attribute hydration warning

- Reproduced the reported warning by injecting `data-qb-installed` on HTML and `data-new-gr-c-s-check-loaded` / `data-gr-ext-installed` on BODY before React hydrated the staff page.
- Applied React's element-scoped `suppressHydrationWarning` to the two document elements only, following the [React hydration guidance](https://react.dev/reference/react-dom/client/hydrateRoot#suppressing-unavoidable-hydration-mismatch-errors). App descendants retain normal mismatch diagnostics.
- Verified clean and simulated-extension sessions produce no hydration warnings and the staff form/bag remain interactive. A deliberate mismatch on MAIN still produces a warning. TypeScript and formatting checks passed.
