# Polywhale Next.js SSR Migration Plan

## Goal

Move Polywhale from a Vite client-rendered SPA to a durable SEO foundation where public routes return meaningful HTML on the initial response, while preserving the existing live dashboard behavior and avoiding regressions in the API server and watcher projects.

This plan treats the web app, API server, and watcher as separate systems:

- Web app: `D:\polywatch-website`
- API/server: external sibling project, currently exposed through `https://whaleserver-production.up.railway.app`
- Watcher: external sibling project that produces whale events consumed by the API

The migration should not require watcher changes. API changes should be additive only and hidden behind versioned/public endpoints.

## Implementation Log

- 2026-05-06: Created this migration plan on branch `codex/next-ssr-foundation`.
- 2026-05-06: Started Phase 1 by extracting reusable, browser-independent SEO metadata into `src/lib/seo.js`.
- 2026-05-06: Started route preparation by adding `src/lib/routes.js` so route matching can run without directly reading `window` during React render.
- 2026-05-06: Updated `src/App.jsx` to accept an optional `initialPath`, which is a prerequisite for server rendering the same app tree later.
- 2026-05-06: Installed Next.js in parallel and added `next:dev`, `next:build`, and `next:start` scripts without changing the current Vite production build path.
- 2026-05-06: Added `next.config.mjs` with a `/api/*` rewrite to preserve the existing web-to-API proxy shape during the future cutover.
- 2026-05-06: Added server-rendered public Next routes for `/`, `/about`, `/leaderboard`, `/privacy`, `/terms`, and `/delete-data`.
- 2026-05-06: Added `src/lib/server-api.js` so Next server routes can fetch public whale and leaderboard data without coupling to browser code.
- 2026-05-06: Verified `npm run next:build` and existing `npm run build` both pass. Next generated static/ISR HTML files for the public routes under `.next/server/app`.
- 2026-05-06: Added app-only Next route files for `/alerts`, `/profile`, `/profile/following`, `/trade/[tradeId]`, and `/trader/[wallet]`.
- 2026-05-06: Added `LegacyAppRoute` and `LegacyAppRouteClient` so app-only routes can keep using the existing hydrated React app without server-prerendering browser-only code.
- 2026-05-06: Added `src/lib/env.js` to make shared code read Vite and Next public environment variables safely.
- 2026-05-06: Verified the expanded route set with `npm run next:build`; Next now recognizes static app-only routes and dynamic trade/trader routes.
- 2026-05-06: Ran steps 1-4 validation before cutover: reviewed branch diff, started `next start` locally on port 3000, verified direct route HTTP 200s, verified `/api/*` proxy response, checked route refreshes in the browser, and confirmed the production websocket endpoint opens.
- 2026-05-06: Found that pure public `/` and `/leaderboard` pages would replace the existing interactive feed/leaderboard for users. Added `HybridPublicRoute` so those routes keep crawlable server HTML but hydrate into the legacy app UI in the browser.
- 2026-05-06: Verified `/`, `/leaderboard`, `/alerts`, and `/profile/following` in the in-app browser at a mobile-sized viewport with no console errors. Also verified following-list navigation to `/leaderboard` and alerts bottom-nav navigation back to `/`.
- 2026-05-06: Replaced the initial public `/` and `/leaderboard` SSR snapshots with app-aligned dashboard markup through `PublicAppSnapshot`. The snapshots now use the app-style feed, leaderboard, filters, stat panels, mobile bottom nav, and the same `1020px` mobile breakpoint before hydration.
- 2026-05-06: Updated `railway.json` to run `npm run next:build` and `npm run next:start -- -H 0.0.0.0 -p $PORT`.
- 2026-05-06: Verified production cutover on `https://www.polywhaletrades.com`: `/` and `/leaderboard` source contain `next-app-snapshot` and `/_next/static`, the old Vite `<div id="root"></div>` shell is gone, route metadata is server-generated, `/api/v1/leaderboard?window=1d&limit=1` works, and `robots.txt` plus `sitemap.xml` return 200.

## Status

The foundation migration is complete on the `codex/next-ssr-foundation` branch and production Railway deployment now runs Next.

Before this work, the website was a Vite SPA. The production HTML contained a static head and an empty React root:

```html
<div id="root"></div>
```

That blocker has been resolved for the public foundation routes. `/`, `/leaderboard`, `/about`, `/privacy`, `/terms`, and `/delete-data` now return route-specific Next HTML. `/` and `/leaderboard` include crawlable app-aligned snapshots before hydration.

## Target Architecture

Use Next.js as the web framework and split the site into two broad surfaces:

- Public SEO surface: server-rendered or statically generated pages with real HTML, route metadata, canonical URLs, structured data, sitemap, and crawlable content.
- Interactive app surface: hydrated React client components for live feed interactions, follows, alerts, Firebase, local storage, websocket updates, and user-specific behavior.

The goal is not to SSR every interaction. The goal is to make indexable pages crawlable first, then hydrate the app where needed.

## Non-Negotiables

- Do not change watcher behavior during the migration.
- Do not break existing API contracts used by the Flutter app.
- Do not remove or rewrite API endpoints unless there is a separate backend migration plan.
- Keep the production API proxy behavior working for the web app.
- Preserve the canonical host `https://www.polywhaletrades.com`.
- Preserve legal routes: `/privacy`, `/terms`, `/delete-data`.
- Preserve current public routes: `/`, `/about`, `/leaderboard`, `/trade/:tradeId`, `/trader/:wallet`, `/profile`, `/profile/following`, `/alerts`.
- Keep follow, alerts, Firebase, local storage, and websocket code client-side unless deliberately redesigned.
- Every phase must pass `npm run build` before pushing.

## Phase 0: Inventory And Safety Baseline

Purpose: understand and freeze current behavior before moving frameworks.

Tasks:

- Record current routes, metadata, robots rules, sitemap URLs, and canonical behavior.
- Capture screenshots or notes for desktop and mobile views of `/`, `/leaderboard`, `/trader/:wallet`, `/trade/:tradeId`, `/profile/following`, and `/alerts`.
- Confirm Railway build/start assumptions in `railway.json`.
- Confirm current API base behavior in `server.js` and Vite env vars.
- Identify all browser-only APIs in `src/App.jsx`: `window`, `document`, `localStorage`, `sessionStorage`, `matchMedia`, `Notification`, Firebase messaging, websocket setup.
- Identify which content must be visible to crawlers on first response.

Validation:

- `npm run build`
- Existing production behavior documented.
- No code changes to API or watcher.

Deliverable:

- A short baseline checklist or issue list before migration begins.

## Phase 1: Component And Routing Preparation

Purpose: reduce migration risk before introducing Next.

Tasks:

- Split route-level components out of the single large `src/App.jsx` where practical.
- Extract shared SEO metadata into plain data/functions that do not require `document`.
- Extract browser-only helpers into client-only modules or hooks.
- Replace manual `window.location.pathname` route selection with route-friendly components that can later map to Next route files.
- Keep the Vite app running during this phase.

Suggested module direction:

- `src/routes/WhaleFeedPage.jsx`
- `src/routes/LeaderboardPage.jsx`
- `src/routes/AboutPage.jsx`
- `src/routes/LegalPages.jsx`
- `src/routes/TraderProfilePage.jsx`
- `src/routes/TradeDetailPage.jsx`
- `src/components/...`
- `src/lib/seo.js`
- `src/lib/api.js`
- `src/lib/follows.client.js`
- `src/lib/alerts.client.js`

Validation:

- `npm run build`
- Manual smoke test of primary routes.
- No route behavior change.

Rollback:

- Since Vite remains active, revert only the extraction commits if needed.

## Phase 2: Introduce Next.js In A Controlled Branch

Purpose: get the app compiling under Next without trying to solve all SEO immediately.

Tasks:

- Add Next.js dependencies and config.
- Create `app/` or `pages/` routing structure. Prefer App Router unless a specific blocker appears.
- Add global CSS import.
- Replace Vite-specific entry files with Next layout/page files.
- Move static assets from `public/` unchanged.
- Port environment variables:
  - `VITE_API_BASE_URL` becomes `NEXT_PUBLIC_API_BASE_URL` for browser code if needed.
  - Server-side API fetches should use server env vars, not public env vars.
  - Keep production API target configurable.
- Decide whether Railway runs `next start` directly or a custom Node server.

Important:

- Do not use `output: 'export'` for the final target if we need true SSR. Static export is useful for pure SSG but not for dynamic server rendering.
- Initial migration may temporarily keep major app surfaces as client components.

Validation:

- `next build`
- `next start` locally
- `/`, `/leaderboard`, legal pages, alerts page, following page load.

Rollback:

- Keep Vite deployment untouched until a Next deployment branch is verified.

## Phase 3: Public Route Metadata And Static HTML

Purpose: fix the SEO foundation for first response HTML.

Tasks:

- Implement Next `metadata` or `generateMetadata` for every public route.
- Move canonical, title, description, robots, Open Graph, Twitter, and JSON-LD generation out of browser effects.
- Ensure the initial HTML for each indexable route contains route-specific metadata.
- Create server-rendered/static pages for:
  - `/`
  - `/about`
  - `/leaderboard`
  - `/privacy`
  - `/terms`
  - `/delete-data`
- Keep these routes indexable where appropriate.
- Keep app/personal routes noindex where appropriate:
  - `/profile`
  - `/profile/following`
  - `/alerts`
  - dynamic `/trade/:tradeId` and `/trader/:wallet` unless we deliberately make them indexable later.

Validation:

- View page source for `/`, `/about`, `/leaderboard`: meaningful HTML and route-specific metadata must be present without running JavaScript.
- `curl` or browser source check should show actual text, not just `id="root"`.
- Sitemap and robots still match route strategy.

Rollback:

- Public route rendering can be reverted independently from client app logic if route shells are kept separate.

## Phase 4: Server Data For SEO Pages

Purpose: make public dynamic pages valuable to crawlers.

Tasks:

- Fetch leaderboard data server-side for `/leaderboard`.
- Fetch homepage summary data server-side for `/` where stable enough.
- Render crawlable summaries:
  - Today's whale volume
  - Top wallets
  - Recent large trade summaries
  - Leaderboard table rows
- Hydrate client components afterward for live updates, sorting, follows, and websocket behavior.

API considerations:

- Prefer existing public API endpoints first.
- If API changes are needed, make them additive:
  - `GET /v1/dashboard/today?tz=America/New_York`
  - `GET /v1/leaderboard?window=today&limit=50`
  - `GET /v1/seo/snapshots/home`
- Do not alter watcher event schema unless a separate backend plan requires it.
- Do not break Flutter app endpoints.

Validation:

- Server-rendered HTML includes real leaderboard/feed content.
- API failures produce graceful fallback HTML, not blank pages.
- Client hydration does not replace server rows with visibly different placeholder values.

Rollback:

- Keep client-side data fetching fallback active while server fetching is introduced.

## Phase 5: Route Strategy For Dynamic Pages

Purpose: decide how far SEO should extend beyond the main public pages.

Options:

- Keep `/trade/:tradeId` and `/trader/:wallet` as `noindex,follow`.
- Make selected trader pages indexable only if they have stable, useful, unique content.
- Make selected trade pages indexable only if they are evergreen enough and not thin/duplicative.

Recommended first decision:

- Keep dynamic trade and trader pages `noindex,follow` until the public homepage, about page, and leaderboard are solid.

If later making trader pages indexable:

- Server-render wallet profile stats and recent trades.
- Add canonical URLs.
- Avoid indexing thin profiles with no meaningful activity.
- Consider sitemap generation only for high-value wallets.

Validation:

- No accidental indexation of private/app-only routes.
- Search Console coverage aligns with intent.

## Phase 6: Deployment And Infrastructure Cutover

Purpose: move production safely.

Tasks:

- Update Railway build command from `npm run build` to the Next build command.
- Update Railway start command to `next start` or custom server command.
- Preserve apex-to-www redirect behavior currently in `server.js`.
- Preserve `/api/*` proxy behavior or replace it with Next rewrites.
- Confirm environment variables in Railway.
- Deploy to a staging Railway service or preview branch first if available.

Validation:

- Production-like preview returns route-specific HTML source.
- API proxy works.
- Websocket connection works.
- Static assets load.
- `robots.txt` and `sitemap.xml` are reachable.
- Canonical host redirect works.

Rollback:

- Keep current Vite/Railway deployment path available until the Next deployment is verified.
- Do not delete Vite config/server files until after cutover stability.

## Phase 7: SEO Expansion After Foundation

Purpose: implement SEO strategy only after crawlable rendering is solved.

Tasks:

- Add content pages for high-intent terms:
  - Polymarket whale trades
  - Polymarket whale leaderboard
  - Top Polymarket whales today
  - Polymarket large trade alerts
- Build internal linking between homepage, leaderboard, about, and future guides.
- Generate structured data per route.
- Improve Open Graph images.
- Add dynamic sitemap generation if indexable route count grows.
- Add Search Console and analytics verification events.
- Build performance budget around Core Web Vitals.

Validation:

- Server HTML contains content.
- Metadata is unique by route.
- Lighthouse and Search Console do not report major crawl/render issues.
- No duplicated canonical routes.

## Recommended Implementation Order

1. Prepare components and browser-only boundaries while still on Vite.
2. Create a Next branch and get the current UI running.
3. Convert static/legal/about pages to server/static routes.
4. Convert `/leaderboard` to server-render meaningful HTML.
5. Convert homepage summaries to server-render meaningful HTML.
6. Cut over deployment.
7. Start broader SEO content strategy.

## Key Risks

- Hydration mismatches from server-rendering components that read browser-only state.
- Client-side local follow state conflicting with server-rendered public rows.
- API latency making SSR pages slow if every request waits on live data.
- Accidentally indexing app-only pages.
- Breaking Railway proxy or canonical redirects.
- Coupling web SEO needs to watcher/API changes too early.

## Risk Controls

- Keep browser-only features in client components.
- Use server-rendered public snapshots for SEO content.
- Add server fetch timeouts and fallback HTML.
- Keep API changes additive.
- Keep noindex on personal/app routes.
- Validate page source, not just the rendered browser view.
- Keep small commits per phase.

## Definition Of Done

The migration is complete when:

- Public routes return meaningful HTML without JavaScript.
- Route metadata is generated server-side.
- Sitemap and robots match the intended indexation strategy.
- Homepage and leaderboard have crawlable content in initial HTML.
- Interactive app behavior still works after hydration.
- Railway production deployment runs Next successfully.
- API server and watcher behavior remain unchanged except for any explicitly planned additive endpoints.
