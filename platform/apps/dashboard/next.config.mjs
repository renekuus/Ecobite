/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow the dashboard to call the local API directly (dev only).
  // In production this would be replaced by a proper reverse-proxy setup.
  async rewrites() {
    return [];
  },
};

export default nextConfig;
