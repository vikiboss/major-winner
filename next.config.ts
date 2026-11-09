import { execSync } from 'node:child_process'

import type { NextConfig } from 'next'

const pkgVersion = process.env.npm_package_version || '0.0.0'
const gitCommitHash = execSync('git rev-parse --short HEAD').toString().trim()

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
      BUILD_VERSION: `${pkgVersion}-${gitCommitHash}`,
      BUILD_AT: Date.now().toString(),
    },
  },
}

export default nextConfig
