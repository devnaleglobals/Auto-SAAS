/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig = {
  poweredByHeader: false,
  async headers() { return [{ source: '/:path*', headers: securityHeaders }]; },
  images: { remotePatterns: [{ protocol: 'https', hostname: '**.cdninstagram.com' }, { protocol: 'https', hostname: '**.fbcdn.net' }] },
};
export default nextConfig;
