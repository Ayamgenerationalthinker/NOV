# Database Documentation — DigiCommerce

## Relational Schema Design

The database schema is implemented in PostgreSQL and managed with Prisma ORM.

### Primary Entities

| Entity | Purpose |
| :--- | :--- |
| `User` | Stores customer and administrator accounts with RBAC (`CUSTOMER`, `ADMIN`, `SUPER_ADMIN`). |
| `Product` | Product catalog metadata, pricing, features, publishing status, and currency. |
| `ProductFile` | Private digital files associated with products, tracking file keys, sizes, and versions. |
| `ProductVersion` | Tracks version releases and changelogs for existing customers. |
| `Category` | Hierarchical taxonomy for products. |
| `Order` | State-machine tracked purchases (`PENDING`, `PAID`, `FAILED`, `CANCELLED`, `REFUNDED`, etc.). |
| `OrderItem` | Individual line items in an order with snapshot pricing at purchase time. |
| `Transaction` | Gateway-level records mapping internal references to external provider references. |
| `Entitlement` | Authoritative customer access token for a purchased digital product. |
| `Download` | Granular audit trail of customer downloads (timestamp, IP, user agent, file). |
| `Coupon` & `CouponRedemption` | Fixed and percentage discount management with usage limits. |
| `PaymentWebhookEvent` | Raw webhook log ensuring zero duplicate processing and idempotent replays. |
| `AuditLog` | Administrative action trail recording who changed what and when. |
