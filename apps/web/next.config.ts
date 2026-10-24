import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  transpilePackages: ['@evidencegraph/domain', '@evidencegraph/engine', '@evidencegraph/fixtures'],
  serverExternalPackages: ['yaml'],
  // Point Next.js to the monorepo root so it picks up the correct pnpm lockfile
  outputFileTracingRoot: path.join(__dirname, '..', '..'),
  outputFileTracingIncludes: {
    '/api/**': ['../../rules/aph-2024-27/**'],
  },
  webpack(config) {
    // ESM packages use `.js` extension for TypeScript source imports.
    // Tell webpack to also look for `.ts` when it sees `.js`
    config.resolve ??= {};
    config.resolve.extensionAlias ??= {};
    (config.resolve.extensionAlias as Record<string, string[]>)['.js'] = ['.ts', '.tsx', '.js'];
    return config;
  },
};

export default nextConfig;
