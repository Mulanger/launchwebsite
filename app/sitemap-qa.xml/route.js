import { QNA_LAST_MODIFIED, qnaItems } from '../../src/lib/qna.js';
import { siteOrigin } from '../../src/lib/seo.js';
import { buildUrlSet } from '../../src/lib/sitemap-xml.js';

export const revalidate = 86400;

export function GET() {
  const lastmod = QNA_LAST_MODIFIED.slice(0, 10);
  const urls = [
    `${siteOrigin}/qa`,
    ...qnaItems.map((item) => `${siteOrigin}${item.path}`),
  ];

  const body = buildUrlSet(urls.map((url) => ({ url, lastmod })));

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}
