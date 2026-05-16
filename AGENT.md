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
- Leaderboard defaults to `Sort: Profit`, backed by the whale server's all-time `GET /v1/leaderboard?sort=profit` mode. Profit rows are ranked directly from resolved BUY `trade_outcomes` since tracking began, not from the active `1D`/`7D` window cohort. In the profit view, hide the day-window controls, show an `All-time P/L` label, show signed `Profit` as the primary right-side metric, show `P/L trades` from the all-time P/L trade count, and replace `Avg` with `All time winrate: <pct>` centered plus `Recent form:` before the latest 5 resolved W/L chips. The displayed percentage is the all-time resolved win rate (`allTimeWinRatePct`), not the win rate of only those five chips.
- Leaderboard row rank badges show the API volume rank only for `Sort: Volume`; for derived sorts such as `Trade count` or `Profit`, the badge should show the current sorted display position so users do not see stale volume ranks.
- Trader profile headers show a short wallet title such as `0xa2cd..`, full address underneath, and a copy button.
- Trader profile daily volume chart is a bar chart so one-day data does not render as an ugly triangle.
- Trader profile desktop/mobile design was rebuilt from the supplied mockups. Desktop uses the dashboard profile surface; mobile uses a dedicated compact profile view with top bar, identity card, performance card, window toggle, stat cards, charts, and bottom nav parity.
- Trader profile performance now fetches wallet history through `/v1/whales?limit=100&minUsd=10000&traderWallet=<wallet>&cursor=...` and merges it with `/v1/traders/:wallet` recent whales. Win/loss is inferred from backend resolution status and `pnlUsd`/profit fields when available.
- Trader profile headers now include an all-time `Profit` badge next to rank/follow. It sums realized wallet P/L from fetched history and must not change when the `1D`, `7D`, `30D`, or `1Y` window toggle changes.
- Trader profile time windows (`1D`, `7D`, `30D`, `1Y`) only affect windowed trade count, win rate, and volume stats. Longest win streak and recent W/L chips intentionally use full fetched history.
- Trader profile resolved performance prefers API fields from `profile.resolved`, computed from full `trade_outcomes` resolved BUY history in the whale server. Use `resolved.realizedPnlUsd` for the Profit badge, `resolved.longestWinStreak` for longest streak, `resolved.recentResults` for W/L chips, and `resolved.windows[windowId]` for resolved window win rate/trade count. The website only falls back to visible whale history when those backend fields are absent. The whale server caches this block per wallet briefly and indexes `trade_outcomes` for profile/profit reads.
- Trader profile W/L result chips are displayed newest first on the left, then older results to the right. The desktop large strip, desktop mini "Recent" tile, and mobile cells should all follow this order.
- Trader profile recent whale trades are shown on desktop and mobile, paginated client-side at 10 rows per page from the merged wallet history. The table shows compact numbered controls only when more than 10 loaded trades exist.
- Alerts now have a dedicated mobile screen path with bottom nav parity (`Feed`, `Leaders`, `Following`, `Alerts`) instead of relying on desktop layout classes.
- SSR mobile bottom nav snapshots must render the same Lucide icons as hydrated `MobileBottomNav`; do not use placeholder `<i>` boxes because they can flash during route transitions.
- Alerts channel cards (`Web push`, `Following mode`, `Minimum size`) stay in one row on mobile instead of stacking.
- Follow/unfollow buttons in the following list no longer trigger row navigation refresh; row navigation ignores nested interactive controls.
- Sidebar "Public web beta" panel was removed.
- Sidebar brand lockup now displays `Polywhale` with a small `trades` subtitle under it.
- Sidebar `Profile` tab is intentionally disabled and shows a `Coming soon` hover tooltip.
- GA4 is installed through `app/_components/GoogleAnalytics.jsx` and `src/lib/analytics.js`, with the legacy Vite fallback using `src/LegacyAnalytics.jsx`. The current default tag id is `G-TMS7KN5K7G`, gated to allowed production hosts. See `ANALYTICS.md`.
- SEO title/metadata defaults now use `Polywhale | Live Polymarket Whale Trades, Top Whales & Whale Feed`.
- Mojibake metadata strings were cleaned (for example broken `today...` characters in search snippets).
- Next.js SSR/SSG foundation was added in parallel with Vite on `codex/next-ssr-foundation`.
- Public SEO routes now have Next App Router route shells under `app/`.
- App-only routes are wired through a legacy client wrapper so existing interactive behavior stays owned by `src/App.jsx`.
- `/` and `/leaderboard` use a hybrid route that serves crawlable HTML first, then hydrates into the existing app UI in browsers.
- `/` and `/leaderboard` server snapshots were aligned with the existing app UI through `app/_components/PublicAppSnapshot.jsx`.
- Hybrid public routes now avoid Lighthouse CLS during hydration by keeping the SSR snapshot as a non-flowing overlay while the legacy React app mounts in the document flow. The homepage also passes server-loaded feed/dashboard data into `WhaleFeedPage` so hydration does not immediately replace the first viewport with a duplicate client fetch.
- `npm run test:cls` runs the Playwright layout-shift check in `scripts/check-cls.mjs`. Use `CLS_BASE_URL`, `CLS_ROUTES`, `CLS_THRESHOLD`, and optional `CLS_SCREENSHOT_DIR` to measure local or deployed pages.
- Railway production cutover to Next was completed and verified. Live source contains `next-app-snapshot` and `/_next/static`, not the old Vite `<div id="root"></div>` shell.
- Market landing page MVP was added at `/market/[slug]` as a native Next server route. It keeps the Polywhale dashboard frame, uses the exact market title as the H1, renders market-specific whale stats/recent trades/top wallets, 404s unknown slugs, and marks weak known markets `noindex,follow`.
- Feed market icons/titles now link to `/market/[slug]` while row click still opens `/trade/[tradeId]`.
- `/sitemap.xml` is generated by Next as a direct URL-set sitemap containing static pages, qualified market pages, trader profiles, Q&A pages, and compare pages.
- `/sitemap-markets.xml` includes only qualified market pages: at least 3 tracked whale trades and at least $50K tracked whale volume.
- Enriched market-page pipeline is implemented across `D:\whalebackend\whale-watcher`, `D:\whaleserver\api-server`, and this website. The website prefers `/v1/market-pages` and falls back to whale-feed scanning while backend deployments roll out.
- Q&A SEO hub is live at `/qa` with static question pages at `/qa/[slug]`. Legacy `/qna` and `/qna/[slug]` permanently redirect to the canonical `/qa` routes. Q&A content is generated from `qna_sample.json` through `src/lib/qna.js` and has a dedicated `/sitemap-qa.xml`.
- Trader profile SEO pages now use a native Next server route at `/trader/[wallet]` with crawlable `TraderProfileSnapshot` HTML, profile JSON-LD, canonical wallet URLs, pseudonym alias redirects when resolvable, and `/sitemap-traders.xml`.
- Compare SEO pages are live at `/compare` and `/compare/polymarket-vs-kalshi`. They are native Next pages backed by `src/lib/compare-pages.js`, use Article/WebPage/Breadcrumb JSON-LD, source links, official logo assets, and `/sitemap-compare.xml`.
- News SEO pages are live at `/news` and `/news/[slug]`. The website fetches published articles from the separate `D:\autonews` Railway service through `AUTONEWS_BASE_URL`, renders them under the existing Polywhale dashboard chrome, includes article URLs in `/sitemap.xml`, and exposes a Google News sitemap at `/sitemap-news.xml`. Article pages consume autonews `image`, `byline`, `sourceLinks`, and `editorialDisclosure` fields when present; `/news/[slug]/image.svg` proxies the generated autonews article image onto the canonical website domain for Open Graph, Twitter, and NewsArticle metadata.

## Project Shape

```text
D:\polywatch-website
  AGENT.md                 This handoff file.
  README.md                Short public/developer overview.
  package.json             npm scripts and dependencies.
  package-lock.json        Locked dependency tree.
  next.config.mjs          Next config.
  vite.config.js           Vite React config and dev/preview `/api` proxy.
  server.js                Production static server plus `/api` proxy.
  railway.json             Railway build/start config.
  index.html               Vite HTML shell.
  NEXT_SSR_MIGRATION_PLAN.md
                           Phased Next SSR migration plan and implementation log.
  app/                     Next App Router public routes and legacy app route wrappers.
    api/[...path]/         Next API proxy route for `/api/*`.
    sitemap.xml/           Root all-in URL-set sitemap route.
    sitemap-static.xml/    Dedicated static-page sitemap route.
    sitemap-markets.xml/   Dedicated market-page sitemap route.
    sitemap-news.xml/      Google News sitemap route for fresh news articles.
    sitemap-compare.xml/   Dedicated compare-page sitemap route.
    sitemap-qa.xml/        Dedicated Q&A sitemap route.
    sitemap-traders.xml/   Dedicated trader-profile sitemap route.
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
    lib/
      env.js               Shared public env reader for Vite and Next browser bundles.
      compare-pages.js     Native compare page metadata, copy, source links, and JSON-LD.
      news-pages.js        Autonews article API adapter, news metadata helpers, and structured data.
      qna.js               Q&A route data, search/grouping helpers, metadata, and JSON-LD.
      trader-pages.js      Trader profile SEO fetching, sitemap source, alias resolution, metadata, and JSON-LD.
      next-metadata.js     Next metadata helpers.
      routes.js            Shared route matching helpers.
      seo.js               Shared SEO metadata and JSON-LD helpers.
      sitemap-pages.js     Static page list shared by root and static sitemaps.
      sitemap-xml.js       XML builders shared by sitemap routes.
      market-pages.js      Server-side market page API adapter with whale-feed fallback.
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
npm run test:cls
```

Use `npm run next:build` before pushing changes that affect production. `npm run next:start` serves the Next production build.

Run `npm run build` as well when changes affect shared legacy Vite code, `src/App.jsx`, `src/styles.css`, dependencies, or anything that could break the fallback build. `npm start` serves the legacy Vite `dist` folder with `server.js`.

Use `npm run test:cls` against a running Next production server when changing hybrid public routes, first-viewport layout, image dimensions, or skeleton/loading behavior. Example:

```powershell
$env:CLS_BASE_URL='http://127.0.0.1:3100'
$env:CLS_ROUTES='/,/leaderboard,/trader/0x88c4919de76e526d55a32c1f8afb439dd1f1129a'
npm run test:cls
```

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
- `VITE_GA_MEASUREMENT_ID`: Optional GA4 measurement id for the legacy Vite path.
- `VITE_GA_ALLOWED_HOSTS`: Comma-separated host allowlist for GA collection. Defaults to the canonical production hosts.
- `VITE_GA_USE_DEFAULT_ID`: Defaults to `true`; allows fallback to the current production GA4 id when no explicit id is set.
- `VITE_GA_DEBUG`: Set to `true` only for local GA DebugView checks.

Next public env compatibility:

- `NEXT_PUBLIC_API_BASE_URL`: browser REST base equivalent for Next bundles. `src/lib/env.js` prefers Vite values when present, then Next values, then fallback defaults.
- `NEXT_PUBLIC_WS_BASE_URL`: browser websocket base equivalent for Next bundles.
- `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`, `NEXT_PUBLIC_FIREBASE_VAPID_KEY`: Next equivalents for Firebase browser config.
- `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_GA_ALLOWED_HOSTS`, `NEXT_PUBLIC_GA_USE_DEFAULT_ID`, `NEXT_PUBLIC_GA_DEBUG`: Next equivalents for GA4. Production should use `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-TMS7KN5K7G` and `NEXT_PUBLIC_GA_ALLOWED_HOSTS=www.polywhaletrades.com,polywhaletrades.com`.

Production server:

- `PORT`: server port. Defaults to `4173`.
- `API_BASE_URL`: upstream target for the Next `app/api/[...path]` proxy route, `server.js` `/api` proxy, and Next server helpers. Defaults to production API.
- `AUTONEWS_BASE_URL`: base URL for the separate autonews Railway service, used by `/news`, `/news/[slug]`, `/sitemap.xml`, and `/sitemap-news.xml`. Values with or without `https://` are accepted, but Railway should normally use the full URL such as `https://autonews-production-xxxx.up.railway.app`.

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
10. News pages fetch article JSON from the autonews service (`GET /v1/news` and `GET /v1/news/:slug`) and render canonical URLs on `www.polywhaletrades.com/news/...`.

Crawler/resource behavior:

- `robots.txt` allows Googlebot, Bingbot, and DuckDuckBot to fetch `/api/*` resources because the hydrated public pages use those JSON requests during rendering checks in Search Console.
- The generic `User-agent: *` group still disallows `/api/` to reduce broad crawler traffic.
- Next and the legacy `server.js` API proxies add `X-Robots-Tag: noindex, nofollow` to `/api/*` responses so API JSON can be fetched as a page resource without being intended for search indexing.

## API Endpoints Used

Public data:

- `GET /v1/whales?limit=100&minUsd=...&maxUsd=...&side=...&cursor=...`
- `GET /v1/whales?limit=100&minUsd=10000&traderWallet=...&cursor=...`
- `GET /v1/whales/:tradeId`
- `GET /v1/whales/:tradeId/detail`
- `GET /v1/leaderboard?window=1d|7d|30d|365d&limit=50&cursor=...`
- `GET /v1/leaderboard?sort=profit&limit=50&cursor=...`
- `GET /v1/traders/:wallet`
- `WS /v1/whales/stream`

Autonews data:

- `GET <AUTONEWS_BASE_URL>/v1/news?limit=...`
- `GET <AUTONEWS_BASE_URL>/v1/news/:slug`

`GET /v1/traders/:wallet` may include `resolved` metrics computed by the whale server from full `trade_outcomes` resolved BUY history: all-time realized P/L, longest win streak, recent W/L results, and resolved `1d`/`7d`/`30d`/`365d` window summaries. Trader profile UI should prefer those authoritative values over frontend reconstruction from visible whale trades.

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
- The production API supports `/v1/leaderboard?sort=profit` for the authoritative all-time profit leaderboard. This mode ignores `window` for row selection and returns server-cached all-time profit fields: `allTimeProfitUsd`, `allTimeProfitKnown`, `allTimePnlTradeCount`, `allTimeWinRatePct`, `recentFormResults`, and `recentFormWinRatePct`. The website should hide time-window controls in profit mode and avoid per-visitor history crawling when these fields are present.

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
- `/compare`
- `/compare/polymarket-vs-kalshi`
- `/news`
- `/news/[slug]`
- `/market/[slug]`
- `/qa`
- `/qa/[slug]`
- `/trader/[wallet]`
- `/privacy`
- `/terms`
- `/delete-data`

Redirect-only SEO aliases:

- `/qna` -> `/qa`
- `/qna/[slug]` -> `/qa/[slug]`

Next app-only legacy wrappers:

- `/alerts`
- `/profile`
- `/profile/following`
- `/trade/[tradeId]`

In the hybrid routes, server-rendered/public HTML is for crawlers and first paint. Browser interaction remains handled by the existing React app after hydration.

Market pages are not hybrid legacy wrappers. `/market/[slug]` is a native Next server page. It prefers the API server's enriched `/v1/market-pages/:slug` response, which is populated by the watcher `market_page_snapshots` worker. Unknown market slugs return 404. Known but weak markets render with `noindex,follow`; qualified markets become indexable and are included in `/sitemap-markets.xml`. The old whale-feed scan remains as fallback for safe deployment order.

Trader profile pages are also native Next public routes. `/trader/[wallet]` fetches `/v1/traders/:wallet`, renders crawlable profile summary HTML through `app/_components/TraderProfileSnapshot.jsx`, emits profile JSON-LD, and then hydrates into the existing interactive React profile. Non-wallet aliases are resolved from the trader index when possible and permanently redirected to the canonical lowercase wallet URL.

Q&A pages are static Next SEO pages. `/qa` is the canonical hub and `/qa/[slug]` statically renders one question per published `qna_sample.json` item; `/qna/*` remains only as a permanent redirect alias. Query searches on `/qa?q=...` are `noindex,follow`.

Compare pages are native Next SEO pages. `/compare` is the hub and `/compare/polymarket-vs-kalshi` is the first comparison page, focused on fees, regulation, funding, market coverage, and Polywhale's wallet-transparency angle. Add new comparison pages through `src/lib/compare-pages.js` and they will flow into `/compare`, `/sitemap.xml`, and `/sitemap-compare.xml`.

News pages are native Next SEO pages backed by `src/lib/news-pages.js` and the separate `D:\autonews` service. `/news` is the public hub, `/news/[slug]` renders a crawlable article with NewsArticle JSON-LD, and article URLs flow into `/sitemap.xml`. `/news/[slug]/image.svg` proxies the autonews generated SVG image for the canonical domain, and article metadata uses the article-specific image instead of the generic site logo when available. `/sitemap-news.xml` is a Google News sitemap containing only articles published in the last 48 hours. In Search Console, submit `sitemap.xml` and `sitemap-news.xml`; the latter may temporarily contain zero URLs when no recent articles exist.

## Important Code Areas

`src/App.jsx`

- Top constants: API bases, localStorage keys, filters, sort options, legal links.
- `WhaleFeedPage`: main feed, filters, websocket subscription, NY session filtering, feed stats.
- `TradeRow`: visible feed row.
- `MarketIcon` and `getMarketImageUrls`: market image rendering.
- `mergeWhales`, `upsertWhale`, `mergeWhaleTrade`, `enrichWhaleWithExistingMarketMedia`, `hydrateWhaleTrade`: live/REST merge and market image hydration.
- `LeaderboardPage`, `LeaderboardRow`, `buildLeaderboardStats`, `fetchLeaderboardProfitSummaries`: leaderboard UI, data summary, and all-time profit sort enrichment.
- `TraderProfilePage`, `MobileWalletProfileView`, `WalletProfileRedesign`, `WalletProfilePerformanceBlock`, `WalletRecentTradesTable`, `buildWalletPerformance`, `buildWalletMarketResultEntries`, `buildWalletProfitSummary`, `fetchTraderHistory`: trader profile loading, desktop/mobile rendering, API-backed resolved performance with visible-history fallbacks, all-time profit badge, recent result chips, and recent trade pagination.
- `FollowWalletButton`, follow helpers, auth helpers: follow/unfollow and anonymous auth.
- `FeedSidebar` / `NavItem`: left navigation, disabled profile item (`Coming soon`) behavior, and brand lockup text.
- `AlertsPage`: desktop + dedicated mobile render path with bottom nav support.
- `fetchJson`, `authFetchJson`, `buildWhalesPath`, `buildLeaderboardPath`: API wrappers.
- Legal page components near the bottom: privacy, terms, delete-data pages.
- SEO support is shared through `src/lib/seo.js` and `src/lib/next-metadata.js`. Client head synchronization still happens from `src/App.jsx`. Static crawler defaults remain in `index.html` and `public/robots.txt`.

`app/`

- Public route shells for crawlable pages.
- `app/_components/HybridPublicRoute.jsx`: serves crawlable public HTML and hydrates into the legacy app for browser users.
- `app/_components/LegacyAppRoute.jsx` and `LegacyAppRouteClient.jsx`: route wrappers for app-only pages.
- `app/_components/PublicChrome.jsx`: reusable public SSR chrome.
- `app/_components/NewsLayout.jsx`: reusable News sidebar, rail, mobile nav, and article helpers.

`src/lib/`

- `seo.js`: canonical SEO route data and JSON-LD builders used by Vite and Next.
- `routes.js`: route matching shared by `src/App.jsx` and Next wrappers.
- `env.js`: public env lookup compatible with Vite and Next browser bundles.
- `next-metadata.js`: Next metadata conversion helpers.
- `server-api.js`: server-side API fetch helpers for Next routes.
- `market-pages.js`: native market-page API adapter and whale-feed fallback.
- `trader-pages.js`: native trader-profile SEO adapter, canonical wallet helpers, alias lookup, sitemap source, and JSON-LD.
- `qna.js`: Q&A content normalization, search/grouping, metadata, and structured data.
- `compare-pages.js`: comparison page registry, copy, source links, metadata, and structured data.
- `news-pages.js`: autonews API reads, canonical news paths, metadata descriptions, and NewsArticle structured data.
- `sitemap-pages.js`: static URL registry used by root and static sitemaps.
- `sitemap-xml.js`: shared XML escaping and sitemap URL-set builder.

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
- Leaderboard `Profit` sort is the default sort and must use `/v1/leaderboard?sort=profit` and all-time realized P/L from resolved BUY outcomes, not the selected window's volume/trade aggregate. Time-window controls must be hidden in profit mode and must not affect profit fetches, rows, ranks, or values. Do not show volume as the primary metric in profit sort; show signed profit, the all-time P/L trade count, centered `All time winrate: <pct>`, and `Recent form:` plus the latest 5-trade W/L form instead of average trade size.
- Trader profile performance window toggles must not change full-history fields: all-time profit, longest win streak, and recent W/L chips are based on full resolved wallet history. Prefer `profile.resolved` for these values; only use grouped visible whale history as a frontend fallback. Windowed win rate and its adjacent trade count should prefer `profile.resolved.windows[windowId]` when available so both numbers describe the same resolved BUY-trade set. The W/L chip order is newest on the left, older to the right.
- Trader profile recent trades should keep 10 rows per page unless the user asks for a different density. Pagination is client-side over the already-loaded merged wallet history, not backend numbered pages.
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
5. On `/leaderboard`, verify `Sort: Profit` is selected by default and rows show/sort by signed all-time profit, not volume; each profit row should show `All time winrate: <pct>` and `Recent form:` chips from the latest 5 resolved wallet trades instead of `Avg`. Switching away from and back to Profit must not recompute a wallet's profit from a time window.
6. Open a trader profile and verify short wallet title, full address copy button, all-time Profit badge, market-level longest win streak, profile chart, follow button, recent trades on desktop/mobile, 10-row recent-trades pagination, and newest-left W/L chip order.
7. Open a trade detail and verify market card, trader card, follow button, and back behavior.
8. Check responsive layout if the change touches grids, feed rows, profile header, or charts.
9. If changing metadata/SEO copy, verify `index.html`, `src/App.jsx`, `src/lib/seo.js`, and Next route metadata are aligned and contain no malformed encoding characters.
10. For SEO route changes, verify source HTML and JSON-LD for affected native pages such as `/market/[slug]`, `/trader/[wallet]`, `/qa`, `/qa/[slug]`, `/compare`, and `/compare/polymarket-vs-kalshi`.
11. Verify `/sitemap.xml` plus the dedicated `/sitemap-static.xml`, `/sitemap-markets.xml`, `/sitemap-news.xml`, `/sitemap-qa.xml`, `/sitemap-traders.xml`, and `/sitemap-compare.xml` routes when changing those page families.
12. For robots/API SEO changes, verify Googlebot can access `/api/*` in `robots.txt` and that `/api/*` responses include `X-Robots-Tag: noindex, nofollow`.
13. For Next branch routing changes, start local Next (`npm run next:start -- -p 3000`) and verify direct route refreshes, page source HTML, hydrated UI, `/api/*`, websocket connection, follows, alerts, and mobile views.
14. For analytics changes, follow `ANALYTICS.md`: verify one manual GA4 `page_view` per route change, confirm consent choices persist, and keep GA4 Enhanced Measurement history page views disabled to avoid duplicates.

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

The production Next server proxies `/api/*` through `app/api/[...path]/route.js` to the production API by default. Set `API_BASE_URL` in Railway only if changing the backend target.

Cutover verification completed on 2026-05-06:

- Live `/` and `/leaderboard` source contain `next-app-snapshot`.
- Live pages load `/_next/static` assets.
- Live pages no longer serve the old Vite `<div id="root"></div>` shell.
- Live `/api/v1/leaderboard?window=1d&limit=1` returns data through the production domain.
- `robots.txt` and `sitemap.xml` return 200.

SEO/domain verification on 2026-05-07:

- Search Console screenshot showed `Page is indexed`, crawl allowed, page fetch successful, and indexing allowed. The sitemap discovery field showed `Temporary processing error`, which is a Google Search Console reporting state, not proof that the live sitemap is broken.
- Export `D:\https___www.polywhaletrades.com_-Coverage-Valid-2026-05-07.zip` contained valid coverage rows only for `/`, `/privacy`, and `/delete-data`.
- Live `https://www.polywhaletrades.com/sitemap.xml` returned 200 valid XML with 674 URLs at check time: 250 market URLs, 215 Q&A URLs, and 203 trader URLs. Live `sitemap-qa.xml` and `sitemap-traders.xml` also returned 200 valid XML.
- Live `robots.txt` listed `sitemap.xml`, `sitemap-qa.xml`, `sitemap-traders.xml`, and `sitemap-compare.xml`.
- `www.polywhaletrades.com` is the canonical production host and points to Railway through GoDaddy DNS: `CNAME www -> 2m0bulvr.up.railway.app`.
- The root/apex `polywhaletrades.com` is currently handled by GoDaddy forwarding, not Railway. GoDaddy created locked A records `@ -> 15.197.225.128` and `@ -> 3.33.251.168`, plus a permanent forwarding rule to `https://www.polywhaletrades.com`.
- At check time, `http://polywhaletrades.com/` redirected to `https://www.polywhaletrades.com/`, but `https://polywhaletrades.com/` failed during TLS before a redirect. That means the GoDaddy HTTPS forwarding certificate is stuck or not provisioned. Railway cannot fix that request path because it never reaches Railway.
- GoDaddy DNS does not accept Railway's `CNAME @ -> <railway>.up.railway.app` apex record. While using GoDaddy forwarding, keep only `www.polywhaletrades.com` as the Railway custom domain. If apex HTTPS forwarding remains broken, ask GoDaddy to re-provision SSL for HTTPS forwarding on `polywhaletrades.com`, or move DNS to a provider with apex CNAME flattening/ALIAS support such as Cloudflare.

SEO route verification on 2026-05-08:

- Live `/compare`, `/compare/polymarket-vs-kalshi`, `/sitemap.xml`, `/sitemap-compare.xml`, `/sitemap-qa.xml`, `/sitemap-traders.xml`, and `/robots.txt` all returned 200 from `https://www.polywhaletrades.com`.
- Live `/sitemap.xml`, `/sitemap-compare.xml`, and `/robots.txt` contained compare references, including `polymarket-vs-kalshi` or `sitemap-compare.xml`.

Sitemap route update on 2026-05-09:

- `/sitemap.xml` is a direct URL-set sitemap with every canonical public SEO URL family: static pages, qualified markets, trader profiles, Q&A pages, compare pages, the news hub, and published news articles.
- Dedicated sitemap routes also exist at `/sitemap-static.xml`, `/sitemap-markets.xml`, `/sitemap-news.xml`, `/sitemap-traders.xml`, `/sitemap-qa.xml`, and `/sitemap-compare.xml` for Search Console diagnostics by page family.
- `robots.txt` lists the root all-in sitemap and all dedicated sitemap routes so crawlers can discover either path. For Google Search Console, submit `sitemap.xml` and `sitemap-news.xml`; the news sitemap is intentionally limited to recent articles.

Googlebot API resource update on 2026-05-09:

- Search Console live testing reported blocked page resources because `robots.txt` disallowed `/api/` while the hydrated app fetches `/api/v1/...` JSON.
- `robots.txt` now allows `/api/` for Googlebot, Bingbot, and DuckDuckBot, while keeping `/api/` disallowed for the generic `User-agent: *` group.
- `app/api/[...path]/route.js` and `server.js` add `X-Robots-Tag: noindex, nofollow` on `/api/*` responses so crawlers can render public pages without API JSON being treated as indexable content.

## Related System Context

The Railway-backed Polywhale system is split across four local project directories:

1. `D:\polywatch-website`: this repo. Owns the public web app, Next SEO routes, legal/static pages, browser follows/alerts UI, and the frontend consumption of the whale API. Production deploys from this repo through Railway's Next build/start commands.
2. `D:\whaleserver\api-server`: whale server/API. Owns REST and websocket contracts such as `/v1/whales`, `/v1/traders/:wallet`, `/v1/leaderboard`, follows/auth, alerts, trade detail composition, and the public SEO snapshot endpoints such as `/v1/market-pages` and `/v1/trader-pages` when available.
3. `D:\whalebackend\whale-watcher`: whale watcher. Watches Polymarket activity, normalizes whale trades, publishes/stores trade events for the API, and populates enriched market-page snapshot data used by the website's `/market/[slug]` routes.
4. `D:\Resolution-tracker`: market resolution service. Tracks market outcomes/resolution state and writes or publishes resolution fields consumed by the API and website, including statuses such as `resolved_win`/`resolved_loss`, `winningOutcome`, `payoutUsd`, `pnlUsd`, `resolvedAt`, and `closed`.
5. `D:\autonews`: automated news worker and article API. Watches Redis whale/resolution events, writes `news_articles`, uses MiniMax through `MINIMAX_API_KEY` with template fallback, and serves article JSON for this website's `/news` routes.

The Flutter/mobile app is separate local client work under `D:\whaletracker`. It shares product language and API concepts, but it is not one of the four Railway service directories above.

This repo only owns the web app and legal/static web pages. Do not silently change server, watcher, or resolution-service behavior from here; coordinate contract changes in the owning directory and keep this website tolerant of rollout order.

## Caution For Future Agents

- Preserve existing user work. Check `git status` before edits.
- Prefer small, scoped UI changes in `src/App.jsx` and `src/styles.css`.
- Run the relevant build before committing.
- The Next production cutover is already complete; do not revert Railway to Vite unless explicitly requested as a rollback.
- Preserve watcher, API, and market-resolution contracts. This repo consumes behavior from `D:\whaleserver\api-server`, `D:\whalebackend\whale-watcher`, and `D:\Resolution-tracker`; do not silently change their assumptions from the website.
- If changing live feed behavior, test both REST-loaded rows and websocket/new rows.
- If changing follow behavior, test logged-out local follows and anonymous-auth server sync.
- Keep legal URLs stable: `/privacy`, `/terms`, `/delete-data`.
