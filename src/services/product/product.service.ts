import { prisma } from '@/lib/prisma';
import { ProductCreateInput, ProductUpdateInput, ProductFilterInput } from '@/lib/validators/product';
import { Prisma, ProductKind } from '@prisma/client';
import { DevProductStore } from '@/lib/dev-store';

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

    if (type) {
      where.productType = type;
    }

    if (kind) {
      where.productKind = kind;
    }

    if (brand) {
      where.brand = { equals: brand, mode: 'insensitive' };
    }

    if (category) {
      where.categories = {
        some: {
          category: {
            slug: category,
          },
        },
      };
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

    try {
      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          include: {
            categories: {
              include: { category: true },
            },
            variants: {
              where: { isAvailable: true },
              orderBy: { price: 'asc' },
            },
            images: {
              orderBy: { displayOrder: 'asc' },
            },
            store: {
              select: { id: true, name: true, slug: true, logoUrl: true, brandColor: true },
            },
          },
          orderBy,
          skip,
          take: limit,
        }),
        prisma.product.count({ where }),
      ]);

      if (products.length === 0) {
        const devProducts = DevProductStore.getAll().filter((p) => {
          if (kind && p.productKind !== kind) return false;
          if (category && !p.categories.some((c) => c.category.slug === category)) return false;
          return true;
        });
        if (devProducts.length > 0) {
          return {
            products: devProducts as any,
            pagination: {
              total: devProducts.length,
              page,
              limit,
              totalPages: 1,
            },
          };
        }
      }

      return {
        products: products.map((p) => ({
          ...p,
          price: Number(p.price),
          discountPrice: p.discountPrice ? Number(p.discountPrice) : null,
          variants: p.variants.map((v) => ({
            ...v,
            price: Number(v.price),
            salePrice: v.salePrice ? Number(v.salePrice) : null,
            costPrice: v.costPrice ? Number(v.costPrice) : null,
            weightGrams: v.weightGrams ? Number(v.weightGrams) : null,
          })),
        })),
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch {
      const devProducts = DevProductStore.getAll().filter((p) => {
        if (kind && p.productKind !== kind) return false;
        if (category && !p.categories.some((c) => c.category.slug === category)) return false;
        return true;
      });

      return {
        products: devProducts as any,
        pagination: {
          total: devProducts.length,
          page,
          limit,
          totalPages: Math.max(1, Math.ceil(devProducts.length / limit)),
        },
      };
    }
  }

  /**
   * Get single published product by slug with files, variants, images, categories, and 3D configs
   */
  static async getProductBySlug(slug: string) {
    try {
      const product = await prisma.product.findUnique({
        where: { slug },
        include: {
          categories: {
            include: { category: true },
          },
          variants: {
            orderBy: { price: 'asc' },
          },
          images: {
            orderBy: { displayOrder: 'asc' },
          },
          files: {
            select: {
              id: true,
              fileName: true,
              fileSize: true,
              fileType: true,
              versionNumber: true,
              createdAt: true,
            },
          },
          store: {
            select: { id: true, name: true, slug: true, logoUrl: true, brandColor: true, policyShipping: true, policyReturns: true },
          },
        },
      });

      if (!product) {
        const devProduct = DevProductStore.getBySlug(slug);
        if (devProduct) return devProduct as any;
        return null;
      }

      return {
        ...product,
        price: Number(product.price),
        discountPrice: product.discountPrice ? Number(product.discountPrice) : null,
        variants: product.variants.map((v) => ({
          ...v,
          price: Number(v.price),
          salePrice: v.salePrice ? Number(v.salePrice) : null,
          costPrice: v.costPrice ? Number(v.costPrice) : null,
          weightGrams: v.weightGrams ? Number(v.weightGrams) : null,
        })),
        files: product.files.map((f) => ({
          ...f,
          fileSize: Number(f.fileSize),
        })),
      };
    } catch {
      const devProduct = DevProductStore.getBySlug(slug);
      if (devProduct) return devProduct as any;
      return null;
    }
  }

  /**
   * Get single published product by ID with files, variants, images, categories, and 3D configs
   */
  static async getProductById(id: string) {
    try {
      const product = await prisma.product.findUnique({
        where: { id },
        include: {
          categories: {
            include: { category: true },
          },
          variants: {
            orderBy: { price: 'asc' },
          },
          images: {
            orderBy: { displayOrder: 'asc' },
          },
          files: {
            select: {
              id: true,
              fileName: true,
              fileSize: true,
              fileType: true,
              versionNumber: true,
              createdAt: true,
            },
          },
          store: {
            select: { id: true, name: true, slug: true, logoUrl: true, brandColor: true, policyShipping: true, policyReturns: true },
          },
        },
      });

      if (!product) {
        const devProduct = DevProductStore.getById(id) || DevProductStore.getBySlug(id);
        if (devProduct) return devProduct as any;
        return null;
      }

      return {
        ...product,
        price: Number(product.price),
        discountPrice: product.discountPrice ? Number(product.discountPrice) : null,
        variants: product.variants.map((v) => ({
          ...v,
          price: Number(v.price),
          salePrice: v.salePrice ? Number(v.salePrice) : null,
          costPrice: v.costPrice ? Number(v.costPrice) : null,
          weightGrams: v.weightGrams ? Number(v.weightGrams) : null,
        })),
        files: product.files.map((f) => ({
          ...f,
          fileSize: Number(f.fileSize),
        })),
      };
    } catch {
      const devProduct = DevProductStore.getById(id) || DevProductStore.getBySlug(id);
      if (devProduct) return devProduct as any;
      return null;
    }
  }


  /**
   * Get all products for seller or admin dashboard
   */
  static async getAllProductsAdmin(page: number = 1, limit: number = 20, storeId?: string) {
    const skip = (page - 1) * limit;
    const where: Prisma.ProductWhereInput = {};
    if (storeId) where.storeId = storeId;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          categories: {
            include: { category: true },
          },
          variants: true,
          images: true,
          files: true,
          store: {
            select: { id: true, name: true },
          },
          _count: {
            select: { orderItems: true, entitlements: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return {
      products: products.map((p) => ({
        ...p,
        price: Number(p.price),
        discountPrice: p.discountPrice ? Number(p.discountPrice) : null,
        variants: p.variants.map((v) => ({
          ...v,
          price: Number(v.price),
          salePrice: v.salePrice ? Number(v.salePrice) : null,
        })),
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Create a new hybrid product (Physical or Digital)
   */
  static async createProduct(data: ProductCreateInput, adminUserId?: string) {
    const slug = data.slug || this.slugify(data.title);

    // Ensure slug uniqueness
    const existing = await prisma.product.findUnique({ where: { slug } });
    const finalSlug = existing ? `${slug}-${Date.now().toString().slice(-4)}` : slug;

    const { categoryIds, variants, images, ...productData } = data;

    const created = await prisma.product.create({
      data: {
        title: productData.title,
        slug: finalSlug,
        description: productData.description,
        shortDescription: productData.shortDescription || null,
        brand: productData.brand || null,
        productKind: productData.productKind || ProductKind.DIGITAL,
        coverImage: productData.coverImage || null,
        galleryImages: productData.galleryImages || [],
        price: new Prisma.Decimal(productData.price),
        discountPrice: productData.discountPrice ? new Prisma.Decimal(productData.discountPrice) : null,
        currency: productData.currency || 'USD',
        isPublished: productData.isPublished || false,
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
          create: (categoryIds || []).map((catId) => ({
            category: { connect: { id: catId } },
          })),
        },
        images: images && images.length > 0
          ? {
              create: images.map((img, idx) => ({
                url: img.url,
                altText: img.altText || productData.title,
                displayOrder: img.displayOrder ?? idx,
                isCover: img.isCover ?? idx === 0,
              })),
            }
          : undefined,
        variants: variants && variants.length > 0
          ? {
              create: variants.map((v) => ({
                sku: v.sku,
                title: v.title,
                option1Name: v.option1Name || null,
                option1Value: v.option1Value || null,
                option2Name: v.option2Name || null,
                option2Value: v.option2Value || null,
                option3Name: v.option3Name || null,
                option3Value: v.option3Value || null,
                price: new Prisma.Decimal(v.price),
                salePrice: v.salePrice ? new Prisma.Decimal(v.salePrice) : null,
                costPrice: v.costPrice ? new Prisma.Decimal(v.costPrice) : null,
                weightGrams: v.weightGrams ? new Prisma.Decimal(v.weightGrams) : null,
                dimensions: v.dimensions ? (v.dimensions as Prisma.InputJsonValue) : Prisma.JsonNull,
                inventoryQuantity: v.inventoryQuantity ?? 0,
                barcode: v.barcode || null,
                imageUrl: v.imageUrl || null,
                isAvailable: v.isAvailable ?? true,
              })),
            }
          : undefined,
      },
      include: {
        categories: { include: { category: true } },
        variants: true,
        images: true,
      },
    });

    if (adminUserId) {
      await prisma.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'CREATE_PRODUCT',
          entityType: 'Product',
          entityId: created.id,
          newValue: JSON.parse(JSON.stringify(created)),
        },
      });
    }

    return {
      ...created,
      price: Number(created.price),
      discountPrice: created.discountPrice ? Number(created.discountPrice) : null,
      variants: created.variants.map((v) => ({
        ...v,
        price: Number(v.price),
        salePrice: v.salePrice ? Number(v.salePrice) : null,
      })),
    };
  }

  /**
   * Update an existing product
   */
  static async updateProduct(id: string, data: ProductUpdateInput, adminUserId?: string) {
    const existing = await prisma.product.findUnique({
      where: { id },
      include: { categories: true, variants: true, images: true },
    });

    if (!existing) {
      throw new Error(`Product with ID ${id} not found`);
    }

    const { categoryIds, variants, images, ...productData } = data;

    const updateData: Prisma.ProductUpdateInput = {};

    if (productData.title !== undefined) updateData.title = productData.title;
    if (productData.slug !== undefined) updateData.slug = productData.slug;
    if (productData.description !== undefined) updateData.description = productData.description;
    if (productData.shortDescription !== undefined) updateData.shortDescription = productData.shortDescription;
    if (productData.brand !== undefined) updateData.brand = productData.brand;
    if (productData.productKind !== undefined) updateData.productKind = productData.productKind;
    if (productData.coverImage !== undefined) updateData.coverImage = productData.coverImage;
    if (productData.galleryImages !== undefined) updateData.galleryImages = productData.galleryImages;
    if (productData.price !== undefined) updateData.price = new Prisma.Decimal(productData.price);
    if (productData.discountPrice !== undefined) {
      updateData.discountPrice = productData.discountPrice ? new Prisma.Decimal(productData.discountPrice) : null;
    }
    if (productData.currency !== undefined) updateData.currency = productData.currency;
    if (productData.isPublished !== undefined) updateData.isPublished = productData.isPublished;
    if (productData.isFeatured !== undefined) updateData.isFeatured = productData.isFeatured;
    if (productData.productType !== undefined) updateData.productType = productData.productType;
    if (productData.features !== undefined) updateData.features = productData.features;
    if (productData.whatsIncluded !== undefined) updateData.whatsIncluded = productData.whatsIncluded;
    if (productData.tags !== undefined) updateData.tags = productData.tags;
    if (productData.licenseInfo !== undefined) updateData.licenseInfo = productData.licenseInfo;
    if (productData.refundInfo !== undefined) updateData.refundInfo = productData.refundInfo;
    if (productData.model3dUrl !== undefined) updateData.model3dUrl = productData.model3dUrl;
    if (productData.model3dPoster !== undefined) updateData.model3dPoster = productData.model3dPoster;
    if (productData.model3dConfig !== undefined) {
      updateData.model3dConfig = productData.model3dConfig ? (productData.model3dConfig as Prisma.InputJsonValue) : Prisma.JsonNull;
    }

    if (categoryIds !== undefined) {
      await prisma.productCategory.deleteMany({ where: { productId: id } });
      updateData.categories = {
        create: categoryIds.map((catId) => ({
          category: { connect: { id: catId } },
        })),
      };
    }

    const updated = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        categories: { include: { category: true } },
        variants: true,
        images: true,
      },
    });

    if (adminUserId) {
      await prisma.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'UPDATE_PRODUCT',
          entityType: 'Product',
          entityId: id,
          oldValue: JSON.parse(JSON.stringify(existing)),
          newValue: JSON.parse(JSON.stringify(updated)),
        },
      });
    }

    return {
      ...updated,
      price: Number(updated.price),
      discountPrice: updated.discountPrice ? Number(updated.discountPrice) : null,
      variants: updated.variants.map((v) => ({
        ...v,
        price: Number(v.price),
        salePrice: v.salePrice ? Number(v.salePrice) : null,
      })),
    };
  }

  /**
   * Toggle product publication status
   */
  static async togglePublish(id: string, isPublished: boolean, adminUserId?: string) {
    const updated = await prisma.product.update({
      where: { id },
      data: { isPublished },
    });

    if (adminUserId) {
      await prisma.auditLog.create({
        data: {
          userId: adminUserId,
          action: isPublished ? 'PUBLISH_PRODUCT' : 'UNPUBLISH_PRODUCT',
          entityType: 'Product',
          entityId: id,
          newValue: { isPublished },
        },
      });
    }

    return updated;
  }

  /**
   * Delete product (with safety constraint)
   */
  static async deleteProduct(id: string, adminUserId?: string) {
    const existing = await prisma.product.findUnique({
      where: { id },
      include: { orderItems: true },
    });

    if (!existing) {
      throw new Error(`Product with ID ${id} not found`);
    }

    if (existing.orderItems.length > 0) {
      throw new Error('Cannot delete product that has existing purchase orders. Unpublish it instead.');
    }

    const deleted = await prisma.product.delete({ where: { id } });

    if (adminUserId) {
      await prisma.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'DELETE_PRODUCT',
          entityType: 'Product',
          entityId: id,
          oldValue: JSON.parse(JSON.stringify(existing)),
        },
      });
    }

    return deleted;
  }
}
