'use client';

import * as React from 'react';
import { Container } from '@/components/ui/container';
import { ErrorState } from '@/components/feedback/error-state';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Log error to monitoring / audit console
    console.error('Unhandled runtime error:', error);
  }, [error]);

  return (
    <Container className="py-20">
      <ErrorState
        title="Application Error"
        message="An unexpected error occurred while rendering this view. Our team has been notified."
        onRetry={() => reset()}
        resetButtonText="Reload View"
      />
    </Container>
  );
}
