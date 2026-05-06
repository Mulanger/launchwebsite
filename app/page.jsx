import HybridPublicRoute from './_components/HybridPublicRoute.jsx';
import JsonLd from './_components/JsonLd.jsx';
import { PublicFeedSnapshot } from './_components/PublicAppSnapshot.jsx';
import { buildNextMetadata } from '../src/lib/next-metadata.js';
import { fetchPublicLeaderboard, fetchPublicWhales } from '../src/lib/server-api.js';
import { seoByPath } from '../src/lib/seo.js';

export const revalidate = 60;
export const metadata = buildNextMetadata(seoByPath['/']);

async function loadHomeData() {
  try {
    const [whales, leaderboard] = await Promise.all([
      fetchPublicWhales(8),
      fetchPublicLeaderboard('1d', 8),
    ]);
    return {
      whales: Array.isArray(whales?.items) ? whales.items : [],
      leaders: Array.isArray(leaderboard?.items) ? leaderboard.items : [],
      error: '',
    };
  } catch (error) {
    return {
      whales: [],
      leaders: [],
      error: error.message || 'Live data unavailable',
    };
  }
}

export default async function HomePage() {
  const { whales, leaders, error } = await loadHomeData();

  return (
    <HybridPublicRoute initialPath="/">
      <JsonLd data={seoByPath['/'].structuredData} />
      <PublicFeedSnapshot whales={whales} leaders={leaders} error={error} />
    </HybridPublicRoute>
  );
}
