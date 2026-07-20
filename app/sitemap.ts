import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.primecfo.ai').replace(/\/$/, '');
  const now = new Date();
  const publicPaths = ['', '/pricing', '/about', '/contact', '/security', '/privacy', '/terms', '/login', '/signup'];

  return publicPaths.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: path === '' ? 'weekly' : 'monthly',
    priority: path === '' ? 1 : 0.7,
  }));
}
