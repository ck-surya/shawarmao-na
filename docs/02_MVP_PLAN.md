# MVP Build Plan

## Phase 0 — Foundation
Confirm restaurant menu/prices/availability/customizations; configure DB; protect admin routes; remove unnecessary customer auth; establish responsive design system.

## Phase 1 — Menu
Header, hours/status, hero photography, popular items, category rail, menu sections, product cards, add/quantity controls, real loading/error/empty states.

## Phase 2 — Cart
Sticky/floating cart, drawer/bottom sheet, quantity adjustment, remove, subtotal, delivery fee, discount placeholder, total, checkout.

## Phase 3 — Checkout
Guest checkout, delivery/pickup, name, phone, address, notes, server-side totals, order number, validation and recoverable errors.

## Phase 4 — Confirmation & tracking
Confirmation, order number, summary, status timeline, latest status and support/contact path.

## Phase 5 — Admin
Admin protection, dashboard, new orders, order detail, accept/reject, status controls, history and menu availability/editing.

## Phase 6 — Payments
Payment provider, pending payment/order, gateway flow, server verification, webhook, failure handling and refund state where supported.

## Phase 7 — Launch
Real menu verification, mobile QA, checkout/order QA, payment QA if enabled, SEO, legal pages, domain, QR, staff training and production smoke test.

## Phase 8 — Later
Coupons, reorder, customer history, WhatsApp/SMS notifications, delivery provider, loyalty, deeper analytics and multi-branch only if actually needed.

## MVP success test
Customer: open → find food → add → guest checkout → valid order → confirmation → status.
Restaurant: see order → accept/reject → update status → complete order.
