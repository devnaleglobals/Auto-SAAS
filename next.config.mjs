/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(self "https://api.razorpay.com" "https://checkout.razorpay.com")' },
  // Limited policy that can't break Next.js or Razorpay Checkout: no framing of our pages, no plugins,
  // no <base> hijacking, and forms only post to us or Razorpay.
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self' https://api.razorpay.com https://checkout.razorpay.com; upgrade-insecure-requests" },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
];

const nextConfig = {
  poweredByHeader: false,
  async headers() { return [{ source: '/:path*', headers: securityHeaders }]; },
  images: { remotePatterns: [{ protocol: 'https', hostname: '**.cdninstagram.com' }, { protocol: 'https', hostname: '**.fbcdn.net' }] },
};
export default nextConfig;
