# Hatchable Build Rules

## Objective
Build a polished restaurant ordering product, not a generic generated website.

## Implementation order
1. Customer UI
2. Cart
3. Checkout
4. Order creation
5. Confirmation/tracking
6. Admin orders
7. Menu management
8. Payments
9. Launch polish

## Deployment
Before deployment: inspect modified files, validate API access declarations, validate imports, validate migrations/seed behavior and run dry-run where available.

## API access
Every api/pages/mcp route must explicitly export access as public, member, admin or scheduler. Use public only for genuinely public endpoints and admin for restaurant management. Avoid customer auth initially.

## Do not
Do not put secrets in frontend; fake payment results; trust client totals; build multi-tenant abstractions now; add unnecessary dependencies; add decorative components just to look impressive.

## UI quality gate
Reject designs dominated by purple/black gradients, glass cards, glowing orbs, dot grids, bento SaaS cards, terminal windows, pricing cards, excessive pills, neon accents, fake testimonials, excessive shadows or generic AI slogans.

## Product quality gate
Release only when ordering is clear, checkout works, totals cannot be manipulated, unavailable items cannot be ordered, admin reliably sees orders, status changes persist, and payment state is verified if payments are enabled.

## Definition of done
Feature works on mobile, has appropriate loading/error/empty states, is accessible, persists correct data and fits the restaurant's visual language.
