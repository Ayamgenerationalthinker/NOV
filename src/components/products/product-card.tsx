import Link from 'next/link';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { ArrowRight, BookOpen, Layers, Sparkles, Video, Code, Image as ImageIcon } from 'lucide-react';
import { ProductType } from '@prisma/client';

export interface ProductCardProps {
  product: {
    id: string;
    title: string;
    slug: string;
    description: string;
    shortDescription?: string | null;
    coverImage?: string | null;
    price: number;
    discountPrice?: number | null;
    currency: string;
    isFeatured?: boolean;
    productType: ProductType;
    categories?: Array<{ category: { name: string; slug: string } }>;
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const hasDiscount = product.discountPrice !== null && product.discountPrice !== undefined && product.discountPrice < product.price;

  const getTypeIcon = () => {
    switch (product.productType) {
      case ProductType.EBOOK:
        return <BookOpen className="w-4 h-4" />;
      case ProductType.COURSE:
      case ProductType.VIDEO:
        return <Video className="w-4 h-4" />;
      case ProductType.SOFTWARE:
      case ProductType.TEMPLATE:
        return <Code className="w-4 h-4" />;
      case ProductType.GRAPHICS:
        return <ImageIcon className="w-4 h-4" />;
      default:
        return <Layers className="w-4 h-4" />;
    }
  };

  return (
    <Card className="group flex flex-col overflow-hidden border-slate-800 bg-slate-900/60 hover:border-slate-700 transition-all duration-300 hover:shadow-xl hover:shadow-blue-950/20">
      {/* Cover / Image Area */}
      <div className="relative aspect-video w-full overflow-hidden bg-slate-950 flex items-center justify-center border-b border-slate-800/80">
        {product.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.coverImage}
            alt={product.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-600 group-hover:text-blue-400 transition-colors">
            <div className="rounded-2xl bg-slate-900/80 p-5 border border-slate-800 mb-2">
              {getTypeIcon()}
            </div>
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-500">Digital Product</span>
          </div>
        )}

        {/* Featured Tag */}
        {product.isFeatured && (
          <div className="absolute top-3 left-3">
            <Badge variant="default" className="gap-1 bg-blue-600/90 text-white font-medium border-none shadow-md">
              <Sparkles className="w-3 h-3" />
              Featured
            </Badge>
          </div>
        )}

        {/* Product Type Pill */}
        <div className="absolute top-3 right-3">
          <Badge variant="secondary" className="gap-1 text-[11px] bg-slate-900/80 backdrop-blur-sm border-slate-700 text-slate-300">
            {getTypeIcon()}
            <span>{product.productType}</span>
          </Badge>
        </div>
      </div>

      <CardContent className="flex-1 p-5 space-y-3">
        {/* Categories */}
        {product.categories && product.categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {product.categories.slice(0, 2).map(({ category }) => (
              <span
                key={category.slug}
                className="text-[11px] font-medium text-blue-400/90 hover:text-blue-300"
              >
                #{category.name}
              </span>
            ))}
          </div>
        )}

        <Link href={`/products/${product.slug}`} className="block">
          <h3 className="font-semibold text-base text-white group-hover:text-blue-400 transition-colors line-clamp-1">
            {product.title}
          </h3>
        </Link>

        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
          {product.shortDescription || product.description}
        </p>
      </CardContent>

      <CardFooter className="p-5 pt-0 flex items-center justify-between border-t border-slate-800/40 mt-auto">
        <div className="flex items-baseline gap-2">
          {hasDiscount ? (
            <>
              <span className="text-lg font-bold text-white">
                {formatCurrency(product.discountPrice!, product.currency)}
              </span>
              <span className="text-xs text-slate-500 line-through">
                {formatCurrency(product.price, product.currency)}
              </span>
            </>
          ) : (
            <span className="text-lg font-bold text-white">
              {formatCurrency(product.price, product.currency)}
            </span>
          )}
        </div>

        <Link href={`/products/${product.slug}`}>
          <Button variant="secondary" size="sm" className="gap-1 text-xs">
            View
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
