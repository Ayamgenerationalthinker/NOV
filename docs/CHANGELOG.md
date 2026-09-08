# Changelog — NOV.com

All notable changes to this project will be documented in this file.

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
