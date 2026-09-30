'use client';

import { useRouter } from 'next/navigation';
import { ProductForm } from '@/components/admin/product-form';

export function NewProductForm() {
  const router = useRouter();
  return (
    <ProductForm
      onSaved={(product, justPublished) => {
        router.replace(`/admin/products/${product.id}/edit?saved=${justPublished ? 'published' : 'draft'}`);
      }}
    />
  );
}
