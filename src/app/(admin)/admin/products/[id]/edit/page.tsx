'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save, AlertCircle, Loader2, Trash2, Upload, Download, CheckCircle2, FileText } from 'lucide-react';
import { ProductType } from '@prisma/client';
import { formatFileSize } from '@/lib/utils';

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

  // Digital Asset Files State
  const [files, setFiles] = React.useState<Array<{
    id: string;
    fileName: string;
    fileSize: number;
    fileType: string;
    versionNumber: string;
    isPrimary: boolean;
    maxDownloads: number | null;
    downloadCount: number;
  }>>([]);
  const [uploadFileObj, setUploadFileObj] = React.useState<File | null>(null);
  const [uploadVersion, setUploadVersion] = React.useState('1.0.0');
  const [uploadIsPrimary, setUploadIsPrimary] = React.useState(true);
  const [uploadMaxDownloads, setUploadMaxDownloads] = React.useState('');
  const [isUploadingFile, setIsUploadingFile] = React.useState(false);
  const [fileActionError, setFileActionError] = React.useState<string | null>(null);
  const [fileActionSuccess, setFileActionSuccess] = React.useState<string | null>(null);

  const loadFiles = React.useCallback(() => {
    fetch(`/api/admin/products/${id}/files`)
      .then((res) => res.json())
      .then((data) => {
        if (data.files) setFiles(data.files);
      })
      .catch((err) => console.error('Failed to load files:', err));
  }, [id]);

  React.useEffect(() => {
    loadFiles();
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
  }, [id, loadFiles]);

  const handleCategoryToggle = (catId: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(catId) ? prev.filter((i) => i !== catId) : [...prev, catId]
    );
  };

  const handleUploadFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFileObj) {
      setFileActionError('Please select a file to upload.');
      return;
    }

    setFileActionError(null);
    setFileActionSuccess(null);
    setIsUploadingFile(true);

    try {
      const formData = new FormData();
      formData.append('file', uploadFileObj);
      formData.append('versionNumber', uploadVersion);
      formData.append('isPrimary', uploadIsPrimary ? 'true' : 'false');
      if (uploadMaxDownloads) {
        formData.append('maxDownloads', uploadMaxDownloads);
      }

      const res = await fetch(`/api/admin/products/${id}/files`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setFileActionError(data.error || 'Failed to upload digital asset.');
        setIsUploadingFile(false);
        return;
      }

      setFileActionSuccess(`Successfully uploaded ${uploadFileObj.name}!`);
      setUploadFileObj(null);
      setUploadMaxDownloads('');
      loadFiles();
    } catch {
      setFileActionError('Network error uploading file.');
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleDeleteFile = async (fileId: string, fileName: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${fileName}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/products/files/${fileId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        loadFiles();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete file.');
      }
    } catch {
      alert('Network error deleting file.');
    }
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

        {/* Digital Asset Files Management */}
        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader>
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Digital Asset Files & Versioning</span>
              <span className="text-xs font-normal text-slate-400">
                {files.length} {files.length === 1 ? 'file' : 'files'} attached
              </span>
            </CardTitle>
            <CardDescription className="text-xs">
              Secure private files delivered to verified customers via signed URLs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Notifications */}
            {fileActionError && (
              <div className="flex items-center gap-2 rounded-lg border border-red-800/40 bg-red-950/40 p-3 text-xs text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                <span>{fileActionError}</span>
              </div>
            )}
            {fileActionSuccess && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-800/40 bg-emerald-950/40 p-3 text-xs text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>{fileActionSuccess}</span>
              </div>
            )}

            {/* Attached Files List */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">Attached Product Assets</label>
              {files.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-800 p-6 text-center text-xs text-slate-500">
                  No digital files attached yet. Upload the primary product deliverable below.
                </div>
              ) : (
                <div className="divide-y divide-slate-800/60 rounded-lg border border-slate-800 overflow-hidden bg-slate-950/40">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 text-xs hover:bg-slate-850/40 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-4">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white truncate">{file.fileName}</span>
                            {file.isPrimary && (
                              <span className="rounded bg-blue-600/30 border border-blue-500/40 px-1.5 py-0.2 text-[10px] text-blue-300 font-medium">
                                Primary
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                            <span>v{file.versionNumber}</span>
                            <span>•</span>
                            <span>{formatFileSize(file.fileSize)}</span>
                            <span>•</span>
                            <span>{file.downloadCount} downloads</span>
                            {file.maxDownloads && (
                              <>
                                <span>•</span>
                                <span>limit: {file.maxDownloads}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleDeleteFile(file.id, file.fileName)}
                          className="p-1.5 text-slate-500 hover:text-red-400 rounded hover:bg-red-950/30 transition-colors"
                          title="Delete file"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upload New File Box */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-4">
              <p className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-blue-400" />
                Upload New Asset Revision
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-3">
                  <input
                    type="file"
                    onChange={(e) => setUploadFileObj(e.target.files?.[0] || null)}
                    className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 file:cursor-pointer cursor-pointer"
                  />
                </div>

                <Input
                  label="Version (e.g. 1.0.0)"
                  value={uploadVersion}
                  onChange={(e) => setUploadVersion(e.target.value)}
                  placeholder="1.0.0"
                />

                <Input
                  label="Download Limit (optional)"
                  type="number"
                  value={uploadMaxDownloads}
                  onChange={(e) => setUploadMaxDownloads(e.target.value)}
                  placeholder="e.g. 5"
                />

                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={uploadIsPrimary}
                      onChange={(e) => setUploadIsPrimary(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Set as Primary Download</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={handleUploadFile}
                  isLoading={isUploadingFile}
                  disabled={!uploadFileObj}
                  className="gap-1.5 text-xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Attach Asset to Product
                </Button>
              </div>
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
