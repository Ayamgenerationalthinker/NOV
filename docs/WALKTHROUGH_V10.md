# Walkthrough - Version 10: Marketing, Promotions & Discount Campaigns

## 1. Overview
Version 10 unlocks an end-to-end promotional and marketing machine for **NOV.com**:
- Full administrative coupon authoring and control engine with redemption limits, minimum spend, and expiration.
- Storefront real-time flash sale announcement banner with countdown timer and 1-click coupon code copier.
- Lead capture newsletter subscriber system with automated welcome discount email dispatch.
- Automated abandoned checkout detection and 1-click personalized recovery reminder email dispatch.

---

## 2. Key Deliverables

### A. Advanced Coupon Management Engine (`src/services/coupon/coupon.service.ts`)
- `getAllCoupons(params)`: Retrieves all promotional codes with redemption counts and search filtering.
- `createCoupon(params)`: Validates uppercase code normalization, bounds checking (percentage discounts between 1% and 100%, positive fixed values), minimum order amount requirements, and per-customer usage limits.
- `updateCoupon(id, params)`: Updates coupon rules, limits, or expiration windows.
- `toggleCouponStatus(id, isActive)`: 1-click enable/disable toggle.
- `deleteCoupon(id)`: Prevents breaking historical invoices by safely deactivating coupons with past redemptions (`isActive: false`), while cleanly deleting unused test codes.

### B. Marketing & Promotional Campaigns Engine (`src/services/marketing/marketing.service.ts`)
- `subscribeNewsletter(email)`: Validates email, idempotently saves subscriber record, and asynchronously dispatches a welcome email with a 10% coupon code (`WELCOME10`).
- `unsubscribeNewsletter(email)`: Sets `isActive: false` for opt-out compliance.
- `getAbandonedCheckouts(hoursAgo)`: Detects checkout sessions created at least 1 hour ago that remain in `PENDING` state. Formats line items and customer contact details.
- `sendAbandonedCheckoutReminder(orderId, discountCode)`: Dispatches personalized recovery email containing the customer's cart items, an exclusive recovery discount code (`RECOVER15`), and a direct resume checkout link.
- `getFlashSaleCampaign` / `updateFlashSaleCampaign`: Live campaign state management with real-time countdown targets and promotional coupon codes.

### C. Storefront UI Components
- **`AnnouncementBanner` (`src/components/marketing/announcement-banner.tsx`)**:
  - Embedded above the header in the global storefront layout.
  - Features dynamic badge, headline, real-time hours/minutes/seconds countdown clock, and 1-click coupon code clipboard copier with "Copied!" feedback and session dismissibility.
- **`NewsletterSignup` (`src/components/marketing/newsletter-signup.tsx`)**:
  - Dark glassmorphism card with email input, loading spinner, and success alert. Embedded on the homepage and ready for footers.

### D. Admin Management Dashboards
- **`/admin/coupons`**: Complete coupon control dashboard with code copier, discount values, redemption counters, expiration dates, status toggles, and modal authoring form.
- **`/admin/marketing`**:
  - Tab 1: Live Flash Sale Banner configurator with real-time countdown preview.
  - Tab 2: Abandoned Checkouts monitor with 1-click recovery email triggers.
  - Tab 3: Newsletter Subscribers directory with subscription timestamps and active flags.

### E. API Endpoints
- `GET /api/admin/coupons` & `POST /api/admin/coupons`
- `GET /api/admin/coupons/[id]`, `PATCH /api/admin/coupons/[id]`, `DELETE /api/admin/coupons/[id]`
- `POST /api/marketing/newsletter`
- `GET /api/marketing/flash-sale` & `POST /api/marketing/flash-sale`
- `GET /api/admin/marketing/subscribers`
- `GET /api/admin/marketing/abandoned`
- `POST /api/admin/marketing/abandoned/[id]/recover`

---

## 3. Automated Verification & Quality Metrics

1. **Unit Tests**:
   - `tests/unit/admin-coupon.service.test.ts`: 10/10 tests passed (creation validation, percentage bounds, uniqueness, soft-deactivation).
   - `tests/unit/marketing.service.test.ts`: 9/9 tests passed (newsletter regex, welcome email, duplicate handling, abandoned cart recovery, flash sale state).
2. **Full Test Suite**:
   - **116 tests passing across all 22 test suites** with 0 failures.
3. **TypeScript Typecheck (`npx tsc --noEmit`)**:
   - **0 errors**.
4. **Production Build (`npm run build`)**:
   - **63 static and dynamic routes compiled cleanly** in 11.1s.
