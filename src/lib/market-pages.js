import { siteOrigin } from './seo.js';
import {
  fetchPublicMarketPage,
  fetchPublicMarketPageIndex,
  fetchServerJson,
  isApiNotFoundError,
} from './server-api.js';

const marketScanPageLimit = 100;
const marketScanMaxPages = 8;
export const marketIndexMinTrades = 3;
export const marketIndexMinVolume = 50000;

let marketPageIndexCache = [];

export function marketPathForSlug(slug) {
  if (!slug) return null;
  return `/market/${encodeURIComponent(slug)}`;
}

export function marketUrlForSlug(slug) {
  const path = marketPathForSlug(slug);
  return path ? `${siteOrigin}${path}` : null;
}

export function isQualifiedMarket(stats) {
  return (
    Number(stats?.whaleTradeCount || 0) >= marketIndexMinTrades &&
    Number(stats?.whaleVolume || 0) >= marketIndexMinVolume
  );
}

export async function fetchWhalePagesForMarketScan() {
  const items = [];
  let cursor = '';

  for (let page = 0; page < marketScanMaxPages; page += 1) {
    const params = new URLSearchParams({
      limit: String(marketScanPageLimit),
      minUsd: '10000',
    });
    if (cursor) params.set('cursor', cursor);

    const data = await fetchServerJson(`/v1/whales?${params.toString()}`, {
      next: { revalidate: 300 },
    });

    if (Array.isArray(data?.items)) {
      items.push(...data.items);
    }

    cursor = data?.nextCursor || '';
    if (!cursor) break;
  }

  return items;
}

export async function fetchMarketPageData(slug) {
  const decodedSlug = decodeURIComponent(String(slug || '')).trim();
  if (!decodedSlug) return null;

  let snapshotError = null;

  try {
    const apiData = await fetchMarketPageDataFromSnapshotApi(decodedSlug);
    if (apiData) return apiData;
  } catch (error) {
    const indexFallback = await fetchMarketPageDataFromIndex(decodedSlug).catch(() => null);
    if (indexFallback) return indexFallback;

    if (!isApiNotFoundError(error)) {
      snapshotError = error;
    }
  }

  let whales = [];

  try {
    whales = await fetchWhalePagesForMarketScan();
  } catch (error) {
    throw snapshotError || error;
  }

  const marketTrades = whales.filter((trade) => trade?.market?.slug === decodedSlug);
  if (!marketTrades.length) {
    if (snapshotError) throw snapshotError;
    return null;
  }

  const newestFirst = [...marketTrades].sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0));
  const market = buildMarketSummary(newestFirst[0], decodedSlug);
  const stats = buildMarketStats(newestFirst);
  const topWallets = buildMarketWalletLeaderboard(newestFirst);
  const relatedMarkets = buildRelatedMarkets(whales, market, decodedSlug);
  const indexable = isQualifiedMarket(stats);

  return {
    market,
    stats,
    recentTrades: newestFirst.slice(0, 50),
    topWallets,
    relatedMarkets,
    topWhalesToday: [],
    seo: {
      indexable,
      canonicalUrl: marketUrlForSlug(decodedSlug),
      reason: indexable
        ? `${marketIndexMinTrades}+ whale trades and $${marketIndexMinVolume.toLocaleString()}+ tracked whale volume`
        : 'Known market below current indexing thresholds',
    },
  };
}

export async function fetchMarketPageIndex(limit = 250) {
  try {
    const data = await fetchPublicMarketPageIndex(limit);
    if (Array.isArray(data?.items)) {
      marketPageIndexCache = data.items
        .filter(isMarketIndexItemIndexable)
        .slice(0, limit);
      return marketPageIndexCache;
    }
  } catch {
    // Rollout safety: while the API server deploys, sitemap can still use whale-feed scanning.
    if (marketPageIndexCache.length) return marketPageIndexCache.slice(0, limit);
  }

  let whales = [];
  try {
    whales = await fetchWhalePagesForMarketScan();
  } catch (error) {
    if (marketPageIndexCache.length) return marketPageIndexCache.slice(0, limit);
    throw error;
  }
  const bySlug = new Map();

  for (const trade of whales) {
    const slug = trade?.market?.slug;
    if (!slug) continue;

    const current = bySlug.get(slug) || {
      slug,
      title: trade.market?.title || slug,
      whaleTradeCount: 0,
      whaleVolume: 0,
      latestTradeTs: 0,
      refreshedAt: new Date().toISOString(),
    };
    current.whaleTradeCount += 1;
    current.whaleVolume += Number(trade.usdSize || 0);
    current.latestTradeTs = Math.max(current.latestTradeTs, Number(trade.timestamp || 0));
    bySlug.set(slug, current);
  }

  marketPageIndexCache = [...bySlug.values()]
    .filter(isQualifiedMarket)
    .sort((a, b) => b.whaleVolume - a.whaleVolume)
    .slice(0, limit);
  return marketPageIndexCache;
}

async function fetchMarketPageDataFromSnapshotApi(slug) {
  const data = await fetchPublicMarketPage(slug);

  if (!data?.market?.slug) return null;
  const indexable = Boolean(data.seo?.indexable) || isQualifiedMarket(data.stats);

  return {
    market: data.market,
    stats: data.stats,
    recentTrades: Array.isArray(data.recentTrades) ? data.recentTrades : [],
    topWallets: Array.isArray(data.topWallets) ? data.topWallets : [],
    relatedMarkets: Array.isArray(data.relatedMarkets) ? data.relatedMarkets : [],
    topWhalesToday: [],
    seo: {
      indexable,
      canonicalUrl: marketUrlForSlug(data.market.slug),
      reason: data.seo?.reason || 'Market page snapshot from Polywhale enrichment worker',
    },
  };
}

async function fetchMarketPageDataFromIndex(slug) {
  const markets = await fetchMarketPageIndex(250);
  const item = markets.find((market) => market?.slug === slug);
  if (!item) return null;

  const stats = {
    whaleVolume: Number(item.whaleVolume || 0),
    whaleTradeCount: Number(item.whaleTradeCount || 0),
    uniqueWhales: Number(item.uniqueWhales || 0),
    biggestTradeUsd: Number(item.biggestTradeUsd || 0),
    latestTradeTs: Number(item.latestTradeTs || 0),
  };

  return {
    market: {
      slug: item.slug,
      conditionId: item.conditionId || '',
      title: item.title || item.slug,
      icon: item.icon || item.image || item.imageUrl || '',
      category: item.category || '',
      eventSlug: item.eventSlug || '',
      polymarketUrl: item.polymarketUrl || '',
      yesPriceCents: item.yesPriceCents,
      noPriceCents: item.noPriceCents,
    },
    stats,
    recentTrades: [],
    topWallets: [],
    relatedMarkets: [],
    topWhalesToday: [],
    seo: {
      indexable: true,
      canonicalUrl: marketUrlForSlug(item.slug),
      reason: 'Indexable market from the Polywhale market sitemap snapshot',
    },
  };
}

function isMarketIndexItemIndexable(item) {
  return Boolean(item?.slug) && isQualifiedMarket(item);
}

function buildMarketSummary(trade, slug) {
  const market = trade?.market || {};
  return {
    slug,
    conditionId: market.conditionId || '',
    title: market.title || 'Polymarket market',
    icon: market.icon || market.image || market.imageUrl || '',
    category: market.category || '',
    eventSlug: market.eventSlug || '',
    polymarketUrl: market.polymarketUrl || trade?.polymarketUrl || '',
    yesPriceCents: market.yesPriceCents,
    noPriceCents: market.noPriceCents,
  };
}

function buildMarketStats(trades) {
  const whaleVolume = trades.reduce((sum, trade) => sum + Number(trade.usdSize || 0), 0);
  const uniqueWhales = new Set(trades.map((trade) => trade.trader?.proxyWallet).filter(Boolean)).size;
  const biggestTradeUsd = trades.reduce((max, trade) => Math.max(max, Number(trade.usdSize || 0)), 0);
  const latestTradeTs = trades.reduce((max, trade) => Math.max(max, Number(trade.timestamp || 0)), 0);

  return {
    whaleVolume,
    whaleTradeCount: trades.length,
    uniqueWhales,
    biggestTradeUsd,
    latestTradeTs,
  };
}

function buildMarketWalletLeaderboard(trades) {
  const byWallet = new Map();

  for (const trade of trades) {
    const wallet = trade.trader?.proxyWallet;
    if (!wallet) continue;
    const current = byWallet.get(wallet) || {
      proxyWallet: wallet,
      displayName: trade.trader?.displayName || null,
      pseudonym: trade.trader?.pseudonym || null,
      profileImage: trade.trader?.profileImage || null,
      volume: 0,
      tradeCount: 0,
    };
    current.volume += Number(trade.usdSize || 0);
    current.tradeCount += 1;
    current.displayName ||= trade.trader?.displayName || null;
    current.pseudonym ||= trade.trader?.pseudonym || null;
    current.profileImage ||= trade.trader?.profileImage || null;
    byWallet.set(wallet, current);
  }

  return [...byWallet.values()]
    .sort((a, b) => b.volume - a.volume)
    .map((wallet, index) => ({
      ...wallet,
      rank: index + 1,
      avgTrade: wallet.volume / Math.max(1, wallet.tradeCount),
    }));
}

function buildRelatedMarkets(allTrades, market, currentSlug) {
  const bySlug = new Map();
  const eventSlug = market.eventSlug || '';
  const titleTokens = tokenizeMarketTitle(market.title);

  for (const trade of allTrades) {
    const candidate = trade.market || {};
    if (!candidate.slug || candidate.slug === currentSlug) continue;

    const existing = bySlug.get(candidate.slug) || {
      slug: candidate.slug,
      title: candidate.title || 'Polymarket market',
      icon: candidate.icon || candidate.image || candidate.imageUrl || '',
      eventSlug: candidate.eventSlug || '',
      whaleVolume: 0,
      whaleTradeCount: 0,
      score: 0,
    };

    existing.whaleVolume += Number(trade.usdSize || 0);
    existing.whaleTradeCount += 1;
    if (eventSlug && candidate.eventSlug === eventSlug) existing.score += 5;
    existing.score += sharedTokenScore(titleTokens, tokenizeMarketTitle(candidate.title || ''));
    bySlug.set(candidate.slug, existing);
  }

  return [...bySlug.values()]
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || b.whaleVolume - a.whaleVolume)
    .slice(0, 6);
}

function tokenizeMarketTitle(title) {
  return new Set(
    String(title || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((token) => token.length >= 4 && !['will', 'price', 'above', 'below', 'market', 'returns', 'normal'].includes(token))
  );
}

function sharedTokenScore(a, b) {
  let score = 0;
  for (const token of a) {
    if (b.has(token)) score += 1;
  }
  return score;
}
