'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import { ProductType } from '@prisma/client';

interface CategoryOption {
  id: string;
  name: string;
}

export default function NewProductPage() {
  const router = useRouter();

  const [title, setTitle] = React.useState('');
  const [slug, setSlug] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [shortDescription, setShortDescription] = React.useState('');
  const [coverImage, setCoverImage] = React.useState('');
  const [price, setPrice] = React.useState('');
  const [discountPrice, setDiscountPrice] = React.useState('');
  const [currency] = React.useState('USD');
  const [productType, setProductType] = React.useState<ProductType>(ProductType.EBOOK);
  const [features, setFeatures] = React.useState('');
  const [whatsIncluded, setWhatsIncluded] = React.useState('');
  const [licenseInfo, setLicenseInfo] = React.useState('Personal non-exclusive license for single user.');
  const [refundInfo, setRefundInfo] = React.useState('14-day satisfaction guarantee.');
  const [isPublished, setIsPublished] = React.useState(false);
  const [isFeatured, setIsFeatured] = React.useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = React.useState<string[]>([]);
  const [categories, setCategories] = React.useState<CategoryOption[]>([]);

  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch('/api/categories')
      .then((res) => res.json())
      .then((data) => setCategories(data.categories || []))
      .catch((err) => console.error('Failed to load categories:', err));
  }, []);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    // Auto-generate slug if user hasn't explicitly customized slug
    const generatedSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setSlug(generatedSlug);
  };

  const handleCategoryToggle = (id: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((catId) => catId !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const payload = {
        title,
        slug: slug.trim() || undefined,
        description,
        shortDescription: shortDescription || undefined,
        coverImage: coverImage.trim() || undefined,
        price: parseFloat(price),
        discountPrice: discountPrice ? parseFloat(discountPrice) : undefined,
        currency,
        productType,
        isPublished,
        isFeatured,
        features: features
          .split('\n')
          .map((f) => f.trim())
          .filter(Boolean),
        whatsIncluded: whatsIncluded
          .split('\n')
          .map((w) => w.trim())
          .filter(Boolean),
        licenseInfo: licenseInfo || undefined,
        refundInfo: refundInfo || undefined,
        categoryIds: selectedCategoryIds,
      };

      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create product.');
        setIsLoading(false);
        return;
      }

      router.push('/admin/products');
      router.refresh();
    } catch {
      setError('An unexpected error occurred while saving.');
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/products" className="text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Create Digital Product</h1>
          <p className="text-xs text-slate-400">Configure product details, pricing, and publication status.</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-800/40 bg-red-950/40 p-4 text-xs text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Details */}
        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader>
            <CardTitle className="text-sm">Product Information</CardTitle>
            <CardDescription className="text-xs">Primary title, slug, and description</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Product Title"
              placeholder="e.g. Full-Stack Web Development Handbook"
              value={title}
              onChange={handleTitleChange}
              required
            />

            <Input
              label="URL Slug"
              placeholder="full-stack-web-development-handbook"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
            />

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Short Description</label>
              <textarea
                rows={2}
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                placeholder="Brief high-impact tagline for catalog cards..."
                className="w-full rounded-lg border border-slate-700 bg-slate-800/80 p-3 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Full Description</label>
              <textarea
                rows={6}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Comprehensive overview of the product, syllabus, benefits..."
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-800/80 p-3 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <Input
              label="Cover Image URL"
              type="url"
              placeholder="https://images.unsplash.com/... or cloud storage URL"
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
            />
          </CardContent>
        </Card>

        {/* Pricing & Type */}
        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader>
            <CardTitle className="text-sm">Pricing & Classification</CardTitle>
            <CardDescription className="text-xs">Product type, price, and optional discount</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Product Type</label>
                <select
                  value={productType}
                  onChange={(e) => setProductType(e.target.value as ProductType)}
                  className="h-10 w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.values(ProductType).map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Price ($ USD)"
                type="number"
                step="0.01"
                placeholder="49.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />

              <Input
                label="Sale / Discount Price ($ USD)"
                type="number"
                step="0.01"
                placeholder="29.00 (optional)"
                value={discountPrice}
                onChange={(e) => setDiscountPrice(e.target.value)}
              />
            </div>

            {/* Categories */}
            {categories.length > 0 && (
              <div className="space-y-2 pt-2">
                <label className="text-xs font-medium text-slate-300">Categories</label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => {
                    const isSelected = selectedCategoryIds.includes(cat.id);
                    return (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => handleCategoryToggle(cat.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          isSelected
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                        }`}
                      >
                        {cat.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Features & Inclusions */}
        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader>
            <CardTitle className="text-sm">Features & Deliverables</CardTitle>
            <CardDescription className="text-xs">One item per line</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Key Features (1 per line)</label>
                <textarea
                  rows={4}
                  value={features}
                  onChange={(e) => setFeatures(e.target.value)}
                  placeholder="Comprehensive 300+ page guide&#10;Production Next.js code repository&#10;Architecture design patterns"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800/80 p-3 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">What&apos;s Included (1 per line)</label>
                <textarea
                  rows={4}
                  value={whatsIncluded}
                  onChange={(e) => setWhatsIncluded(e.target.value)}
                  placeholder="PDF + EPUB formats&#10;Starter GitHub repo access&#10;Lifetime revision access"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800/80 p-3 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <Input
                label="License Information"
                value={licenseInfo}
                onChange={(e) => setLicenseInfo(e.target.value)}
              />
              <Input
                label="Refund Information"
                value={refundInfo}
                onChange={(e) => setRefundInfo(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Status Settings */}
        <Card className="border-slate-800 bg-slate-900/60">
          <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs font-semibold text-white">Publish Immediately</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs font-semibold text-white">Feature on Storefront Homepage</span>
              </label>
            </div>

            <Button type="submit" size="md" className="gap-2" isLoading={isLoading}>
              <Save className="w-4 h-4" />
              Save Product
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
