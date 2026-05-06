import { fetchWhalePagesForMarketScan, isQualifiedMarket, marketPathForSlug } from '../src/lib/market-pages.js';
import { seoByPath, siteOrigin } from '../src/lib/seo.js';

export const revalidate = 300;

const staticPages = [
  { path: '/', changeFrequency: 'daily', priority: 1 },
  { path: '/about', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/leaderboard', changeFrequency: 'daily', priority: 0.9 },
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

  try {
    const whales = await fetchWhalePagesForMarketScan();
    entries.push(...buildMarketSitemapEntries(whales));
  } catch {
    // Keep the sitemap available even if the upstream whale API is temporarily unavailable.
  }

  return entries;
}

function buildMarketSitemapEntries(whales) {
  const bySlug = new Map();

  for (const trade of whales) {
    const slug = trade?.market?.slug;
    if (!slug) continue;

    const current = bySlug.get(slug) || {
      slug,
      whaleTradeCount: 0,
      whaleVolume: 0,
      latestTradeTs: 0,
    };

    current.whaleTradeCount += 1;
    current.whaleVolume += Number(trade.usdSize || 0);
    current.latestTradeTs = Math.max(current.latestTradeTs, Number(trade.timestamp || 0));
    bySlug.set(slug, current);
  }

  return [...bySlug.values()]
    .filter(isQualifiedMarket)
    .sort((a, b) => b.whaleVolume - a.whaleVolume)
    .slice(0, 250)
    .map((market) => ({
      url: `${siteOrigin}${marketPathForSlug(market.slug)}`,
      lastModified: market.latestTradeTs ? new Date(market.latestTradeTs * 1000) : new Date(),
      changeFrequency: 'hourly',
      priority: 0.7,
    }));
}
