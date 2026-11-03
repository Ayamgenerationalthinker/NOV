import type { NextConfig } from "next";

// On Vercel, share links default to the project's production domain unless NEXT_PUBLIC_APP_URL is set.
const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
const publicAppUrl = process.env.NEXT_PUBLIC_APP_URL || (vercelHost ? `https://${vercelHost}` : undefined);

const nextConfig: NextConfig = {
  typescript: {
    // TypeScript check is run explicitly via `npx tsc --noEmit` in CI/CD and tests
    ignoreBuildErrors: false,
  },
  serverExternalPackages: ['@prisma/client', 'bcryptjs', 'pg'],
  images: {
    // Product covers come from the shop's own media route; see components/products/cover-image.tsx.
    localPatterns: [{ pathname: '/api/media/**', search: '' }],
    remotePatterns: [{ protocol: 'https', hostname: 'tomevari.vercel.app', pathname: '/api/media/**' }],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 2678400,
  },
  ...(publicAppUrl ? { env: { NEXT_PUBLIC_APP_URL: publicAppUrl } } : {}),
};

export default nextConfig;
