/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Listing photos come from Supabase Storage / Unsplash; allow remote images.
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
};

export default nextConfig;
