/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    externalDir: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    const raw = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
    const api = raw.replace(/\/+$/, "");
    return [
      // Proxy backend API to avoid CORS in browser
      { source: "/api/v1/:path*", destination: `${api}/api/v1/:path*` },
      // Proxy media (optional)
      { source: "/media/:path*", destination: `${api}/media/:path*` },
    ];
  },
};

export default nextConfig;

