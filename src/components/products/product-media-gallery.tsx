'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Box, Image as ImageIcon } from 'lucide-react';

// three.js is large: only download it when a product actually has a 3D model and the buyer opens it.
const Product3DViewer = dynamic(
  () => import('@/components/3d/product-3d-viewer').then((m) => m.Product3DViewer),
  { ssr: false, loading: () => <div className="aspect-square w-full animate-pulse rounded-3xl bg-zinc-900" /> }
);

interface ProductMediaGalleryProps {
  coverImage?: string | null;
  galleryImages: string[];
  model3dUrl?: string | null;
  model3dPoster?: string | null;
  productTitle: string;
}

export function ProductMediaGallery({
  coverImage,
  galleryImages,
  model3dUrl,
  model3dPoster,
  productTitle,
}: ProductMediaGalleryProps) {
  const allImages = [coverImage, ...galleryImages].filter(Boolean) as string[];
  const [selectedImage, setSelectedImage] = useState<string>(allImages[0] || '');
  const [activeTab, setActiveTab] = useState<'PHOTO' | '3D'>('PHOTO');

  return (
    <div className="space-y-4">
      {/* Tab Switcher if 3D is available */}
      {model3dUrl && (
        <div className="flex items-center gap-1.5 p-1 bg-zinc-900 border border-zinc-800 rounded-xl w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('PHOTO')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'PHOTO'
                ? 'bg-zinc-800 text-stone-100 shadow-sm'
                : 'text-zinc-400 hover:text-stone-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" /> High-Res Photography
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('3D')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === '3D'
                ? 'bg-stone-200 text-zinc-950 font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-stone-200'
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
        <div className="relative aspect-[4/5] w-full overflow-hidden bg-stone-900 md:rounded-3xl md:border md:border-zinc-800/80 flex items-center justify-center">
          {selectedImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={selectedImage}
              alt={productTitle}
              className="w-full h-full object-cover"
              fetchPriority="high"
            />
          ) : (
            <div className="text-center text-zinc-600 p-8">
              <ImageIcon className="w-12 h-12 mx-auto mb-2" />
              <p className="text-xs">No image provided</p>
            </div>
          )}
        </div>
      )}

      {/* Thumbnail Strip */}
      {allImages.length > 1 && (
        <div className="flex items-center gap-3 overflow-x-auto px-4 pb-2 md:px-0">
          {allImages.map((img, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setSelectedImage(img);
                setActiveTab('PHOTO');
              }}
              className={`relative w-20 h-20 rounded-2xl overflow-hidden border-2 flex-shrink-0 transition-all ${
                activeTab === 'PHOTO' && selectedImage === img
                  ? 'border-emerald-500 shadow-md'
                  : 'border-zinc-800 opacity-60 hover:opacity-100'
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
