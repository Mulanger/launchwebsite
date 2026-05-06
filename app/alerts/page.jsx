import LegacyAppRoute from '../_components/LegacyAppRoute.jsx';
import { buildNextMetadata } from '../../src/lib/next-metadata.js';
import { getSeoForPath } from '../../src/lib/seo.js';

export const metadata = buildNextMetadata(getSeoForPath('/alerts'));

export default function AlertsPage() {
  return <LegacyAppRoute initialPath="/alerts" />;
}
