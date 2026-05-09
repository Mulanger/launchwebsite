'use client';

import { useEffect, useState } from 'react';
import LegacyAppRoute from './LegacyAppRoute.jsx';

export default function HybridPublicRoute({ initialPath, initialData = null, children }) {
  const [mounted, setMounted] = useState(false);
  const [legacyReady, setLegacyReady] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div
      className="hybrid-public-route"
      data-mounted={mounted ? 'true' : 'false'}
      data-legacy-ready={legacyReady ? 'true' : 'false'}
    >
      {legacyReady ? null : <div className="hybrid-public-snapshot">{children}</div>}
      {mounted ? (
        <div className="hybrid-public-client" aria-hidden={legacyReady ? undefined : 'true'}>
          <LegacyAppRoute
            initialPath={initialPath}
            initialData={initialData}
            onReady={() => setLegacyReady(true)}
          />
        </div>
      ) : null}
    </div>
  );
}
