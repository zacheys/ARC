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
  eslint: {
    // Keep production builds unblocked by lint; run `npm run lint` separately.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
