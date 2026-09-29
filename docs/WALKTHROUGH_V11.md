# Walkthrough: Version 11 — Hybrid Physical & Digital Commerce, Inventory Ledger, Shipping & Interactive 3D

## Overview

Version 11 upgrades NOV from a purely digital product platform into a comprehensive **Hybrid Commerce Platform** supporting physical goods (apparel, accessories, electronics) and digital downloads (ebooks, templates, courses, software), backed by real-time inventory ledgering, shipping zones, fulfillment logistics, and interactive 3D WebGL viewers.

---

## Key Features

### 1. Unified Physical & Digital Product Architecture
- **Variants & SKUs**: Supports size, color, storage, and custom option combinations with independent SKUs, pricing, sale prices, cost prices, and weight/dimensions.
- **Dynamic Product Wizard**: Step-by-step product creation with automatic form adaptation based on `PHYSICAL` vs `DIGITAL` selection.
- **Interactive 3D Media**: GLB/GLTF model configuration with WebGL feature detection and photography fallbacks.

### 2. Real-Time Inventory & Stock Movement Ledger
- **Atomic Stock Adjustments**: Restocks, manual adjustments, order fulfillment, return restocks, and damage/loss write-offs recorded immutably in `StockMovement`.
- **Expiring Reservations**: 15-minute checkout holds preventing overselling without blocking unsold stock indefinitely.
- **Low-Stock Telemetry**: Real-time alerts for merchant restocking.

### 3. Shipping & Reverse Logistics Engine
- **Dynamic Shipping Zone Pricing**: Domestic (e.g. Ghana) and international tiers with base rates, per-item incremental fees, and free-shipping thresholds.
- **Zero-Shipping Rule**: Pure digital baskets automatically bypass shipping calculations and address requirements.
- **Carrier Fulfillment Tracking**: Assign DHL, FedEx, or Ghana Post tracking numbers and URLs with customer notification.
- **Customer Return Workflow**: Return request filing, seller approval, dispute response, and automated inventory restock reconciliation.

### 4. Interactive 3D WebGL Storefront
- **`Product3DViewer`**: React Three Fiber & Drei 360° interactive canvas with drag-to-orbit, zoom, and auto-rotation toggle.
- **`Hero3DScene`**: Ambient 3D geometry showcase with lighting and reflections.
- **Graceful Fallbacks**: Fallback to high-resolution product photography if WebGL is unavailable or models fail to load.

---

## Verification & Testing

- **Automated Tests**: 123 passing across 24 test suites.
- **TypeScript**: 0 errors (`npx tsc --noEmit`).
- **Prisma Schema**: Validated and synced.
