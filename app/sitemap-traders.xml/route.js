import { fetchTraderPageIndex, traderPathForWallet } from '../../src/lib/trader-pages.js';
import { siteOrigin } from '../../src/lib/seo.js';
import { buildUrlSet } from '../../src/lib/sitemap-xml.js';

export const revalidate = 900;

export async function GET() {
  const traders = await fetchTraderPageIndex(500);
  const fallbackLastmod = new Date().toISOString().slice(0, 10);

  const body = buildUrlSet(
    traders.map((trader) => ({
      url: `${siteOrigin}${traderPathForWallet(trader.proxyWallet)}`,
      lastmod: trader.refreshedAt ? new Date(trader.refreshedAt) : fallbackLastmod,
    })),
  );

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}
