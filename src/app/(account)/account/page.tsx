import { redirect } from 'next/navigation';
import Link from 'next/link';
import { SessionService } from '@/services/auth/session.service';
import { EntitlementService } from '@/services/entitlement/entitlement.service';
import { Container } from '@/components/ui/container';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatFileSize } from '@/lib/utils';
import {
  Download,
  BookOpen,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  Package,
} from 'lucide-react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Digital Library | NOV.com',
  description: 'Access and download your purchased digital products, templates, and courses.',
};

export const dynamic = 'force-dynamic';

export default async function AccountLibraryPage() {
  const session = await SessionService.getCurrentSession();

  if (!session || !session.userId) {
    redirect('/login?redirect=/account');
  }

  const library = await EntitlementService.getCustomerLibrary(session.userId);

  return (
    <div className="py-12 md:py-16">
      <Container>
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-8 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Verified Entitlements
            </div>
            <h1 className="text-3xl font-extrabold text-white">My Digital Library</h1>
            <p className="text-xs text-slate-400 mt-1">
              All digital assets, license downloads, and lifetime updates linked to your account.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/products">
              <Button variant="secondary" size="sm" className="gap-1.5">
                <BookOpen className="w-4 h-4" />
                Browse More
              </Button>
            </Link>
          </div>
        </div>

        {/* Content */}
        {library.length === 0 ? (
          <div className="py-20 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 mb-4">
              <Package className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-white">Your library is currently empty</h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-2 leading-relaxed">
              When you complete a purchase on NOV.com, your digital products and secure signed downloads will instantly appear here.
            </p>
            <div className="mt-6">
              <Link href="/products">
                <Button size="md" className="gap-2 shadow-lg shadow-blue-500/20">
                  Explore Catalog
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            {library.map((item) => (
              <Card key={item.id} className="border-slate-800 bg-slate-900/60 overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                    {/* Left: Product Info */}
                    <div className="flex gap-4 items-start">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                        <Layers className="w-7 h-7" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-white">
                            <Link href={`/products/${item.product.slug}`} className="hover:text-blue-400 transition-colors">
                              {item.product.title}
                            </Link>
                          </h3>
                          <Badge variant="secondary" className="text-[10px]">
                            {item.product.productType}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            Acquired: {new Date(item.grantedAt).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                            Active Lifetime License
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Files List */}
                    <div className="w-full lg:w-96 space-y-2 pt-2 lg:pt-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                        Downloadable Assets ({item.product.files.length})
                      </p>

                      {item.product.files.length === 0 ? (
                        <p className="text-xs text-slate-500 italic">No files attached to this product yet.</p>
                      ) : (
                        item.product.files.map((file) => (
                          <div
                            key={file.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-colors"
                          >
                            <div className="min-w-0 pr-2">
                              <p className="text-xs font-semibold text-white truncate">{file.fileName}</p>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                <span>v{file.versionNumber}</span>
                                <span>•</span>
                                <span>{formatFileSize(file.fileSize)}</span>
                                {file.maxDownloads && (
                                  <>
                                    <span>•</span>
                                    <span>
                                      {file.customerDownloadCount}/{file.maxDownloads} downloads
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            <a
                              href={`/api/downloads/${file.id}`}
                              className="shrink-0"
                              download
                            >
                              <Button size="sm" variant="primary" className="gap-1.5 text-xs h-8 px-3">
                                <Download className="w-3.5 h-3.5" />
                                Download
                              </Button>
                            </a>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </Container>
    </div>
  );
}
