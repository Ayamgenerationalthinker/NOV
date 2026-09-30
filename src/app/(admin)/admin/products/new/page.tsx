import { Metadata } from 'next';
import { NewProductForm } from './new-product-form';

export const metadata: Metadata = {
  title: 'New product — NOV Console',
};

export default function NewProductPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">New product</h1>
        <p className="text-sm text-zinc-400 mt-1">Save it as a draft, or publish it to get a shareable link.</p>
      </div>
      <NewProductForm />
    </div>
  );
}
