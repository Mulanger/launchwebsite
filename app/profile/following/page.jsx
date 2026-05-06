import LegacyAppRoute from '../../_components/LegacyAppRoute.jsx';
import { buildNextMetadata } from '../../../src/lib/next-metadata.js';
import { getSeoForPath } from '../../../src/lib/seo.js';

export const metadata = buildNextMetadata(getSeoForPath('/profile/following'));

export default function FollowingPage() {
  return <LegacyAppRoute initialPath="/profile/following" />;
}
