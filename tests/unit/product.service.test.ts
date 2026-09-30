import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma, ProductKind } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ProductService, ProductValidationError, DEFAULT_VARIANT_TITLE } from '@/services/product/product.service';
import { productUpdateSchema } from '@/lib/validators/product';

vi.mock('@/lib/prisma', () => {
  const client: any = {
    product: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    productVariant: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    productFile: { count: vi.fn() },
    productCategory: { deleteMany: vi.fn() },
    productImage: { deleteMany: vi.fn() },
    stockMovement: { create: vi.fn() },
    orderItem: { count: vi.fn(), groupBy: vi.fn() },
    auditLog: { create: vi.fn() },
  };
  client.$transaction = vi.fn((fn: (tx: unknown) => unknown) => fn(client));
  return { prisma: client };
});

const dec = (n: number) => new Prisma.Decimal(n);

function dbProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: 'prod-1',
    slug: 'kente-tote',
    title: 'Kente Tote',
    productKind: ProductKind.PHYSICAL,
    price: dec(200),
    discountPrice: null,
    isPublished: false,
    variants: [],
    files: [],
    ...overrides,
  };
}

function variant(overrides: Record<string, unknown> = {}) {
  return {
    id: 'var-default',
    title: DEFAULT_VARIANT_TITLE,
    option1Value: null,
    inventoryQuantity: 10,
    reservedQuantity: 0,
    isAvailable: true,
    price: dec(200),
    salePrice: null,
    costPrice: null,
    weightGrams: null,
    ...overrides,
  };
}

describe('ProductService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.product.findUnique).mockImplementation((async (args: any) =>
      args.where.slug ? null : dbProduct()) as any);
    vi.mocked(prisma.product.create).mockResolvedValue(dbProduct() as any);
    vi.mocked(prisma.product.update).mockImplementation((async (args: any) => dbProduct(args.data)) as any);
    vi.mocked(prisma.productVariant.create).mockResolvedValue(variant({ id: 'var-new' }) as any);
    vi.mocked(prisma.orderItem.count).mockResolvedValue(0);
  });

  it('should slugify product titles accurately and handle special characters', () => {
    expect(ProductService.slugify('Next.js 15 Masterclass & Pro Guide!')).toBe('nextjs-15-masterclass-pro-guide');
    expect(ProductService.slugify('  The Complete E-book (2026 Edition)  ')).toBe('the-complete-e-book-2026-edition');
    expect(ProductService.slugify('Ghana Mobile Money & Flutterwave Setup')).toBe('ghana-mobile-money-flutterwave-setup');
  });

  describe('creating products', () => {
    it('gives a physical product without options a real stock count on a default variant', async () => {
      await ProductService.createProduct({
        title: 'Kente Tote',
        description: 'A handwoven tote bag.',
        productKind: ProductKind.PHYSICAL,
        price: 200,
        stockQuantity: 12,
      } as any);

      expect(prisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ isPublished: false, currency: 'GHS' }) })
      );
      expect(prisma.productVariant.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ title: DEFAULT_VARIANT_TITLE, inventoryQuantity: 12, productId: 'prod-1' }),
      });
      expect(prisma.stockMovement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ quantityChanged: 12, quantityBefore: 0, quantityAfter: 12, movementType: 'RESTOCK' }),
      });
    });

    it('creates one variant per option, each with its own stock', async () => {
      await ProductService.createProduct({
        title: 'Kente Tote',
        description: 'A handwoven tote bag.',
        productKind: ProductKind.PHYSICAL,
        price: 200,
        variants: [
          { title: 'S', option1Name: 'Size', option1Value: 'S', price: 200, inventoryQuantity: 3 },
          { title: 'L', option1Name: 'Size', option1Value: 'L', price: 220, inventoryQuantity: 0 },
        ],
      } as any);

      const creates = vi.mocked(prisma.productVariant.create).mock.calls.map((c) => (c[0] as any).data);
      expect(creates).toHaveLength(2);
      expect(creates.map((d) => [d.option1Value, d.inventoryQuantity])).toEqual([['S', 3], ['L', 0]]);
      expect(creates.every((d) => d.title !== DEFAULT_VARIANT_TITLE)).toBe(true);
    });

    it('refuses to publish a digital product that has no file to deliver', async () => {
      vi.mocked(prisma.product.create).mockResolvedValue(dbProduct({ productKind: ProductKind.DIGITAL }) as any);
      vi.mocked(prisma.productFile.count).mockResolvedValue(0);

      await expect(
        ProductService.createProduct({
          title: 'Side Hustle Playbook',
          description: 'A practical ebook.',
          productKind: ProductKind.DIGITAL,
          price: 50,
          isPublished: true,
        } as any)
      ).rejects.toBeInstanceOf(ProductValidationError);
    });
  });

  describe('publishing', () => {
    it('blocks publishing a digital product without a file, allows it once a file exists', async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValue(dbProduct({ productKind: ProductKind.DIGITAL }) as any);

      vi.mocked(prisma.productFile.count).mockResolvedValue(0);
      await expect(ProductService.togglePublish('prod-1', true)).rejects.toThrow(/Upload the file/);
      expect(prisma.product.update).not.toHaveBeenCalled();

      vi.mocked(prisma.productFile.count).mockResolvedValue(1);
      await ProductService.togglePublish('prod-1', true);
      expect(prisma.product.update).toHaveBeenCalledWith({ where: { id: 'prod-1' }, data: { isPublished: true } });
    });

    it('lets a physical product be published even when sold out', async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValue(dbProduct() as any);
      await expect(ProductService.togglePublish('prod-1', true)).resolves.toBeDefined();
    });
  });

  describe('updating products', () => {
    it('only changes submitted fields (a price edit does not unpublish or wipe lists)', async () => {
      const parsed = productUpdateSchema.parse({ price: 180 });
      expect(parsed).toEqual({ price: 180 });

      vi.mocked(prisma.product.findUnique).mockResolvedValue(dbProduct({ isPublished: true, variants: [variant()] }) as any);
      await ProductService.updateProduct('prod-1', parsed);

      const data = (vi.mocked(prisma.product.update).mock.calls[0][0] as any).data;
      expect(Object.keys(data)).toEqual(['price']);
      // The default variant follows the product price so checkout charges the right amount
      expect(prisma.productVariant.update).toHaveBeenCalledWith({
        where: { id: 'var-default' },
        data: expect.objectContaining({ price: expect.anything() }),
      });
    });

    it('records a stock movement when the owner edits stock', async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValue(dbProduct({ variants: [variant({ inventoryQuantity: 10 })] }) as any);

      await ProductService.updateProduct('prod-1', { variants: [], stockQuantity: 7 });

      expect(prisma.stockMovement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ variantId: 'var-default', quantityChanged: -3, quantityAfter: 7, movementType: 'MANUAL_ADJUSTMENT' }),
      });
      expect(prisma.productVariant.update).toHaveBeenCalledWith({
        where: { id: 'var-default' },
        data: expect.objectContaining({ inventoryQuantity: 7 }),
      });
    });

    it('hides removed options that have past orders and deletes the rest', async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValue(
        dbProduct({
          variants: [
            variant({ id: 'var-s', title: 'S', option1Value: 'S' }),
            variant({ id: 'var-m', title: 'M', option1Value: 'M' }),
            variant({ id: 'var-l', title: 'L', option1Value: 'L' }),
          ],
        }) as any
      );
      vi.mocked(prisma.orderItem.count).mockImplementation((async (args: any) => (args.where.variantId === 'var-m' ? 2 : 0)) as any);

      await ProductService.updateProduct('prod-1', {
        variants: [{ id: 'var-s', title: 'S', option1Name: 'Size', option1Value: 'S', price: 200, inventoryQuantity: 10, isAvailable: true }],
      });

      expect(prisma.productVariant.update).toHaveBeenCalledWith({ where: { id: 'var-m' }, data: { isAvailable: false } });
      expect(prisma.productVariant.delete).toHaveBeenCalledWith({ where: { id: 'var-l' } });
      expect(prisma.productVariant.delete).not.toHaveBeenCalledWith({ where: { id: 'var-m' } });
    });

    it('reports a missing product instead of silently creating one', async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValue(null);
      await expect(ProductService.updateProduct('nope', { price: 1 })).rejects.toBeInstanceOf(ProductValidationError);
    });
  });

  it('admin list shows units sold from paid orders and available stock', async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([
      dbProduct({ variants: [variant({ inventoryQuantity: 10, reservedQuantity: 2 })] }),
      dbProduct({ id: 'prod-2', productKind: ProductKind.DIGITAL }),
    ] as any);
    vi.mocked(prisma.product.count).mockResolvedValue(2);
    vi.mocked(prisma.orderItem.groupBy).mockResolvedValue([{ productId: 'prod-1', _sum: { quantity: 4 } }] as any);

    const { products } = await ProductService.getAllProductsAdmin();

    expect(prisma.orderItem.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ order: { status: 'PAID' } }) })
    );
    expect(products[0]).toMatchObject({ salesCount: 4, stockAvailable: 8, hasOptions: false });
    expect(products[1]).toMatchObject({ salesCount: 0, stockAvailable: null });
  });
});
