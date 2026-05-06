import { siteOrigin } from './seo.js';
import { fetchPublicLeaderboard, fetchServerJson } from './server-api.js';

const marketScanPageLimit = 100;
const marketScanMaxPages = 8;
export const marketIndexMinTrades = 3;
export const marketIndexMinVolume = 50000;

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

  const [whales, leaderboard] = await Promise.all([
    fetchWhalePagesForMarketScan(),
    fetchPublicLeaderboard('1d', 10).catch(() => ({ items: [] })),
  ]);

  const marketTrades = whales.filter((trade) => trade?.market?.slug === decodedSlug);
  if (!marketTrades.length) return null;

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
    topWhalesToday: Array.isArray(leaderboard?.items) ? leaderboard.items : [],
    seo: {
      indexable,
      canonicalUrl: marketUrlForSlug(decodedSlug),
      reason: indexable
        ? `${marketIndexMinTrades}+ whale trades and $${marketIndexMinVolume.toLocaleString()}+ tracked whale volume`
        : 'Known market below current indexing thresholds',
    },
  };
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
