import { fetchNewsIndex, newsPathForSlug, normalizeNewsDate } from '../../src/lib/news-pages.js';
import { siteOrigin } from '../../src/lib/seo.js';
import { escapeXml } from '../../src/lib/sitemap-xml.js';

export const revalidate = 300;

export async function GET() {
  const articles = await fetchNewsIndex(1000);
  const cutoffMs = Date.now() - 48 * 60 * 60 * 1000;
  const body = buildNewsUrlSet(
    articles.filter((article) => normalizeNewsDate(article.publishedAt).getTime() >= cutoffMs),
  );

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}

function buildNewsUrlSet(articles) {
  const urls = articles
    .map((article) => {
      const published = normalizeNewsDate(article.publishedAt);
      return [
        '  <url>',
        `    <loc>${escapeXml(`${siteOrigin}${newsPathForSlug(article.slug)}`)}</loc>`,
        '    <news:news>',
        '      <news:publication>',
        '        <news:name>Polywhale</news:name>',
        '        <news:language>en</news:language>',
        '      </news:publication>',
        `      <news:publication_date>${published.toISOString()}</news:publication_date>`,
        `      <news:title>${escapeXml(article.title)}</news:title>`,
        '    </news:news>',
        '  </url>',
      ].join('\n');
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n${urls}\n</urlset>`;
}

