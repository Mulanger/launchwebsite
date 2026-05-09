import { siteOrigin } from '../../src/lib/seo.js';
import { staticSitemapPages } from '../../src/lib/sitemap-pages.js';
import { buildUrlSet } from '../../src/lib/sitemap-xml.js';

export const revalidate = 86400;

export function GET() {
  const now = new Date();
  const body = buildUrlSet(
    staticSitemapPages.map((page) => ({
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
