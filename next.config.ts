import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // TypeScript check is run explicitly via `npx tsc --noEmit` in CI/CD and tests
    ignoreBuildErrors: false,
  },
  serverExternalPackages: ['@prisma/client', 'bcryptjs', 'pg'],
};

export default nextConfig;
