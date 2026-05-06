# Polywatch Website Agent Handoff

This repo is the Polywhale web app. Production now runs the Next.js SSR/SSG foundation on Railway, while the older React/Vite build remains in the repo as a local fallback and comparison path. It is not the Flutter app and it is not the Railway API server. The website consumes the same whale-trade API used by the app and presents a public live feed, leaderboard, trader profiles, trade details, web alerts setup, and Google Play legal pages.

## Current Status

- Main branch: `main`
- Git remote: `https://github.com/Mulanger/launchwebsite.git`
- Production host: Railway
- Production API default: `https://whaleserver-production.up.railway.app`
- Local development can run through Next or legacy Vite on `127.0.0.1`
- Next SSR foundation branch: `codex/next-ssr-foundation`
- Production is cut over to Next. Railway uses `npm run next:build` and `npm run next:start -- -H 0.0.0.0 -p $PORT`.
- Current production cutover work is committed and pushed through `0cde8bb Switch Railway deployment to Next`.

Recent important work:

- Feed uses the current New York trading session for "Today's whale volume" and feed visibility.
- Feed top whales and the leaderboard page now derive from the same current New York trading session as the feed, using loaded whale trades as a frontend fallback until the API exposes a native today leaderboard.
- The website computes a New York session key and schedules a refresh after the next New York midnight so today-scoped views roll over automatically.
- Feed sort is limited to `Most recent` and `Largest size`.
- Market images are hydrated for live websocket trades so new rows do not remain as empty fallback squares.
- Leaderboard rows show volume, trade count, and average trade. The confusing row-level "Whales" column and "All markets" label were removed.
- Trader profile headers show a short wallet title such as `0xa2cd..`, full address underneath, and a copy button.
- Trader profile daily volume chart is a bar chart so one-day data does not render as an ugly triangle.
- Alerts now have a dedicated mobile screen path with bottom nav parity (`Feed`, `Leaders`, `Following`, `Alerts`) instead of relying on desktop layout classes.
- Alerts channel cards (`Web push`, `Following mode`, `Minimum size`) stay in one row on mobile instead of stacking.
- Follow/unfollow buttons in the following list no longer trigger row navigation refresh; row navigation ignores nested interactive controls.
- Sidebar "Public web beta" panel was removed.
- Sidebar brand lockup now displays `Polywhale` with a small `trades` subtitle under it.
- Sidebar `Profile` tab is intentionally disabled and shows a `Coming soon` hover tooltip.
- GA4 is installed in `index.html` using tag id `G-TMS7KN5K7G`.
- SEO title/metadata defaults now use `Polywhale | Live Polymarket Whale Trades, Top Whales & Whale Feed`.
- Mojibake metadata strings were cleaned (for example broken `today...` characters in search snippets).
- Next.js SSR/SSG foundation was added in parallel with Vite on `codex/next-ssr-foundation`.
- Public SEO routes now have Next App Router route shells under `app/`.
- App-only routes are wired through a legacy client wrapper so existing interactive behavior stays owned by `src/App.jsx`.
- `/` and `/leaderboard` use a hybrid route that serves crawlable HTML first, then hydrates into the existing app UI in browsers.
- `/` and `/leaderboard` server snapshots were aligned with the existing app UI through `app/_components/PublicAppSnapshot.jsx`.
- Railway production cutover to Next was completed and verified. Live source contains `next-app-snapshot` and `/_next/static`, not the old Vite `<div id="root"></div>` shell.

## Project Shape

```text
D:\polywatch-website
  AGENT.md                 This handoff file.
  README.md                Short public/developer overview.
  package.json             npm scripts and dependencies.
  package-lock.json        Locked dependency tree.
  next.config.mjs          Next config and `/api` rewrite.
  vite.config.js           Vite React config and dev/preview `/api` proxy.
  server.js                Production static server plus `/api` proxy.
  railway.json             Railway build/start config.
  index.html               Vite HTML shell.
  NEXT_SSR_MIGRATION_PLAN.md
                           Phased Next SSR migration plan and implementation log.
  app/                     Next App Router public routes and legacy app route wrappers.
  public/
    favicon.png
    site.webmanifest
    robots.txt
    sitemap.xml
    assets/
      polywatch-icon.png
      screen-alerts.png
      screen-leaderboard.png
      screen-live-feed.png
  src/
    main.jsx               React entrypoint.
    App.jsx                All routes, components, data fetching, state, and helpers.
    lib/
      env.js               Shared public env reader for Vite and Next browser bundles.
      next-metadata.js     Next metadata helpers.
      routes.js            Shared route matching helpers.
      seo.js               Shared SEO metadata and JSON-LD helpers.
      server-api.js        Next server fetch helpers.
    styles.css             Global app styling and responsive rules.
  dist/                    Build output from `npm run build`; do not edit manually.
  .next/                   Next build output; do not edit manually.
```

## Commands

```powershell
npm install
npm run dev
npm run build
npm run preview
npm start
npm run next:dev
npm run next:build
npm run next:start
```

Use `npm run next:build` before pushing changes that affect production. `npm run next:start` serves the Next production build.

Run `npm run build` as well when changes affect shared legacy Vite code, `src/App.jsx`, `src/styles.css`, dependencies, or anything that could break the fallback build. `npm start` serves the legacy Vite `dist` folder with `server.js`.

## Environment Variables

Frontend/Vite:

- `VITE_API_BASE_URL`: REST base used by `src/App.jsx`. Defaults to `/api`.
- `VITE_WS_BASE_URL`: websocket base. Defaults to `https://whaleserver-production.up.railway.app`, normalized to `wss://...`.
- `VITE_DEV_API_TARGET`: Vite dev/preview proxy target for `/api`. Defaults to production API.
- `VITE_FIREBASE_API_KEY`: Firebase Web app API key for browser notifications.
- `VITE_FIREBASE_AUTH_DOMAIN`: Firebase Web app auth domain.
- `VITE_FIREBASE_PROJECT_ID`: Firebase project id. Use the same project as the existing Android FCM setup.
- `VITE_FIREBASE_MESSAGING_SENDER_ID`: Firebase Cloud Messaging sender id for the Web app.
- `VITE_FIREBASE_APP_ID`: Firebase Web app id.
- `VITE_FIREBASE_VAPID_KEY`: Firebase Web Push certificate key used by `getToken()`.

Next public env compatibility:

- `NEXT_PUBLIC_API_BASE_URL`: browser REST base equivalent for Next bundles. `src/lib/env.js` prefers Vite values when present, then Next values, then fallback defaults.
- `NEXT_PUBLIC_WS_BASE_URL`: browser websocket base equivalent for Next bundles.
- `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`, `NEXT_PUBLIC_FIREBASE_VAPID_KEY`: Next equivalents for Firebase browser config.

Production server:

- `PORT`: server port. Defaults to `4173`.
- `API_BASE_URL`: upstream target for `server.js` `/api` proxy, `next.config.mjs` `/api/:path*` rewrite, and Next server helpers. Defaults to production API.

## Runtime Data Flow

1. Browser loads Next-rendered HTML from Railway.
2. Public `/` and `/leaderboard` receive crawlable app-aligned SSR snapshots, then hydrate into the existing React app UI.
3. App-only routes are served by Next wrappers and hydrate the existing React app route.
4. REST calls go through `apiBaseUrl`, usually `/api`, which is rewritten/proxied to the Railway API.
5. Live whale updates connect directly to `/v1/whales/stream` using `VITE_WS_BASE_URL`, `NEXT_PUBLIC_WS_BASE_URL`, or the production API default.
6. The feed initial load fetches REST pages for today's New York session.
7. Websocket trades are inserted at the top, filtered client-side, then hydrated/merged when image metadata is missing.
8. Today-scoped feed stats, last-60-minute stats, feed top whales, and the leaderboard page are computed from the same current New York session key in the web client.
9. Follow state is stored locally and synced to the API after anonymous auth.

## API Endpoints Used

Public data:

- `GET /v1/whales?limit=100&minUsd=...&maxUsd=...&side=...&cursor=...`
- `GET /v1/whales/:tradeId`
- `GET /v1/whales/:tradeId/detail`
- `GET /v1/leaderboard?window=7d&limit=50&cursor=...`
- `GET /v1/traders/:wallet`
- `WS /v1/whales/stream`

Auth/follows:

- `POST /v1/auth/anonymous`
- `GET /v1/users/me/follows`
- `POST /v1/users/me/follows`
- `DELETE /v1/users/me/follows/:wallet`

Alerts:

- `POST /v1/alerts/subscribe`
- `DELETE /v1/alerts/subscribe`
- `GET /v1/alerts/me`

Web alerts use Firebase Web Messaging in `public/firebase-messaging-sw.js`. The website asks notification permission only when the user presses Activate, obtains a browser FCM token, then stores the same alert preferences through the existing authenticated alert subscription endpoint used by Android. This is additive: Android tokens still use the same collection and dispatcher, while web users are created with platform `web` once the API server supports that enum.

Important fallback behavior:

- `GET /v1/whales/:tradeId` can fail for some recent trades, so trade detail and feed hydration can fall back to searching the recent whale feed.
- `GET /v1/whales/:tradeId/detail` is the enhanced trade-detail endpoint. It is additive and should not replace the existing basic `/v1/whales/:tradeId` contract because the Android app also depends on that server.
- The trade detail page should tolerate the enhanced endpoint being unavailable by normalizing a basic trade into a reduced detail view.
- Following-only feed uses server auth when available. Without auth, it filters public feed results against local followed wallets.
- The production API supports `/v1/leaderboard?window=1d`, `7d`, `30d`, and `365d`. Use the API leaderboard for authoritative windows instead of client-derived rank fallbacks.

## Routes

Vite route selection still lives in `src/App.jsx` inside `App()`.

- `/` -> `WhaleFeedPage`
- `/about` -> `AboutPage`
- `/leaderboard` -> `LeaderboardPage`
- `/trade/:tradeId` -> `TradeDetailPage`
- `/trader/:wallet` -> `TraderProfilePage`
- `/profile` -> `ProfilePage`
- `/profile/following` -> `FollowingPage`
- `/alerts` -> `AlertsPage`
- `/privacy` -> `PrivacyPage`
- `/terms` -> `TermsPage`
- `/delete-data` -> `DeleteDataPage`

Next route shells live under `app/`.

Public SEO routes:

- `/`
- `/about`
- `/leaderboard`
- `/privacy`
- `/terms`
- `/delete-data`

Next app-only legacy wrappers:

- `/alerts`
- `/profile`
- `/profile/following`
- `/trade/[tradeId]`
- `/trader/[wallet]`

In the hybrid routes, server-rendered/public HTML is for crawlers and first paint. Browser interaction remains handled by the existing React app after hydration.

## Important Code Areas

`src/App.jsx`

- Top constants: API bases, localStorage keys, filters, sort options, legal links.
- `WhaleFeedPage`: main feed, filters, websocket subscription, NY session filtering, feed stats.
- `TradeRow`: visible feed row.
- `MarketIcon` and `getMarketImageUrls`: market image rendering.
- `mergeWhales`, `upsertWhale`, `mergeWhaleTrade`, `enrichWhaleWithExistingMarketMedia`, `hydrateWhaleTrade`: live/REST merge and market image hydration.
- `LeaderboardPage`, `LeaderboardRow`, `buildLeaderboardStats`: leaderboard UI and data summary.
- `TraderProfilePage`, `WalletAddressLine`, `DailyVolumeChart`: trader profile header, copy action, and profile chart.
- `FollowWalletButton`, follow helpers, auth helpers: follow/unfollow and anonymous auth.
- `FeedSidebar` / `NavItem`: left navigation, disabled profile item (`Coming soon`) behavior, and brand lockup text.
- `AlertsPage`: desktop + dedicated mobile render path with bottom nav support.
- `fetchJson`, `authFetchJson`, `buildWhalesPath`, `buildLeaderboardPath`: API wrappers.
- Legal page components near the bottom: privacy, terms, delete-data pages.
- SEO support is shared through `src/lib/seo.js` and `src/lib/next-metadata.js`. Client head synchronization still happens from `src/App.jsx`. Static crawler defaults remain in `index.html`, `public/robots.txt`, and `public/sitemap.xml`.

`app/`

- Public route shells for crawlable pages.
- `app/_components/HybridPublicRoute.jsx`: serves crawlable public HTML and hydrates into the legacy app for browser users.
- `app/_components/LegacyAppRoute.jsx` and `LegacyAppRouteClient.jsx`: route wrappers for app-only pages.
- `app/_components/PublicChrome.jsx`: reusable public SSR chrome.

`src/lib/`

- `seo.js`: canonical SEO route data and JSON-LD builders used by Vite and Next.
- `routes.js`: route matching shared by `src/App.jsx` and Next wrappers.
- `env.js`: public env lookup compatible with Vite and Next browser bundles.
- `next-metadata.js`: Next metadata conversion helpers.
- `server-api.js`: server-side API fetch helpers for Next routes.

`src/styles.css`

- Feed layout, sidebar, trade rows, market icons, stat strips.
- Leaderboard table and responsive row grids.
- Trader profile header, wallet address line, daily volume chart.
- Legal pages and mobile breakpoints.

`server.js`

- Serves `dist`.
- Proxies `/api/*` to `API_BASE_URL`.
- Uses SPA fallback to `dist/index.html` for client routes.

`vite.config.js`

- React plugin.
- Dev and preview proxy `/api` to `VITE_DEV_API_TARGET`.
- Suppresses Rollup warnings from package-level `"use client"` directives.

## UI/Product Rules Already Chosen

- The website is an actual app surface, not a marketing landing page.
- Keep dashboard UI dense, calm, and scan-friendly.
- Public-facing brand text is now `Polywhale` (while internal storage keys and some app constants still use `polywatch`).
- Feed market rows should show real API images only; empty market squares are a bug unless the API truly has no image anywhere.
- Feed visible data is today's New York session, not a rolling arbitrary list.
- "Today" means the date in `America/New_York`, resetting at New York midnight. Use the shared helpers in `src/App.jsx` (`getCurrentNewYorkSession`, `filterNewYorkSession`, `buildTodayLeaderboardFromTrades`) rather than adding new date logic.
- Keep trade intent wording as provided by the backend. Do not reinterpret BUY/SELL in the website; intent classification belongs upstream.
- The public web leaderboard is presented as `1D` and is today-scoped in the frontend. Trader profile stats still use the API's `7d` stats until the backend exposes profile stats for today. 30D and 1Y are visible but treated as future/locked UI.
- Do not add search bars back to the feed or leaderboard unless explicitly asked.
- Keep sidebar `Profile` nav item disabled unless specifically requested to reopen it.

## Today Session Implementation

The website now has a frontend fallback for a unified "today" system:

- `WhaleFeedPage` fetches and filters whale trades for the current New York date.
- Feed stat cards use `buildStats`, which filters to the current New York session.
- Last 60 minutes is computed from already session-filtered feed rows, so it does not bleed across midnight.
- Feed rail "Top whales today" uses `buildTodayLeaderboardFromTrades(sessionItems)`.
- `LeaderboardPage` fetches today's whale trades and derives ranks with `buildTodayLeaderboardFromTrades` instead of using the API's 7D leaderboard aggregate.
- Both feed and leaderboard pages schedule a refresh just after the next New York midnight via `getCurrentNewYorkSession().nextResetMs`.

This is intentionally a fallback. The authoritative implementation should move these aggregates to the API so stats and ranks are complete even when the web client has not paginated through every trade.

Recommended backend contract:

```text
GET /v1/dashboard/today?tz=America/New_York
GET /v1/whales?startTs=<ny_midnight_utc>&endTs=<next_ny_midnight_utc>&limit=100&cursor=...
GET /v1/leaderboard?window=today&limit=50&cursor=...
```

Recommended dashboard response fields:

```text
session: date, timezone, startTs, endTs, asOf, nextResetTs
stats: volume, activeWhales, megaTrades, biggestTradeUsd, biggestTradeSide, last60Volume, last60Count
leaderboard: rank, proxyWallet, displayName/pseudonym, volume, tradeCount, avgTrade
```

When the backend supports `window=today`, remove the frontend-derived leaderboard fallback and switch `LeaderboardPage` and `FeedRail` to the API response.

## Local Storage Keys

- `polywatch:webAuth`: anonymous auth token and user id.
- `polywatch:webDeviceId`: generated web device id.
- `polywatch:followedWallets`: local followed wallet list.
- `polywatch:webAlertPrefs`: web alert preferences, activation state, browser FCM token, permission snapshot, and last sync time.
- `polywatch:trade:{tradeId}`: sessionStorage cached trade for detail-page fallback.

## Testing Checklist

Before pushing:

1. Run `npm run next:build`.
2. Run `npm run build` when touching shared React/Vite code, shared styles, dependencies, or anything that should keep the legacy fallback working.
3. Open `/` and verify feed rows render market images, filters work, and no console errors appear.
4. Open `/leaderboard` and verify the table has no row-level `Whales` column and no `All markets` signal label.
5. Open a trader profile and verify short wallet title, full address copy button, profile chart, follow button, and recent trades.
6. Open a trade detail and verify market card, trader card, follow button, and back behavior.
7. Check responsive layout if the change touches grids, feed rows, profile header, or charts.
8. If changing metadata/SEO copy, verify `index.html`, `src/App.jsx`, `src/lib/seo.js`, and Next route metadata are aligned and contain no malformed encoding characters.
9. For Next branch routing changes, start local Next (`npm run next:start -- -p 3000`) and verify direct route refreshes, page source HTML, hydrated UI, `/api/*`, websocket connection, follows, alerts, and mobile views.

## Trade Detail Endpoint

The web trade detail route prefers `GET /v1/whales/:tradeId/detail`. The endpoint composes read-only data from existing watcher/server collections:

- `trade`: the original whale DTO.
- `market`: market metadata plus same-market execution-price history from recent whale trades.
- `trader`: wallet metadata plus 1D New York-session volume, rank, trade count, and recent trades.
- `relatedTrades`: today's other whale trades on the same market, matched by `market.conditionId` first and `market.slug` as fallback.
- `scenario`: formatted inputs for payout/loss/probability display.
- `onChain`: transaction hash plus Polygonscan URL.

Do not add watcher schema writes for this unless the backend explicitly needs richer market snapshots later. The current implementation is intentionally read-only and additive so the Android app can keep using the existing watcher/server contract.

## Deployment Notes

Railway uses `railway.json`:

- build: `npm run next:build`
- start: `npm run next:start -- -H 0.0.0.0 -p $PORT`

The production Next server rewrites `/api/*` to the production API by default. Set `API_BASE_URL` in Railway only if changing the backend target.

Cutover verification completed on 2026-05-06:

- Live `/` and `/leaderboard` source contain `next-app-snapshot`.
- Live pages load `/_next/static` assets.
- Live pages no longer serve the old Vite `<div id="root"></div>` shell.
- Live `/api/v1/leaderboard?window=1d&limit=1` returns data through the production domain.
- `robots.txt` and `sitemap.xml` return 200.

## Related System Context

The broader Polywatch system has three pieces:

- watcher service on Railway: watches Polymarket activity and publishes whale events upstream.
- API/server on Railway: exposes REST and websocket endpoints consumed here.
- Flutter app on the local PC: mobile app that shares the same product language and follow/alert concepts.

This repo only owns the web app and legal/static web pages.

## Caution For Future Agents

- Preserve existing user work. Check `git status` before edits.
- Prefer small, scoped UI changes in `src/App.jsx` and `src/styles.css`.
- Run the relevant build before committing.
- The Next production cutover is already complete; do not revert Railway to Vite unless explicitly requested as a rollback.
- Preserve watcher and API contracts. This repo consumes `/server` and `/watcher` behavior but should not silently change their assumptions.
- If changing live feed behavior, test both REST-loaded rows and websocket/new rows.
- If changing follow behavior, test logged-out local follows and anonymous-auth server sync.
- Keep legal URLs stable: `/privacy`, `/terms`, `/delete-data`.
