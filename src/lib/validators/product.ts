import { z } from 'zod';
import { ProductType, ProductKind } from '@prisma/client';

/** Absolute URL (R2/CDN) or a root-relative path (local dev uploads such as /uploads/...). */
export const mediaUrlSchema = z
  .string()
  .refine((v) => v.startsWith('/') && !v.startsWith('//') || /^https?:\/\//.test(v), 'Must be an uploaded file or a full https URL');

export const productVariantSchema = z.object({
  id: z.string().optional(),
  // Generated from the product slug and variant title when omitted.
  sku: z.string().min(2, 'SKU must be at least 2 characters').max(80).optional(),
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
  imageUrl: mediaUrlSchema.optional().nullable().or(z.literal('')),
  isAvailable: z.boolean().default(true),
});

export const productImageSchema = z.object({
  id: z.string().optional(),
  url: mediaUrlSchema,
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
  coverImage: mediaUrlSchema.optional().nullable().or(z.literal('')),
  galleryImages: z.array(mediaUrlSchema).default([]),
  images: z.array(productImageSchema).optional(),
  price: z.coerce.number().min(0, 'Price must be greater than or equal to 0'),
  discountPrice: z.coerce.number().min(0).optional().nullable(),
  currency: z.string().length(3).default('GHS'),
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
  // Physical products without variants: stock held on a hidden default variant.
  stockQuantity: z.coerce.number().int().min(0).optional(),

  // 3D Model Configuration
  model3dUrl: mediaUrlSchema.optional().nullable().or(z.literal('')),
  model3dPoster: mediaUrlSchema.optional().nullable().or(z.literal('')),
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

type OptionalWithoutDefaults<T extends z.ZodRawShape> = {
  [K in keyof T]: z.ZodOptional<T[K] extends z.ZodDefault<infer Inner> ? Inner : T[K]>;
};

// Zod 4 applies .default() even inside .partial(), which would silently reset omitted fields
// (isPublished, features, currency...) on every partial update. Strip defaults first.
function withoutDefaults<T extends z.ZodRawShape>(shape: T): OptionalWithoutDefaults<T> {
  return Object.fromEntries(
    Object.entries(shape).map(([key, schema]) => [
      key,
      ((schema instanceof z.ZodDefault ? schema.removeDefault() : schema) as z.ZodType).optional(),
    ])
  ) as unknown as OptionalWithoutDefaults<T>;
}

export const productUpdateSchema = z.object(withoutDefaults(productCreateSchema.shape));

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
