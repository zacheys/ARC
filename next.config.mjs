/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Vercel Blob public URLs
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
  // Note: the `eslint` config key was removed in Next.js 16 (`next build` no
  // longer runs ESLint). Linting is now a separate step if configured.
};

export default nextConfig;
