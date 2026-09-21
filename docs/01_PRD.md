# Product Requirements Document

## Product
Shawarmao Na Direct Ordering — a restaurant-specific direct ordering website for Shawarmao Na, Sector 51, Gurugram.

## Vision
A fast, trustworthy, mobile-first ordering experience that helps customers order directly from the restaurant and gives staff a simple order-management system. It should feel like a real premium food brand, not a SaaS template or AI demo.

## Business strategy
Keep Zomato/Swiggy as discovery/acquisition channels. Use the direct website for repeat orders, direct customer relationships, QR-driven reorders and reduced dependence on aggregators. Do not promise to replace aggregators immediately.

## Users
- Customers ordering on mobile
- Restaurant owner/staff managing orders
- Returning customers using QR/direct links

## Core customer flow
Discover → Menu → Item → Cart → Checkout → Payment/manual payment → Confirmation → Tracking → Reorder later

## Core admin flow
Admin login → New orders → Accept/reject → Preparing → Ready → Out for delivery → Delivered

## MVP customer features
- Mobile-first homepage/menu
- Restaurant identity, hours and location
- Categories and popular items
- Real menu item cards with verified prices/descriptions
- Quantity controls
- Customization only where actually configured
- Cart drawer/bottom sheet
- Guest checkout; no forced customer account
- Delivery/pickup selection
- Name, phone, address and notes
- Order confirmation
- Order status tracking
- Loading, error and empty states

## MVP admin features
- Protected admin access
- Today's orders
- Order list/board
- Order detail
- Accept/reject
- Status changes
- Status history
- Menu availability toggle
- Basic menu management
- Basic order/revenue summary

## Payment
COD/manual payment can be supported in MVP. If online payments are added, create pending order/payment, use gateway flow, verify on the server and process the gateway webhook. Never trust frontend payment success.

## Delivery
MVP uses restaurant-managed/manual delivery or pickup. Third-party delivery integration is a later phase. Do not build live rider GPS or a delivery fleet in V1.

## QR
Use a direct-order QR on packaging, receipts, counter material and marketing material.

## Order states
pending → confirmed → preparing → ready → out_for_delivery → delivered
Alternative terminal states: cancelled, rejected.
Every status change must be persisted in order_status_history.

## Data integrity
- Server recalculates prices and totals.
- Never trust client totals.
- Validate item availability before creating an order.
- Generate unique order numbers.
- Payment state is server controlled.
- Status history is auditable.

## Analytics
MVP: orders/day, revenue/day, average order value, status counts.
Later: repeat customers, QR conversions, coupon usage, attribution.

## SEO
Use proper titles/descriptions, restaurant/location information, Restaurant/LocalBusiness structured data where appropriate, fast mobile loading and social metadata.

## Acceptance criteria
A customer can browse, add items, checkout without an account, place a valid order, receive confirmation and see status. Restaurant staff can see, accept/reject and progress orders. Unavailable items cannot be ordered. Delivery/pickup works. Overnight hours 12 PM–5 AM are handled correctly. Layout works from 320px to desktop. No fake testimonials, statistics or payment confirmations.

## Out of scope for MVP
Native apps, multi-restaurant SaaS, AI recommendations, live rider GPS, complex loyalty, microservices, Kubernetes, Kafka/Redis without a proven need, multiple delivery integrations, advanced CRM and large marketing-only landing pages.
