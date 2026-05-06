import { fetchMarketPageIndex, marketPathForSlug } from '../src/lib/market-pages.js';
import { QNA_LAST_MODIFIED, qnaItems } from '../src/lib/qna.js';
import { siteOrigin } from '../src/lib/seo.js';
import { fetchTraderPageIndex, traderPathForWallet } from '../src/lib/trader-pages.js';

export const revalidate = 300;

const staticPages = [
  { path: '/', changeFrequency: 'daily', priority: 1 },
  { path: '/about', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/leaderboard', changeFrequency: 'daily', priority: 0.9 },
  { path: '/qa', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/privacy', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/terms', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/delete-data', changeFrequency: 'yearly', priority: 0.2 },
];

export default async function sitemap() {
  const now = new Date();
  const entries = staticPages.map((page) => ({
    url: `${siteOrigin}${page.path}`,
    lastModified: now,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));

  entries.push(
    ...qnaItems.map((item) => ({
      url: `${siteOrigin}${item.path}`,
      lastModified: new Date(QNA_LAST_MODIFIED),
      changeFrequency: 'monthly',
      priority: 0.62,
    })),
  );

  try {
    const markets = await fetchMarketPageIndex(250);
    entries.push(...markets.map((market) => ({
      url: `${siteOrigin}${marketPathForSlug(market.slug)}`,
      lastModified: market.latestTradeTs ? new Date(market.latestTradeTs * 1000) : new Date(market.refreshedAt || now),
      changeFrequency: 'hourly',
      priority: 0.7,
    })));
  } catch {
    // Keep the sitemap available even if the upstream whale API is temporarily unavailable.
  }

  try {
    const traders = await fetchTraderPageIndex(100);
    entries.push(...traders.map((trader) => ({
      url: `${siteOrigin}${traderPathForWallet(trader.proxyWallet)}`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: trader.bestRank && trader.bestRank <= 25 ? 0.72 : 0.58,
    })));
  } catch {
    // Keep the sitemap available even if the upstream leaderboard API is temporarily unavailable.
  }

  return entries;
}
