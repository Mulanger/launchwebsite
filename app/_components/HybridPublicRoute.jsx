'use client';

import { useEffect, useState } from 'react';
import LegacyAppRoute from './LegacyAppRoute.jsx';

export default function HybridPublicRoute({ initialPath, children }) {
  const [mounted, setMounted] = useState(false);
  const [legacyReady, setLegacyReady] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      {legacyReady ? null : children}
      {mounted ? <LegacyAppRoute initialPath={initialPath} onReady={() => setLegacyReady(true)} /> : null}
    </>
  );
}
