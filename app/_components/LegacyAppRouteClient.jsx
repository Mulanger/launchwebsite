'use client';

import { useLayoutEffect } from 'react';
import App from '../../src/App.jsx';

export default function LegacyAppRouteClient({ initialPath, initialData, onReady }) {
  useLayoutEffect(() => {
    onReady?.();
  }, [onReady]);

  return <App initialPath={initialPath} initialData={initialData} />;
}
