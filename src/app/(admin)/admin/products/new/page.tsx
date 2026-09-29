import { Metadata } from 'next';
import { ProductWizard } from '@/components/admin/product-wizard';

export const metadata: Metadata = {
  title: 'Create Product — NOV Console',
};

export default function NewProductPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Add New Product</h1>
        <p className="text-xs text-zinc-400 mt-1">
          Create physical or digital products, configure SKU variants, inventory stock, and interactive 3D experiences.
        </p>
      </div>

      <ProductWizard />
    </div>
  );
}
