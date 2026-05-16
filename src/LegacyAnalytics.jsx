'use client';

import { useEffect, useState } from 'react';
import { AnalyticsConsentBanner } from './AnalyticsConsentControls.jsx';
import {
  initializeGoogleAnalytics,
  installAnalyticsClickTracking,
  readAnalyticsConfig,
  trackPageView,
} from './lib/analytics.js';

export default function LegacyAnalytics() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const config = readAnalyticsConfig();
    const initialized = initializeGoogleAnalytics(config);
    setEnabled(initialized);
    if (initialized) {
      window.setTimeout(() => {
        trackPageView({
          title: document.title,
          location: `${window.location.origin}${window.location.pathname}${window.location.search}`,
          path: `${window.location.pathname}${window.location.search}`,
          referrer: document.referrer || '',
        });
      }, 0);
    }
    if (!initialized) return undefined;
    return installAnalyticsClickTracking();
  }, []);

  return enabled ? <AnalyticsConsentBanner /> : null;
}
