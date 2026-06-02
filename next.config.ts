import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'export',
  images: {
    unoptimized: true,
  },
  reactCompiler: {
    compilationMode: 'all',
  },
}

export default nextConfig
