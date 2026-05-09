/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    const immutableCache = 'public, max-age=31536000, immutable';
    return [
      {
        source: '/assets/:path*',
        headers: [{ key: 'Cache-Control', value: immutableCache }],
      },
      {
        source: '/favicon.png',
        headers: [{ key: 'Cache-Control', value: immutableCache }],
      },
      {
        source: '/site.webmanifest',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }],
      },
    ];
  },
};

export default nextConfig;
