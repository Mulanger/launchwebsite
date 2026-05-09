import HybridPublicRoute from './_components/HybridPublicRoute.jsx';
import JsonLd from './_components/JsonLd.jsx';
import { PublicFeedSnapshot } from './_components/PublicAppSnapshot.jsx';
import { buildNextMetadata } from '../src/lib/next-metadata.js';
import { fetchPublicDashboardToday, fetchPublicLeaderboard, fetchPublicWhales } from '../src/lib/server-api.js';
import { seoByPath } from '../src/lib/seo.js';

export const revalidate = 60;
export const metadata = buildNextMetadata(seoByPath['/']);

function buildDashboardFromSnapshot(whales, leaders, nextCursor = null) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const activeWallets = new Set();
  let volumeUsd = 0;
  let megaTrades = 0;
  let biggestTrade = null;
  const buckets = Array.from({ length: 12 }, () => 0);

  for (const trade of whales) {
    const usdSize = Number(trade?.usdSize || 0);
    const timestamp = Number(trade?.timestamp || 0);
    const wallet = String(trade?.trader?.proxyWallet || '').toLowerCase();
    if (wallet) activeWallets.add(wallet);
    volumeUsd += usdSize;
    if (usdSize >= 250000) megaTrades += 1;
    if (!biggestTrade || usdSize > Number(biggestTrade.usdSize || 0)) biggestTrade = trade;

    const ageSeconds = nowSeconds - timestamp;
    if (ageSeconds >= 0 && ageSeconds < 3600) {
      const bucketIndex = Math.max(0, Math.min(11, 11 - Math.floor(ageSeconds / 300)));
      buckets[bucketIndex] += usdSize;
    }
  }

  return {
    items: whales,
    nextCursor,
    today: {
      volumeUsd,
      activeWhales: activeWallets.size,
      megaTrades,
      biggestTrade,
    },
    last60m: {
      tradeCount: whales.filter((trade) => nowSeconds - Number(trade?.timestamp || 0) < 3600).length,
      volumeUsd: buckets.reduce((total, value) => total + value, 0),
      buckets,
    },
    leaderboard: leaders,
  };
}

function normalizeHomePayload({ dashboard = null, whales = [], leaders = [], nextCursor = null, error = '' }) {
  const items = Array.isArray(dashboard?.items) ? dashboard.items : whales;
  const leaderboard = Array.isArray(dashboard?.leaderboard) ? dashboard.leaderboard : leaders;
  const cursor = dashboard?.nextCursor ?? nextCursor ?? null;
  const clientDashboard = dashboard
    ? {
      ...dashboard,
      items,
      nextCursor: cursor,
      leaderboard,
    }
    : buildDashboardFromSnapshot(items, leaderboard, cursor);

  return {
    whales: items,
    leaders: leaderboard,
    nextCursor: cursor,
    dashboard: clientDashboard,
    error,
  };
}

async function loadHomeData() {
  try {
    const dashboard = await fetchPublicDashboardToday(100, 50);
    return normalizeHomePayload({ dashboard });
  } catch {
    // Fall back to the older split endpoints while the dashboard endpoint is unavailable.
  }

  try {
    const [whales, leaderboard] = await Promise.all([
      fetchPublicWhales(100),
      fetchPublicLeaderboard('1d', 50),
    ]);
    return normalizeHomePayload({
      whales: Array.isArray(whales?.items) ? whales.items : [],
      leaders: Array.isArray(leaderboard?.items) ? leaderboard.items : [],
      nextCursor: whales?.nextCursor ?? null,
    });
  } catch (error) {
    return normalizeHomePayload({ error: error.message || 'Live data unavailable' });
  }
}

export default async function HomePage() {
  const { whales, leaders, nextCursor, dashboard, error } = await loadHomeData();

  return (
    <HybridPublicRoute
      initialPath="/"
      initialData={{ feed: { items: whales, nextCursor, dashboard, error } }}
    >
      <JsonLd data={seoByPath['/'].structuredData} />
      <PublicFeedSnapshot whales={whales} leaders={leaders} error={error} />
    </HybridPublicRoute>
  );
}
