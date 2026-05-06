'use client';

import dynamic from 'next/dynamic';

const LegacyAppClient = dynamic(() => import('./LegacyAppRouteClient.jsx'), {
  ssr: false,
  loading: () => null,
});

export default function LegacyAppRoute({ initialPath, onReady }) {
  return <LegacyAppClient initialPath={initialPath} onReady={onReady} />;
}
