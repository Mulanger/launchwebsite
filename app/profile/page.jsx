import LegacyAppRoute from '../_components/LegacyAppRoute.jsx';
import { buildNextMetadata } from '../../src/lib/next-metadata.js';
import { getSeoForPath } from '../../src/lib/seo.js';

export const metadata = buildNextMetadata(getSeoForPath('/profile'));

export default function ProfilePage() {
  return <LegacyAppRoute initialPath="/profile" />;
}
