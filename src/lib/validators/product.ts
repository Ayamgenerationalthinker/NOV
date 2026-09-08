import { z } from 'zod';
import { ProductType } from '@prisma/client';

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
  coverImage: z.string().url('Cover image must be a valid URL').optional().or(z.literal('')),
  galleryImages: z.array(z.string().url()).default([]),
  price: z.coerce.number().min(0, 'Price must be greater than or equal to 0'),
  discountPrice: z.coerce.number().min(0).optional().nullable(),
  currency: z.string().length(3).default('USD'),
  isPublished: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  productType: z.nativeEnum(ProductType).default(ProductType.EBOOK),
  features: z.array(z.string()).default([]),
  whatsIncluded: z.array(z.string()).default([]),
  licenseInfo: z.string().optional(),
  refundInfo: z.string().optional(),
  categoryIds: z.array(z.string()).default([]),
});

export const productUpdateSchema = productCreateSchema.partial();

export const productFilterSchema = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
  type: z.nativeEnum(ProductType).optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  sort: z.enum(['newest', 'price-asc', 'price-desc', 'featured']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
export type ProductFilterInput = z.infer<typeof productFilterSchema>;
