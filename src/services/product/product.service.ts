import { prisma } from '@/lib/prisma';
import {
  ProductCreateInput,
  ProductUpdateInput,
  ProductFilterInput,
  ProductVariantInput,
} from '@/lib/validators/product';
import { OrderStatus, Prisma, ProductKind, StockMovementType } from '@prisma/client';
import crypto from 'crypto';
import { DEFAULT_VARIANT_TITLE } from '@/lib/product-purchase';

/**
 * A physical product without options keeps its stock on one hidden variant titled
 * DEFAULT_VARIANT_TITLE, so it shares the same reservation / stock-movement machinery as
 * products with variants.
 */
export { DEFAULT_VARIANT_TITLE };

export function isDefaultVariant(variant: { title: string; option1Value?: string | null }): boolean {
  return variant.title === DEFAULT_VARIANT_TITLE && !variant.option1Value;
}

/** A product change the owner can fix (shown to them as-is, returned as HTTP 400). */
export class ProductValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProductValidationError';
  }
}

type Tx = Prisma.TransactionClient;

type VariantRow = Prisma.ProductVariantGetPayload<object>;

const productDetailInclude = {
  categories: { include: { category: true } },
  variants: { orderBy: { price: 'asc' } },
  images: { orderBy: { displayOrder: 'asc' } },
  files: {
    select: {
      id: true,
      fileName: true,
      fileSize: true,
      fileType: true,
      versionNumber: true,
      isPrimary: true,
      createdAt: true,
    },
  },
  store: {
    select: { id: true, name: true, slug: true, logoUrl: true, brandColor: true, policyShipping: true, policyReturns: true },
  },
} satisfies Prisma.ProductInclude;

function serializeVariant(v: VariantRow) {
  return {
    ...v,
    price: Number(v.price),
    salePrice: v.salePrice !== null ? Number(v.salePrice) : null,
    costPrice: v.costPrice !== null ? Number(v.costPrice) : null,
    weightGrams: v.weightGrams !== null ? Number(v.weightGrams) : null,
  };
}

function serializeProduct<
  T extends {
    price: Prisma.Decimal;
    discountPrice: Prisma.Decimal | null;
    variants?: VariantRow[];
    files?: Array<{ fileSize: bigint }>;
  },
>(product: T) {
  return {
    ...product,
    price: Number(product.price),
    discountPrice: product.discountPrice !== null ? Number(product.discountPrice) : null,
    variants: (product.variants || []).map(serializeVariant),
    files: (product.files || []).map((f) => ({ ...f, fileSize: Number(f.fileSize) })),
  };
}

export class ProductService {
  /**
   * Automatically generate a clean, URL-friendly slug from title
   */
  static slugify(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Get public published products with filtering and pagination
   */
  static async getPublishedProducts(filters: ProductFilterInput) {
    const { category, search, type, kind, brand, minPrice, maxPrice, sort, page, limit } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      isPublished: true,
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { shortDescription: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (type) where.productType = type;
    if (kind) where.productKind = kind;
    if (brand) where.brand = { equals: brand, mode: 'insensitive' };

    if (category) {
      where.categories = { some: { category: { slug: category } } };
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = new Prisma.Decimal(minPrice);
      if (maxPrice !== undefined) where.price.lte = new Prisma.Decimal(maxPrice);
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput = {};
    if (sort === 'newest') orderBy.createdAt = 'desc';
    else if (sort === 'price-asc') orderBy.price = 'asc';
    else if (sort === 'price-desc') orderBy.price = 'desc';
    else if (sort === 'featured') orderBy.isFeatured = 'desc';

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          categories: { include: { category: true } },
          variants: { where: { isAvailable: true }, orderBy: { price: 'asc' } },
          images: { orderBy: { displayOrder: 'asc' } },
          store: { select: { id: true, name: true, slug: true, logoUrl: true, brandColor: true } },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return {
      products: products.map(serializeProduct),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single product by slug (published or not; public callers must check isPublished)
   */
  static async getProductBySlug(slug: string) {
    const product = await prisma.product.findUnique({
      where: { slug },
      include: productDetailInclude,
    });
    return product ? serializeProduct(product) : null;
  }

  /**
   * Get a single product by ID (published or not; public callers must check isPublished)
   */
  static async getProductById(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: productDetailInclude,
    });
    return product ? serializeProduct(product) : null;
  }

  /**
   * Owner product list with status, price, units sold (paid orders) and available stock
   */
  static async getAllProductsAdmin(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        include: {
          variants: true,
          files: { select: { id: true, fileName: true, fileSize: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.product.count(),
    ]);

    const sales = products.length
      ? await prisma.orderItem.groupBy({
          by: ['productId'],
          where: { productId: { in: products.map((p) => p.id) }, order: { status: OrderStatus.PAID } },
          _sum: { quantity: true },
        })
      : [];
    const unitsSold = new Map(sales.map((s) => [s.productId, s._sum.quantity ?? 0]));

    return {
      products: products.map((p) => {
        const serialized = serializeProduct(p);
        const availableVariants = p.variants.filter((v) => v.isAvailable);
        return {
          ...serialized,
          salesCount: unitsSold.get(p.id) ?? 0,
          stockAvailable:
            p.productKind === ProductKind.PHYSICAL
              ? availableVariants.reduce((sum, v) => sum + Math.max(0, v.inventoryQuantity - v.reservedQuantity), 0)
              : null,
          hasOptions: availableVariants.some((v) => !isDefaultVariant(v)),
        };
      }),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Digital products can only go live once there is a file to deliver.
   */
  private static async assertPublishable(tx: Tx, productId: string, productKind: ProductKind) {
    if (productKind === ProductKind.DIGITAL) {
      const fileCount = await tx.productFile.count({ where: { productId } });
      if (fileCount === 0) {
        throw new ProductValidationError('Upload the file buyers will receive before publishing this digital product.');
      }
    }
  }

  private static generateSku(slug: string, title: string): string {
    const suffix = crypto.randomBytes(2).toString('hex');
    return `${slug}-${this.slugify(title) || 'variant'}-${suffix}`.slice(0, 80);
  }

  private static async recordStockChange(
    tx: Tx,
    variant: { id: string; inventoryQuantity: number },
    newQuantity: number,
    movementType: StockMovementType,
    note: string,
    performedBy?: string
  ) {
    const delta = newQuantity - variant.inventoryQuantity;
    if (delta === 0) return;
    await tx.stockMovement.create({
      data: {
        variantId: variant.id,
        movementType,
        quantityChanged: delta,
        quantityBefore: variant.inventoryQuantity,
        quantityAfter: newQuantity,
        note,
        performedBy,
      },
    });
  }

  /**
   * Bring a physical product's variants in line with the form:
   * - explicit variants (size/colour...) each with their own stock, or
   * - no variants: a single hidden default variant holding `stockQuantity`.
   * Variants that disappear are deleted, or hidden if past orders reference them.
   */
  private static async syncPhysicalVariants(
    tx: Tx,
    product: { id: string; slug: string; price: Prisma.Decimal; discountPrice: Prisma.Decimal | null },
    input: { variants?: ProductVariantInput[]; stockQuantity?: number },
    existing: VariantRow[],
    performedBy?: string
  ) {
    const wantsOptions = Boolean(input.variants && input.variants.length > 0);
    const existingDefault = existing.find((v) => isDefaultVariant(v) && v.isAvailable) || existing.find(isDefaultVariant);

    // Nothing about stock/variants was submitted: just keep the default variant's price in sync.
    if (!wantsOptions && input.stockQuantity === undefined && input.variants === undefined) {
      if (existingDefault) {
        await tx.productVariant.update({
          where: { id: existingDefault.id },
          data: { price: product.price, salePrice: product.discountPrice },
        });
      }
      return;
    }

    const keepIds = new Set<string>();

    if (wantsOptions) {
      for (const v of input.variants!) {
        const match = v.id ? existing.find((e) => e.id === v.id) : undefined;
        const data = {
          title: v.title,
          option1Name: v.option1Name || null,
          option1Value: v.option1Value || null,
          option2Name: v.option2Name || null,
          option2Value: v.option2Value || null,
          option3Name: v.option3Name || null,
          option3Value: v.option3Value || null,
          price: new Prisma.Decimal(v.price),
          salePrice: v.salePrice ? new Prisma.Decimal(v.salePrice) : null,
          imageUrl: v.imageUrl || null,
          isAvailable: v.isAvailable ?? true,
        };

        if (match) {
          keepIds.add(match.id);
          await this.recordStockChange(tx, match, v.inventoryQuantity, StockMovementType.MANUAL_ADJUSTMENT, 'Stock edited in product form', performedBy);
          await tx.productVariant.update({
            where: { id: match.id },
            data: { ...data, inventoryQuantity: v.inventoryQuantity },
          });
        } else {
          const created = await tx.productVariant.create({
            data: {
              ...data,
              productId: product.id,
              sku: v.sku || this.generateSku(product.slug, v.title),
              inventoryQuantity: v.inventoryQuantity,
            },
          });
          keepIds.add(created.id);
          await this.recordStockChange(tx, { id: created.id, inventoryQuantity: 0 }, v.inventoryQuantity, StockMovementType.RESTOCK, 'Initial stock', performedBy);
        }
      }
    } else {
      const quantity = input.stockQuantity ?? existingDefault?.inventoryQuantity ?? 0;
      if (existingDefault) {
        keepIds.add(existingDefault.id);
        await this.recordStockChange(tx, existingDefault, quantity, StockMovementType.MANUAL_ADJUSTMENT, 'Stock edited in product form', performedBy);
        await tx.productVariant.update({
          where: { id: existingDefault.id },
          data: { inventoryQuantity: quantity, price: product.price, salePrice: product.discountPrice, isAvailable: true },
        });
      } else {
        const created = await tx.productVariant.create({
          data: {
            productId: product.id,
            sku: `${product.slug}-default-${crypto.randomBytes(2).toString('hex')}`.slice(0, 80),
            title: DEFAULT_VARIANT_TITLE,
            price: product.price,
            salePrice: product.discountPrice,
            inventoryQuantity: quantity,
          },
        });
        keepIds.add(created.id);
        await this.recordStockChange(tx, { id: created.id, inventoryQuantity: 0 }, quantity, StockMovementType.RESTOCK, 'Initial stock', performedBy);
      }
    }

    for (const old of existing) {
      if (keepIds.has(old.id)) continue;
      const referenced = await tx.orderItem.count({ where: { variantId: old.id } });
      if (referenced > 0) {
        await tx.productVariant.update({ where: { id: old.id }, data: { isAvailable: false } });
      } else {
        await tx.productVariant.delete({ where: { id: old.id } });
      }
    }
  }

  private static buildImageCreates(images: ProductCreateInput['images'], title: string) {
    return images && images.length > 0
      ? {
          create: images.map((img, idx) => ({
            url: img.url,
            altText: img.altText || title,
            displayOrder: img.displayOrder ?? idx,
            isCover: img.isCover ?? idx === 0,
          })),
        }
      : undefined;
  }

  /**
   * Create a new product (Physical or Digital). Digital products start as drafts until a file exists.
   */
  static async createProduct(data: ProductCreateInput, adminUserId?: string) {
    const baseSlug = data.slug || this.slugify(data.title) || 'product';
    const existing = await prisma.product.findUnique({ where: { slug: baseSlug } });
    const slug = existing ? `${baseSlug}-${crypto.randomBytes(2).toString('hex')}` : baseSlug;

    const { categoryIds, variants, images, stockQuantity, ...productData } = data;
    const productKind = productData.productKind || ProductKind.DIGITAL;

    const created = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          title: productData.title,
          slug,
          description: productData.description,
          shortDescription: productData.shortDescription || null,
          brand: productData.brand || null,
          productKind,
          coverImage: productData.coverImage || null,
          galleryImages: productData.galleryImages || [],
          price: new Prisma.Decimal(productData.price),
          discountPrice: productData.discountPrice ? new Prisma.Decimal(productData.discountPrice) : null,
          currency: productData.currency || 'GHS',
          isPublished: false,
          isFeatured: productData.isFeatured || false,
          productType: productData.productType,
          features: productData.features || [],
          whatsIncluded: productData.whatsIncluded || [],
          tags: productData.tags || [],
          licenseInfo: productData.licenseInfo || null,
          refundInfo: productData.refundInfo || null,
          storeId: productData.storeId || null,
          shippingProfileId: productData.shippingProfileId || null,
          model3dUrl: productData.model3dUrl || null,
          model3dPoster: productData.model3dPoster || null,
          model3dConfig: productData.model3dConfig ? (productData.model3dConfig as Prisma.InputJsonValue) : Prisma.JsonNull,
          categories: {
            create: (categoryIds || []).map((catId) => ({ category: { connect: { id: catId } } })),
          },
          images: this.buildImageCreates(images, productData.title),
        },
      });

      if (productKind === ProductKind.PHYSICAL) {
        await this.syncPhysicalVariants(tx, product, { variants: variants ?? [], stockQuantity: stockQuantity ?? 0 }, [], adminUserId);
      }

      if (productData.isPublished) {
        await this.assertPublishable(tx, product.id, productKind);
        await tx.product.update({ where: { id: product.id }, data: { isPublished: true } });
      }

      if (adminUserId) {
        await tx.auditLog.create({
          data: {
            userId: adminUserId,
            action: 'CREATE_PRODUCT',
            entityType: 'Product',
            entityId: product.id,
            newValue: { title: product.title, slug, productKind, isPublished: Boolean(productData.isPublished) },
          },
        });
      }

      return product;
    });

    return (await this.getProductById(created.id))!;
  }

  /**
   * Update an existing product. Only submitted fields change.
   */
  static async updateProduct(id: string, data: ProductUpdateInput, adminUserId?: string) {
    const existing = await prisma.product.findUnique({
      where: { id },
      include: { variants: true },
    });

    if (!existing) {
      throw new ProductValidationError(`Product with ID ${id} not found`);
    }

    const { categoryIds, variants, images, stockQuantity, ...productData } = data;
    const updateData: Prisma.ProductUpdateInput = {};

    if (productData.title !== undefined) updateData.title = productData.title;
    if (productData.slug !== undefined) {
      const taken = await prisma.product.findFirst({ where: { slug: productData.slug, id: { not: id } } });
      if (taken) throw new ProductValidationError(`The link /${productData.slug} is already used by another product.`);
      updateData.slug = productData.slug;
    }
    if (productData.description !== undefined) updateData.description = productData.description;
    if (productData.shortDescription !== undefined) updateData.shortDescription = productData.shortDescription;
    if (productData.brand !== undefined) updateData.brand = productData.brand;
    if (productData.productKind !== undefined) updateData.productKind = productData.productKind;
    if (productData.coverImage !== undefined) updateData.coverImage = productData.coverImage || null;
    if (productData.galleryImages !== undefined) updateData.galleryImages = productData.galleryImages;
    if (productData.price !== undefined) updateData.price = new Prisma.Decimal(productData.price);
    if (productData.discountPrice !== undefined) {
      updateData.discountPrice = productData.discountPrice ? new Prisma.Decimal(productData.discountPrice) : null;
    }
    if (productData.currency !== undefined) updateData.currency = productData.currency;
    if (productData.isFeatured !== undefined) updateData.isFeatured = productData.isFeatured;
    if (productData.productType !== undefined) updateData.productType = productData.productType;
    if (productData.features !== undefined) updateData.features = productData.features;
    if (productData.whatsIncluded !== undefined) updateData.whatsIncluded = productData.whatsIncluded;
    if (productData.tags !== undefined) updateData.tags = productData.tags;
    if (productData.licenseInfo !== undefined) updateData.licenseInfo = productData.licenseInfo;
    if (productData.refundInfo !== undefined) updateData.refundInfo = productData.refundInfo;
    if (productData.model3dUrl !== undefined) updateData.model3dUrl = productData.model3dUrl || null;
    if (productData.model3dPoster !== undefined) updateData.model3dPoster = productData.model3dPoster || null;
    if (productData.model3dConfig !== undefined) {
      updateData.model3dConfig = productData.model3dConfig ? (productData.model3dConfig as Prisma.InputJsonValue) : Prisma.JsonNull;
    }

    await prisma.$transaction(async (tx) => {
      if (categoryIds !== undefined) {
        await tx.productCategory.deleteMany({ where: { productId: id } });
        updateData.categories = {
          create: categoryIds.map((catId) => ({ category: { connect: { id: catId } } })),
        };
      }

      if (images !== undefined) {
        await tx.productImage.deleteMany({ where: { productId: id } });
        updateData.images = this.buildImageCreates(images, productData.title ?? existing.title);
      }

      const updated = await tx.product.update({ where: { id }, data: updateData });

      if (updated.productKind === ProductKind.PHYSICAL) {
        await this.syncPhysicalVariants(tx, updated, { variants, stockQuantity }, existing.variants, adminUserId);
      }

      if (productData.isPublished !== undefined) {
        if (productData.isPublished) {
          await this.assertPublishable(tx, id, updated.productKind);
        }
        await tx.product.update({ where: { id }, data: { isPublished: productData.isPublished } });
      }

      if (adminUserId) {
        await tx.auditLog.create({
          data: {
            userId: adminUserId,
            action: 'UPDATE_PRODUCT',
            entityType: 'Product',
            entityId: id,
            newValue: { fields: Object.keys(data) },
          },
        });
      }
    });

    return (await this.getProductById(id))!;
  }

  /**
   * Publish or unpublish a product
   */
  static async togglePublish(id: string, isPublished: boolean, adminUserId?: string) {
    return prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id } });
      if (!product) throw new ProductValidationError(`Product with ID ${id} not found`);

      if (isPublished) {
        await this.assertPublishable(tx, id, product.productKind);
      }

      const updated = await tx.product.update({ where: { id }, data: { isPublished } });

      if (adminUserId) {
        await tx.auditLog.create({
          data: {
            userId: adminUserId,
            action: isPublished ? 'PUBLISH_PRODUCT' : 'UNPUBLISH_PRODUCT',
            entityType: 'Product',
            entityId: id,
            newValue: { isPublished },
          },
        });
      }

      return { ...updated, price: Number(updated.price), discountPrice: updated.discountPrice !== null ? Number(updated.discountPrice) : null };
    });
  }

  /**
   * Delete product (only if it has never been ordered)
   */
  static async deleteProduct(id: string, adminUserId?: string) {
    const existing = await prisma.product.findUnique({
      where: { id },
      include: { _count: { select: { orderItems: true } } },
    });

    if (!existing) {
      throw new ProductValidationError(`Product with ID ${id} not found`);
    }

    if (existing._count.orderItems > 0) {
      throw new ProductValidationError('Cannot delete a product that has orders. Unpublish it instead.');
    }

    const deleted = await prisma.product.delete({ where: { id } });

    if (adminUserId) {
      await prisma.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'DELETE_PRODUCT',
          entityType: 'Product',
          entityId: id,
          oldValue: { title: existing.title, slug: existing.slug },
        },
      });
    }

    return deleted;
  }
}
