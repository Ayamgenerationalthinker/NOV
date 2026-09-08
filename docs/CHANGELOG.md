# Changelog — NOV.com

All notable changes to this project will be documented in this file.

## [0.10.0] - Version 9: Administrative Analytics, Sales Metrics & Customer Management (2026-09-08)

### Added
* Analytics & Financial Intelligence Service (`src/services/admin/analytics.service.ts`):
  - `getOverviewMetrics`: Computes live gross revenue, net revenue (gross minus completed refunds), total refunds, total orders, paid orders count, conversion rate percentage, average order value (AOV), total customer count, total downloads served, and active digital license entitlements.
  - `getRevenueTimeSeries`: Generates an unbroken calendar time-series (7D / 14D / 30D / 90D) aggregating daily sales volume and order counts with zero-filled gaps for flawless chart rendering.
  - `getTopProducts`: Ranks digital products descending by total revenue and unit sales volume from verified purchases.
  - `getRecentOrders`: Real-time stream of latest customer transactions.
  - `getOrders`: Filterable, searchable, and paginated global order querying by order number, customer name, or email across all lifecycle statuses (`PAID`, `PENDING`, `REFUNDED`, `CANCELLED`).
  - `getOrderDetails`: Detailed inspector returning line items, payment gateway transactions, digital entitlements, customer metadata, and audit events.
  - `processAdminRefund`: Administrative refund engine that verifies order status, generates immutable `Refund` records, transitions order state machine to `REFUNDED`, automatically revokes customer license keys and download rights, dispatches refund notification emails, and records audit logs.
  - `getCustomers`: Paginated customer directory computing lifetime spend (LTV), total orders placed, and active digital licenses per customer.
  - `getCustomerDetails`: Customer profile view detailing order history, granted entitlements, and download audit logs with privacy-preserving masked IP addresses.
* Interactive Admin UI Components & Views:
  - `AnalyticsChart` (`src/components/admin/analytics-chart.tsx`): Interactive SVG sales velocity chart with 7D, 14D, and 30D toggles and cursor hover tooltips displaying date, revenue, and order volume.
  - `OrderManagement` (`src/components/admin/order-management.tsx`): Full-featured order control center with status filter tabs, search bar, order inspection modal, line-item viewer, 1-click receipt email re-dispatch, and refund confirmation modal with license revocation safeguards.
  - `CustomerManagement` (`src/components/admin/customer-management.tsx`): Searchable customer relationship hub with LTV calculations, customer drill-down drawer, order history, active product entitlements, and download audit records.
  - `/admin` (Executive Overview): Enhanced with 4 financial KPI cards, sales velocity chart, recent orders transaction feed, and top-selling product leaderboard.
  - `/admin/orders`: Dedicated global order management dashboard.
  - `/admin/customers`: Dedicated customer directory and relationship management portal.
  - `/admin/analytics`: Deep-dive sales performance dashboard with revenue share distribution, conversion rates, and refund telemetry.
* API Endpoints:
  - `GET /api/admin/analytics/overview`: Overview KPIs, time series, and product rankings.
  - `GET /api/admin/orders`: Paginated order query with status filters and search.
  - `GET /api/admin/orders/[id]`: Detailed order inspector.
  - `POST /api/admin/orders/[id]/refund`: Admin-initiated refund execution with entitlement revocation.
  - `GET /api/admin/customers`: Customer directory with calculated LTV and active license counts.
  - `GET /api/admin/customers/[id]`: Customer profile and audit history.
* Automated Tests:
  - `tests/unit/analytics.service.test.ts`: 9 unit tests verifying financial math, division-by-zero resilience, time-series gap filling, product rankings, refund validations, and customer metrics.
  - Full test suite expanded to **97 tests passing across 20 test suites**.

## [0.9.0] - Version 8: Email Notifications & Customer Receipt Dispatch (2026-09-08)

### Added
* Transactional Email Engine (`src/services/email/email.service.ts`):
  - `sendOrderReceiptEmail`: Dispatches branded, responsive HTML digital invoices and instant download access links to customers upon verified payment. Includes order number, itemized pricing breakdown, coupon savings, and direct customer portal download button.
  - `sendRefundConfirmationEmail`: Dispatches refund confirmation notices to customers when an order is transitioned to `REFUNDED`.
  - `sendProductUpdateEmail`: Broadcasts product update and version release notifications with changelog summaries to all verified entitlement owners.
  - `sendPasswordResetEmail`: Generates cryptographically secure password reset links with 1-hour expiration.
  - `sendVerificationEmail`: Generates account email confirmation links with 24-hour expiration.
  - Development mock mode: Automatically logs full email content and simulated message IDs to the console when `RESEND_API_KEY` is not present, ensuring zero crashes during local development and testing.
* Order State Machine Lifecycle Integration (`src/services/order/order.service.ts`):
  - Automatically triggers asynchronous order receipt email delivery upon transitioning orders to `PAID`.
  - Automatically triggers asynchronous refund confirmation email delivery upon transitioning orders to `REFUNDED`.
* Interactive Customer Receipt Resending:
  - Added "Email Receipt" 1-click action inside the order receipt modal in the Customer Portal (`src/components/account/account-portal.tsx`).
* API Endpoints:
  - `POST /api/orders/[id]/resend-receipt`: Authenticated customer and admin endpoint to re-dispatch digital purchase receipts.
* Automated Tests:
  - Unit tests for Email Service (`tests/unit/email.service.test.ts`): 5 tests passing.
  - Total automated test suite expanded to **88 tests passing across 19 test suites**.

## [0.8.0] - Version 7: Product Reviews, Ratings & Customer Feedback System (2026-09-08)

### Added
* Product Review Service (`src/services/review/review.service.ts`):
  - `createOrUpdateReview`: Validates integer 1-5 star ratings, enforces minimum review length, verifies active `Entitlement` status to automatically award the **Verified Buyer** badge, and prevents duplicate reviews by allowing customer review revisions.
  - `getProductReviews`: Fetches paginated reviews with customer identities and calculates statistical distributions:
    - Average score (rounded to 1 decimal place).
    - Total reviews count.
    - Distribution breakdown for 5★, 4★, 3★, 2★, and 1★ ratings with exact counts and dynamic percentages.
  - `getProductReviewSummary`: Lightweight method for catalog cards and preview summaries.
  - `checkCustomerReviewStatus`: Checks if a logged-in user has already reviewed and verifies purchase ownership.
  - `moderateReview`: Administrative pipeline to approve, reject, or hide reviews with `AuditLog` tracking.
  - `deleteReview`: Author and admin authorization guards for safe review removal.
* Storefront Product Reviews UI (`src/components/reviews/product-reviews.tsx`):
  - Overall rating score card with star visuals and review counts.
  - Dynamic rating distribution bars for 1-5 star ratings.
  - Expandable interactive review submission modal with 1-5 interactive star picker, hover animations, headline, and feedback text.
  - Verified Buyer badge (`Verified Buyer` in emerald with shield check icon) on verified reviews.
  - Review author initials avatar, verified badges, rating stars, and publication dates.
* Product Details Integration (`src/app/(storefront)/products/[slug]/page.tsx`):
  - Hero header star rating badge linking directly to `#reviews`.
  - Full-width interactive reviews and ratings section embedded at the bottom of each product details view.
* API Endpoints:
  - `GET /api/products/[id]/reviews`: Paginated reviews list and rating distribution breakdown.
  - `POST /api/products/[id]/reviews`: Authenticated customer review submission.
  - `DELETE /api/reviews/[id]`: Review deletion with ownership check.
  - `PATCH /api/admin/reviews/[id]`: Admin review moderation (approve / hide).
* Automated Tests:
  - Unit tests for Review Service (`tests/unit/review.service.test.ts`): 10 tests passing.
  - Total automated test suite expanded to **83 tests passing across 18 test suites**.

## [0.7.0] - Version 6: Customer Accounts, Digital Library UI & Instant File Access (2026-09-08)

### Added
* Customer Portal Architecture & Account Service (`src/services/account/account.service.ts`):
  - `getAccountSummary`: Aggregates customer stats (total products, completed orders, total downloads) and profile details.
  - `getCustomerOrders`: Retrieves full order history, line items, pricing, discounts, and payment transaction metadata.
  - `getCustomerDownloads`: Retrieves download audit logs with privacy-preserving masked IP addresses (`192.168.***.***`).
  - `claimGuestOrders`: Automatically discovers and binds past unlinked guest orders matching customer's email address and grants missing digital entitlements.
  - `updateProfile`: Allows customers to update display names.
  - `changePassword`: Secure password updating with current password verification and length validation.
* Interactive Customer Portal UI (`src/components/account/account-portal.tsx`):
  - Modern multi-tab dashboard (Digital Library, Order History, Download Activity, Settings & Security).
  - Quick summary stats banner displaying real-time metrics.
  - Interactive search bar to filter purchased digital products.
  - License key revealer and 1-click clipboard copier with custom product-specific keys (`NOV-XXXX-XXXX-XXXX-LIC`).
  - Direct download action buttons requesting 15-minute signed storage URLs.
  - Order receipts modal with itemized pricing, subtotal, discount codes, tax breakdown, and 1-click browser printing (`window.print()`).
  - Download activity audit table showing download timestamps, versions, and masked IP records.
  - Guest order claim scanner tool with real-time UI feedback.
  - Fast sign-out button.
* API Endpoints:
  - `GET /api/account/orders`: Fetches customer order history and transactions.
  - `GET /api/account/downloads`: Fetches customer download activity logs.
  - `PUT /api/account/profile`: Updates customer display name.
  - `PUT /api/account/password`: Changes account password.
  - `POST /api/account/claim-orders`: Associates past guest orders with customer account.
* Automated Tests:
  - Unit tests for Customer Account Service (`tests/unit/account.service.test.ts`): 9 tests passing.
  - Test suite expanded to **73 tests passing across 17 test suites**.

## [0.6.0] - Version 5: Global & African Payment Gateways (Flutterwave & Paystack) (2026-09-08)

### Added
* Payment Provider Architecture & Abstraction (`src/services/payment/`):
  - Unified payment adapter contract `IPaymentAdapter` (`payment.interface.ts`) supporting multi-currency and regional settlement options.
  - Flutterwave Gateway Adapter (`flutterwave.adapter.ts`):
    - Full support for Cards, African Mobile Money (M-Pesa, MTN MoMo, Airtel Money, Telecel Cash), and USSD.
    - Standard checkout initialization with automatic redirection and fallback to simulated dev testing.
    - Constant-time `verif-hash` cryptographic signature verification.
    - JSON payload normalization into typed `WebhookEventPayload`.
  - Paystack Gateway Adapter (`paystack.adapter.ts`):
    - Cards, Nigerian/Ghanaian/Kenyan Bank Transfers, and USSD.
    - Automated currency subunit conversion (cents / kobo).
    - Cryptographic HMAC-SHA512 `x-paystack-signature` verification using `crypto.timingSafeEqual`.
  - Payment Service Manager (`payment.service.ts`):
    - Factory resolver for `FLUTTERWAVE` and `PAYSTACK` gateways.
    - Checkout session initialization creating persistent `Transaction` records with unique references (`FLW-` / `PSTK-`).
    - Synchronous payment verification endpoint querying live gateway APIs.
* Webhook Idempotency & Entitlement Automation Service (`src/services/payment/webhook.service.ts`):
  - Replay-attack prevention and idempotency guard leveraging `PaymentWebhookEvent`.
  - Dual-path fulfillment: orders are transitioned to `PAID` whether customer redirect completes or asynchronous webhook fires first.
  - Automatic digital entitlement issuance and audit logging on verified transactions.
* API Endpoints:
  - `POST /api/payments/initialize`: Initializes gateway checkout sessions.
  - `GET /api/payments/verify`: Customer redirect return callback handler verifying status and directing users to `/checkout/success`.
  - `POST /api/webhooks/flutterwave`: Cryptographically verified webhook endpoint for Flutterwave events.
  - `POST /api/webhooks/paystack`: HMAC-SHA512 verified webhook endpoint for Paystack events.
* Storefront Checkout Integration:
  - `POST /api/checkout/create-session` enhanced to automatically initiate payment sessions for paid orders and grant instant access for $0/free orders.
  - `/checkout` UI updated to redirect directly to gateway payment pages and return gracefully to `/checkout/success`.
* Automated Tests:
  - Unit tests for payment adapters (`tests/unit/payment.service.test.ts`): 10 tests passing.
  - Unit tests for webhook idempotency and cryptographic verification (`tests/unit/webhook.service.test.ts`): 4 tests passing.
  - Test suite expanded to **64 tests passing across 16 test suites**.

## [0.5.0] - Version 4: Shopping Cart, Checkout Session & Order State Machine (2026-09-08)

### Added
* Client-Side Shopping Cart & State Management:
  - Persistent React `CartContext` (`src/context/cart-context.tsx`) with localStorage synchronization and multi-item digital bundle support.
  - Interactive cart badge counter (`src/components/cart/cart-badge.tsx`) embedded in the header navigation.
  - Interactive `ProductBuyActions` component (`src/components/products/product-buy-actions.tsx`) with "Add to Cart" feedback and "Buy Now" direct checkout flow.
* Coupon & Promotion Engine (`src/services/coupon/coupon.service.ts`):
  - Server-side validation of discount codes (`PERCENTAGE` and `FIXED_AMOUNT`).
  - Active date window checking (`startsAt` and `expiresAt`), minimum order amounts, total redemption quotas (`maxUses`), and per-customer usage limits.
  - Coupon redemption recording with atomic database increments.
* Order Service & Lifecycle State Machine (`src/services/order/order.service.ts`):
  - Zero-trust pricing engine querying live product prices and sales discounts directly from PostgreSQL, strictly preventing client-side price tampering.
  - Unique audit-friendly order number generator (`NOV-XXXXXX-XXXX`).
  - Order state machine with strict transition guards:
    - `PENDING` -> `PAID`, `FAILED`, `CANCELLED`
    - `PAID` -> `REFUND_PENDING`, `REFUNDED`, `CHARGEBACK`
    - Blocks illegal state transitions (e.g. `PAID` back to `PENDING`).
  - Automatic entitlement granting side-effect: transitioning to `PAID` automatically grants customer lifetime library licenses and access rights.
  - Automatic entitlement revocation side-effect: transitioning to `REFUNDED` revokes access.
* API Endpoints:
  - `POST /api/coupons/validate`: Real-time coupon verification and discount computation.
  - `POST /api/checkout/create-session`: Creates an order in `PENDING` state with server-verified line items and totals.
  - `GET /api/orders/[id]`: Secure receipt and order details lookup.
* User Interfaces:
  - `/cart`: Responsive shopping cart page with item removals, live subtotal calculations, coupon code application, and security badges.
  - `/checkout`: High-converting checkout page with email capture, payment provider selection (Cards, Flutterwave Mobile Money, Paystack Bank Transfer), and order submission.
  - `/checkout/success`: Order confirmation page with order number, receipt breakdown, and direct link to customer library downloads.
* Automated Tests:
  - Unit tests for Coupon Service (`tests/unit/coupon.service.test.ts`): 5 tests passing.
  - Unit tests for Order Service & State Machine (`tests/unit/order.service.test.ts`): 6 tests passing.
  - Total automated test suite expanded to **50 tests passing across 14 test suites**.

## [0.4.0] - Version 3: Secure Digital File Storage & Entitlement-Authorized Delivery (2026-09-08)

### Added
* Zero-Public-Storage Architecture:
  - Private digital asset storage abstraction (`src/services/storage/storage.interface.ts`).
  - S3 / Cloudflare R2 storage adapter (`src/services/storage/s3.storage.ts`) supporting AWS SDK v3 with pre-signed GET object URLs (15-minute expiration window).
  - Local filesystem private storage adapter (`src/services/storage/local.storage.ts`) with HMAC-SHA256 signature verification for zero-credential local development and automated testing.
  - Storage service factory (`src/services/storage/storage.service.ts`) with automatic R2/S3 credential detection.
* Product File Service (`src/services/file/product-file.service.ts`):
  - `attachFileToProduct`: Uploads private binaries to isolated UUID keys, associates file metadata (size, MIME type, version, primary flag, max downloads), and records administrative audit events.
  - `getProductFiles`: Retrieves digital file portfolio and download counters.
  - `removeProductFile`: Safely deletes binary objects from private storage and purges database records with audit logging.
  - `createProductVersion`: Releases new software/template versions with changelog notes.
* Entitlement Service (`src/services/entitlement/entitlement.service.ts`):
  - `verifyCustomerAccess`: Strict cryptographic validation of active customer entitlements.
  - `grantEntitlement`: Upserts customer entitlement state upon verified purchase.
  - `revokeEntitlement`: Revokes access immediately upon refund or dispute and records audit trails.
  - `getCustomerLibrary`: Retrieves full customer inventory of purchased digital goods.
* Download Service (`src/services/download/download.service.ts`):
  - `processDownloadRequest`: Multi-barrier security verification requiring authenticated session, active entitlement, download count quota checks, download audit logging, and 15-minute signed URL issuance.
* API Endpoints:
  - `GET /api/downloads/[fileId]`: Entitlement-guarded download endpoint redirecting authorized customers to signed URLs.
  - `GET /api/downloads/file-stream`: Local signed file streaming endpoint with HMAC-SHA256 signature verification.
  - `GET /api/admin/products/[id]/files`: Admin endpoint to list all attached product assets.
  - `POST /api/admin/products/[id]/files`: Admin multipart upload endpoint for digital deliverables.
  - `DELETE /api/admin/products/files/[fileId]`: Admin endpoint for deleting digital assets.
  - `GET /api/account/library`: Authenticated customer library API.
* User Interfaces:
  - `/account`: Verified Customer Digital Library page with instant download triggers, license status, file sizes, and versions.
  - `/admin/products/[id]/edit`: Added Digital Asset File Manager card with drag/drop file upload, versioning, download limits, and deletion controls.
* Security & Automated Tests:
  - Comprehensive unit test suite in `tests/unit/storage.service.test.ts` and `tests/unit/entitlement.service.test.ts`.
  - Rigorous security barrier tests verifying 403 Forbidden on unauthorized downloads, revoked entitlements, download limits, and 404 on missing assets (39 total tests across 12 test suites passing).

## [0.3.0] - Version 2: Product Management (2026-09-08)

### Added
* Product Service layer in `src/services/product/product.service.ts`:
  - `getPublishedProducts`: Filterable, paginated query with category, price range, and full-text search.
  - `getProductBySlug`: Retrieves full product details with file specifications and category tags.
  - `getAllProductsAdmin`: Comprehensive catalog view for administrators.
  - `createProduct`: Generates SEO slugs, attaches categories, and logs administrative audit events.
  - `updateProduct`: Full product modification with change tracking.
  - `deleteProduct`: Prevents deletion of purchased products to preserve customer entitlement integrity.
  - `togglePublish`: Instant publication toggle.
* Category Service in `src/services/category/category.service.ts`:
  - Catalog category queries with real-time published product counts.
* Public API Routes:
  - `GET /api/products`: Filterable, searchable public catalog.
  - `GET /api/products/[slug]`: Public product detail lookup.
  - `GET /api/categories`: Public categories list.
* Admin API Routes (guarded with RBAC):
  - `GET /api/admin/products`: Admin catalog query.
  - `POST /api/admin/products`: Author a new product.
  - `PUT /api/admin/products/[id]`: Update product details and pricing.
  - `DELETE /api/admin/products/[id]`: Product deletion.
  - `PATCH /api/admin/products/[id]/publish`: Toggle publication status.
* Storefront UI Views:
  - `/products`: Responsive catalog with category pills, search input, and `ProductCard` component.
  - `/products/[slug]`: SEO-optimized product landing page with dynamic OpenGraph metadata, feature checklists, "What's Included", pricing & discount display, and buy actions.
  - `/categories`: Category showcase with product count badges.
  - Homepage updated with dynamic "Featured Products" section.
* Administrative UI Views:
  - `/admin`: Dashboard overview with metrics and quick actions.
  - `/admin/products`: Real-time inventory table with one-click publish/unpublish.
  - `/admin/products/new`: Product authoring form with pricing, types, categories, features, and licensing terms.
  - `/admin/products/[id]/edit`: Full product editor with delete safeguards.
* Unit tests for Product Validators (`productCreateSchema`, `productFilterSchema`) and ProductService `slugify` (28 total tests).

## [0.2.0] - Version 1: Database + Authentication & RBAC (2026-09-08)

### Added
* Database seeder script in `prisma/seed.ts` for Super Admin initialization (`admin@nov.com`) and default product categories.
* `VerificationToken` and `PasswordResetToken` relational models in `prisma/schema.prisma`.
* Password hashing service with bcrypt (`12` salt rounds) and complexity validator in `src/services/auth/password.service.ts`.
* Cryptographically secure random token generation and expiration service in `src/services/auth/token.service.ts`.
* Tamper-proof HMAC-SHA256 session token and cookie management in `src/services/auth/session.service.ts`.
* Role-based access control (RBAC) authorization guards (`CUSTOMER`, `ADMIN`, `SUPER_ADMIN`) in `src/services/auth/rbac.service.ts`.
* Transactional email service abstraction with HTML templates in `src/services/email/email.service.ts`.
* Zod validation schemas for registration, login, forgot password, and password reset in `src/lib/validators/auth.ts`.
* Authentication API routes:
  - `POST /api/auth/register`: Account creation with duplicate prevention.
  - `POST /api/auth/login`: Credential validation with HttpOnly session cookies.
  - `POST /api/auth/logout`: Session termination.
  - `GET /api/auth/me`: Current session and profile retrieval.
  - `POST /api/auth/forgot-password`: Password reset request with token dispatch.
  - `POST /api/auth/reset-password`: Token verification and password update.
* Customer Auth UI views:
  - `/login`: Secure sign-in form with redirect handling and error/success alerts.
  - `/register`: Customer sign-up form with password strength validation.
  - `/forgot-password`: Password recovery request form.
  - `/reset-password`: New password confirmation form.

## [0.1.0] - Version 0: Project Foundation (2026-09-08)

### Added
* Next.js 16 (App Router) + TypeScript + Tailwind CSS initial architecture.
* Normalized PostgreSQL schema in `prisma/schema.prisma` with Prisma 7 client generation.
* Zod environment schema validator in `src/lib/env.ts` and template in `.env.example`.
* Core reusable UI component primitives: `Button`, `Card`, `Badge`, `Input`, `Container`, `Skeleton`, `ErrorState`, `EmptyState`.
* Storefront root layout, high-trust homepage, global error boundary, and 404 page.
* Diagnostic health check API route at `/api/health`.
