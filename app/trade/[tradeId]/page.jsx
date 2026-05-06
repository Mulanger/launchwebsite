import LegacyAppRoute from '../../_components/LegacyAppRoute.jsx';
import { buildNextMetadata } from '../../../src/lib/next-metadata.js';
import { getSeoForPath } from '../../../src/lib/seo.js';

export async function generateMetadata({ params }) {
  const { tradeId } = await params;
  const path = `/trade/${encodeURIComponent(tradeId)}`;
  return buildNextMetadata(getSeoForPath(path, path.match(/^\/trade\/([^/]+)$/)));
}

export default async function TradePage({ params }) {
  const { tradeId } = await params;
  return <LegacyAppRoute initialPath={`/trade/${encodeURIComponent(tradeId)}`} />;
}
