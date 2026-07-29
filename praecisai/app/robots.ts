import type { MetadataRoute } from 'next';

const SITE_URL = 'https://www.praecisai.in';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Private / authenticated surfaces — no SEO value, keep them out of the index.
        disallow: ['/dashboard', '/admin', '/demo-dashboard', '/auth', '/login', '/signup'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
