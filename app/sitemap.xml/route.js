import { COMPARE_LAST_MODIFIED, comparePages } from '../../src/lib/compare-pages.js';
import { fetchMarketPageIndex, marketPathForSlug } from '../../src/lib/market-pages.js';
import { QNA_LAST_MODIFIED, qnaItems } from '../../src/lib/qna.js';
import { fetchNewsIndex, newsPathForSlug, normalizeNewsDate } from '../../src/lib/news-pages.js';
import { siteOrigin } from '../../src/lib/seo.js';
import { staticSitemapPages } from '../../src/lib/sitemap-pages.js';
import { buildUrlSet } from '../../src/lib/sitemap-xml.js';
import { fetchTraderPageIndex, traderPathForWallet } from '../../src/lib/trader-pages.js';

export const revalidate = 300;

export async function GET() {
  const now = new Date();
  const entries = [
    ...staticSitemapPages.map((page) => ({
      url: `${siteOrigin}${page.path}`,
      lastmod: now,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    })),
    { url: `${siteOrigin}/qa`, lastmod: QNA_LAST_MODIFIED, changeFrequency: 'weekly', priority: 0.8 },
    ...qnaItems.map((item) => ({
      url: `${siteOrigin}${item.path}`,
      lastmod: QNA_LAST_MODIFIED,
      changeFrequency: 'monthly',
      priority: 0.62,
    })),
    { url: `${siteOrigin}/compare`, lastmod: COMPARE_LAST_MODIFIED, changeFrequency: 'monthly', priority: 0.74 },
    ...comparePages.map((page) => ({
      url: `${siteOrigin}${page.path}`,
      lastmod: COMPARE_LAST_MODIFIED,
      changeFrequency: 'monthly',
      priority: 0.68,
    })),
  ];

  try {
    const markets = await fetchMarketPageIndex(250);
    entries.push(
      ...markets.map((market) => ({
        url: `${siteOrigin}${marketPathForSlug(market.slug)}`,
        lastmod: market.latestTradeTs ? new Date(market.latestTradeTs * 1000) : new Date(market.refreshedAt || now),
        changeFrequency: 'hourly',
        priority: 0.7,
      })),
    );
  } catch {
    // Keep the root sitemap available even if the upstream whale API is temporarily unavailable.
  }

  try {
    const traders = await fetchTraderPageIndex(500);
    entries.push(
      ...traders.map((trader) => ({
        url: `${siteOrigin}${traderPathForWallet(trader.proxyWallet)}`,
        lastmod: trader.refreshedAt ? new Date(trader.refreshedAt) : now,
        changeFrequency: 'hourly',
        priority: trader.bestRank && trader.bestRank <= 25 ? 0.72 : 0.58,
      })),
    );
  } catch {
    // Keep the root sitemap available even if the upstream whale API is temporarily unavailable.
  }

  try {
    const articles = await fetchNewsIndex(1000);
    entries.push(
      ...articles.map((article) => ({
        url: `${siteOrigin}${newsPathForSlug(article.slug)}`,
        lastmod: normalizeNewsDate(article.updatedAt || article.publishedAt),
        changeFrequency: 'daily',
        priority: article.kind === 'whale_loss' ? 0.76 : 0.72,
      })),
    );
  } catch {
    // Keep the root sitemap available even if the autonews service is temporarily unavailable.
  }

  const body = buildUrlSet(entries);

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}
