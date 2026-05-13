import { fetchPublicTraderPageIndex, fetchServerJson, isApiNotFoundError } from './server-api.js';
import { seoImage, siteName, siteOrigin } from './seo.js';

export const traderSitemapWindows = ['1d', '7d', '30d', '365d'];
export const traderSitemapRevalidateSeconds = 900;

const walletRegex = /^0x[0-9a-fA-F]{40}$/;
let traderPageIndexCache = [];

export function isWalletAddress(value) {
  return walletRegex.test(String(value || '').trim());
}

export function normalizeWallet(value) {
  return String(value || '').trim().toLowerCase();
}

export function shortWallet(wallet) {
  const normalized = normalizeWallet(wallet);
  if (!normalized) return 'Unknown wallet';
  return `${normalized.slice(0, 6)}..${normalized.slice(-4)}`;
}

export function traderPathForWallet(wallet) {
  const normalized = normalizeWallet(wallet);
  return normalized ? `/trader/${encodeURIComponent(normalized)}` : '/leaderboard';
}

export function slugifyTraderAlias(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getTraderDisplayName(profile) {
  return (
    String(profile?.displayName || '').trim() ||
    String(profile?.pseudonym || '').trim() ||
    profile?.shortAddress ||
    shortWallet(profile?.proxyWallet)
  );
}

export function getTraderStats(profile, windowId = '30d') {
  return (
    profile?.stats?.[windowId] ||
    profile?.stats?.['7d'] ||
    profile?.stats?.['1d'] ||
    profile?.stats?.['365d'] || {
      volume: 0,
      tradeCount: 0,
      whaleCount: 0,
      buyVolume: 0,
      sellVolume: 0,
    }
  );
}

export async function fetchTraderProfile(wallet) {
  if (!isWalletAddress(wallet)) return null;

  try {
    return await fetchServerJson(`/v1/traders/${encodeURIComponent(normalizeWallet(wallet))}`, {
      next: { revalidate: 300 },
    });
  } catch (error) {
    const indexFallback = await fetchTraderProfileFromIndex(wallet).catch(() => null);
    if (indexFallback) return indexFallback;

    if (!isApiNotFoundError(error)) {
      throw error;
    }
    return null;
  }
}

async function fetchTraderProfileFromIndex(wallet) {
  const normalizedWallet = normalizeWallet(wallet);
  const traders = await fetchTraderPageIndex(500);
  const item = traders.find((trader) => trader.proxyWallet === normalizedWallet);
  if (!item) return null;

  const stats = buildFallbackTraderStats(item);

  return {
    proxyWallet: normalizedWallet,
    shortAddress: shortWallet(normalizedWallet),
    displayName: item.displayName || null,
    pseudonym: item.pseudonym || null,
    profileImage: item.profileImage || null,
    firstSeen: item.firstSeenTs || item.lastSeenTs || 0,
    rankBadge: item.bestRank
      ? {
          rank: item.bestRank,
          window: item.bestRankWindow || item.windows?.[0] || '30d',
        }
      : null,
    stats,
    dailyVolume: [],
    recentWhales: [],
    seoFallback: true,
  };
}

function buildFallbackTraderStats(item) {
  const volume = Number(item.volume || 0);
  const tradeCount = Number(item.tradeCount || item.whaleCount || 0);
  const stats = {
    volume,
    tradeCount,
    whaleCount: tradeCount,
    buyVolume: 0,
    sellVolume: 0,
  };

  return {
    '1d': stats,
    '7d': stats,
    '30d': stats,
    '365d': stats,
  };
}

async function fetchLeaderboardWindow(windowId, limit) {
  try {
    const params = new URLSearchParams({
      window: windowId,
      limit: String(limit),
    });
    const data = await fetchServerJson(`/v1/leaderboard?${params.toString()}`, {
      next: { revalidate: traderSitemapRevalidateSeconds },
    });
    return Array.isArray(data?.items) ? data.items : [];
  } catch {
    return [];
  }
}

export async function fetchTraderPageIndex(limit = 500) {
  const byWallet = new Map();

  try {
    const data = await fetchPublicTraderPageIndex(limit);
    const items = Array.isArray(data?.items) ? data.items : [];
    if (items.length) {
      items
        .map(normalizeTraderPageIndexItem)
        .filter((item) => isWalletAddress(item.proxyWallet))
        .forEach((item) => byWallet.set(item.proxyWallet, item));
      traderPageIndexCache = Array.from(byWallet.values()).sort(compareTraderIndexItems).slice(0, limit);
    }
  } catch {
    // Fall back to live leaderboard windows while the API endpoint rolls out.
    if (traderPageIndexCache.length) return traderPageIndexCache.slice(0, limit);
  }

  if (byWallet.size < limit) {
    let fallback = [];
    try {
      fallback = await fetchLeaderboardTraderPageIndex(Math.min(limit, 100));
    } catch (error) {
      if (traderPageIndexCache.length) return traderPageIndexCache.slice(0, limit);
      throw error;
    }
    fallback.forEach((item) => {
      if (!byWallet.has(item.proxyWallet)) {
        byWallet.set(item.proxyWallet, item);
      }
    });
  }

  traderPageIndexCache = Array.from(byWallet.values()).sort(compareTraderIndexItems).slice(0, limit);
  return traderPageIndexCache;
}

async function fetchLeaderboardTraderPageIndex(limitPerWindow = 100) {
  const windows = await Promise.all(
    traderSitemapWindows.map(async (windowId) => ({
      windowId,
      items: await fetchLeaderboardWindow(windowId, limitPerWindow),
    })),
  );

  const byWallet = new Map();

  for (const { windowId, items } of windows) {
    for (const item of items) {
      const wallet = normalizeWallet(item.proxyWallet);
      if (!isWalletAddress(wallet)) continue;

      const existing = byWallet.get(wallet) || {
        proxyWallet: wallet,
        displayName: item.displayName || null,
        pseudonym: item.pseudonym || null,
        profileImage: item.profileImage || null,
        windows: [],
        bestRank: null,
        bestRankWindow: null,
        volume: 0,
        tradeCount: 0,
      };

      const itemRank = Number(item.rank || 0) || null;
      existing.displayName = existing.displayName || item.displayName || null;
      existing.pseudonym = existing.pseudonym || item.pseudonym || null;
      existing.profileImage = existing.profileImage || item.profileImage || null;
      existing.windows.push(windowId);
      if (itemRank && (!existing.bestRank || itemRank < existing.bestRank)) {
        existing.bestRank = itemRank;
        existing.bestRankWindow = windowId;
      }
      existing.volume = Math.max(existing.volume, Number(item.volume || 0));
      existing.tradeCount = Math.max(existing.tradeCount, Number(item.tradeCount || item.whaleCount || 0));

      byWallet.set(wallet, existing);
    }
  }

  return Array.from(byWallet.values()).sort(
    (left, right) => Number(right.volume || 0) - Number(left.volume || 0),
  );
}

function normalizeTraderPageIndexItem(item) {
  const bestRank = Number(item.bestRank || 0) || null;
  return {
    proxyWallet: normalizeWallet(item.proxyWallet),
    displayName: item.displayName || null,
    pseudonym: item.pseudonym || null,
    profileImage: item.profileImage || null,
    windows: item.bestRankWindow ? [item.bestRankWindow] : [],
    bestRank,
    bestRankWindow: item.bestRankWindow || null,
    volume: Number(item.bestVolume || item.volume || 0),
    tradeCount: Number(item.tradeCount || item.whaleCount || 0),
    lastSeenTs: Number(item.lastSeenTs || 0),
    refreshedAt: item.refreshedAt || null,
  };
}

function compareTraderIndexItems(left, right) {
  return Number(left.bestRank || 999999) - Number(right.bestRank || 999999) ||
    Number(right.volume || 0) - Number(left.volume || 0) ||
    String(left.proxyWallet).localeCompare(String(right.proxyWallet));
}

export async function resolveTraderAlias(alias) {
  const aliasSlug = slugifyTraderAlias(alias);
  if (!aliasSlug) return null;

  const traders = await fetchTraderPageIndex(100);
  return (
    traders.find((trader) =>
      [trader.displayName, trader.pseudonym]
        .filter(Boolean)
        .some((name) => slugifyTraderAlias(name) === aliasSlug),
    ) || null
  );
}

export function buildTraderDescription(profile, stats = getTraderStats(profile)) {
  const name = getTraderDisplayName(profile);
  const wallet = profile?.proxyWallet || '';
  const volume = Number(stats.volume || 0);
  const trades = Number(stats.whaleCount || stats.tradeCount || 0);
  const rank = profile?.rankBadge?.rank;
  const rankCopy = rank ? ` Ranked #${rank} on the ${String(profile.rankBadge.window || 'current').toUpperCase()} leaderboard.` : '';

  return `${name} is a public Polymarket whale wallet on Polywhale. Track recent large trades, whale volume, trade count, market activity, and wallet address ${wallet}.${rankCopy} Current tracked volume is ${Math.round(volume).toLocaleString('en-US')} across ${trades.toLocaleString('en-US')} whale trades.`;
}

export function buildTraderProfileStructuredData(profile) {
  const stats = getTraderStats(profile);
  const wallet = normalizeWallet(profile?.proxyWallet);
  const name = getTraderDisplayName(profile);
  const url = `${siteOrigin}${traderPathForWallet(wallet)}`;

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'ProfilePage',
      name: `${name} Polymarket trader profile`,
      url,
      description: buildTraderDescription(profile, stats),
      mainEntity: {
        '@type': 'Person',
        name,
        alternateName: [profile?.displayName, profile?.pseudonym, shortWallet(wallet)].filter(Boolean),
        identifier: wallet,
        image: profile?.profileImage || seoImage,
        description: buildTraderDescription(profile, stats),
        url,
      },
      isPartOf: {
        '@type': 'WebSite',
        name: siteName,
        url: siteOrigin,
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: siteName,
          item: siteOrigin,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Leaderboard',
          item: `${siteOrigin}/leaderboard`,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name,
          item: url,
        },
      ],
    },
  ];
}
