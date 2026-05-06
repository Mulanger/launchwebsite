import LegacyAppRoute from '../../_components/LegacyAppRoute.jsx';
import { buildNextMetadata } from '../../../src/lib/next-metadata.js';
import { getSeoForPath } from '../../../src/lib/seo.js';

export async function generateMetadata({ params }) {
  const { wallet } = await params;
  const path = `/trader/${encodeURIComponent(wallet)}`;
  return buildNextMetadata(getSeoForPath(path, null, path.match(/^\/trader\/([^/]+)$/)));
}

export default async function TraderPage({ params }) {
  const { wallet } = await params;
  return <LegacyAppRoute initialPath={`/trader/${encodeURIComponent(wallet)}`} />;
}
