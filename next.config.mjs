/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'Content-Security-Policy', value: "base-uri 'self'; object-src 'none'; frame-ancestors 'none'; upgrade-insecure-requests" },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
];
const svgImageSecurityHeaders = [
  { key: 'Content-Security-Policy', value: "sandbox; default-src 'none'; img-src data: https:; style-src 'unsafe-inline'" },
];

const nextConfig = {
  poweredByHeader: false,
  async headers() {
    const immutableCache = 'public, max-age=31536000, immutable';
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        source: '/news/:slug/image.svg',
        headers: svgImageSecurityHeaders,
      },
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
