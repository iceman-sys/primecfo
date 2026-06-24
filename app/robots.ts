import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.primecfo.ai';
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/', '/dashboard/', '/clients/', '/connect/', '/insights/', '/reports/', '/settings/'],
    },
    sitemap: `${base.replace(/\/$/, '')}/sitemap.xml`,
  };
}
