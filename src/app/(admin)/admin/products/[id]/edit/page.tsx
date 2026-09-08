'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save, AlertCircle, Loader2, Trash2 } from 'lucide-react';
import { ProductType } from '@prisma/client';

interface CategoryOption {
  id: string;
  name: string;
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [title, setTitle] = React.useState('');
  const [slug, setSlug] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [shortDescription, setShortDescription] = React.useState('');
  const [coverImage, setCoverImage] = React.useState('');
  const [price, setPrice] = React.useState('');
  const [discountPrice, setDiscountPrice] = React.useState('');
  const [productType, setProductType] = React.useState<ProductType>(ProductType.EBOOK);
  const [features, setFeatures] = React.useState('');
  const [whatsIncluded, setWhatsIncluded] = React.useState('');
  const [licenseInfo, setLicenseInfo] = React.useState('');
  const [refundInfo, setRefundInfo] = React.useState('');
  const [isPublished, setIsPublished] = React.useState(false);
  const [isFeatured, setIsFeatured] = React.useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = React.useState<string[]>([]);
  const [categories, setCategories] = React.useState<CategoryOption[]>([]);

  const [isFetching, setIsFetching] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    Promise.all([
      fetch(`/api/admin/products`).then((res) => res.json()),
      fetch('/api/categories').then((res) => res.json()),
    ])
      .then(([adminData, catData]) => {
        setCategories(catData.categories || []);
        // Find current product
        const found = (adminData.products || []).find((p: { id: string }) => p.id === id);
        if (found) {
          setTitle(found.title);
          setSlug(found.slug);
          setDescription(found.description || '');
          setShortDescription(found.shortDescription || '');
          setCoverImage(found.coverImage || '');
          setPrice(found.price.toString());
          setDiscountPrice(found.discountPrice ? found.discountPrice.toString() : '');
          setProductType(found.productType);
          setFeatures((found.features || []).join('\n'));
          setWhatsIncluded((found.whatsIncluded || []).join('\n'));
          setLicenseInfo(found.licenseInfo || '');
          setRefundInfo(found.refundInfo || '');
          setIsPublished(found.isPublished);
          setIsFeatured(found.isFeatured);
          setSelectedCategoryIds(found.categories.map((c: { category: { id: string } }) => c.category.id));
        }
      })
      .catch((err) => {
        console.error('Failed to load product data:', err);
        setError('Failed to load product details.');
      })
      .finally(() => setIsFetching(false));
  }, [id]);

  const handleCategoryToggle = (catId: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(catId) ? prev.filter((i) => i !== catId) : [...prev, catId]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      const payload = {
        title,
        slug,
        description,
        shortDescription: shortDescription || undefined,
        coverImage: coverImage.trim() || undefined,
        price: parseFloat(price),
        discountPrice: discountPrice ? parseFloat(discountPrice) : null,
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

      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to update product.');
        setIsSaving(false);
        return;
      }

      router.push('/admin/products');
      router.refresh();
    } catch {
      setError('An unexpected error occurred while updating.');
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to delete product.');
        setIsDeleting(false);
        return;
      }

      router.push('/admin/products');
      router.refresh();
    } catch {
      alert('Network error while deleting product.');
      setIsDeleting(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center p-24 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mr-3 text-blue-500" />
        <span className="text-sm">Loading product details...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/products" className="text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Edit Product</h1>
            <p className="text-xs text-slate-400">Update catalog pricing, details, and visibility.</p>
          </div>
        </div>

        <Button
          type="button"
          variant="danger"
          size="sm"
          className="gap-1.5"
          onClick={handleDelete}
          isLoading={isDeleting}
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-800/40 bg-red-950/40 p-4 text-xs text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader>
            <CardTitle className="text-sm">Product Information</CardTitle>
            <CardDescription className="text-xs">Primary title, slug, and descriptions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Product Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <Input
              label="URL Slug"
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
                className="w-full rounded-lg border border-slate-700 bg-slate-800/80 p-3 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Full Description</label>
              <textarea
                rows={6}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-800/80 p-3 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <Input
              label="Cover Image URL"
              type="url"
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
            />
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader>
            <CardTitle className="text-sm">Pricing & Classification</CardTitle>
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
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />

              <Input
                label="Sale / Discount Price ($ USD)"
                type="number"
                step="0.01"
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

        {/* Features */}
        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader>
            <CardTitle className="text-sm">Features & Deliverables</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Key Features (1 per line)</label>
                <textarea
                  rows={4}
                  value={features}
                  onChange={(e) => setFeatures(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800/80 p-3 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">What&apos;s Included (1 per line)</label>
                <textarea
                  rows={4}
                  value={whatsIncluded}
                  onChange={(e) => setWhatsIncluded(e.target.value)}
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

        {/* Status */}
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
                <span className="text-xs font-semibold text-white">Published on Storefront</span>
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

            <Button type="submit" size="md" className="gap-2" isLoading={isSaving}>
              <Save className="w-4 h-4" />
              Update Product
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
