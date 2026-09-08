import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { FileQuestion, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <Container className="py-24">
      <div className="mx-auto max-w-md text-center">
        <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-slate-800 text-slate-400 mb-6">
          <FileQuestion className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-bold text-white">Page Not Found</h1>
        <p className="mt-3 text-sm text-slate-400">
          The page or digital product resource you are looking for does not exist or has been moved.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link href="/">
            <Button variant="primary" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Return Home
            </Button>
          </Link>
          <Link href="/products">
            <Button variant="secondary">Browse Catalog</Button>
          </Link>
        </div>
      </div>
    </Container>
  );
}
