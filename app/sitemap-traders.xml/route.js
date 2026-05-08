import { fetchTraderPageIndex, traderPathForWallet } from '../../src/lib/trader-pages.js';
import { siteOrigin } from '../../src/lib/seo.js';

export const revalidate = 900;

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const traders = await fetchTraderPageIndex(500);
  const fallbackLastmod = new Date().toISOString().slice(0, 10);

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${traders
  .map(
    (trader) => {
      const lastmod = trader.refreshedAt
        ? new Date(trader.refreshedAt).toISOString().slice(0, 10)
        : fallbackLastmod;
      return `  <url>
    <loc>${escapeXml(`${siteOrigin}${traderPathForWallet(trader.proxyWallet)}`)}</loc>
    <lastmod>${lastmod}</lastmod>
  </url>`;
    },
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
