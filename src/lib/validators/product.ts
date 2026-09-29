import { z } from 'zod';
import { ProductType, ProductKind } from '@prisma/client';

export const productVariantSchema = z.object({
  id: z.string().optional(),
  sku: z.string().min(2, 'SKU must be at least 2 characters').max(50),
  title: z.string().min(1, 'Variant title is required').max(100),
  option1Name: z.string().optional().nullable(),
  option1Value: z.string().optional().nullable(),
  option2Name: z.string().optional().nullable(),
  option2Value: z.string().optional().nullable(),
  option3Name: z.string().optional().nullable(),
  option3Value: z.string().optional().nullable(),
  price: z.coerce.number().min(0, 'Variant price must be >= 0'),
  salePrice: z.coerce.number().min(0).optional().nullable(),
  costPrice: z.coerce.number().min(0).optional().nullable(),
  weightGrams: z.coerce.number().min(0).optional().nullable(),
  dimensions: z
    .object({
      length: z.number().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
      unit: z.enum(['cm', 'in']).default('cm'),
    })
    .optional()
    .nullable(),
  inventoryQuantity: z.coerce.number().int().min(0).default(0),
  barcode: z.string().optional().nullable(),
  imageUrl: z.string().url().optional().nullable().or(z.literal('')),
  isAvailable: z.boolean().default(true),
});

export const productImageSchema = z.object({
  id: z.string().optional(),
  url: z.string().url('Image URL must be valid'),
  altText: z.string().optional().nullable(),
  displayOrder: z.number().int().default(0),
  isCover: z.boolean().default(false),
});

export const productCreateSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  slug: z
    .string()
    .min(3, 'Slug must be at least 3 characters')
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens')
    .optional(),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  shortDescription: z.string().max(300).optional(),
  brand: z.string().max(100).optional().nullable(),
  productKind: z.nativeEnum(ProductKind).default(ProductKind.DIGITAL),
  coverImage: z.string().url('Cover image must be a valid URL').optional().or(z.literal('')),
  galleryImages: z.array(z.string().url()).default([]),
  images: z.array(productImageSchema).optional(),
  price: z.coerce.number().min(0, 'Price must be greater than or equal to 0'),
  discountPrice: z.coerce.number().min(0).optional().nullable(),
  currency: z.string().length(3).default('USD'),
  isPublished: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  productType: z.nativeEnum(ProductType).default(ProductType.EBOOK),
  features: z.array(z.string()).default([]),
  whatsIncluded: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  licenseInfo: z.string().optional().nullable(),
  refundInfo: z.string().optional().nullable(),
  categoryIds: z.array(z.string()).default([]),
  storeId: z.string().optional().nullable(),
  shippingProfileId: z.string().optional().nullable(),
  variants: z.array(productVariantSchema).optional(),

  // 3D Model Configuration
  model3dUrl: z.string().url().optional().nullable().or(z.literal('')),
  model3dPoster: z.string().url().optional().nullable().or(z.literal('')),
  model3dConfig: z
    .object({
      autoRotate: z.boolean().optional(),
      cameraPosition: z.array(z.number()).optional(),
      scale: z.number().optional(),
      background: z.string().optional(),
    })
    .optional()
    .nullable(),
});

export const productUpdateSchema = productCreateSchema.partial();

export const productFilterSchema = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
  type: z.nativeEnum(ProductType).optional(),
  kind: z.nativeEnum(ProductKind).optional(),
  brand: z.string().optional(),
  storeId: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  sort: z.enum(['newest', 'price-asc', 'price-desc', 'featured']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export type ProductVariantInput = z.infer<typeof productVariantSchema>;
export type ProductImageInput = z.infer<typeof productImageSchema>;
export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
export type ProductFilterInput = z.infer<typeof productFilterSchema>;
