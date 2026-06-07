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
  compiler: {
    define: {
      BUILD_AT: Date.now().toString(),
    },
  },
}

export default nextConfig
