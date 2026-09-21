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
