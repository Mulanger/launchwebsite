# Polywatch Website Agent Handoff

This repo is the React/Vite web version of Polywatch. It is not the Flutter app and it is not the Railway API server. The website consumes the same whale-trade API used by the app and presents a public live feed, leaderboard, trader profiles, trade details, alert/profile placeholders, and Google Play legal pages.

## Current Status

- Main branch: `main`
- Git remote: `https://github.com/Mulanger/launchwebsite.git`
- Production host: Railway
- Production API default: `https://whaleserver-production.up.railway.app`
- Local development typically runs through Vite or preview on `127.0.0.1`

Recent important work:

- Feed uses the current New York trading session for "Today's whale volume" and feed visibility.
- Feed sort is limited to `Most recent` and `Largest size`.
- Market images are hydrated for live websocket trades so new rows do not remain as empty fallback squares.
- Leaderboard rows show volume, trade count, and average trade. The confusing row-level "Whales" column and "All markets" label were removed.
- Trader profile headers show a short wallet title such as `0xa2cd..`, full address underneath, and a copy button.
- Trader profile daily volume chart is a bar chart so one-day data does not render as an ugly triangle.

## Project Shape

```text
D:\polywatch-website
  AGENT.md                 This handoff file.
  README.md                Short public/developer overview.
  package.json             npm scripts and dependencies.
  package-lock.json        Locked dependency tree.
  vite.config.js           Vite React config and dev/preview `/api` proxy.
  server.js                Production static server plus `/api` proxy.
  railway.json             Railway build/start config.
  index.html               Vite HTML shell.
  public/
    favicon.png
    site.webmanifest
    robots.txt
    assets/
      polywatch-icon.png
      screen-alerts.png
      screen-leaderboard.png
      screen-live-feed.png
  src/
    main.jsx               React entrypoint.
    App.jsx                All routes, components, data fetching, state, and helpers.
    styles.css             Global app styling and responsive rules.
  dist/                    Build output from `npm run build`; do not edit manually.
```

## Commands

```powershell
npm install
npm run dev
npm run build
npm run preview
npm start
```

Use `npm run build` before pushing UI or API changes. `npm start` serves the built `dist` folder with `server.js`.

## Environment Variables

Frontend/Vite:

- `VITE_API_BASE_URL`: REST base used by `src/App.jsx`. Defaults to `/api`.
- `VITE_WS_BASE_URL`: websocket base. Defaults to `https://whaleserver-production.up.railway.app`, normalized to `wss://...`.
- `VITE_DEV_API_TARGET`: Vite dev/preview proxy target for `/api`. Defaults to production API.

Production server:

- `PORT`: server port. Defaults to `4173`.
- `API_BASE_URL`: upstream target for `server.js` `/api` proxy. Defaults to production API.

## Runtime Data Flow

1. Browser loads the SPA from Vite or `server.js`.
2. REST calls go through `apiBaseUrl`, usually `/api`, which is proxied to the Railway API.
3. Live whale updates connect directly to `/v1/whales/stream` using `VITE_WS_BASE_URL` or the production API default.
4. The feed initial load fetches REST pages for today's New York session.
5. Websocket trades are inserted at the top, filtered client-side, then hydrated/merged when image metadata is missing.
6. Follow state is stored locally and synced to the API after anonymous auth.

## API Endpoints Used

Public data:

- `GET /v1/whales?limit=100&minUsd=...&maxUsd=...&side=...&cursor=...`
- `GET /v1/whales/:tradeId`
- `GET /v1/leaderboard?window=7d&limit=50&cursor=...`
- `GET /v1/traders/:wallet`
- `WS /v1/whales/stream`

Auth/follows:

- `POST /v1/auth/anonymous`
- `GET /v1/users/me/follows`
- `POST /v1/users/me/follows`
- `DELETE /v1/users/me/follows/:wallet`

Important fallback behavior:

- `GET /v1/whales/:tradeId` can fail for some recent trades, so trade detail and feed hydration can fall back to searching the recent whale feed.
- Following-only feed uses server auth when available. Without auth, it filters public feed results against local followed wallets.

## Routes

All route selection lives in `src/App.jsx` inside `App()`.

- `/` -> `WhaleFeedPage`
- `/leaderboard` -> `LeaderboardPage`
- `/trade/:tradeId` -> `TradeDetailPage`
- `/trader/:wallet` -> `TraderProfilePage`
- `/profile` -> `ProfilePage`
- `/profile/following` -> `FollowingPage`
- `/alerts` -> `AlertsPage`
- `/privacy` -> `PrivacyPage`
- `/terms` -> `TermsPage`
- `/delete-data` -> `DeleteDataPage`

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
- `fetchJson`, `authFetchJson`, `buildWhalesPath`, `buildLeaderboardPath`: API wrappers.
- Legal page components near the bottom: privacy, terms, delete-data pages.

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
- Feed market rows should show real API images only; empty market squares are a bug unless the API truly has no image anywhere.
- Feed visible data is today's New York session, not a rolling arbitrary list.
- Keep trade intent wording as provided by the backend. Do not reinterpret BUY/SELL in the website; intent classification belongs upstream.
- 7D is the active public leaderboard/profile window. 30D and 1Y are visible but treated as future/locked UI.
- Do not add search bars back to the feed or leaderboard unless explicitly asked.

## Local Storage Keys

- `polywatch:webAuth`: anonymous auth token and user id.
- `polywatch:webDeviceId`: generated web device id.
- `polywatch:followedWallets`: local followed wallet list.
- `polywatch:webAlertPrefs`: web alert preference placeholders.
- `polywatch:trade:{tradeId}`: sessionStorage cached trade for detail-page fallback.

## Testing Checklist

Before pushing:

1. Run `npm run build`.
2. Open `/` and verify feed rows render market images, filters work, and no console errors appear.
3. Open `/leaderboard` and verify the table has no row-level `Whales` column and no `All markets` signal label.
4. Open a trader profile and verify short wallet title, full address copy button, profile chart, follow button, and recent trades.
5. Open a trade detail and verify market card, trader card, follow button, and back behavior.
6. Check responsive layout if the change touches grids, feed rows, profile header, or charts.

## Deployment Notes

Railway uses `railway.json`:

- build: `npm run build`
- start: `npm start`

The production server defaults to the production API. Set `API_BASE_URL` in Railway only if changing the backend target.

## Related System Context

The broader Polywatch system has three pieces:

- watcher service on Railway: watches Polymarket activity and publishes whale events upstream.
- API/server on Railway: exposes REST and websocket endpoints consumed here.
- Flutter app on the local PC: mobile app that shares the same product language and follow/alert concepts.

This repo only owns the web app and legal/static web pages.

## Caution For Future Agents

- Preserve existing user work. Check `git status` before edits.
- Prefer small, scoped UI changes in `src/App.jsx` and `src/styles.css`.
- Run the build before committing.
- If changing live feed behavior, test both REST-loaded rows and websocket/new rows.
- If changing follow behavior, test logged-out local follows and anonymous-auth server sync.
- Keep legal URLs stable: `/privacy`, `/terms`, `/delete-data`.
