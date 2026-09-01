import type { NextConfig } from "next";

import createMDX from '@next/mdx';

const nextConfig: NextConfig = {
  pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],
  reactStrictMode: true,
  poweredByHeader: false,
  typescript: { ignoreBuildErrors: true },
  // framer-motion is a large barrel imported by nearly every landing section;
  // the icon/chart libs below are already optimized by Next's defaults.
  experimental: {
    optimizePackageImports: ['framer-motion'],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'praecisai-production.up.railway.app',
      },
      // Custom API subdomain: kept alongside the Railway host so switching
      // NEXT_PUBLIC_API_BASE_URL between the two needs no code change.
      {
        protocol: 'https',
        hostname: 'api.praecisai.in',
      },
    ],
  },
  async rewrites() {
    // Same-origin proxy. API_PROXY_TARGET is server-side only, so this keeps
    // working when NEXT_PUBLIC_API_BASE_URL is set to "" to make the browser
    // call /api/v1 on this domain instead of the backend host directly.
    const target =
      process.env.API_PROXY_TARGET ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      'http://localhost:3001';
    return [
      {
        source: '/api/:path*',
        destination: `${target}/api/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

const withMDX = createMDX({
  // Add markdown plugins here, as desired
})

// VERCEL ENVIRONMENT VARIABLES
// Region: bom1 (Mumbai) for India-optimized latency.
//
// NEXT_PUBLIC_API_BASE_URL controls the host the BROWSER calls. Pointing it at
// *.up.railway.app made some Indian ISP resolvers fail with
// ERR_NAME_NOT_RESOLVED, which surfaced as random "API not responding" screens.
// Two safe alternatives:
//
//   1. Custom API subdomain (preferred: no proxy limits)
//        NEXT_PUBLIC_API_BASE_URL = https://api.praecisai.in
//      plus a CNAME api -> the Railway-provided target, added as a custom
//      domain in Railway. The browser then only resolves praecisai.in, which
//      it already resolves to load the site.
//
//   2. Same-origin proxy (no DNS work, but request bodies pass through Vercel)
//        NEXT_PUBLIC_API_BASE_URL = ""   (browser calls /api/v1 on this domain)
//        API_PROXY_TARGET         = https://praecisai-production.up.railway.app
//      Keep an eye on large Excel uploads: Vercel caps proxied request bodies
//      (~4.5 MB), so option 1 is the better fit for the Import Center.

export default withMDX(nextConfig);
