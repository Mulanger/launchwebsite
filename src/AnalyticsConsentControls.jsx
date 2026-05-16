'use client';

import { useEffect, useState } from 'react';
import {
  analyticsConsentStorageKey,
  readAnalyticsConsent,
  setAnalyticsConsent,
  trackAnalyticsEvent,
} from './lib/analytics.js';

function useAnalyticsConsentChoice() {
  const [choice, setChoice] = useState(() => readAnalyticsConsent());

  useEffect(() => {
    const refresh = () => setChoice(readAnalyticsConsent());
    const onStorage = (event) => {
      if (event.key === analyticsConsentStorageKey) refresh();
    };

    window.addEventListener('polywhale:analytics-consent-changed', refresh);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('polywhale:analytics-consent-changed', refresh);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const updateChoice = (nextChoice) => {
    if (setAnalyticsConsent(nextChoice)) {
      setChoice(nextChoice);
      trackAnalyticsEvent('analytics_consent_update', { analytics_consent: nextChoice });
    }
  };

  return [choice, updateChoice];
}

export function AnalyticsConsentBanner() {
  const [choice, updateChoice] = useAnalyticsConsentChoice();
  if (choice) return null;

  return (
    <div className="analytics-consent-banner" role="region" aria-label="Analytics privacy choice">
      <div className="analytics-consent-copy">
        <strong>Analytics</strong>
        <span>
          We use Google Analytics to understand pages and product actions. Ads storage stays off.
        </span>
      </div>
      <div className="analytics-consent-actions">
        <a href="/privacy">Privacy</a>
        <button type="button" className="analytics-consent-button secondary" onClick={() => updateChoice('denied')}>
          Necessary only
        </button>
        <button type="button" className="analytics-consent-button primary" onClick={() => updateChoice('granted')}>
          Accept analytics
        </button>
      </div>
    </div>
  );
}

export function AnalyticsConsentSettings() {
  const [choice, updateChoice] = useAnalyticsConsentChoice();
  const status = choice === 'granted' ? 'Analytics enabled' : choice === 'denied' ? 'Necessary only' : 'No choice saved';

  return (
    <section className="analytics-consent-settings" aria-label="Analytics preference">
      <div>
        <span>Analytics preference</span>
        <strong>{status}</strong>
        <p>
          Google Analytics is used for aggregate page and feature measurement. Advertising storage and personalization are disabled.
        </p>
      </div>
      <div className="analytics-consent-settings-actions">
        <button
          type="button"
          className={`analytics-consent-button secondary ${choice === 'denied' ? 'active' : ''}`}
          onClick={() => updateChoice('denied')}
        >
          Necessary only
        </button>
        <button
          type="button"
          className={`analytics-consent-button primary ${choice === 'granted' ? 'active' : ''}`}
          onClick={() => updateChoice('granted')}
        >
          Accept analytics
        </button>
      </div>
    </section>
  );
}
