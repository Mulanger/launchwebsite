import { seoImage, siteName, siteOrigin } from './seo.js';

const defaultAutonewsBase = '';

export function getAutonewsBase() {
  const raw = (process.env.AUTONEWS_BASE_URL || process.env.NEWS_API_BASE_URL || defaultAutonewsBase).trim();
  if (!raw) return '';

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    return new URL(withProtocol).origin;
  } catch {
    return '';
  }
}

export function newsPathForSlug(slug) {
  return `/news/${encodeURIComponent(slug)}`;
}

export function newsImagePathForSlug(slug) {
  return `${newsPathForSlug(slug)}/image.svg`;
}

export async function fetchNewsIndex(limit = 50) {
  const base = getAutonewsBase();
  if (!base) return [];

  const url = new URL('/v1/news', base);
  url.searchParams.set('limit', String(limit));
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 60 },
  });

  if (!response.ok) return [];
  const payload = await response.json();
  return Array.isArray(payload.items) ? payload.items : [];
}

export async function fetchNewsArticle(slug) {
  const base = getAutonewsBase();
  if (!base || !slug) return null;

  const response = await fetch(`${base}/v1/news/${encodeURIComponent(slug)}`, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 60 },
  });

  if (!response.ok) return null;
  const payload = await response.json();
  return payload.article || null;
}

export function buildNewsArticleStructuredData(article) {
  const image = getNewsArticleImage(article);
  const sourceUrls = (article.sourceLinks || []).map((source) => source.url).filter(Boolean);

  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    description: article.dek,
    image: image
      ? [
          {
            '@type': 'ImageObject',
            url: image.url,
            width: image.width,
            height: image.height,
            caption: image.alt,
          },
        ]
      : undefined,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt || article.publishedAt,
    mainEntityOfPage: `${siteOrigin}${newsPathForSlug(article.slug)}`,
    author: {
      '@type': article.byline?.type || 'Organization',
      name: article.byline?.name || `${siteName} News Desk`,
      url: article.byline?.url || `${siteOrigin}/about`,
    },
    publisher: {
      '@type': 'Organization',
      name: siteName,
      logo: {
        '@type': 'ImageObject',
        url: seoImage,
      },
    },
    articleSection: article.kind === 'whale_loss' ? 'Resolved whale losses' : 'Whale trades',
    keywords: article.tags,
    about: ['Polymarket', 'Prediction markets', article.facts?.marketTitle].filter(Boolean),
    isAccessibleForFree: true,
    ...(sourceUrls.length ? { citation: sourceUrls } : {}),
  };
}

export function normalizeNewsDate(value) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export function buildNewsDescription(article) {
  return article?.dek || 'Latest Polymarket whale trade and resolved-loss news from Polywhale.';
}

export function getNewsArticleImage(article) {
  if (!article?.slug) return null;
  const image = article.image || {};
  return {
    url: image.url || `${siteOrigin}${newsImagePathForSlug(article.slug)}`,
    alt: image.alt || `${article.title} - Polywhale news image`,
    width: image.width || 1200,
    height: image.height || 675,
    type: image.mimeType || 'image/svg+xml',
  };
}
