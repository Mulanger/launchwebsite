'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AnalyticsConsentBanner } from '../../src/AnalyticsConsentControls.jsx';
import {
  initializeGoogleAnalytics,
  installAnalyticsClickTracking,
  readAnalyticsConfig,
  trackPageView,
} from '../../src/lib/analytics.js';

export default function GoogleAnalytics() {
  const pathname = usePathname() || '/';
  const config = useMemo(() => readAnalyticsConfig(), []);
  const [enabled, setEnabled] = useState(false);
  const previousLocationRef = useRef('');

  useEffect(() => {
    const initialized = initializeGoogleAnalytics(config);
    setEnabled(initialized);
    if (!initialized) return undefined;
    return installAnalyticsClickTracking();
  }, [config]);

  useEffect(() => {
    if (!enabled) return undefined;

    const timer = window.setTimeout(() => {
      const locationPath = `${window.location.pathname}${window.location.search}`;
      const currentLocation = `${window.location.origin}${locationPath}`;
      trackPageView({
        title: document.title,
        location: currentLocation,
        path: locationPath,
        referrer: previousLocationRef.current || document.referrer || '',
      });
      previousLocationRef.current = currentLocation;
    }, 0);

    return () => window.clearTimeout(timer);
  }, [enabled, pathname]);

  return enabled ? <AnalyticsConsentBanner /> : null;
}
