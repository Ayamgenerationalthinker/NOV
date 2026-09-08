# Changelog — DigiCommerce

All notable changes to this project will be documented in this file.

## [0.1.0] - Version 0: Project Foundation (2026-09-08)

### Added
* Next.js 16 (App Router) + TypeScript + Tailwind CSS initial architecture.
* Normalized PostgreSQL database schema in `prisma/schema.prisma` with models for Users, Roles, Products, Files, Versions, Categories, Orders, OrderItems, Transactions, Entitlements, Downloads, Coupons, Redemptions, Reviews, AuditLogs, and Webhooks.
* Prisma 7 configuration in `prisma.config.ts` and singleton client in `src/lib/prisma.ts`.
* Zod environment schema validator in `src/lib/env.ts` and template in `.env.example`.
* Core reusable UI component primitives: `Button`, `Card`, `Badge`, `Input`, `Container`, `Skeleton`, `ErrorState`, `EmptyState`.
* Storefront root layout, high-trust homepage, global error boundary, and 404 page.
* Diagnostic health check API route at `/api/health`.
* Unit and component testing harness with Vitest and React Testing Library.
* Comprehensive technical documentation (`README.md`, `ARCHITECTURE.md`, `DATABASE.md`, `PAYMENTS.md`, `SECURITY.md`).
