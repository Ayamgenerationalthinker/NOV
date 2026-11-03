'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Box, Image as ImageIcon } from 'lucide-react';

// three.js is large: only download it when a product actually has a 3D model and the buyer opens it.
const Product3DViewer = dynamic(
  () => import('@/components/3d/product-3d-viewer').then((m) => m.Product3DViewer),
  { ssr: false, loading: () => <div className="aspect-square w-full animate-pulse rounded-[14px] bg-band" /> }
);

interface ProductMediaGalleryProps {
  coverImage?: string | null;
  galleryImages: string[];
  model3dUrl?: string | null;
  model3dPoster?: string | null;
  productTitle: string;
  /** Digital products: show the cover as a book-sized card instead of a full-width photo. */
  compact?: boolean;
}

export function ProductMediaGallery({
  coverImage,
  galleryImages,
  model3dUrl,
  model3dPoster,
  productTitle,
  compact = false,
}: ProductMediaGalleryProps) {
  const allImages = [coverImage, ...galleryImages].filter(Boolean) as string[];
  const [selectedImage, setSelectedImage] = useState<string>(allImages[0] || '');
  const [activeTab, setActiveTab] = useState<'PHOTO' | '3D'>('PHOTO');

  return (
    <div className="space-y-4">
      {/* Tab Switcher if 3D is available */}
      {model3dUrl && (
        <div className="flex items-center gap-1.5 p-1 bg-band border border-line rounded-[10px] w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('PHOTO')}
            className={`flex min-h-11 items-center gap-1.5 px-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'PHOTO'
                ? 'bg-ink text-white'
                : 'text-ink-soft hover:text-ink'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" /> High-Res Photography
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('3D')}
            className={`flex min-h-11 items-center gap-1.5 px-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === '3D'
                ? 'bg-ink text-white font-semibold'
                : 'text-ink-soft hover:text-ink'
            }`}
          >
            <Box className="w-3.5 h-3.5" /> Interactive 360° Inspection
          </button>
        </div>
      )}

      {/* Main Viewport */}
      {activeTab === '3D' && model3dUrl ? (
        <Product3DViewer
          modelUrl={model3dUrl}
          posterImage={model3dPoster || coverImage}
          productTitle={productTitle}
        />
      ) : (
        <div
          className={
            compact
              ? 'relative mx-auto flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-[#0b5cff] to-[#001650] p-5 sm:aspect-[3/4] lg:p-8'
              : 'relative aspect-[4/5] w-full overflow-hidden rounded-[14px] border border-line bg-band flex items-center justify-center'
          }
        >
          {selectedImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={selectedImage}
              alt={productTitle}
              className={compact ? "h-full w-auto max-w-full rounded-xl object-contain shadow-[0_24px_48px_-20px_rgba(0,0,0,0.6)]" : "w-full h-full object-contain"}
              fetchPriority="high"
            />
          ) : (
            <div className="text-center text-ink-soft p-8">
              <ImageIcon className="w-12 h-12 mx-auto mb-2" />
              <p className="text-sm">No image provided</p>
            </div>
          )}
        </div>
      )}

      {/* Thumbnail Strip */}
      {allImages.length > 1 && (
        <div className={'flex items-center gap-3 overflow-x-auto pb-2'}>
          {allImages.map((img, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setSelectedImage(img);
                setActiveTab('PHOTO');
              }}
              className={`relative w-20 h-20 rounded-[10px] overflow-hidden border-2 flex-shrink-0 transition-colors ${
                activeTab === 'PHOTO' && selectedImage === img
                  ? 'border-brand'
                  : 'border-line hover:border-ink'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt={`${productTitle} thumbnail ${idx + 1}`} loading="lazy" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
