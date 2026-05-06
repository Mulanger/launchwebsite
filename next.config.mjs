/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const apiTarget = process.env.API_BASE_URL || 'https://whaleserver-production.up.railway.app';
    return [
      {
        source: '/api/:path*',
        destination: `${apiTarget.replace(/\/$/, '')}/:path*`,
      },
    ];
  },
};

export default nextConfig;
