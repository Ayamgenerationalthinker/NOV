import fs from 'fs';
import path from 'path';
import { Role, ProductKind, ProductType, OrderStatus, FulfillmentStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

export interface DevUser {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string;
  role: Role;
  createdAt: string;
}

export interface DevVariant {
  id: string;
  productId: string;
  sku: string;
  title: string;
  option1Name?: string | null;
  option1Value?: string | null;
  option2Name?: string | null;
  option2Value?: string | null;
  price: number;
  salePrice?: number | null;
  inventoryQuantity: number;
  reservedQuantity: number;
  soldQuantity: number;
  isAvailable: boolean;
}

export interface DevProduct {
  id: string;
  title: string;
  slug: string;
  description: string;
  shortDescription?: string | null;
  brand?: string | null;
  productKind: ProductKind;
  productType: ProductType;
  coverImage?: string | null;
  galleryImages: string[];
  price: number;
  discountPrice?: number | null;
  currency: string;
  isPublished: boolean;
  isFeatured: boolean;
  model3dUrl?: string | null;
  features: string[];
  whatsIncluded: string[];
  tags: string[];
  createdAt: string;
  variants: DevVariant[];
  categories: Array<{ category: { name: string; slug: string } }>;
  files?: Array<{ id: string; fileName: string; fileSize: number; versionNumber: string }>;
}

const STORAGE_DIR = path.resolve(process.cwd(), '.private_storage');
const USERS_FILE = path.join(STORAGE_DIR, 'dev_users.json');
const PRODUCTS_FILE = path.join(STORAGE_DIR, 'dev_products.json');

function ensureDir() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
}

// ==========================================
// 1. Dev User Store
// ==========================================
function getDevUsers(): DevUser[] {
  try {
    ensureDir();
    if (!fs.existsSync(USERS_FILE)) {
      // Seed default single store owner
      const defaultOwner: DevUser = {
        id: 'owner_nov_001',
        email: 'owner@nov.com',
        name: 'Store Owner',
        passwordHash: bcrypt.hashSync('OwnerPassword123!', 10),
        role: Role.SUPER_ADMIN,
        createdAt: new Date().toISOString(),
      };
      fs.writeFileSync(USERS_FILE, JSON.stringify([defaultOwner], null, 2), 'utf-8');
      return [defaultOwner];
    }
    const data = fs.readFileSync(USERS_FILE, 'utf-8');
    return JSON.parse(data) || [];
  } catch {
    return [];
  }
}

function saveDevUsers(users: DevUser[]): void {
  try {
    ensureDir();
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save dev users:', err);
  }
}

export const DevUserStore = {
  findByEmail(email: string): DevUser | null {
    const users = getDevUsers();
    return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
  },

  findById(id: string): DevUser | null {
    const users = getDevUsers();
    return users.find((u) => u.id === id) || null;
  },

  create(userData: { email: string; name?: string | null; passwordHash: string; role?: Role }): DevUser {
    const users = getDevUsers();
    const newUser: DevUser = {
      id: `dev_usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      email: userData.email.toLowerCase(),
      name: userData.name || null,
      passwordHash: userData.passwordHash,
      role: userData.role || Role.CUSTOMER,
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    saveDevUsers(users);
    return newUser;
  },
};

// ==========================================
// 2. Dev Product Store (Editorial Inventory)
// ==========================================
const DEFAULT_EDITORIAL_PRODUCTS: DevProduct[] = [
  {
    id: 'prod-chrono-01',
    title: 'Titanium Chrono Edition 01',
    slug: 'titanium-chrono-edition-01',
    brand: 'NOV ATELIER',
    productKind: ProductKind.PHYSICAL,
    productType: ProductType.ACCESSORIES,
    description:
      'Engineered from aerospace-grade Grade 5 titanium, the Edition 01 Chronograph represents bespoke micro-mechanical balance. Featuring a high-contrast matte dial, scratch-resistant sapphire crystal, and an artisanal Horween leather strap. Assembled by hand in limited batches.',
    shortDescription: 'Aerospace titanium chronograph with sapphire crystal and Horween leather.',
    price: 385,
    discountPrice: null,
    currency: 'USD',
    isPublished: true,
    isFeatured: true,
    coverImage: '/images/hero-product.jpg',
    galleryImages: ['/images/hero-product.jpg', '/images/product-2.jpg'],
    features: [
      'Grade 5 Titanium Monobloc Case (40mm)',
      'Double-domed anti-reflective sapphire crystal',
      'Japanese high-beat mechanical caliber',
      'Water resistant to 10 ATM / 100 meters',
      'Includes bespoke wooden presentation case and warranty card',
    ],
    whatsIncluded: [
      'Titanium Chrono Edition 01 timepiece',
      'Horween leather strap + rubber sport strap',
      'Numbered certificate of authenticity',
      '5-year international craftsmanship warranty',
    ],
    tags: ['Watches', 'Titanium', 'Limited Edition', 'Physical'],
    createdAt: new Date().toISOString(),
    categories: [{ category: { name: 'Luxury Accessories', slug: 'accessories' } }],
    variants: [
      {
        id: 'var-tc-01',
        productId: 'prod-chrono-01',
        sku: 'NOV-CHR-TIT-BLK',
        title: 'Matte Obsidian / Black Strap',
        option1Name: 'Finish',
        option1Value: 'Matte Obsidian',
        option2Name: 'Strap',
        option2Value: 'Black Horween Leather',
        price: 385,
        salePrice: null,
        inventoryQuantity: 18,
        reservedQuantity: 1,
        soldQuantity: 32,
        isAvailable: true,
      },
      {
        id: 'var-tc-02',
        productId: 'prod-chrono-01',
        sku: 'NOV-CHR-TIT-SLV',
        title: 'Brushed Silver / Cognac Strap',
        option1Name: 'Finish',
        option1Value: 'Brushed Silver',
        option2Name: 'Strap',
        option2Value: 'Cognac Horween Leather',
        price: 385,
        salePrice: null,
        inventoryQuantity: 9,
        reservedQuantity: 0,
        soldQuantity: 41,
        isAvailable: true,
      },
    ],
  },
  {
    id: 'prod-hoodie-02',
    title: 'Heavyweight Loopback Pullover — Charcoal',
    slug: 'heavyweight-loopback-pullover-charcoal',
    brand: 'NOV GARMENTS',
    productKind: ProductKind.PHYSICAL,
    productType: ProductType.FASHION,
    description:
      'Custom-knitted from 500 GSM combed organic cotton loopback French terry. Tailored with dropped shoulders, double-layer hood without drawstrings, and reinforced blind-stitched hems. Pre-shrunk and garment-dyed for a soft, lifetime patina.',
    shortDescription: '500 GSM luxury French terry organic cotton hoodie with dropped shoulder cut.',
    price: 145,
    discountPrice: 125,
    currency: 'USD',
    isPublished: true,
    isFeatured: true,
    coverImage: '/images/product-1.jpg',
    galleryImages: ['/images/product-1.jpg'],
    features: [
      '500 GSM 100% Organic Combed Cotton',
      'Double-layer ergonomic hood without drawstring clutter',
      'Pre-shrunk Japanese loopback terry cloth',
      'Artisanal garment wash in faded charcoal',
    ],
    whatsIncluded: ['Heavyweight Loopback Pullover', 'Canvas dust bag'],
    tags: ['Apparel', 'Hoodie', 'Cotton', 'Streetwear'],
    createdAt: new Date().toISOString(),
    categories: [{ category: { name: 'Fashion & Apparel', slug: 'fashion' } }],
    variants: [
      {
        id: 'var-hd-s',
        productId: 'prod-hoodie-02',
        sku: 'NOV-HD-CHR-S',
        title: 'Charcoal / Small',
        option1Name: 'Size',
        option1Value: 'S',
        option2Name: 'Color',
        option2Value: 'Charcoal',
        price: 145,
        salePrice: 125,
        inventoryQuantity: 14,
        reservedQuantity: 0,
        soldQuantity: 28,
        isAvailable: true,
      },
      {
        id: 'var-hd-m',
        productId: 'prod-hoodie-02',
        sku: 'NOV-HD-CHR-M',
        title: 'Charcoal / Medium',
        option1Name: 'Size',
        option1Value: 'M',
        option2Name: 'Color',
        option2Value: 'Charcoal',
        price: 145,
        salePrice: 125,
        inventoryQuantity: 22,
        reservedQuantity: 2,
        soldQuantity: 65,
        isAvailable: true,
      },
      {
        id: 'var-hd-l',
        productId: 'prod-hoodie-02',
        sku: 'NOV-HD-CHR-L',
        title: 'Charcoal / Large',
        option1Name: 'Size',
        option1Value: 'L',
        option2Name: 'Color',
        option2Value: 'Charcoal',
        price: 145,
        salePrice: 125,
        inventoryQuantity: 16,
        reservedQuantity: 1,
        soldQuantity: 52,
        isAvailable: true,
      },
      {
        id: 'var-hd-xl',
        productId: 'prod-hoodie-02',
        sku: 'NOV-HD-CHR-XL',
        title: 'Charcoal / Extra Large',
        option1Name: 'Size',
        option1Value: 'XL',
        option2Name: 'Color',
        option2Value: 'Charcoal',
        price: 145,
        salePrice: 125,
        inventoryQuantity: 4,
        reservedQuantity: 0,
        soldQuantity: 19,
        isAvailable: true,
      },
    ],
  },
  {
    id: 'prod-tote-03',
    title: 'Architectural Minimalist Leather Carryall',
    slug: 'architectural-minimalist-leather-carryall',
    brand: 'NOV LEATHER',
    productKind: ProductKind.PHYSICAL,
    productType: ProductType.ACCESSORIES,
    description:
      'Sculpted from full-grain Tuscan vegetable-tanned leather. Features an unlined raw suede interior, reinforced rolled handles, and a magnetic brass closure. Designed with interior laptop sleeve (fits up to 16" MacBook Pro) and hidden passport pocket.',
    shortDescription: 'Full-grain vegetable-tanned Tuscan leather tote with 16" laptop partition.',
    price: 260,
    discountPrice: null,
    currency: 'USD',
    isPublished: true,
    isFeatured: true,
    coverImage: '/images/product-2.jpg',
    galleryImages: ['/images/product-2.jpg'],
    features: [
      'Full-grain Italian vegetable-tanned cowhide',
      'Solid brushed brass hardware and magnetic snap closure',
      'Dedicated padded pocket for up to 16" devices',
      'Reinforced base with protective brass feet',
    ],
    whatsIncluded: ['Carryall Tote', 'Leather care balm', 'Custom dust pouch'],
    tags: ['Leather', 'Bags', 'Travel', 'Physical'],
    createdAt: new Date().toISOString(),
    categories: [{ category: { name: 'Luxury Accessories', slug: 'accessories' } }],
    variants: [
      {
        id: 'var-tot-blk',
        productId: 'prod-tote-03',
        sku: 'NOV-TOT-BLK',
        title: 'Onyx Black',
        option1Name: 'Color',
        option1Value: 'Onyx Black',
        price: 260,
        salePrice: null,
        inventoryQuantity: 12,
        reservedQuantity: 0,
        soldQuantity: 18,
        isAvailable: true,
      },
      {
        id: 'var-tot-tan',
        productId: 'prod-tote-03',
        sku: 'NOV-TOT-TAN',
        title: 'Cognac Saddle Tan',
        option1Name: 'Color',
        option1Value: 'Cognac Saddle Tan',
        price: 260,
        salePrice: null,
        inventoryQuantity: 7,
        reservedQuantity: 1,
        soldQuantity: 24,
        isAvailable: true,
      },
    ],
  },
  {
    id: 'prod-code-04',
    title: 'Distributed Commerce Architecture Kit',
    slug: 'distributed-commerce-architecture-kit',
    brand: 'NOV SOFTWARE',
    productKind: ProductKind.DIGITAL,
    productType: ProductType.SOFTWARE,
    description:
      'The comprehensive, battle-tested architectural foundation for single-owner and hybrid e-commerce. Includes full Next.js 15 App Router codebase, Prisma ORM schema, Paystack & Flutterwave payment abstraction, expiring stock reservations, and inventory movement ledgers.',
    shortDescription: 'Production-ready full-stack commerce engine with Next.js 15, Prisma, and payment adapters.',
    price: 99,
    discountPrice: 79,
    currency: 'USD',
    isPublished: true,
    isFeatured: true,
    coverImage: '/images/product-3.jpg',
    galleryImages: ['/images/product-3.jpg'],
    features: [
      'Next.js 15 App Router + TypeScript + Tailwind CSS',
      'Prisma ORM schema with physical & digital product models',
      'Paystack & Flutterwave multi-gateway payment adapters with webhooks',
      'Automated Vitest test suite with 120+ tests',
      'Instant digital entitlement engine with signed download tokens',
    ],
    whatsIncluded: [
      'Complete GitHub repository source code access',
      'Comprehensive architectural documentation (docs/*.md)',
      'Docker Compose setup for PostgreSQL development',
      'Lifetime updates and release notifications',
    ],
    tags: ['Software', 'Code', 'Next.js', 'Digital', 'Architecture'],
    createdAt: new Date().toISOString(),
    categories: [{ category: { name: 'Developer Tools', slug: 'software' } }],
    files: [
      {
        id: 'file-code-01',
        fileName: 'nov-commerce-engine-v2.1.zip',
        fileSize: 4850000,
        versionNumber: '2.1.0',
      },
    ],
    variants: [
      {
        id: 'var-sw-lic',
        productId: 'prod-code-04',
        sku: 'NOV-SW-COMM-LIC',
        title: 'Single Developer Commercial License',
        option1Name: 'License',
        option1Value: 'Commercial',
        price: 99,
        salePrice: 79,
        inventoryQuantity: 9999,
        reservedQuantity: 0,
        soldQuantity: 142,
        isAvailable: true,
      },
    ],
  },
  {
    id: 'prod-spatial-05',
    title: 'Spatial UI 3D Icons & Shader Library',
    slug: 'spatial-ui-3d-icons-shader-library',
    brand: 'NOV CREATIVE',
    productKind: ProductKind.DIGITAL,
    productType: ProductType.GRAPHICS,
    description:
      'Curated collection of 120+ high-poly 3D spatial interface assets, Blender scene files, GLTF/GLB web-optimized models, and Three.js / React Three Fiber shader presets. Optimized for sub-100kb web load times with procedural PBR materials.',
    shortDescription: '120+ high-fidelity 3D UI elements and Three.js shaders for web & mobile interfaces.',
    price: 59,
    discountPrice: null,
    currency: 'USD',
    isPublished: true,
    isFeatured: false,
    coverImage: '/images/product-4.jpg',
    galleryImages: ['/images/product-4.jpg'],
    features: [
      '120+ unique 3D icons in GLTF, GLB, OBJ, and FBX formats',
      'Native Blender source files with configurable material nodes',
      'Three.js / React Three Fiber material and lighting presets',
      'Draco compressed files averaging 65kb each',
    ],
    whatsIncluded: [
      'Blender Master Project (.blend)',
      'Web-ready GLTF / GLB asset bundle',
      'React Three Fiber example demo components',
      'Personal & Commercial project license',
    ],
    tags: ['3D', 'Graphics', 'Shaders', 'Blender', 'Digital'],
    createdAt: new Date().toISOString(),
    categories: [{ category: { name: '3D & Graphics Assets', slug: 'graphics' } }],
    files: [
      {
        id: 'file-gfx-01',
        fileName: 'spatial-ui-master-v1.zip',
        fileSize: 18400000,
        versionNumber: '1.0.0',
      },
    ],
    variants: [
      {
        id: 'var-gfx-lic',
        productId: 'prod-spatial-05',
        sku: 'NOV-GFX-SPATIAL-01',
        title: 'Full Studio Access',
        option1Name: 'Access',
        option1Value: 'Full Studio',
        price: 59,
        salePrice: null,
        inventoryQuantity: 9999,
        reservedQuantity: 0,
        soldQuantity: 88,
        isAvailable: true,
      },
    ],
  },
];

function getDevProducts(): DevProduct[] {
  try {
    ensureDir();
    if (!fs.existsSync(PRODUCTS_FILE)) {
      fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(DEFAULT_EDITORIAL_PRODUCTS, null, 2), 'utf-8');
      return DEFAULT_EDITORIAL_PRODUCTS;
    }
    const data = fs.readFileSync(PRODUCTS_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_EDITORIAL_PRODUCTS;
  } catch {
    return DEFAULT_EDITORIAL_PRODUCTS;
  }
}

function saveDevProducts(products: DevProduct[]): void {
  try {
    ensureDir();
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save dev products:', err);
  }
}

export const DevProductStore = {
  getAll(): DevProduct[] {
    return getDevProducts();
  },

  getBySlug(slug: string): DevProduct | null {
    const products = getDevProducts();
    return products.find((p) => p.slug.toLowerCase() === slug.toLowerCase()) || null;
  },

  getById(id: string): DevProduct | null {
    const products = getDevProducts();
    return products.find((p) => p.id === id) || null;
  },

  save(productData: Partial<DevProduct> & { title: string; price: number }): DevProduct {
    const products = getDevProducts();
    const id = productData.id || `prod_${Date.now()}`;
    const slug = productData.slug || productData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    const existingIndex = products.findIndex((p) => p.id === id);
    const newProduct: DevProduct = {
      id,
      title: productData.title,
      slug,
      description: productData.description || '',
      shortDescription: productData.shortDescription || null,
      brand: productData.brand || 'NOV ATELIER',
      productKind: productData.productKind || ProductKind.PHYSICAL,
      productType: productData.productType || ProductType.PHYSICAL_GOOD,
      coverImage: productData.coverImage || '/images/hero-product.jpg',
      galleryImages: productData.galleryImages || ['/images/hero-product.jpg'],
      price: productData.price,
      discountPrice: productData.discountPrice || null,
      currency: productData.currency || 'USD',
      isPublished: productData.isPublished !== undefined ? productData.isPublished : true,
      isFeatured: productData.isFeatured || false,
      features: productData.features || [],
      whatsIncluded: productData.whatsIncluded || [],
      tags: productData.tags || [],
      createdAt: productData.createdAt || new Date().toISOString(),
      categories: productData.categories || [{ category: { name: 'Curated Goods', slug: 'curated' } }],
      variants: productData.variants || [
        {
          id: `var_${Date.now()}`,
          productId: id,
          sku: `NOV-${slug.slice(0, 8).toUpperCase()}-01`,
          title: 'Standard',
          price: productData.price,
          salePrice: productData.discountPrice || null,
          inventoryQuantity: 25,
          reservedQuantity: 0,
          soldQuantity: 0,
          isAvailable: true,
        },
      ],
      files: productData.files || [],
    };

    if (existingIndex >= 0) {
      products[existingIndex] = { ...products[existingIndex], ...newProduct };
    } else {
      products.unshift(newProduct);
    }

    saveDevProducts(products);
    return newProduct;
  },

  adjustStock(variantId: string, delta: number): boolean {
    const products = getDevProducts();
    let updated = false;

    for (const p of products) {
      for (const v of p.variants) {
        if (v.id === variantId || v.sku === variantId) {
          v.inventoryQuantity = Math.max(0, v.inventoryQuantity + delta);
          v.isAvailable = v.inventoryQuantity > 0;
          updated = true;
          break;
        }
      }
      if (updated) break;
    }

    if (updated) {
      saveDevProducts(products);
    }
    return updated;
  },
};
