import { readPublicEnv } from './env.js';

export const fallbackGaMeasurementId = 'G-TMS7KN5K7G';
export const analyticsConsentStorageKey = 'polywhale:analyticsConsent';

const defaultAllowedHosts = ['www.polywhaletrades.com', 'polywhaletrades.com'];
const analyticsStateKey = '__POLYWHALE_ANALYTICS__';

function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function parseBoolean(value, fallback = false) {
  if (value === true || value === false) return value;
  const normalized = String(value ?? '').trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function parseList(value, fallback = []) {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  const items = String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length ? items : fallback;
}

function normalizeHostname(hostname = '') {
  return String(hostname || '').split(':')[0].trim().toLowerCase();
}

function getStorage() {
  if (!isBrowser()) return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function ensureGtag() {
  if (!isBrowser()) return null;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments);
  };
  return window.gtag;
}

export function readAnalyticsConfig(overrides = {}) {
  const configuredMeasurementId =
    overrides.measurementId ??
    readPublicEnv('VITE_GA_MEASUREMENT_ID', readPublicEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID', ''));
  const useFallbackMeasurementId = parseBoolean(
    overrides.useDefaultMeasurementId ??
      readPublicEnv('VITE_GA_USE_DEFAULT_ID', readPublicEnv('NEXT_PUBLIC_GA_USE_DEFAULT_ID', 'true')),
    true
  );
  const measurementId = String(
    configuredMeasurementId || (useFallbackMeasurementId ? fallbackGaMeasurementId : '')
  ).trim();
  const allowedHosts = parseList(
    overrides.allowedHosts ??
      readPublicEnv('VITE_GA_ALLOWED_HOSTS', readPublicEnv('NEXT_PUBLIC_GA_ALLOWED_HOSTS', defaultAllowedHosts.join(','))),
    defaultAllowedHosts
  ).map(normalizeHostname);
  const debug = parseBoolean(
    overrides.debug ?? readPublicEnv('VITE_GA_DEBUG', readPublicEnv('NEXT_PUBLIC_GA_DEBUG', 'false')),
    false
  );

  return {
    measurementId,
    allowedHosts,
    debug,
  };
}

export function isAnalyticsHostAllowed(config = readAnalyticsConfig(), hostname = '') {
  const host = normalizeHostname(hostname || (isBrowser() ? window.location.hostname : ''));
  if (!host) return false;
  if (config.debug) return true;
  if (config.allowedHosts.includes('*')) return true;
  return config.allowedHosts.includes(host);
}

export function isAnalyticsEnabled(config = readAnalyticsConfig()) {
  return Boolean(config.measurementId && isBrowser() && isAnalyticsHostAllowed(config));
}

export function readAnalyticsConsent() {
  const storage = getStorage();
  const value = storage?.getItem(analyticsConsentStorageKey);
  return value === 'granted' || value === 'denied' ? value : null;
}

function buildConsentState(choice) {
  return {
    analytics_storage: choice === 'granted' ? 'granted' : 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    functionality_storage: 'granted',
    security_storage: 'granted',
  };
}

function persistAnalyticsConsent(choice) {
  const storage = getStorage();
  if (!storage) return;
  if (choice === 'granted' || choice === 'denied') {
    storage.setItem(analyticsConsentStorageKey, choice);
  }
}

export function setAnalyticsConsent(choice) {
  if (!isBrowser()) return false;
  if (choice !== 'granted' && choice !== 'denied') return false;
  persistAnalyticsConsent(choice);
  const gtag = ensureGtag();
  if (gtag) {
    gtag('consent', 'update', buildConsentState(choice));
  }
  window.dispatchEvent(new CustomEvent('polywhale:analytics-consent-changed', { detail: { choice } }));
  return true;
}

function getAnalyticsState() {
  if (!isBrowser()) return null;
  window[analyticsStateKey] = window[analyticsStateKey] || {
    initialized: false,
    measurementId: '',
    lastPageViewLocation: '',
    lastPageViewReferrer: document.referrer || '',
  };
  return window[analyticsStateKey];
}

export function initializeGoogleAnalytics(config = readAnalyticsConfig()) {
  if (!isAnalyticsEnabled(config)) return false;

  const state = getAnalyticsState();
  if (!state) return false;
  const gtag = ensureGtag();
  if (!gtag) return false;

  const consentChoice = readAnalyticsConsent() || 'denied';

  if (!state.initialized || state.measurementId !== config.measurementId) {
    gtag('consent', 'default', {
      ...buildConsentState(consentChoice),
      wait_for_update: 500,
    });
    gtag('set', 'ads_data_redaction', true);
    if (config.debug) {
      gtag('set', 'debug_mode', true);
    }

    if (!document.querySelector(`script[data-polywhale-ga="${config.measurementId}"]`)) {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(config.measurementId)}`;
      script.dataset.polywhaleGa = config.measurementId;
      document.head.appendChild(script);
    }

    gtag('js', new Date());
    gtag('config', config.measurementId, {
      send_page_view: false,
    });

    state.initialized = true;
    state.measurementId = config.measurementId;
  } else {
    gtag('consent', 'update', buildConsentState(consentChoice));
  }

  return true;
}

export function inferAnalyticsPageType(pathname = '') {
  const path = String(pathname || '/').split('?')[0].replace(/\/+$/, '') || '/';
  if (path === '/') return 'feed';
  if (path === '/leaderboard') return 'leaderboard';
  if (path === '/alerts') return 'alerts';
  if (path === '/polymarket-whale-alerts') return 'alerts_seo';
  if (path === '/profile/following') return 'following';
  if (path === '/profile') return 'profile';
  if (path.startsWith('/trade/')) return 'trade';
  if (path.startsWith('/trader/')) return 'trader';
  if (path.startsWith('/market/')) return 'market';
  if (path === '/qa' || path.startsWith('/qa/') || path === '/qna' || path.startsWith('/qna/')) return 'qa';
  if (path === '/news' || path.startsWith('/news/')) return 'news';
  if (path === '/compare' || path.startsWith('/compare/')) return 'compare';
  if (path === '/privacy' || path === '/terms' || path === '/delete-data') return 'legal';
  if (path === '/about') return 'about';
  return 'app';
}

function getCurrentLocation() {
  if (!isBrowser()) return '';
  return `${window.location.origin}${window.location.pathname}${window.location.search}`;
}

function cleanEventParams(params = {}) {
  return Object.entries(params).reduce((cleaned, [key, value]) => {
    if (value === undefined || value === null || value === '') return cleaned;
    if (typeof value === 'string') {
      cleaned[key] = value.slice(0, 500);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      cleaned[key] = value;
    }
    return cleaned;
  }, {});
}

export function trackPageView({
  title = '',
  location = '',
  path = '',
  referrer = '',
  pageType = '',
} = {}) {
  if (!isBrowser()) return false;
  const config = readAnalyticsConfig();
  if (!initializeGoogleAnalytics(config)) return false;

  const state = getAnalyticsState();
  const pageLocation = location || getCurrentLocation();
  if (state?.lastPageViewLocation === pageLocation) return false;

  const pathname = path || `${window.location.pathname}${window.location.search}`;
  const pageReferrer = referrer ?? state?.lastPageViewReferrer ?? document.referrer ?? '';
  const params = cleanEventParams({
    page_title: title || document.title,
    page_location: pageLocation,
    page_path: pathname,
    page_referrer: pageReferrer,
    page_type: pageType || inferAnalyticsPageType(pathname),
  });

  window.gtag('event', 'page_view', params);
  if (state) {
    state.lastPageViewReferrer = pageLocation;
    state.lastPageViewLocation = pageLocation;
  }
  return true;
}

export function trackAnalyticsEvent(eventName, params = {}) {
  if (!isBrowser() || !eventName) return false;
  const config = readAnalyticsConfig();
  if (!initializeGoogleAnalytics(config)) return false;

  const eventParams = cleanEventParams({
    page_type: inferAnalyticsPageType(window.location.pathname),
    ...params,
  });
  window.gtag('event', eventName, eventParams);
  return true;
}

export function installAnalyticsClickTracking() {
  if (!isBrowser()) return () => {};

  const onClick = (event) => {
    const link = event.target?.closest?.('a[href]');
    if (!link) return;

    let url;
    try {
      url = new URL(link.href, window.location.href);
    } catch {
      return;
    }

    const domain = normalizeHostname(url.hostname);
    if (domain !== 'polymarket.com' && !domain.endsWith('.polymarket.com')) return;

    trackAnalyticsEvent('polymarket_outbound_click', {
      link_domain: domain,
      link_url: url.href,
    });
  };

  document.addEventListener('click', onClick, true);
  return () => document.removeEventListener('click', onClick, true);
}
