# Version 6: Customer Accounts, Digital Library UI & Instant File Access

## Overview
Version 6 introduces the complete, rich customer experience for **NOV.com**. Customers can browse their purchased digital portfolio, trigger instant cryptographically signed file downloads, view and print itemized order tax receipts, audit device download history, manage security credentials, and claim past unlinked guest purchases with a single click.

---

## Key Features & Architecture

### 1. Interactive Customer Portal (`src/components/account/account-portal.tsx`)
- **Overview Banner**: High-impact profile header showing customer name, verified email, role badge, membership start date, and quick metrics:
  - Total Products Owned
  - Total Orders Placed
  - Total Downloads
- **Digital Library Tab**:
  - Live search input to quickly filter products by name or type.
  - Product cards featuring type tags, acquisition dates, lifetime license badges, and attached asset counters.
  - License key revealer modal with one-click clipboard copying (`NOV-XXXX-XXXX-XXXX-LIC`).
  - Direct download buttons requesting temporary 15-minute signed URLs from Cloudflare R2 / private storage.
- **Order History & Receipts Tab**:
  - Full order timeline showing order numbers, placement dates, payment methods, and color-coded status badges (`PAID`, `PENDING`, `REFUNDED`).
  - "View Receipt" modal displaying complete tax invoice breakdown: subtotal, coupon discounts, net total, and line item details.
  - One-click browser receipt printing (`window.print()`).
- **Download Activity Tab**:
  - Audit log table tracking customer download requests: file name, version tag, file size, download timestamp, and privacy-masked IP addresses (`192.168.***.***`).
- **Settings & Security Tab**:
  - Profile name updater with instant feedback.
  - Password change form requiring current password verification and enforcing strong password length.
  - Guest purchase scanner: scans the database for previous guest orders matching the customer's email and binds them to the account and digital library.

---

### 2. Customer Account Service (`src/services/account/account.service.ts`)
- `getAccountSummary(customerId)`: Fetches profile data and aggregates counts from `Entitlement`, `Order`, and `Download` tables in parallel.
- `getCustomerOrders(customerId)`: Returns full order and transaction objects with numeric price conversions.
- `getCustomerDownloads(customerId, limit)`: Returns download records with privacy-preserving IP masking.
- `claimGuestOrders(customerId, customerEmail)`: Links unassigned orders to customer ID and issues `Entitlement` records for paid items.
- `updateProfile(customerId, { name })`: Updates customer display name.
- `changePassword(customerId, { currentPassword, newPassword })`: Validates current credentials and updates bcrypt hash.

---

### 3. API Endpoints
- `GET /api/account/orders`: Fetches customer order history and transactions.
- `GET /api/account/downloads`: Fetches customer download activity logs.
- `PUT /api/account/profile`: Updates customer display name.
- `PUT /api/account/password`: Changes account password.
- `POST /api/account/claim-orders`: Associates past guest orders with customer account.

---

### 4. Automated Tests
- **Account Service Test Suite** (`tests/unit/account.service.test.ts`):
  - Summary aggregation and error handling on non-existent accounts.
  - Order mapping and transaction data serialization.
  - Privacy-preserving IP address masking.
  - Guest order binding and entitlement granting.
  - Password update verification and minimum length constraints.
- **Test Suite Results**: **73 tests passing across 17 test suites**.
- **Production Build**: Clean Turbopack compilation across 45 routes.
