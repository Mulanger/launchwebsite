import { QNA_LAST_MODIFIED, qnaItems } from '../../src/lib/qna.js';
import { siteOrigin } from '../../src/lib/seo.js';

export const revalidate = 86400;

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function GET() {
  const lastmod = QNA_LAST_MODIFIED.slice(0, 10);
  const urls = [
    `${siteOrigin}/qa`,
    ...qnaItems.map((item) => `${siteOrigin}${item.path}`),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `  <url>
    <loc>${escapeXml(url)}</loc>
    <lastmod>${lastmod}</lastmod>
  </url>`,
  )
  .join('\n')}
</urlset>
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}
