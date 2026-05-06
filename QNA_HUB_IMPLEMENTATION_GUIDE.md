# Polywhale Q&A Hub Implementation Guide

## Goal

Pillar 2 is a crawlable Q&A surface for high-intent searches like "is Polymarket legal", "how do Polymarket odds work", and "Polymarket vs Kalshi". The route should bring search users into Polywhale, answer the exact question quickly, then move them toward the live feed, leaderboard, alerts, related questions, and market pages.

Canonical URL pattern:

```text
/qa
/qa/<question-slug>
```

`/qna` and `/qna/<question-slug>` redirect permanently to the canonical `/qa` routes.

## What Is Implemented

- `src/lib/qna.js` converts `qna_sample.json` into production route data.
- `app/qa/page.jsx` renders the index hub with search, category sections, featured answers, and internal links.
- `app/qa/[slug]/page.jsx` statically renders one page per question with the direct answer, expanded answer, sources, related questions, and links into the app.
- `app/qna/*` redirects to `/qa/*`.
- `app/sitemap.js` includes `/qa` and every published Q&A page.
- `app/sitemap-qa.xml/route.js` exposes a dedicated Q&A sitemap for Search Console/Bing reporting.
- `public/robots.txt`, `PublicChrome`, `PublicAppSnapshot`, and the hydrated sidebar include Q&A links.

The sample file currently contains 216 rows. The implementation publishes 214 because two rows are unrelated to Polymarket and are filtered out.

## SEO Structure

The hub uses:

- `CollectionPage`
- `ItemList`
- `BreadcrumbList`

Each question page uses:

- `FAQPage`
- `Article`
- `BreadcrumbList`

Google's current FAQ structured data documentation says FAQ rich results are restricted to well-known government or health sites, so this should not be sold internally as a guaranteed FAQ-rich-result play. The schema is still useful for machine readability, and Bing supports JSON-LD validation in Webmaster Tools.

Reference docs:

- Google FAQ structured data: https://developers.google.com/search/docs/appearance/structured-data/faqpage
- Google sitemap guidance: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- Bing JSON-LD support: https://blogs.bing.com/webmaster/august-2018/Introducing-JSON-LD-Support-in-Bing-Webmaster-Tools

## Content Rules

Each Q&A page should keep this shape:

1. H1 is the literal searched question.
2. The first paragraph answers directly in plain English.
3. The following paragraphs explain caveats, mechanics, or examples.
4. Legal, tax, VPN, and regulatory pages show an informational note.
5. Sources are visible on the page and should preferably be primary sources.
6. Related questions link to sibling `/qa/*` pages.
7. App links point users to `/`, `/leaderboard`, and `/alerts`.

Before shipping the sample content as production SEO content, do an editorial pass:

- Remove unrelated autocomplete pollution.
- Verify legal/tax/regulatory statements by country and state.
- Replace weak sources with primary sources where possible.
- Check time-sensitive claims quarterly or immediately after major Polymarket/regulatory changes.
- Avoid duplicated answers across near-identical questions unless the pages are intentionally distinct.

## System Boundary

This repo owns the Q&A pages. The watcher, whale server, and market-resolution service do not need changes for the static Q&A launch.

Future exceptions:

- "Who is the biggest Polymarket trader right now?" should eventually read from the whale server leaderboard endpoint and use a shorter revalidation window.
- Market-specific Q&A should link into `/market/[slug]` once the market-page snapshot pipeline is fully deployed.
- If a content worker is added later, it should write reviewed JSON/MDX into this website repo or expose a stable content endpoint consumed at build time.

## Deployment Checklist

1. Run `npm run next:build`.
2. Run `npm run build` because the hydrated sidebar in `src/App.jsx` changed.
3. Verify `view-source:/qa` contains question links and JSON-LD.
4. Verify `view-source:/qa/is-polymarket-legal` contains the full answer and JSON-LD.
5. Verify `/qna/is-polymarket-legal` redirects to `/qa/is-polymarket-legal`.
6. Verify `/sitemap.xml` and `/sitemap-qa.xml` include Q&A URLs.
7. Submit both sitemaps in Google Search Console and Bing Webmaster Tools.
8. Validate a sample question page in Google's Rich Results Test and Bing Markup Validator.

## Measurement

Track Q&A performance separately:

- Search Console page filter: URLs containing `/qa/`.
- Bing Webmaster Tools sitemap report: `/sitemap-qa.xml`.
- GA4 landing-page report: path starts with `/qa`.
- Track assisted navigation from `/qa/*` to `/`, `/leaderboard`, and `/alerts`.

The first success metric is indexation, not traffic. After pages are indexed, improve the pages that get impressions but low CTR by rewriting titles/descriptions and tightening the opening answer.
