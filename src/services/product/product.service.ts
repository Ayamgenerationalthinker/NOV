import { prisma } from '@/lib/prisma';
import { ProductCreateInput, ProductUpdateInput, ProductFilterInput } from '@/lib/validators/product';
import { Prisma } from '@prisma/client';

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
    const { category, search, type, minPrice, maxPrice, sort, page, limit } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      isPublished: true,
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { shortDescription: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (type) {
      where.productType = type;
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
          },
          orderBy,
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
        })),
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (err) {
      console.error('Database connection or query failure in getPublishedProducts:', err);
      return {
        products: [],
        pagination: {
          total: 0,
          page,
          limit,
          totalPages: 0,
        },
      };
    }
  }

  /**
   * Get single published product by slug with files and categories
   */
  static async getProductBySlug(slug: string) {
    try {
      const product = await prisma.product.findUnique({
        where: { slug },
        include: {
          categories: {
            include: { category: true },
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
        },
      });

      if (!product) return null;

      return {
        ...product,
        price: Number(product.price),
        discountPrice: product.discountPrice ? Number(product.discountPrice) : null,
        files: product.files.map((f) => ({
          ...f,
          fileSize: Number(f.fileSize),
        })),
      };
    } catch (err) {
      console.error('Database connection or query failure in getProductBySlug:', err);
      return null;
    }
  }

  /**
   * Get all products for admin dashboard (published and drafts)
   */
  static async getAllProductsAdmin(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        include: {
          categories: {
            include: { category: true },
          },
          files: true,
          _count: {
            select: { orderItems: true, entitlements: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.product.count(),
    ]);

    return {
      products: products.map((p) => ({
        ...p,
        price: Number(p.price),
        discountPrice: p.discountPrice ? Number(p.discountPrice) : null,
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
   * Create a new product (Admin)
   */
  static async createProduct(data: ProductCreateInput, adminUserId?: string) {
    const slug = data.slug || this.slugify(data.title);

    // Ensure slug uniqueness
    const existing = await prisma.product.findUnique({ where: { slug } });
    const finalSlug = existing ? `${slug}-${Date.now().toString().slice(-4)}` : slug;

    const { categoryIds, ...productData } = data;

    const created = await prisma.product.create({
      data: {
        title: productData.title,
        slug: finalSlug,
        description: productData.description,
        shortDescription: productData.shortDescription || null,
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
        licenseInfo: productData.licenseInfo || null,
        refundInfo: productData.refundInfo || null,
        categories: {
          create: (categoryIds || []).map((catId) => ({
            category: { connect: { id: catId } },
          })),
        },
      },
      include: {
        categories: { include: { category: true } },
      },
    });

    // Record audit log
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
    };
  }

  /**
   * Update an existing product (Admin)
   */
  static async updateProduct(id: string, data: ProductUpdateInput, adminUserId?: string) {
    const existing = await prisma.product.findUnique({
      where: { id },
      include: { categories: true },
    });

    if (!existing) {
      throw new Error(`Product with ID ${id} not found`);
    }

    const { categoryIds, ...productData } = data;

    // Build update payload
    const updateData: Prisma.ProductUpdateInput = {};

    if (productData.title !== undefined) updateData.title = productData.title;
    if (productData.slug !== undefined) updateData.slug = productData.slug;
    if (productData.description !== undefined) updateData.description = productData.description;
    if (productData.shortDescription !== undefined) updateData.shortDescription = productData.shortDescription;
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
    if (productData.licenseInfo !== undefined) updateData.licenseInfo = productData.licenseInfo;
    if (productData.refundInfo !== undefined) updateData.refundInfo = productData.refundInfo;

    // Update categories if supplied
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
      },
    });

    // Record audit log
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
   * Delete product
   */
  static async deleteProduct(id: string, adminUserId?: string) {
    const existing = await prisma.product.findUnique({
      where: { id },
      include: { orderItems: true },
    });

    if (!existing) {
      throw new Error(`Product with ID ${id} not found`);
    }

    // Protect data integrity: if product has orders, prevent hard delete and recommend unpublishing
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
