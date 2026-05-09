import { COMPARE_LAST_MODIFIED, comparePages } from '../../src/lib/compare-pages.js';
import { siteOrigin } from '../../src/lib/seo.js';
import { buildUrlSet } from '../../src/lib/sitemap-xml.js';

export const revalidate = 86400;

export function GET() {
  const lastmod = COMPARE_LAST_MODIFIED.slice(0, 10);
  const urls = [`${siteOrigin}/compare`, ...comparePages.map((page) => `${siteOrigin}${page.path}`)];

  const body = buildUrlSet(urls.map((url) => ({ url, lastmod })));

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}
