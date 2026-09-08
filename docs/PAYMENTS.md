# Payment Architecture & Security — DigiCommerce

## 1. Zero-Trust Payment Flow

The platform NEVER trusts the frontend to declare that a payment succeeded. Access is granted solely after backend webhook validation and gateway API verification.

```
1. Customer initiates checkout
2. Server creates Order (PENDING) and Transaction (INITIALIZED)
3. Server initializes payment session with Gateway (Flutterwave/Paystack)
4. Customer completes payment on Gateway
5. Gateway sends signed HTTP POST webhook to /api/webhooks/[provider]
6. Server verifies HMAC SHA256/Secret signature header
7. Server calls Gateway Verification API to confirm amount, currency & status
8. Server transitions Transaction to SUCCESSFUL and Order to PAID
9. Server grants Entitlement to customer
10. Server triggers transactional purchase receipt email
```

---

## 2. Idempotency & Replay Protection

Every webhook event is recorded in the `PaymentWebhookEvent` table.
* If a webhook with the same transaction/event reference is received again, the system returns `HTTP 200` immediately without executing duplicate state mutations, duplicate entitlement creation, or duplicate emails.
