import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@tokamak-pilot/shared'],
};

export default nextConfig;
