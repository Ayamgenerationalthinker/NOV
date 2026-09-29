'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Package,
  FileCode,
  Sparkles,
  Plus,
  Trash2,
  Image as ImageIcon,
  Layers,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Box,
  Truck,
  ShieldCheck,
} from 'lucide-react';
import { ProductType, ProductKind } from '@prisma/client';

interface VariantFormState {
  sku: string;
  title: string;
  option1Name?: string;
  option1Value?: string;
  option2Name?: string;
  option2Value?: string;
  price: number;
  salePrice?: number;
  inventoryQuantity: number;
  weightGrams?: number;
}

export function ProductWizard({ initialData }: { initialData?: any }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Core Form State
  const [productKind, setProductKind] = useState<ProductKind>(
    initialData?.productKind || ProductKind.PHYSICAL
  );
  const [title, setTitle] = useState(initialData?.title || '');
  const [brand, setBrand] = useState(initialData?.brand || '');
  const [slug, setSlug] = useState(initialData?.slug || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [shortDescription, setShortDescription] = useState(initialData?.shortDescription || '');
  const [productType, setProductType] = useState<ProductType>(
    initialData?.productType || ProductType.FASHION
  );
  const [price, setPrice] = useState<number>(initialData?.price || 0);
  const [discountPrice, setDiscountPrice] = useState<number | ''>(
    initialData?.discountPrice ?? ''
  );
  const [currency, setCurrency] = useState(initialData?.currency || 'USD');
  const [isPublished, setIsPublished] = useState(initialData?.isPublished ?? true);
  const [isFeatured, setIsFeatured] = useState(initialData?.isFeatured ?? false);

  // Media & 3D Assets
  const [coverImage, setCoverImage] = useState(initialData?.coverImage || '');
  const [galleryInput, setGalleryInput] = useState(
    initialData?.galleryImages?.join('\n') || ''
  );
  const [model3dUrl, setModel3dUrl] = useState(initialData?.model3dUrl || '');
  const [model3dPoster, setModel3dPoster] = useState(initialData?.model3dPoster || '');

  // Tags & Features
  const [tagsInput, setTagsInput] = useState(initialData?.tags?.join(', ') || '');
  const [featuresInput, setFeaturesInput] = useState(
    initialData?.features?.join('\n') || ''
  );

  // Variants (For physical items)
  const [variants, setVariants] = useState<VariantFormState[]>(
    initialData?.variants?.map((v: any) => ({
      sku: v.sku,
      title: v.title,
      option1Name: v.option1Name || 'Size',
      option1Value: v.option1Value || '',
      option2Name: v.option2Name || 'Color',
      option2Value: v.option2Value || '',
      price: Number(v.price),
      salePrice: v.salePrice ? Number(v.salePrice) : undefined,
      inventoryQuantity: v.inventoryQuantity ?? 10,
      weightGrams: v.weightGrams ? Number(v.weightGrams) : undefined,
    })) || [
      {
        sku: 'NOV-PROD-01',
        title: 'Standard',
        option1Name: 'Size',
        option1Value: 'M',
        option2Name: 'Color',
        option2Value: 'Black',
        price: 99,
        inventoryQuantity: 25,
      },
    ]
  );

  const handleAddVariant = () => {
    const nextNum = variants.length + 1;
    setVariants([
      ...variants,
      {
        sku: `NOV-VAR-${nextNum}`,
        title: `Variant ${nextNum}`,
        option1Name: 'Size',
        option1Value: '',
        option2Name: 'Color',
        option2Value: '',
        price: price || 50,
        inventoryQuantity: 10,
      },
    ]);
  };

  const handleRemoveVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const handleVariantChange = (index: number, field: keyof VariantFormState, value: any) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    setVariants(updated);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    const galleryImages = galleryInput
      .split('\n')
      .map((s: string) => s.trim())
      .filter(Boolean);

    const tags = tagsInput
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean);

    const features = featuresInput
      .split('\n')
      .map((s: string) => s.trim())
      .filter(Boolean);

    const payload = {
      title,
      brand: brand || undefined,
      slug: slug || undefined,
      description,
      shortDescription: shortDescription || undefined,
      productKind,
      productType,
      coverImage: coverImage || undefined,
      galleryImages,
      price: Number(price),
      discountPrice: discountPrice !== '' ? Number(discountPrice) : undefined,
      currency,
      isPublished,
      isFeatured,
      tags,
      features,
      model3dUrl: model3dUrl || undefined,
      model3dPoster: model3dPoster || undefined,
      variants: productKind === ProductKind.PHYSICAL ? variants : undefined,
    };

    try {
      const url = initialData?.id ? `/api/admin/products/${initialData.id}` : '/api/admin/products';
      const method = initialData?.id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save product');
      }

      router.push('/admin/products');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Wizard Step Tracker */}
      <div className="grid grid-cols-4 gap-2 p-1.5 bg-zinc-900/80 border border-zinc-800 rounded-2xl">
        {[
          { step: 1, label: '1. Product Type', icon: Layers },
          { step: 2, label: '2. Details & SEO', icon: Package },
          { step: 3, label: '3. Media & 3D', icon: Box },
          { step: 4, label: '4. Variants & Stock', icon: Truck },
        ].map((item) => (
          <button
            key={item.step}
            type="button"
            onClick={() => setStep(item.step)}
            className={`flex items-center justify-center gap-2 py-3 px-2 rounded-xl text-xs font-medium transition-all ${
              step === item.step
                ? 'bg-zinc-800 text-white shadow-lg border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <item.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{item.label}</span>
          </button>
        ))}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-sm flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-red-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Step 1: Product Classification */}
      {step === 1 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-white">Select Product Classification</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              onClick={() => setProductKind(ProductKind.PHYSICAL)}
              className={`p-6 rounded-3xl border-2 cursor-pointer transition-all ${
                productKind === ProductKind.PHYSICAL
                  ? 'border-emerald-500 bg-emerald-950/20 shadow-xl'
                  : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4 border border-emerald-500/20">
                <Package className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Physical Product</h3>
              <p className="text-sm text-zinc-400">
                Fashion, footwear, consumer electronics, luxury accessories, and tangible goods with SKU inventory, sizes, colors, and parcel shipping.
              </p>
            </div>

            <div
              onClick={() => setProductKind(ProductKind.DIGITAL)}
              className={`p-6 rounded-3xl border-2 cursor-pointer transition-all ${
                productKind === ProductKind.DIGITAL
                  ? 'border-emerald-500 bg-emerald-950/20 shadow-xl'
                  : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4 border border-emerald-500/20">
                <FileCode className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Digital Product</h3>
              <p className="text-sm text-zinc-400">
                Software, 3D assets, presets, templates, audio samples, or digital files with instant encrypted download links and customer library access.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2">
                Category / Product Family
              </label>
              <select
                value={productType}
                onChange={(e) => setProductType(e.target.value as ProductType)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 text-sm"
              >
                <option value="FASHION">Fashion & Apparel</option>
                <option value="FOOTWEAR">Footwear & Sneakers</option>
                <option value="ELECTRONICS">Electronics & Gadgets</option>
                <option value="ACCESSORIES">Luxury Accessories</option>
                <option value="HOME">Home & Living</option>
                <option value="BEAUTY">Beauty & Wellness</option>
                <option value="SOFTWARE">Software & Tools</option>
                <option value="TEMPLATE">Design Templates</option>
                <option value="GRAPHICS">3D Assets & Graphics</option>
                <option value="EBOOK">E-Book & Guides</option>
                <option value="BUNDLE">Curated Bundle</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2">
                Brand / Manufacturer
              </label>
              <input
                type="text"
                placeholder="e.g. NOV Atelier, Apex Tech"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Details & Pricing */}
      {step === 2 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-white">Product Information & Pricing</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2">
                Product Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Minimalist Titanium Chronograph"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 text-sm font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2">
                URL Slug (Optional, auto-generated)
              </label>
              <input
                type="text"
                placeholder="minimalist-titanium-chronograph"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-300 font-mono text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2">
                  Regular Price ({currency}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="249.00"
                  value={price || ''}
                  onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2">
                  Sale / Discount Price (Optional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="199.00"
                  value={discountPrice}
                  onChange={(e) => setDiscountPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2">
                  Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 text-sm font-mono"
                >
                  <option value="USD">USD ($)</option>
                  <option value="GHS">GHS (GH₵ - Ghana Cedi)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2">
                Short Subtitle / Hook
              </label>
              <input
                type="text"
                placeholder="High-grade forged titanium with Swiss automatic movement."
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2">
                Full Description *
              </label>
              <textarea
                rows={5}
                required
                placeholder="Detailed specifications, craftsmanship, materials, sizing guidelines..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 text-sm leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2">
                Search Tags (comma-separated)
              </label>
              <input
                type="text"
                placeholder="luxury, titanium, waterproof, limited-edition"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Media & 3D Interactive Assets */}
      {step === 3 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-white">Visuals, Photography & 3D Model</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2">
                Primary Cover Image URL *
              </label>
              <input
                type="url"
                placeholder="https://images.unsplash.com/photo-..."
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2">
                Additional Gallery Image URLs (one per line)
              </label>
              <textarea
                rows={4}
                placeholder="https://images.unsplash.com/photo-1...&#10;https://images.unsplash.com/photo-2..."
                value={galleryInput}
                onChange={(e) => setGalleryInput(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-300 font-mono text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* 3D Model Section */}
            <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
              <div className="flex items-center gap-3 text-emerald-400">
                <Sparkles className="w-5 h-5" />
                <h3 className="text-sm font-semibold uppercase tracking-wider">
                  Interactive 3D Experience (Optional)
                </h3>
              </div>
              <p className="text-xs text-zinc-400">
                Provide a hosted `.glb` or `.gltf` 3D model URL to enable interactive 360° orbit inspection for customers. If omitted, standard photography is displayed.
              </p>

              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1">
                  3D GLB/GLTF Model URL
                </label>
                <input
                  type="url"
                  placeholder="https://assets.nov.com/models/watch-titanium.glb"
                  value={model3dUrl}
                  onChange={(e) => setModel3dUrl(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1">
                  3D Poster / Thumbnail Fallback URL
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={model3dPoster}
                  onChange={(e) => setModel3dPoster(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Variants, Inventory Matrix & Publication */}
      {step === 4 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">SKU Variants & Stock Inventory</h2>
              <p className="text-xs text-zinc-400 mt-1">
                Configure size, color, and stock levels for physical fulfillment.
              </p>
            </div>
            {productKind === ProductKind.PHYSICAL && (
              <button
                type="button"
                onClick={handleAddVariant}
                className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-medium transition-all"
              >
                <Plus className="w-4 h-4" /> Add Variant
              </button>
            )}
          </div>

          {productKind === ProductKind.PHYSICAL ? (
            <div className="space-y-4">
              {variants.map((v, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-zinc-400">Variant #{idx + 1}</span>
                    {variants.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveVariant(idx)}
                        className="text-red-400 hover:text-red-300 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div>
                      <label className="text-[11px] font-mono text-zinc-500">SKU Code</label>
                      <input
                        type="text"
                        value={v.sku}
                        onChange={(e) => handleVariantChange(idx, 'sku', e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-mono text-zinc-500">Size / Option 1</label>
                      <input
                        type="text"
                        placeholder="e.g. EU 42 / XL"
                        value={v.option1Value || ''}
                        onChange={(e) => handleVariantChange(idx, 'option1Value', e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-mono text-zinc-500">Color / Option 2</label>
                      <input
                        type="text"
                        placeholder="e.g. Matte Black"
                        value={v.option2Value || ''}
                        onChange={(e) => handleVariantChange(idx, 'option2Value', e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-mono text-zinc-500">Price ({currency})</label>
                      <input
                        type="number"
                        value={v.price}
                        onChange={(e) => handleVariantChange(idx, 'price', parseFloat(e.target.value) || 0)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-mono text-zinc-500">Stock Quantity</label>
                      <input
                        type="number"
                        value={v.inventoryQuantity}
                        onChange={(e) => handleVariantChange(idx, 'inventoryQuantity', parseInt(e.target.value) || 0)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 text-center">
              <FileCode className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-white">Digital Product Deliverable</p>
              <p className="text-xs text-zinc-400 mt-1">
                You can attach private download binaries and release versions after saving this product.
              </p>
            </div>
          )}

          {/* Visibility Controls */}
          <div className="pt-4 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 bg-zinc-900 border-zinc-700"
              />
              <span className="text-sm font-medium text-zinc-200">Publish to Storefront Immediately</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 bg-zinc-900 border-zinc-700"
              />
              <span className="text-sm font-medium text-zinc-200">Show in Homepage Featured Row</span>
            </label>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-6 border-t border-zinc-800">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-sm font-medium transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        ) : <div />}

        {step < 4 ? (
          <button
            type="button"
            onClick={() => setStep(step + 1)}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-sm font-semibold transition-all shadow-lg"
          >
            Next Step <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            disabled={loading}
            onClick={handleSubmit}
            className="flex items-center gap-2 px-8 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-semibold transition-all shadow-xl disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">Saving...</span>
            ) : (
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Complete & Save Product
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
