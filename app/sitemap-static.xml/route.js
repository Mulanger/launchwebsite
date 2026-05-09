import { siteOrigin } from '../../src/lib/seo.js';
import { buildUrlSet } from '../../src/lib/sitemap-xml.js';

export const revalidate = 86400;

const staticPages = [
  { path: '/', changeFrequency: 'daily', priority: 1 },
  { path: '/about', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/leaderboard', changeFrequency: 'daily', priority: 0.9 },
  { path: '/privacy', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/terms', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/delete-data', changeFrequency: 'yearly', priority: 0.2 },
];

export function GET() {
  const now = new Date();
  const body = buildUrlSet(
    staticPages.map((page) => ({
      url: `${siteOrigin}${page.path}`,
      lastmod: now,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    })),
  );

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}
