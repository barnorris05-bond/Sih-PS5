import type { NextConfig } from 'next';
import path from 'node:path';

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data:;
  font-src 'self' data:;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'self';
  worker-src 'self' blob:;
  connect-src 'self';
`
  .replace(/\s{2,}/g, ' ')
  .trim();

const nextConfig: NextConfig = {
  transpilePackages: ['@evidencegraph/domain', '@evidencegraph/engine', '@evidencegraph/fixtures'],
  serverExternalPackages: ['yaml'],
  outputFileTracingRoot: path.join(__dirname, '..', '..'),
  outputFileTracingIncludes: {
    '/api/**': ['../../rules/aph-2024-27/**'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'Content-Security-Policy',
            value: cspHeader,
          },
        ],
      },
    ];
  },
  webpack(config) {
    config.resolve ??= {};
    config.resolve.extensionAlias ??= {};
    (config.resolve.extensionAlias as Record<string, string[]>)['.js'] = ['.ts', '.tsx', '.js'];
    return config;
  },
};

export default nextConfig;
