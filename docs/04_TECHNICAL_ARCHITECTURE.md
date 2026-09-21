# Technical Architecture

## Scope
Restaurant-specific implementation for Shawarmao Na. Do not build a multi-tenant platform yet.

## Stack direction
- Frontend: Next.js/React + TypeScript where supported
- Backend: Hatchable API functions
- Database: Hatchable managed PostgreSQL-style database
- Storage: managed object storage for images when needed
- Icons: Lucide
- Motion: CSS or Motion/Framer Motion if supported

## Routes
Customer: /, /menu, /checkout, /order/:id
Admin: /admin, /admin/orders, /admin/menu, /admin/settings
API: /api/menu, /api/orders, /api/order/:id, /api/admin/orders, /api/admin/order-status

## Access
Public: menu and carefully validated customer order creation.
Admin: order/menu/settings management.
Customer auth is not required for MVP.

## Database entities
restaurants, menu_categories, menu_items, customers, orders, order_items, order_status_history.

## Security
Validate all input server-side; recalculate totals; protect admin APIs; verify payment callbacks; rate-limit/protect order creation where appropriate; avoid unnecessary personal-data logging; never expose secrets in frontend.

## Performance
Mobile-first, optimized images, lazy-load below fold, small client bundles, minimal dependencies and fast checkout.

## Reliability
Idempotent order creation where practical; persisted status changes; immutable/auditable status history; idempotent payment webhooks; recoverable failures.

## Overnight hours
12 PM–5 AM crosses midnight. Business-hour logic must handle this correctly.

## Architecture principle
Use a modular monolith. Do not prematurely introduce microservices, Kubernetes, Kafka, Redis or complex event buses.
