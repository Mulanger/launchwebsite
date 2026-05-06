# Polywhale Website

Web app for Polywhale. The current production path is still the React/Vite app served by `server.js`, while the `codex/next-ssr-foundation` branch contains the in-progress Next.js SSR/SSG foundation for SEO.

The site consumes the Railway whale-trade API and presents a public live feed, leaderboard, trader profiles, trade details, web alerts setup, following management, and legal pages.

## Local development

Current Vite app:

```bash
npm install
npm run dev
```

The dev server proxies `/api/*` to the production API by default. To point it at another API:

```bash
$env:VITE_DEV_API_TARGET="http://127.0.0.1:3000"; npm run dev
```

Next SSR foundation branch:

```bash
npm run next:dev
npm run next:build
npm run next:start
```

The Next app currently server-renders/static-renders public SEO routes and hydrates app-only routes through the existing React app.

## Production build and deployment

Current production build path:

```bash
npm run build
npm start
```

Railway can deploy this repository with the included `railway.json`.
The production server also proxies `/api/*` to `https://whaleserver-production.up.railway.app` unless `API_BASE_URL` is set.

Do not switch Railway to Next until the cutover phase is approved. The Next foundation has been validated locally, but production still uses the Vite build/start commands.

## SSR migration status

The migration plan is documented in `NEXT_SSR_MIGRATION_PLAN.md`.

Implemented on `codex/next-ssr-foundation`:

- Next.js installed alongside the existing Vite app.
- Public SEO routes exist in `app/`: `/`, `/about`, `/leaderboard`, `/privacy`, `/terms`, `/delete-data`.
- App-only routes are wired in Next through a client wrapper: `/alerts`, `/profile`, `/profile/following`, `/trade/[tradeId]`, `/trader/[wallet]`.
- `/` and `/leaderboard` use a hybrid approach: crawlers receive server-rendered HTML, while browser users hydrate into the existing app UI.
- `/api/*` is preserved through a Next rewrite.

Validated before cutover:

- `npm run next:build`
- `npm run build`
- Local `next start` route checks on `http://localhost:3000`
- Direct route refreshes for public and app-only routes
- `/api/*` proxy response
- Production websocket endpoint opens

## Before publishing

- Replace launch/update links when the Google Play listing is live.
- Update `support@whaletracker.com` if the public support email changes.
- Review `Privacy Policy`, `Terms`, and `Delete Data` pages before submitting them in Play Console.
- Use the live `/privacy` URL as the app privacy policy URL in Play Console.
- Use the live `/delete-data` URL if Play asks for a data deletion URL.
- Before a Next cutover, update Railway build/start commands, verify production source HTML, and confirm API, websocket, follows, alerts, and mobile views.
