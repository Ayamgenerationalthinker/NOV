# Changelog — NOV.com

All notable changes to this project will be documented in this file.

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
* Unit tests for PasswordService, TokenService, SessionService, RBACService, and Auth Validators (23 total tests).

## [0.1.0] - Version 0: Project Foundation (2026-09-08)

### Added
* Next.js 16 (App Router) + TypeScript + Tailwind CSS initial architecture.
* Normalized PostgreSQL schema in `prisma/schema.prisma` with Prisma 7 client generation.
* Zod environment schema validator in `src/lib/env.ts` and template in `.env.example`.
* Core reusable UI component primitives: `Button`, `Card`, `Badge`, `Input`, `Container`, `Skeleton`, `ErrorState`, `EmptyState`.
* Storefront root layout, high-trust homepage, global error boundary, and 404 page.
* Diagnostic health check API route at `/api/health`.
* Unit and component testing harness with Vitest and React Testing Library.
* Technical documentation (`README.md`, `ARCHITECTURE.md`, `DATABASE.md`, `PAYMENTS.md`, `SECURITY.md`).
