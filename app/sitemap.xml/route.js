import { COMPARE_LAST_MODIFIED } from '../../src/lib/compare-pages.js';
import { QNA_LAST_MODIFIED } from '../../src/lib/qna.js';
import { siteOrigin } from '../../src/lib/seo.js';
import { buildSitemapIndex } from '../../src/lib/sitemap-xml.js';

export const revalidate = 300;

export function GET() {
  const now = new Date();
  const body = buildSitemapIndex([
    { url: `${siteOrigin}/sitemap-static.xml`, lastmod: now },
    { url: `${siteOrigin}/sitemap-markets.xml`, lastmod: now },
    { url: `${siteOrigin}/sitemap-traders.xml`, lastmod: now },
    { url: `${siteOrigin}/sitemap-qa.xml`, lastmod: QNA_LAST_MODIFIED },
    { url: `${siteOrigin}/sitemap-compare.xml`, lastmod: COMPARE_LAST_MODIFIED },
  ]);

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}
