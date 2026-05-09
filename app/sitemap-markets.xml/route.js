import { fetchMarketPageIndex, marketPathForSlug } from '../../src/lib/market-pages.js';
import { siteOrigin } from '../../src/lib/seo.js';
import { buildUrlSet } from '../../src/lib/sitemap-xml.js';

export const revalidate = 300;

export async function GET() {
  const now = new Date();
  let markets = [];

  try {
    markets = await fetchMarketPageIndex(250);
  } catch {
    // Keep the route valid even if the upstream whale API is temporarily unavailable.
  }

  const body = buildUrlSet(
    markets.map((market) => ({
      url: `${siteOrigin}${marketPathForSlug(market.slug)}`,
      lastmod: market.latestTradeTs ? new Date(market.latestTradeTs * 1000) : new Date(market.refreshedAt || now),
      changeFrequency: 'hourly',
      priority: 0.7,
    })),
  );

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}
