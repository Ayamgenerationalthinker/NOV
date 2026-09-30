'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Package,
  Upload,
  Trash2,
  Plus,
  Loader2,
  FileText,
  ImagePlus,
  X,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatFileSize } from '@/lib/utils';

type Kind = 'DIGITAL' | 'PHYSICAL';

const DIGITAL_TYPES = [
  { value: 'EBOOK', label: 'Ebook' },
  { value: 'COURSE', label: 'Course' },
  { value: 'TEMPLATE', label: 'Template' },
  { value: 'AUDIO', label: 'Audio' },
  { value: 'VIDEO', label: 'Video' },
  { value: 'SOFTWARE', label: 'Software' },
  { value: 'GRAPHICS', label: 'Graphics' },
] as const;

const DEFAULT_VARIANT_TITLE = 'Default';

interface VariantRow {
  id?: string;
  value1: string;
  value2: string;
  stock: string;
  price: string;
}

interface ExistingFile {
  id: string;
  fileName: string;
  fileSize: number;
}

export interface ProductFormProduct {
  id: string;
  slug: string;
  title: string;
  description: string;
  productKind: Kind;
  productType: string;
  price: number;
  discountPrice: number | null;
  coverImage: string | null;
  galleryImages: string[];
  whatsIncluded: string[];
  isPublished: boolean;
  variants: Array<{
    id: string;
    title: string;
    option1Name: string | null;
    option1Value: string | null;
    option2Name: string | null;
    option2Value: string | null;
    price: number;
    inventoryQuantity: number;
    isAvailable: boolean;
  }>;
  files: ExistingFile[];
}

interface ProductFormProps {
  initialProduct?: ProductFormProduct;
  /** Called after a successful save; `justPublished` is true when this save put it live. */
  onSaved: (product: ProductFormProduct, justPublished: boolean) => void;
}

const fieldClass =
  'w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-3 text-base sm:text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60';
const labelClass = 'block text-xs font-semibold text-zinc-300 mb-1.5';
const optionalTag = <span className="ml-1 font-normal text-zinc-500">(optional)</span>;

async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  form.append('folder', 'products');
  const res = await fetch('/api/upload', { method: 'POST', body: form });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Image upload failed');
  return data.url as string;
}

export function ProductForm({ initialProduct, onSaved }: ProductFormProps) {
  const isEdit = Boolean(initialProduct);
  const optionVariants = (initialProduct?.variants || []).filter(
    (v) => v.isAvailable && !(v.title === DEFAULT_VARIANT_TITLE && !v.option1Value)
  );
  const defaultVariant = (initialProduct?.variants || []).find(
    (v) => v.title === DEFAULT_VARIANT_TITLE && !v.option1Value
  );

  const [kind, setKind] = React.useState<Kind | null>(initialProduct?.productKind ?? null);
  const [title, setTitle] = React.useState(initialProduct?.title ?? '');
  const [price, setPrice] = React.useState(initialProduct ? String(initialProduct.price) : '');
  const [salePrice, setSalePrice] = React.useState(
    initialProduct?.discountPrice != null ? String(initialProduct.discountPrice) : ''
  );
  const [description, setDescription] = React.useState(initialProduct?.description ?? '');
  const [whatYouGet, setWhatYouGet] = React.useState((initialProduct?.whatsIncluded ?? []).join('\n'));
  const [productType, setProductType] = React.useState(
    initialProduct && initialProduct.productKind === 'DIGITAL' ? initialProduct.productType : 'EBOOK'
  );
  const [coverImage, setCoverImage] = React.useState<string | null>(initialProduct?.coverImage ?? null);
  const [gallery, setGallery] = React.useState<string[]>(initialProduct?.galleryImages ?? []);

  // Digital delivery
  const [existingFiles, setExistingFiles] = React.useState<ExistingFile[]>(initialProduct?.files ?? []);
  const [pendingFile, setPendingFile] = React.useState<File | null>(null);

  // Physical stock
  const [hasOptions, setHasOptions] = React.useState(optionVariants.length > 0);
  const [stock, setStock] = React.useState(String(defaultVariant?.inventoryQuantity ?? 0));
  const [option1Name, setOption1Name] = React.useState(optionVariants[0]?.option1Name ?? 'Size');
  const [option2Name, setOption2Name] = React.useState(optionVariants[0]?.option2Name ?? '');
  const [rows, setRows] = React.useState<VariantRow[]>(
    optionVariants.length > 0
      ? optionVariants.map((v) => ({
          id: v.id,
          value1: v.option1Value ?? v.title,
          value2: v.option2Value ?? '',
          stock: String(v.inventoryQuantity),
          price: v.price !== initialProduct?.price ? String(v.price) : '',
        }))
      : [{ value1: '', value2: '', stock: '0', price: '' }]
  );

  const [uploading, setUploading] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState<'draft' | 'publish' | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handleCover = async (file?: File) => {
    if (!file) return;
    setUploading('cover');
    setError(null);
    try {
      setCoverImage(await uploadImage(file));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(null);
    }
  };

  const handleGallery = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading('gallery');
    setError(null);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) urls.push(await uploadImage(file));
      setGallery((prev) => [...prev, ...urls]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(null);
    }
  };

  const removeExistingFile = async (fileId: string) => {
    if (!confirm('Remove this file? Buyers will no longer be able to download it.')) return;
    const res = await fetch(`/api/admin/products/files/${fileId}`, { method: 'DELETE' });
    if (res.ok) setExistingFiles((prev) => prev.filter((f) => f.id !== fileId));
    else setError('Could not remove the file.');
  };

  const validate = (publish: boolean): string | null => {
    if (!kind) return 'Choose Digital or Physical first.';
    if (title.trim().length < 3) return 'Give your product a title (at least 3 characters).';
    const priceNum = Number(price);
    if (price === '' || Number.isNaN(priceNum) || priceNum < 0) return 'Enter a valid price in GH₵.';
    if (salePrice !== '' && (Number.isNaN(Number(salePrice)) || Number(salePrice) >= priceNum)) {
      return 'The sale price must be lower than the regular price.';
    }
    if (description.trim().length < 10) return 'Add a description (at least 10 characters).';
    if (kind === 'DIGITAL' && publish && existingFiles.length === 0 && !pendingFile) {
      return 'Choose the file buyers will receive before publishing.';
    }
    if (kind === 'PHYSICAL' && hasOptions) {
      if (!option1Name.trim()) return 'Name your option (for example "Size").';
      const filled = rows.filter((r) => r.value1.trim());
      if (filled.length === 0) return 'Add at least one option, or switch off "This product has options".';
      if (filled.some((r) => r.stock === '' || Number(r.stock) < 0 || !Number.isInteger(Number(r.stock)))) {
        return 'Every option needs a stock quantity (0 or more).';
      }
    }
    if (kind === 'PHYSICAL' && !hasOptions && (stock === '' || Number(stock) < 0 || !Number.isInteger(Number(stock)))) {
      return 'Enter how many you have in stock (0 or more).';
    }
    return null;
  };

  const buildPayload = () => {
    const priceNum = Number(price);
    const saleNum = salePrice === '' ? null : Number(salePrice);
    const payload: Record<string, unknown> = {
      title: title.trim(),
      description: description.trim(),
      shortDescription: description.trim().split('\n')[0].slice(0, 300),
      productKind: kind,
      productType: kind === 'DIGITAL' ? productType : 'PHYSICAL_GOOD',
      price: priceNum,
      discountPrice: saleNum,
      currency: 'GHS',
      coverImage: coverImage || '',
      galleryImages: kind === 'PHYSICAL' ? gallery : [],
      whatsIncluded: whatYouGet
        .split('\n')
        .map((l) => l.replace(/^[-•*]\s*/, '').trim())
        .filter(Boolean),
    };

    if (kind === 'PHYSICAL') {
      if (hasOptions) {
        payload.variants = rows
          .filter((r) => r.value1.trim())
          .map((r) => {
            const v1 = r.value1.trim();
            const v2 = option2Name.trim() ? r.value2.trim() : '';
            const ownPrice = r.price.trim() !== '' ? Number(r.price) : null;
            return {
              ...(r.id ? { id: r.id } : {}),
              title: [v1, v2].filter(Boolean).join(' / '),
              option1Name: option1Name.trim(),
              option1Value: v1,
              option2Name: v2 ? option2Name.trim() : null,
              option2Value: v2 || null,
              price: ownPrice ?? priceNum,
              salePrice: ownPrice === null ? saleNum : null,
              inventoryQuantity: Number(r.stock),
            };
          });
      } else {
        payload.variants = [];
        payload.stockQuantity = Number(stock);
      }
    }
    return payload;
  };

  const save = async (publish: boolean) => {
    const problem = validate(publish);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(publish ? 'publish' : 'draft');
    setError(null);

    try {
      // 1. Save details (new products are always created as drafts first)
      const res = await fetch(isEdit ? `/api/admin/products/${initialProduct!.id}` : '/api/admin/products', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      });
      const data = await res.json();
      if (!res.ok) {
        const details = data.details ? Object.values(data.details).flat().join(' ') : '';
        throw new Error([data.error, details].filter(Boolean).join(': '));
      }
      let product: ProductFormProduct = data.product;

      // 2. Attach the delivery file for digital products
      if (kind === 'DIGITAL' && pendingFile) {
        const form = new FormData();
        form.append('file', pendingFile);
        form.append('isPrimary', 'true');
        const fileRes = await fetch(`/api/admin/products/${product.id}/files`, { method: 'POST', body: form });
        const fileData = await fileRes.json();
        if (!fileRes.ok) {
          throw new Error(`Product saved as a draft, but the file upload failed: ${fileData.error || 'unknown error'}`);
        }
        setPendingFile(null);
        setExistingFiles((prev) => [fileData.file, ...prev]);
      }

      // 3. Publish / unpublish
      const wasPublished = Boolean(initialProduct?.isPublished);
      if (publish !== wasPublished || (!isEdit && publish)) {
        const pubRes = await fetch(`/api/admin/products/${product.id}/publish`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isPublished: publish }),
        });
        const pubData = await pubRes.json();
        if (!pubRes.ok) throw new Error(`Saved as a draft, but not published: ${pubData.error}`);
      }

      const refreshed = await fetch(`/api/admin/products/${product.id}`);
      if (refreshed.ok) product = (await refreshed.json()).product;

      onSaved(product, publish && !wasPublished);
    } catch (err) {
      setError((err as Error).message || 'Something went wrong while saving.');
    } finally {
      setSaving(null);
    }
  };

  // Step 0: Digital or Physical
  if (!kind) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-zinc-300">What are you selling?</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { k: 'DIGITAL' as Kind, icon: BookOpen, title: 'Digital', text: 'Ebook, course, template or any file buyers download right after paying.' },
            { k: 'PHYSICAL' as Kind, icon: Package, title: 'Physical', text: 'An item you deliver. Track stock, sizes and colours.' },
          ].map(({ k, icon: Icon, title: t, text }) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className="text-left rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 hover:border-emerald-500/60 hover:bg-zinc-900 transition-colors"
            >
              <Icon className="w-6 h-6 text-emerald-400 mb-3" />
              <div className="font-semibold text-white">{t}</div>
              <div className="text-xs text-zinc-400 mt-1">{text}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const isPhysical = kind === 'PHYSICAL';
  const isPublished = Boolean(initialProduct?.isPublished);

  return (
    <form
      className="space-y-8 pb-28"
      onSubmit={(e) => {
        e.preventDefault();
        save(isPublished);
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-300">
          {isPhysical ? <Package className="w-3.5 h-3.5" /> : <BookOpen className="w-3.5 h-3.5" />}
          {isPhysical ? 'Physical product' : 'Digital product'}
        </span>
        {!isEdit && (
          <button type="button" className="text-xs text-zinc-400 underline" onClick={() => setKind(null)}>
            Change
          </button>
        )}
      </div>

      {/* Basics */}
      <section className="space-y-4">
        <div>
          <label className={labelClass} htmlFor="pf-title">Title</label>
          <input id="pf-title" className={fieldClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={isPhysical ? 'Kente tote bag' : 'The Ghana Side-Hustle Playbook'} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass} htmlFor="pf-price">Price (GH₵)</label>
            <input id="pf-price" className={fieldClass} inputMode="decimal" type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="150" />
          </div>
          <div>
            <label className={labelClass} htmlFor="pf-sale">Sale price (GH₵){optionalTag}</label>
            <input id="pf-sale" className={fieldClass} inputMode="decimal" type="number" min="0" step="0.01" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} placeholder="—" />
          </div>
        </div>

        {!isPhysical && (
          <div>
            <label className={labelClass} htmlFor="pf-type">Type</label>
            <select id="pf-type" className={fieldClass} value={productType} onChange={(e) => setProductType(e.target.value)}>
              {DIGITAL_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className={labelClass} htmlFor="pf-desc">Description</label>
          <textarea id="pf-desc" className={`${fieldClass} min-h-36`} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is it, who is it for, and why will they love it? The first line is used as the summary in link previews." />
        </div>

        <div>
          <label className={labelClass} htmlFor="pf-get">What you get{optionalTag}</label>
          <textarea id="pf-get" className={`${fieldClass} min-h-28`} value={whatYouGet} onChange={(e) => setWhatYouGet(e.target.value)} placeholder={isPhysical ? 'One per line, e.g.\nHandwoven kente strap\nFits a 15" laptop' : 'One per line, e.g.\n120-page PDF\nBonus budgeting spreadsheet'} />
        </div>
      </section>

      {/* Images */}
      <section className="space-y-4">
        <div>
          <span className={labelClass}>Cover image{optionalTag}</span>
          <p className="text-xs text-zinc-500 mb-2">Shown on the product page and in the WhatsApp / social preview. A square or 1200×630 image works best.</p>
          {coverImage ? (
            <div className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={coverImage} alt="Cover" className="h-40 w-40 rounded-xl object-cover border border-zinc-800" />
              <button type="button" aria-label="Remove cover" onClick={() => setCoverImage(null)} className="absolute -top-2 -right-2 rounded-full bg-zinc-800 p-1.5 text-zinc-200">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <label className="flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 text-xs text-zinc-400">
              {uploading === 'cover' ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImagePlus className="w-5 h-5" />}
              {uploading === 'cover' ? 'Uploading…' : 'Tap to add a cover image'}
              <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden" onChange={(e) => handleCover(e.target.files?.[0])} />
            </label>
          )}
        </div>

        {isPhysical && (
          <div>
            <span className={labelClass}>More photos{optionalTag}</span>
            <div className="flex flex-wrap gap-3">
              {gallery.map((url) => (
                <div key={url} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-20 w-20 rounded-lg object-cover border border-zinc-800" />
                  <button type="button" aria-label="Remove photo" onClick={() => setGallery((g) => g.filter((u) => u !== url))} className="absolute -top-2 -right-2 rounded-full bg-zinc-800 p-1 text-zinc-200">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border border-dashed border-zinc-700 text-zinc-400">
                {uploading === 'gallery' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="hidden" onChange={(e) => handleGallery(e.target.files)} />
              </label>
            </div>
          </div>
        )}
      </section>

      {/* Delivery file (digital) */}
      {!isPhysical && (
        <section className="space-y-3">
          <span className={labelClass}>File buyers receive</span>
          <p className="text-xs text-zinc-500 -mt-1">PDF, EPUB, ZIP… Buyers download it right after paying and get a link by email.</p>
          {existingFiles.map((f) => (
            <div key={f.id} className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 shrink-0 text-emerald-400" />
                <span className="truncate text-sm text-zinc-200">{f.fileName}</span>
                <span className="shrink-0 text-xs text-zinc-500">{formatFileSize(f.fileSize)}</span>
              </div>
              <button type="button" aria-label="Remove file" onClick={() => removeExistingFile(f.id)} className="text-zinc-500 hover:text-red-400">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 px-4 py-4 text-sm text-zinc-300">
            <Upload className="w-4 h-4 text-emerald-400" />
            <span className="truncate">
              {pendingFile ? `${pendingFile.name} (${formatFileSize(pendingFile.size)}) — uploads when you save` : existingFiles.length ? 'Add or replace a file' : 'Choose the file to deliver'}
            </span>
            <input type="file" className="hidden" onChange={(e) => setPendingFile(e.target.files?.[0] ?? null)} />
          </label>
        </section>
      )}

      {/* Stock (physical) */}
      {isPhysical && (
        <section className="space-y-4">
          <label className="flex items-center gap-3 text-sm text-zinc-200">
            <input type="checkbox" className="h-5 w-5 accent-emerald-500" checked={hasOptions} onChange={(e) => setHasOptions(e.target.checked)} />
            This product has options (size, colour…){optionalTag}
          </label>

          {!hasOptions ? (
            <div className="max-w-40">
              <label className={labelClass} htmlFor="pf-stock">Quantity in stock</label>
              <input id="pf-stock" className={fieldClass} type="number" inputMode="numeric" min="0" step="1" value={stock} onChange={(e) => setStock(e.target.value)} />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass} htmlFor="pf-opt1">Option name</label>
                  <input id="pf-opt1" className={fieldClass} value={option1Name} onChange={(e) => setOption1Name(e.target.value)} placeholder="Size" />
                </div>
                <div>
                  <label className={labelClass} htmlFor="pf-opt2">Second option{optionalTag}</label>
                  <input id="pf-opt2" className={fieldClass} value={option2Name} onChange={(e) => setOption2Name(e.target.value)} placeholder="Colour" />
                </div>
              </div>

              {rows.map((row, idx) => (
                <div key={row.id ?? `new-${idx}`} className="grid grid-cols-12 items-end gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                  <div className={option2Name.trim() ? 'col-span-6 sm:col-span-3' : 'col-span-12 sm:col-span-5'}>
                    <label className={labelClass}>{option1Name || 'Option'}</label>
                    <input className={fieldClass} value={row.value1} onChange={(e) => setRows((r) => r.map((x, i) => (i === idx ? { ...x, value1: e.target.value } : x)))} placeholder="M" />
                  </div>
                  {option2Name.trim() && (
                    <div className="col-span-6 sm:col-span-3">
                      <label className={labelClass}>{option2Name}</label>
                      <input className={fieldClass} value={row.value2} onChange={(e) => setRows((r) => r.map((x, i) => (i === idx ? { ...x, value2: e.target.value } : x)))} placeholder="Red" />
                    </div>
                  )}
                  <div className="col-span-4 sm:col-span-2">
                    <label className={labelClass}>Stock</label>
                    <input className={fieldClass} type="number" inputMode="numeric" min="0" step="1" value={row.stock} onChange={(e) => setRows((r) => r.map((x, i) => (i === idx ? { ...x, stock: e.target.value } : x)))} />
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <label className={labelClass}>Price{optionalTag}</label>
                    <input className={fieldClass} type="number" inputMode="decimal" min="0" step="0.01" value={row.price} onChange={(e) => setRows((r) => r.map((x, i) => (i === idx ? { ...x, price: e.target.value } : x)))} placeholder={price || 'Same'} />
                  </div>
                  <div className="col-span-2 sm:col-span-1 flex justify-end pb-3">
                    <button type="button" aria-label="Remove option" onClick={() => setRows((r) => (r.length > 1 ? r.filter((_, i) => i !== idx) : r))} className="text-zinc-500 hover:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setRows((r) => [...r, { value1: '', value2: '', stock: '0', price: '' }])}>
                <Plus className="w-4 h-4" /> Add option
              </Button>
            </div>
          )}
        </section>
      )}

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-900 bg-red-950/60 p-3 text-sm text-red-200">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Sticky actions: easy to reach on a phone */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-800 bg-zinc-950/95 px-4 py-3 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0">
        <div className="mx-auto flex max-w-3xl gap-3">
          {isPublished ? (
            <>
              <Button type="button" variant="outline" className="flex-1 sm:flex-none" isLoading={saving === 'draft'} disabled={Boolean(saving || uploading)} onClick={() => save(false)}>
                Unpublish
              </Button>
              <Button type="submit" variant="success" className="flex-1 sm:flex-none" isLoading={saving === 'publish'} disabled={Boolean(saving || uploading)}>
                Save changes
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" className="flex-1 sm:flex-none" isLoading={saving === 'draft'} disabled={Boolean(saving || uploading)} onClick={() => save(false)}>
                Save draft
              </Button>
              <Button type="button" variant="success" className="flex-1 sm:flex-none" isLoading={saving === 'publish'} disabled={Boolean(saving || uploading)} onClick={() => save(true)}>
                Publish
              </Button>
            </>
          )}
          {isEdit && (
            <Link href="/admin/products" className="hidden sm:inline-flex items-center px-3 text-sm text-zinc-400 hover:text-white">
              Cancel
            </Link>
          )}
        </div>
      </div>
    </form>
  );
}
