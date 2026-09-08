# Security Guidelines & Threat Model — DigiCommerce

## 1. File Protection
* **No Public Web Hosting**: Digital assets are never placed in `/public` or unauthenticated static buckets.
* **Pre-signed URLs**: Downloads are routed through `/api/downloads/[fileId]` which verifies customer entitlement in PostgreSQL before signing a 15-minute temporary URL from Cloudflare R2 / S3.

## 2. Authentication & Authorization
* **Role-Based Access Control (RBAC)**: Enforced across all API routes and server actions (`CUSTOMER`, `ADMIN`, `SUPER_ADMIN`).
* **Session Integrity**: Secure HttpOnly cookies with CSRF safeguards.

## 3. Secret Management
* All API keys (Flutterwave, Paystack, Resend, Cloudflare R2) are loaded strictly into server-side environment variables and validated at startup using `Zod` in `src/lib/env.ts`.
