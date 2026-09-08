# Architecture Documentation — DigiCommerce

## 1. System Overview

DigiCommerce is architected as a modular, domain-driven commerce platform built on Next.js App Router, TypeScript, PostgreSQL, and Prisma ORM.

```
┌────────────────────────────────────────────────────────┐
│                   Next.js App Router                   │
│   (Storefront)   (Customer Dashboard)   (Admin Hub)   │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                    Application Layer                   │
│  Server Actions / API Handlers / Middleware & Security │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                      Domain Services                   │
│   AuthService   PaymentService   StorageService Email  │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                      Data Layer                        │
│             Prisma ORM & PostgreSQL Database           │
└────────────────────────────────────────────────────────┘
```

---

## 2. Core Domain Services

### A. PaymentService
An abstraction layer that separates business logic from specific payment providers:
* `IPaymentAdapter` interface implemented by `FlutterwaveAdapter` and `PaystackAdapter`.
* Capabilities: `initializePayment()`, `verifyTransaction()`, `handleWebhook()`, `processRefund()`.

### B. StorageService
An abstraction for private digital asset storage:
* `IStorageAdapter` implemented by `CloudflareR2Adapter` / `S3Adapter`.
* Generates time-limited (e.g., 15 minutes) cryptographically signed URLs.
* Files are never stored in public web directories.

### C. EmailService
Transactional email delivery via Resend with standardized templates:
* Purchase receipt & instant access link.
* Password reset & account verification.
* Product update notifications.

---

## 3. Order & Entitlement Lifecycle

```
Customer Checkout ──> Pending Order Created ──> Gateway Redirect
                                                       │
                                                       ▼
Product Access Granted <── Order Paid <── Webhook Verified
```
