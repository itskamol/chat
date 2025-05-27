/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: false, // Ensures ESLint runs during build
  },
  typescript: {
    ignoreBuildErrors: false, // Ensures TypeScript errors fail the build
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
