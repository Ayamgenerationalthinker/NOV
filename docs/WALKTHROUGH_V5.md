# Version 5: Global & African Payment Gateways (Flutterwave & Paystack)

## Overview
Version 5 delivers the complete payment infrastructure for **NOV.com**, connecting the platform to global card networks and African mobile payment rails (M-Pesa, MTN Mobile Money, Airtel Money, Telecel Cash, Bank Transfers, and USSD) via **Flutterwave** and **Paystack**.

All transactions follow zero-trust server validation, cryptographic signature checking, and strict webhook idempotency to prevent duplicate fulfillment or replay attacks.

---

## Key Architecture & Features

### 1. Payment Adapter Abstraction (`src/services/payment/`)
- `IPaymentAdapter` (`payment.interface.ts`): Standardized interface for any payment gateway:
  - `initializePayment(params)`: Initiates a payment session with gateway-specific metadata.
  - `verifyPayment(reference)`: Queries the gateway's REST API to verify settlement.
  - `verifyWebhookSignature(headers, rawBody)`: Cryptographically verifies the webhook authenticity.
  - `parseWebhookEvent(rawBody)`: Normalizes provider-specific payloads into typed events.
- `FlutterwaveAdapter` (`flutterwave.adapter.ts`):
  - Cards, African Mobile Money (Kenya, Ghana, Nigeria, Rwanda, Uganda), USSD.
  - `verif-hash` header signature verification using constant-time comparison.
- `PaystackAdapter` (`paystack.adapter.ts`):
  - Cards, Bank Transfers, USSD, Apple Pay.
  - Currency subunit handling (`amount * 100` for cents / kobo).
  - HMAC-SHA512 `x-paystack-signature` verification using `crypto.timingSafeEqual`.
- `PaymentService` (`payment.service.ts`): Factory resolving adapters, persisting `Transaction` records, and verifying transaction status.

---

### 2. Idempotent Webhook Processing (`src/services/payment/webhook.service.ts`)
- **Security Check**: Immediately verifies HMAC-SHA512 (Paystack) or Secret Hash (Flutterwave). Rejects forged requests with HTTP 401.
- **Idempotency Guard**: Checks `PaymentWebhookEvent` table for duplicate `eventId`. If already processed, skips processing without re-triggering side effects.
- **Dual-Path Fulfillment**:
  - Path A: Customer redirects back to `/api/payments/verify`, which confirms status and grants entitlements.
  - Path B: Gateway webhook arrives at `/api/webhooks/flutterwave` or `/api/webhooks/paystack` asynchronously.
  - Whichever arrives first fulfills the order; the second acts as an idempotent confirmation.
- **Entitlement Dispatch**: Validated payments invoke `OrderService.transitionOrderStatus(PAID)`, which atomically creates `Entitlement` records for the customer's digital library.

---

### 3. API Endpoints
- `POST /api/payments/initialize`: Initializes checkout session for a given order ID and payment provider.
- `GET /api/payments/verify`: Gateway redirect callback that verifies transaction status and redirects customer to `/checkout/success`.
- `POST /api/webhooks/flutterwave`: Ingests Flutterwave webhook events.
- `POST /api/webhooks/paystack`: Ingests Paystack webhook events.

---

### 4. Automated Tests
- **Payment Service & Adapters** (`tests/unit/payment.service.test.ts`):
  - Verifies adapter selection and fallback behavior.
  - Verifies simulated gateway URL generation.
  - Verifies Flutterwave and Paystack webhook parsing and subunit conversions.
- **Webhook Processing & Security** (`tests/unit/webhook.service.test.ts`):
  - Validates rejection of unsigned or invalid webhook payloads.
  - Validates idempotency skip for previously processed events.
  - Validates successful end-to-end webhook processing, database transaction update, and order transition to `PAID`.
- **Test Suite Results**: **64 tests passing across 16 test suites**.
- **Next.js Production Build**: Clean build with 40+ dynamic and static routes.
