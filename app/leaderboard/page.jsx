import HybridPublicRoute from '../_components/HybridPublicRoute.jsx';
import { PublicLeaderboardSnapshot } from '../_components/PublicAppSnapshot.jsx';
import { buildNextMetadata } from '../../src/lib/next-metadata.js';
import { fetchPublicLeaderboard } from '../../src/lib/server-api.js';
import { seoByPath } from '../../src/lib/seo.js';

export const revalidate = 60;
export const metadata = buildNextMetadata(seoByPath['/leaderboard']);

async function loadLeaderboard() {
  try {
    const data = await fetchPublicLeaderboard('1d', 50, { sort: 'profit' });
    return {
      items: Array.isArray(data?.items) ? data.items : [],
      nextCursor: data?.nextCursor ?? null,
      asOf: data?.asOf ?? null,
      windowId: '1d',
      sort: 'profit',
      error: '',
    };
  } catch (error) {
    return {
      items: [],
      nextCursor: null,
      asOf: null,
      windowId: '1d',
      sort: 'profit',
      error: error.message || 'Leaderboard unavailable',
    };
  }
}

export default async function LeaderboardPage() {
  const { items, nextCursor, asOf, sort, error } = await loadLeaderboard();

  return (
    <HybridPublicRoute
      initialPath="/leaderboard"
      initialData={{ leaderboard: { items, nextCursor, asOf, windowId: '1d', sort, error } }}
    >
      <PublicLeaderboardSnapshot items={items} sort={sort} error={error} />
    </HybridPublicRoute>
  );
}
