# Polywhale Analytics

Polywhale uses GA4 through the Google tag (`gtag.js`). Production tracking is owned by the Next root layout, with the legacy Vite entry kept aligned for fallback builds.

## Code Paths

- `app/layout.jsx` injects public env into `window.__POLYWHALE_PUBLIC_ENV__` and mounts the Next analytics tracker.
- `app/_components/GoogleAnalytics.jsx` initializes GA, sends manual page views on App Router path changes, renders the consent banner, and installs outbound Polymarket click tracking.
- `src/LegacyAnalytics.jsx` initializes the same helper for the legacy Vite shell.
- `src/lib/analytics.js` owns GA config, consent mode, page-type inference, page-view dispatch, custom-event dispatch, host allowlisting, and global outbound click tracking.
- `src/AnalyticsConsentControls.jsx` owns the banner and privacy-page preference control.

## Environment

Set these in Railway when changing analytics behavior:

```text
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-TMS7KN5K7G
NEXT_PUBLIC_GA_ALLOWED_HOSTS=www.polywhaletrades.com,polywhaletrades.com
NEXT_PUBLIC_GA_USE_DEFAULT_ID=true
NEXT_PUBLIC_GA_DEBUG=false
```

`VITE_GA_*` equivalents are also supported for the legacy Vite path. If no measurement ID is provided, production falls back to `G-TMS7KN5K7G` while `NEXT_PUBLIC_GA_USE_DEFAULT_ID=true`. Events still only fire on allowed hostnames, so local development and the raw Railway host do not pollute GA by default.

For local analytics debugging, temporarily set:

```text
NEXT_PUBLIC_GA_ALLOWED_HOSTS=127.0.0.1,localhost
NEXT_PUBLIC_GA_DEBUG=true
```

## Page Views

The site sends page views manually with `gtag('event', 'page_view', ...)` and initializes GA with `send_page_view: false`.

Required GA4 admin setting:

1. Open GA4 Admin.
2. Go to Data streams > Web > Enhanced measurement.
3. Under Page views advanced settings, disable "Page changes based on browser history events".
4. Leave normal page-load measurement disabled in code through `send_page_view: false`.

This avoids duplicate page views while preserving deterministic Next/App Router tracking.

Each page view includes:

```text
page_title
page_location
page_path
page_referrer
page_type
```

Register `page_type` as an event-scoped custom dimension in GA4. Current page types are `feed`, `leaderboard`, `alerts`, `following`, `profile`, `trade`, `trader`, `market`, `qa`, `news`, `compare`, `legal`, `about`, and `app`.

## Consent

Consent mode v2 defaults analytics storage to denied until the user chooses. Advertising storage, ad personalization, and ad user-data sharing remain denied. The user's choice is stored in:

```text
localStorage["polywhale:analyticsConsent"]
```

The `/privacy` page exposes the same preference control after the banner is dismissed.

## Events

Custom events currently sent:

```text
analytics_consent_update
feed_filter_change
feed_sort_change
leaderboard_window_change
leaderboard_sort_change
follow_wallet
unfollow_wallet
alert_subscribe
alert_update
alert_disable
alert_test_send
polymarket_outbound_click
```

Do not include full wallet addresses or auth/session identifiers in custom event parameters. Route URLs may already contain public wallet or trade context where the page itself requires it.

## Verification

Recommended checks before deployment:

```powershell
npm run next:build
npm run build
```

For local browser inspection, set debug env before starting `next:dev`, or before `next:build` if using `next:start`:

```powershell
$env:NEXT_PUBLIC_GA_ALLOWED_HOSTS='127.0.0.1,localhost'
$env:NEXT_PUBLIC_GA_DEBUG='true'
npm run next:dev -- --hostname 127.0.0.1 -p 3100
```

Use GA4 DebugView or browser DevTools Network filtered to `google-analytics.com/g/collect` and verify one `page_view` per route change.
