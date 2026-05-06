# Polywhale Market Landing Pages Plan

## Goal

Create programmatic, crawlable market landing pages that can rank for searches such as:

```text
polymarket strait of hormuz market
polymarket bitcoin above 84000 may 6 whale trades
polymarket iran regime market whale activity
```

These pages should turn live whale-trade data into stable SEO pages for high-activity Polymarket markets, without creating thin pages for every market.

## Why This Matters

The Next SSR foundation now makes `/` and `/leaderboard` crawlable, and the homepage can expose current market titles in source HTML. That is useful but not enough for reliable search discovery because feed rows rotate out.

For durable market search visibility, each qualified market needs a stable URL with:

- Route-specific title and description.
- One clear `<h1>` with the market title.
- Crawlable market stats.
- Crawlable recent whale trades.
- Internal links from feed, trade detail, related markets, and sitemap.

## Proposed URL Structure

Primary route:

```text
/market/[slug]
```

Examples:

```text
/market/strait-of-hormuz-traffic-returns-to-normal-by-end-of-april
/market/bitcoin-above-84000-on-may-6
/market/ucl-bay-psg-2026-05-06-psg
```

The canonical slug should come from `market.slug` when available. If a backend-generated slug is needed, it must be stable and derived once, not regenerated differently over time.

## Indexing Rules

Do not index every market automatically. A market page should be indexable only if it meets quality thresholds.

Recommended MVP thresholds:

```text
whaleTradeCount >= 3
whaleVolume >= 50000
market.slug exists
market.title exists
recentTrades.length >= 3
```

Higher-quality threshold for broader release:

```text
whaleTradeCount >= 3
whaleVolume >= 100000
uniqueWhales >= 2
market has icon or metadata
```

If a market does not qualify:

- Return `noindex,follow`, or
- Return 404 if the page should not exist publicly yet.

Recommended first behavior:

```text
Qualified market: 200 index,follow
Known but weak market: 200 noindex,follow
Unknown market: 404
```

## MVP Data Source

Use existing whale trade data first. Do not add a new worker for the first version.

Current trade data already includes:

```text
trade.id
trade.tier
trade.side
trade.outcome
trade.usdSize
trade.shares
trade.priceCents
trade.priceMillicents
trade.timestamp
trade.transactionHash
market.conditionId
market.slug
market.title
market.icon
market.category
market.eventSlug
market.yesPriceCents
market.noPriceCents
market.polymarketUrl
trader.proxyWallet
trader.pseudonym
trader.displayName
trader.profileImage
```

That is enough to build useful first-version market pages.

## MVP Backend API

Add market aggregation endpoints to the existing API/server, not the watcher.

Recommended endpoints:

```text
GET /v1/markets/qualified?limit=500
GET /v1/markets/:slug
GET /v1/markets/:slug/whales?limit=50
GET /v1/markets/:slug/leaderboard?limit=25
```

MVP can combine these into one endpoint first if that is simpler:

```text
GET /v1/markets/:slug/seo
```

Recommended response:

```json
{
  "market": {
    "slug": "strait-of-hormuz-traffic-returns-to-normal-by-end-of-april",
    "conditionId": "0x...",
    "title": "Strait of Hormuz traffic returns to normal by end of April?",
    "icon": "https://...",
    "category": "Politics",
    "eventSlug": "strait-of-hormuz-traffic",
    "polymarketUrl": "https://polymarket.com/event/...",
    "yesPriceCents": 50,
    "noPriceCents": 50
  },
  "seo": {
    "indexable": true,
    "canonicalUrl": "https://www.polywhaletrades.com/market/strait-of-hormuz-traffic-returns-to-normal-by-end-of-april",
    "reason": "3+ whale trades and $50K+ whale volume"
  },
  "stats": {
    "whaleVolume": 144000,
    "whaleTradeCount": 6,
    "uniqueWhales": 4,
    "biggestTradeUsd": 50000,
    "latestTradeTs": 1778076960
  },
  "topWallets": [
    {
      "proxyWallet": "0x...",
      "displayName": "Arid-Revolver",
      "volume": 90000,
      "tradeCount": 3,
      "avgTrade": 30000
    }
  ],
  "recentTrades": [
    {
      "id": "611c9fc7ed2e31076aaae7ba",
      "side": "BUY",
      "outcome": "NO",
      "usdSize": 11083,
      "priceCents": 99,
      "timestamp": 1778076960,
      "trader": {
        "proxyWallet": "0x...",
        "displayName": "999999999"
      }
    }
  ],
  "relatedMarkets": []
}
```

## MVP Backend Aggregation Logic

Group stored whale trades by market identity.

Market identity priority:

```text
1. market.conditionId
2. market.slug
3. normalized market.title
```

For each market, compute:

```text
whaleVolume = sum(usdSize)
whaleTradeCount = count(trades)
uniqueWhales = count(distinct trader.proxyWallet)
biggestTradeUsd = max(usdSize)
latestTradeTs = max(timestamp)
topWallets = group by trader.proxyWallet, sum volume, count trades
recentTrades = newest trades for market
outcomeBreakdown = group by outcome and side if useful
```

The API should return stable market records even if the market no longer appears in the homepage feed.

## Next Website Implementation

Add:

```text
app/market/[slug]/page.jsx
```

Server behavior:

- Fetch `/v1/markets/:slug/seo`.
- Return `notFound()` for unknown slugs.
- Generate metadata from market title and stats.
- Use `robots: index,follow` only for qualified markets.
- Use `robots: noindex,follow` for known but weak markets.
- Render market data as real HTML.
- Revalidate every 5 to 15 minutes.

Suggested config:

```js
export const revalidate = 300;
```

## Page Layout

Recommended market page sections:

1. Market hero

```text
H1: Strait of Hormuz traffic returns to normal by end of April?
Subtitle: Whale trades, top wallets, and market activity on this Polymarket market.
CTA: View on Polymarket
```

2. Market stats

```text
Whale volume
Whale trades
Unique whales
Biggest trade
Latest whale trade
YES price
NO price
```

3. Recent whale trades

```text
Side
Outcome
Size
Price
Trader
Time
Link to /trade/:tradeId
```

4. Top wallets on this market

```text
Wallet
Volume
Trade count
Average trade
Link to /trader/:wallet
Follow button after hydration if appropriate
```

5. Related markets

```text
Same eventSlug
Similar normalized title terms
Same category
High recent whale activity
```

6. Explainer copy

Short, templated, factual text:

```text
Polywhale tracks large public trades on this Polymarket market and ranks wallets by whale-sized activity. This page summarizes large trades observed by Polywhale and links back to the underlying Polymarket market.
```

Avoid overclaiming. Use language like `tracked whale activity`, not `total market activity`, unless enriched data supports that.

## Metadata Template

For qualified market:

```text
Title:
{Market Title} | Polymarket Whale Trades | Polywhale

Description:
Track whale trades, top wallets, recent large positions, and price signals for {Market Title} on Polymarket.

Canonical:
https://www.polywhaletrades.com/market/{slug}
```

For weak but known market:

```text
robots: noindex,follow
```

## Structured Data

Use conservative structured data.

Recommended:

- `WebPage`
- `BreadcrumbList`
- Possibly `Dataset` if the page presents a data table.

Avoid financial-product schema unless we are certain it fits and does not misrepresent prediction market content.

## Internal Linking

To make these pages discoverable:

- Feed rows should link market title/icon to `/market/:slug`.
- Trade detail market card should link to `/market/:slug`.
- Market page recent trades should link to `/trade/:tradeId`.
- Market page top wallets should link to `/trader/:wallet`.
- Related market cards should link to other `/market/:slug` pages.
- Leaderboard or future category pages can link to high-volume markets.

## Sitemap Strategy

Add qualified market pages to sitemap only when they pass thresholds.

Preferred endpoint:

```text
GET /v1/markets/qualified?limit=500
```

Next can generate sitemap entries from that endpoint.

Sitemap entry fields:

```text
url: /market/:slug
lastModified: latestTradeTs or market updated time
changeFrequency: hourly or daily
priority: 0.6
```

Do not include `noindex` market pages in the sitemap.

## Later Enrichment Strategy

The MVP should be based on existing whale data. After the market pages work and are indexed cleanly, enrich them with Polymarket data.

### Enrichment Goals

Add market-level context that Polywhale does not currently store:

- Full market description.
- Event title and event page.
- Full outcome list.
- Current prices for all outcomes.
- Spread and order book state.
- Full market volume.
- Liquidity.
- Open interest.
- Top holders or position holders if available.
- Price history.
- Market start/end/resolution dates.
- Resolution source/rules.

### External API Sources

Use Polymarket public APIs where appropriate:

```text
Gamma API: market/event discovery and metadata
Data API: activity, positions, holder/leaderboard style data, open interest where available
CLOB API: order book, prices, spreads, price history
```

Keep these calls server-side. Do not call them directly from the browser for SEO-critical rendering.

### Enrichment Storage

Do not make every market page request depend on several live third-party API calls.

Recommended:

```text
API database table/collection: marketSnapshots
```

Suggested fields:

```text
slug
conditionId
eventSlug
title
description
icon
image
category
outcomes
prices
spread
liquidity
volume
openInterest
holders
priceHistory
polymarketUrl
lastWhaleTradeTs
lastEnrichedAt
enrichmentStatus
```

The website should read enriched data from the API/server, not directly from Polymarket.

## Enrichment Worker

Do not put enrichment inside the existing watcher initially. The watcher should stay focused on detecting whale trades.

Recommended later component:

```text
market-indexer / market-enrichment job
```

This can run as:

- A scheduled Railway cron service.
- A lightweight worker inside the API server if cron support is simpler.
- A separate service only if it grows complex.

Recommended cadence:

```text
Every 5 minutes:
  update high-activity markets with recent whale trades

Every 30-60 minutes:
  refresh qualified market metadata and prices

Daily:
  refresh older qualified pages and sitemap candidates
```

Worker responsibilities:

- Scan recent whale trades.
- Build market candidates.
- Apply quality thresholds.
- Fetch enrichment data from Polymarket APIs.
- Cache normalized market snapshots.
- Mark pages as indexable/noindex.
- Record errors and stale status.

## Enrichment Quality Gates

Only show enriched fields when data is fresh and trustworthy.

Examples:

```text
Show CLOB prices only if fetched successfully in the last 10 minutes.
Show holders only if API response includes holder positions and market mapping is exact.
Show full market volume only if source is clearly market-level, not just Polywhale whale volume.
```

Use labels carefully:

```text
Polywhale whale volume
Polymarket total volume
Top whale wallets tracked by Polywhale
Top holders from Polymarket data
```

Do not mix these concepts.

## Rollout Phases

### Phase 1: MVP Aggregation

Tasks:

- Add API endpoint for market SEO payload from existing whale trades.
- Add `/market/[slug]` Next route.
- Add page metadata and `noindex` logic.
- Add internal links from trade rows and trade detail market card.
- Add qualified market sitemap entries.

Validation:

- `npm run next:build`
- Qualified market source HTML contains title, stats, recent trades, top wallets.
- Unknown market returns 404.
- Weak market returns noindex or 404.
- Sitemap includes only qualified markets.

### Phase 2: UX And Internal Linking

Tasks:

- Add related markets.
- Add market pages to trade detail.
- Add better market cards.
- Add category/topic hints.

Validation:

- Users can navigate naturally from feed to market to trade/trader.
- No hydration regressions.
- Mobile layout is readable.

### Phase 3: Enrichment Cache

Tasks:

- Add market snapshot storage.
- Add Polymarket metadata enrichment.
- Add price/liquidity/open interest fields where available.
- Add freshness timestamps.

Validation:

- Market pages do not become slow.
- Pages still render if enrichment fails.
- Labels distinguish Polywhale data from Polymarket data.

### Phase 4: Holder And Advanced Market Data

Tasks:

- Add holder/position data if a reliable source is available.
- Add price history chart.
- Add order book/spread summary.
- Add richer related market logic.

Validation:

- Holder data maps to the correct condition/outcome.
- Data freshness is visible.
- No unsupported claims are made.

### Phase 5: SEO Expansion

Tasks:

- Add market-category pages.
- Add topic pages for clusters like `Iran`, `Bitcoin daily markets`, `sports`.
- Add Search Console monitoring.
- Track which pages are indexed and receiving impressions.

Validation:

- Search Console shows indexed qualified market pages.
- Thin pages are excluded.
- No crawl bloat.

## Risks

- Thin pages if too many low-activity markets are indexed.
- Duplicate pages if slugs change or event/market slug mapping is inconsistent.
- Slow SSR if pages fetch multiple external APIs live.
- Misleading labels if Polywhale whale volume is confused with Polymarket total volume.
- API/server load if sitemap or crawlers hit many market pages.
- Stale market pages if old markets are not refreshed or marked correctly.

## Risk Controls

- Strict indexability thresholds.
- Stable canonical URLs.
- Cached API/server market snapshots.
- ISR on the Next website.
- Clear freshness timestamps.
- Separate labels for Polywhale-tracked data and Polymarket-wide data.
- Graceful fallback when enrichment fails.

## Definition Of Done

MVP is done when:

- `/market/[slug]` renders from existing whale data.
- Qualified pages are indexable and included in sitemap.
- Weak pages are noindex or 404.
- Feed and trade detail link to market pages.
- Source HTML contains market title, stats, recent trades, and top wallets.
- Production build passes.
- Existing feed, leaderboard, trade, trader, follows, alerts, API, and websocket behavior still works.

MVP implementation status:

- `/market/[slug]` is implemented as a native Next server page.
- The page uses the same Polywhale dashboard frame and changes only the center market workspace plus a market snapshot card in the right rail.
- The market page sidebar does not mark Whale Feed active; the page has a Back to whale feed action instead.
- The market image is shown beside the H1 when available.
- Unknown market slugs return 404.
- Known weak markets render with `noindex,follow`.
- Qualified markets require at least 3 tracked whale trades and at least $50K tracked whale volume.
- The dynamic Next `/sitemap.xml` includes qualified market pages only.
- Feed desktop rows and mobile cards link market title/icon to the market page while preserving row click to trade detail.
- Trade detail market identity links to the market page.
- Current automation is feed-driven: pages and sitemap update from the latest whale feed scan through Next revalidation. Persistent historical slug retention, automatic old-page demotion/removal rules beyond the scan window, and richer Polymarket market metadata require the later server-side market snapshot/enrichment worker.

Enriched pipeline implementation status:

- `whale-watcher` now writes persistent `market_page_snapshots` documents.
- The snapshot worker computes market stats, top wallets, related markets, indexability, `lastQualifiedAt`, stale state, and prune cleanup.
- `api-server` exposes `/v1/market-pages?indexable=true&limit=250` for sitemap generation.
- `api-server` exposes `/v1/market-pages/:slug` for server-rendered market pages.
- The website now prefers the market-page API and falls back to whale-feed scanning while backend deployments roll out.
- Deployment order should be watcher first, API server second, website last or already deployed.

Enrichment is done when:

- API/server stores market snapshots from Polymarket enrichment.
- Market pages show enriched metadata with freshness.
- Pages remain fast and crawlable.
- Enrichment failures do not break page rendering.
