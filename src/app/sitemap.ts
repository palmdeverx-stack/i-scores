import type { MetadataRoute } from 'next';

const SITE_URL = 'https://e-kru.com';

const publicRoutes = [
  { path: '/', priority: 1, changeFrequency: 'weekly' as const },
  { path: '/privacy-policy', priority: 0.3, changeFrequency: 'yearly' as const },
  { path: '/terms-of-service', priority: 0.3, changeFrequency: 'yearly' as const },
  { path: '/service-agreement', priority: 0.3, changeFrequency: 'yearly' as const },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return publicRoutes.map(({ path, priority, changeFrequency }) => ({
    url: new URL(path, SITE_URL).toString(),
    changeFrequency,
    priority,
  }));
}
