import { prisma } from '@/lib/prisma';

export class CategoryService {
  /**
   * Get all categories with product counts
   */
  static async getAllCategories() {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: {
            products: {
              where: {
                product: { isPublished: true },
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      icon: cat.icon,
      productCount: cat._count.products,
    }));
  }

  /**
   * Get category by slug
   */
  static async getCategoryBySlug(slug: string) {
    return prisma.category.findUnique({
      where: { slug },
      include: {
        _count: {
          select: {
            products: {
              where: { product: { isPublished: true } },
            },
          },
        },
      },
    });
  }
}
