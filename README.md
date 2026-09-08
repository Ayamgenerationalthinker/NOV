# NOV.com — Private Global Digital Product Commerce Platform

[![Repository](https://img.shields.io/badge/GitHub-Ayamgenerationalthinker%2FNOV-blue)](https://github.com/Ayamgenerationalthinker/NOV)

**NOV.com** is a production-grade, self-hosted private digital product commerce platform engineered for creators and businesses who want 100% control over their storefront, customers, payments, file security, and digital product delivery.

---

## 🌟 Key Architectural Features

* **Multi-Gateway Payment Abstraction**: Unified interface supporting Flutterwave, Paystack, and future gateways (cards, Ghana Mobile Money, African local methods, and international payments).
* **Cryptographic Webhook Verification**: Idempotent order processing with signature validation and duplicate transaction protection.
* **Secure Digital Delivery**: Private object storage (Cloudflare R2 / AWS S3) with time-limited cryptographically signed URLs.
* **Full Data Ownership**: Normalized PostgreSQL schema with Prisma ORM, audit logging, RBAC, and analytics.
* **Customer Library & Account Management**: Instant digital asset access, download logging, and passwordless or credential authentication.
* **High-Performance UI**: Next.js App Router, TypeScript, Tailwind CSS, and accessible UI component architecture.

---

## 🚀 Quick Start

### Prerequisites
* **Node.js**: v20.x or v22.x+
* **npm**: v10+
* **PostgreSQL**: Local or hosted (Supabase, Neon, AWS RDS, etc.)

### 1. Installation
```bash
cd digicommerce
npm install
```

### 2. Environment Setup
Copy `.env.example` to `.env` and fill in your values:
```bash
cp .env.example .env
```

### 3. Generate Prisma Client
```bash
npm run prisma:generate
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Running Tests
```bash
npm test
```

---

## 📁 Project Architecture

```
digicommerce/
├── docs/                        # Architectural documentation
│   ├── ARCHITECTURE.md          # System design & service layers
│   ├── DATABASE.md              # Entity relationships & schema
│   ├── PAYMENTS.md              # Gateway lifecycle & webhooks
│   ├── SECURITY.md              # RBAC, signed URLs, threat model
│   └── CHANGELOG.md             # Version history
├── prisma/
│   ├── schema.prisma            # Normalized PostgreSQL schema
│   └── prisma.config.ts         # Prisma 7 configuration
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── api/health/          # Health check API
│   │   ├── layout.tsx           # Global root layout
│   │   ├── page.tsx             # Storefront homepage
│   │   ├── error.tsx            # Error boundary
│   │   └── not-found.tsx        # 404 page
│   ├── components/
│   │   ├── ui/                  # Button, Card, Badge, Input, Skeleton
│   │   ├── layout/              # Header, Footer
│   │   └── feedback/            # ErrorState, EmptyState
│   ├── lib/
│   │   ├── prisma.ts            # Singleton Prisma client
│   │   ├── env.ts               # Zod-validated environment config
│   │   └── utils.ts             # Currency, formatting, CN helpers
│   └── types/                   # TypeScript domain definitions
└── tests/                       # Unit & integration tests
```

---

## 📖 Documentation Index

* [Architecture Design](docs/ARCHITECTURE.md)
* [Database Schema](docs/DATABASE.md)
* [Payment System](docs/PAYMENTS.md)
* [Security Policies](docs/SECURITY.md)
* [Changelog](docs/CHANGELOG.md)
