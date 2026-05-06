'use client';

import dynamic from 'next/dynamic';

const LegacyAppClient = dynamic(() => import('./LegacyAppRouteClient.jsx'), {
  ssr: false,
  loading: () => null,
});

export default function LegacyAppRoute({ initialPath }) {
  return <LegacyAppClient initialPath={initialPath} />;
}
