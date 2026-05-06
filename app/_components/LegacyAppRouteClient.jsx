'use client';

import { useEffect } from 'react';
import App from '../../src/App.jsx';

export default function LegacyAppRouteClient({ initialPath, onReady }) {
  useEffect(() => {
    onReady?.();
  }, [onReady]);

  return <App initialPath={initialPath} />;
}
