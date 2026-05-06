# Polywhale Trader Profiles SEO Implementation Guide

## Goal

Pillar 3 turns public Polymarket wallet profiles into indexable SEO assets. A search for a wallet address, a Polymarket pseudonym, or a known whale trader should land on a crawlable Polywhale page with the wallet's trade behavior, not a blank hydrated app shell.

Canonical URL pattern:

```text
/trader/<wallet-address>
```

Pseudonym URLs such as `/trader/Theo4` should redirect to the canonical wallet URL when the alias can be resolved from the trader index.

## What Is Implemented

- `app/trader/[wallet]/page.jsx` is now a native Next server route instead of a client-only legacy wrapper.
- `app/_components/TraderProfileSnapshot.jsx` renders crawlable wallet identity, rank, 30D stats, today volume, first-seen date, daily volume chart, volume mix, and recent whale trades.
- The profile page uses the same right rail pattern as Q&A: a compact live whale feed plus a `View all trades` button.
- `src/lib/trader-pages.js` centralizes wallet normalization, profile fetching, pseudonym alias lookup, metadata copy, sitemap index generation, and JSON-LD.
- `/sitemap-traders.xml` lists fresh trader profile URLs from leaderboard windows.
- `/sitemap.xml` also includes the current trader URL set.
- `robots.txt` now allows `/trader/*` and advertises `/sitemap-traders.xml`.

## Current Freshness Mechanism

The first version uses a dynamic Next sitemap as the discovery worker:

1. Fetch leaderboard windows: `1d`, `7d`, `30d`, `365d`.
2. Merge unique `proxyWallet` values.
3. Emit `/trader/<wallet>` URLs with an ISR revalidation window.
4. Serve each profile on demand from `GET /v1/traders/:wallet`.

This means new whales that enter the leaderboard can become discoverable without a deploy. It is good enough for launch, but it does not yet cover every wallet ever seen in the database.

## Recommended Backend Worker

The scalable version should live in the whale server or watcher stack:

```text
trader_page_snapshots
  proxyWallet
  canonicalPath
  pseudonym
  displayName
  profileImage
  firstSeen
  lastSeen
  latestTradeTs
  indexedVolume30d
  indexedTradeCount30d
  lifetimeWhaleCount
  rank1d
  rank7d
  rank30d
  rank365d
  indexable
  noindexReason
  refreshedAt
```

Worker cadence:

- Run every 15 minutes.
- Upsert wallets from new whale trades.
- Refresh leaderboard-derived ranks and volumes.
- Mark a wallet `indexable=true` once it has enough public activity, for example at least 2 whale trades or at least $50K tracked 30D volume.
- Keep low-signal wallets available on direct URL but `noindex,follow`.

Recommended API:

```text
GET /v1/trader-pages?indexable=true&limit=500&cursor=...
GET /v1/trader-pages/:wallet
GET /v1/trader-pages/aliases/:slug
```

Once this exists, replace `fetchTraderPageIndex()` in `src/lib/trader-pages.js` with the native trader-page index endpoint instead of assembling the sitemap from leaderboard windows.

## SEO Rules

- Canonical always points to `/trader/<wallet>`.
- Pseudonym aliases redirect to the wallet canonical path.
- Use `ProfilePage` + `Person` JSON-LD, but only describe public wallet behavior.
- Do not imply real-world identity attribution unless the trader self-identifies publicly.
- Use indexable pages only for wallets with enough signal. Low-signal profiles should be `noindex,follow`.

## Validation Checklist

1. `npm run next:build`
2. Open `/trader/<known-wallet>` and verify full source HTML includes profile content.
3. Verify `/sitemap-traders.xml` includes active leaderboard wallets.
4. Verify `robots.txt` does not disallow `/trader/`.
5. Validate a sample profile page with Google Rich Results Test and Bing Markup Validator.
6. Check Search Console page filter: URLs containing `/trader/`.
