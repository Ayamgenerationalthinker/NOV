'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Upload, Download, Trash2, CheckCircle2, FileText, AlertCircle } from 'lucide-react';
import { ProductWizard } from '@/components/admin/product-wizard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatFileSize } from '@/lib/utils';

export default function EditProductPage() {
  const params = useParams();
  const id = params.id as string;

  const [product, setProduct] = React.useState<any>(null);
  const [isFetching, setIsFetching] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Digital Asset Files State
  const [files, setFiles] = React.useState<any[]>([]);
  const [uploadFileObj, setUploadFileObj] = React.useState<File | null>(null);
  const [uploadVersion, setUploadVersion] = React.useState('1.0.0');
  const [uploadIsPrimary, setUploadIsPrimary] = React.useState(true);
  const [uploadMaxDownloads, setUploadMaxDownloads] = React.useState('');
  const [isUploadingFile, setIsUploadingFile] = React.useState(false);

  const fetchProductAndFiles = React.useCallback(async () => {
    try {
      const [prodRes, filesRes] = await Promise.all([
        fetch(`/api/admin/products/${id}`),
        fetch(`/api/admin/products/${id}/files`),
      ]);

      if (!prodRes.ok) throw new Error('Failed to load product details');
      const prodData = await prodRes.json();
      setProduct(prodData.product);

      if (filesRes.ok) {
        const filesData = await filesRes.json();
        setFiles(filesData.files || []);
      }
    } catch (err: any) {
      setError(err.message || 'Error loading product.');
    } finally {
      setIsFetching(false);
    }
  }, [id]);

  React.useEffect(() => {
    fetchProductAndFiles();
  }, [fetchProductAndFiles]);

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFileObj) return;

    setIsUploadingFile(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', uploadFileObj);
      formData.append('versionNumber', uploadVersion);
      formData.append('isPrimary', String(uploadIsPrimary));
      if (uploadMaxDownloads) {
        formData.append('maxDownloads', uploadMaxDownloads);
      }

      const res = await fetch(`/api/admin/products/${id}/files`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      setUploadFileObj(null);
      setUploadMaxDownloads('');
      fetchProductAndFiles();
    } catch (err: any) {
      setError(err.message || 'File upload failed');
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;
    try {
      const res = await fetch(`/api/admin/products/files/${fileId}`, { method: 'DELETE' });
      if (res.ok) {
        setFiles((prev) => prev.filter((f) => f.id !== fileId));
      }
    } catch (err) {
      console.error('Failed to delete file', err);
    }
  };

  if (isFetching) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        <p className="text-xs font-mono text-zinc-500">Loading product editor...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">Product Not Found</h2>
        <p className="text-xs text-zinc-400">The requested product does not exist or has been removed.</p>
        <Link href="/admin/products" className="inline-block px-4 py-2 bg-zinc-800 text-white rounded-xl text-xs">
          Back to Catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      <div className="flex items-center gap-3">
        <Link href="/admin/products" className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-all">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Edit Product</h1>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">ID: {product.id} • Slug: /{product.slug}</p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs">
          {error}
        </div>
      )}

      {/* Main Multi-step Wizard */}
      <ProductWizard initialData={product} />

      {/* Digital Deliverables File Manager (for digital assets) */}
      {product.productKind === 'DIGITAL' && (
        <Card className="border-zinc-800 bg-zinc-900/60 rounded-3xl overflow-hidden mt-12">
          <CardHeader className="p-6 border-b border-zinc-800/80">
            <div className="flex items-center gap-3 text-emerald-400">
              <FileText className="w-5 h-5" />
              <div>
                <CardTitle className="text-base text-white">Digital Deliverables & File Versions</CardTitle>
                <CardDescription className="text-xs text-zinc-400 mt-0.5">
                  Private binaries securely delivered to entitled purchasers via signed, expiring URLs.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Existing Files */}
            {files.length > 0 ? (
              <div className="divide-y divide-zinc-800/60 border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-950/60">
                {files.map((file) => (
                  <div key={file.id} className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white">{file.fileName}</span>
                          {file.isPrimary && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                              Primary
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-zinc-500">v{file.versionNumber}</span>
                        </div>
                        <div className="text-[11px] font-mono text-zinc-400 mt-0.5">
                          {formatFileSize(file.fileSize)} • {file.fileType}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteFile(file.id)}
                      className="p-2 text-zinc-500 hover:text-red-400 transition-colors"
                      title="Delete Asset"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-2xl">
                No downloadable files attached to this digital product yet.
              </div>
            )}

            {/* Upload File Form */}
            <form onSubmit={handleFileUpload} className="p-5 bg-zinc-950 rounded-2xl border border-zinc-800 space-y-4">
              <h4 className="text-xs font-mono uppercase text-zinc-400">Upload New Binary Asset</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <input
                    type="file"
                    required
                    onChange={(e) => setUploadFileObj(e.target.files?.[0] || null)}
                    className="w-full text-xs text-zinc-300 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-white hover:file:bg-zinc-700 cursor-pointer"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Version (e.g. 1.0.0)"
                    value={uploadVersion}
                    onChange={(e) => setUploadVersion(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  size="sm"
                  disabled={isUploadingFile || !uploadFileObj}
                  className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs rounded-xl"
                >
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  {isUploadingFile ? 'Uploading...' : 'Upload Asset File'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
