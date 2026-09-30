import fs from 'fs';
import path from 'path';
import { ProductKind, ProductType, OrderStatus, FulfillmentStatus } from '@prisma/client';

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
  model3dPoster?: string | null;
  features: string[];
  whatsIncluded: string[];
  tags: string[];
  createdAt: string;
  variants: DevVariant[];
  categories: Array<{ category: { name: string; slug: string } }>;
  files?: Array<{ id: string; fileName: string; fileSize: number; versionNumber: string }>;
}

const STORAGE_DIR = path.resolve(process.cwd(), '.private_storage');
const PRODUCTS_FILE = path.join(STORAGE_DIR, 'dev_products.json');

function ensureDir() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
}

// ==========================================
// 2. Dev Product Store (Zero In-Built Products)
// ==========================================
const DEFAULT_EDITORIAL_PRODUCTS: DevProduct[] = [];

function getDevProducts(): DevProduct[] {
  try {
    ensureDir();
    if (!fs.existsSync(PRODUCTS_FILE)) {
      fs.writeFileSync(PRODUCTS_FILE, JSON.stringify([], null, 2), 'utf-8');
      return [];
    }
    const data = fs.readFileSync(PRODUCTS_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
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
      model3dUrl: productData.model3dUrl || null,
      model3dPoster: productData.model3dPoster || null,
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

  delete(id: string): boolean {
    const products = getDevProducts();
    const filtered = products.filter((p) => p.id !== id && p.slug !== id);
    if (filtered.length !== products.length) {
      saveDevProducts(filtered);
      return true;
    }
    return false;
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
