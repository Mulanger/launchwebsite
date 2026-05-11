import Link from 'next/link';
import { notFound } from 'next/navigation';
import JsonLd from '../../_components/JsonLd.jsx';
import {
  NewsRail,
  NewsShell,
  NewsTypePill,
  formatNewsDate,
  formatUsd,
} from '../../_components/NewsLayout.jsx';
import { buildNextMetadata } from '../../../src/lib/next-metadata.js';
import {
  buildNewsArticleStructuredData,
  buildNewsDescription,
  fetchNewsArticle,
  fetchNewsIndex,
  getNewsArticleImage,
  isIndexableNewsArticle,
  newsPathForSlug,
} from '../../../src/lib/news-pages.js';
import { siteOrigin } from '../../../src/lib/seo.js';

export const revalidate = 60;

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const article = await fetchNewsArticle(slug);

  if (!article) {
    return buildNextMetadata({
      title: 'Polymarket News Article Not Found | Polywhale',
      description: 'This Polywhale news article is not available.',
      path: '/news',
      robots: 'noindex,follow',
    });
  }

  const image = getNewsArticleImage(article);
  const robots = isIndexableNewsArticle(article)
    ? 'index,follow,max-image-preview:large'
    : 'noindex,follow,max-image-preview:large';
  return buildNextMetadata({
    title: `${article.title} | Polywhale News`,
    description: buildNewsDescription(article),
    keywords: [...(article.tags || []), 'Polymarket news', 'whale trade news', 'Polywhale'].join(', '),
    path: newsPathForSlug(article.slug),
    robots,
    image,
    openGraphType: 'article',
    publishedTime: article.publishedAt,
    modifiedTime: article.updatedAt || article.publishedAt,
    authors: [article.byline?.name || 'Polywhale News Desk'],
  });
}

export default async function NewsArticlePage({ params }) {
  const { slug } = await params;
  const [article, latest] = await Promise.all([fetchNewsArticle(slug), fetchNewsIndex(8)]);

  if (!article) {
    notFound();
  }

  const facts = article.facts || {};
  const articleUrl = `${siteOrigin}${newsPathForSlug(article.slug)}`;
  const related = latest.filter((item) => item.slug !== article.slug);
  const image = getNewsArticleImage(article);
  const byline = article.byline?.name || 'Polywhale News Desk';
  const disclosure =
    article.editorialDisclosure ||
    'This story was generated from public Polymarket trade and resolution data tracked by Polywhale, with deterministic fact checks before publication.';
  const sourceLinks = Array.isArray(article.sourceLinks) ? article.sourceLinks : [];

  return (
    <NewsShell rail={<NewsRail article={article} related={related} />}>
      <JsonLd data={buildNewsArticleStructuredData(article)} />
      <main className="feed-main news-main news-article-main">
        <Link className="news-back-button" href="/news">
          Back to News
        </Link>

        <nav className="news-breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Polywhale</Link>
          <span>/</span>
          <Link href="/news">News</Link>
          <span>/</span>
          <span>{article.kind === 'whale_loss' ? 'Resolved loss' : 'Whale trade'}</span>
        </nav>

        <article className="news-article">
          <NewsTypePill kind={article.kind} />
          <h1>{article.title}</h1>
          <p className="news-dek">{article.dek}</p>
          <div className="news-meta">
            <span>By {byline}</span>
            <span>{formatNewsDate(article.publishedAt)}</span>
            {facts.amountUsd ? <span>{formatUsd(facts.amountUsd)} trade</span> : null}
            {facts.lossUsd ? <span>{formatUsd(facts.lossUsd)} loss</span> : null}
          </div>

          {image ? (
            <figure className="news-hero-image">
              <img src={image.url} alt={image.alt} width={image.width} height={image.height} />
              <figcaption>Polywhale data visualization</figcaption>
            </figure>
          ) : null}

          <div className="news-body">
            {(article.body || []).map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          <p className="news-disclosure">{disclosure}</p>

          {sourceLinks.length ? (
            <section className="news-source-links" aria-label="Article sources">
              <h2>Sources</h2>
              <div>
                {sourceLinks.map((source) => (
                  <a href={source.url} key={`${source.kind}-${source.url}`} rel="nofollow noopener" target="_blank">
                    {source.label}
                  </a>
                ))}
              </div>
            </section>
          ) : null}

          <section className="news-fact-strip" aria-label="Article facts">
            <span>
              <small>Market</small>
              <strong>{facts.marketTitle || 'Polymarket market'}</strong>
            </span>
            <span>
              <small>Wallet</small>
              <strong>{facts.traderName || facts.wallet || 'Tracked whale'}</strong>
            </span>
            <span>
              <small>Position</small>
              <strong>
                {facts.side || 'BUY'} {facts.outcome || ''}
              </strong>
            </span>
          </section>

          <section className="news-next-actions" aria-label="Continue on Polywhale">
            <Link href="/">
              <strong>Open the live whale feed</strong>
              <span>Watch large Polymarket trades as they arrive.</span>
            </Link>
            {facts.wallet ? (
              <Link href={`/trader/${facts.wallet}`}>
                <strong>Open this wallet profile</strong>
                <span>Review recent whale trades and resolved performance.</span>
              </Link>
            ) : (
              <Link href="/leaderboard">
                <strong>See top whale wallets</strong>
                <span>Rank tracked wallets by volume and profit signals.</span>
              </Link>
            )}
          </section>

          <p className="news-canonical">Canonical URL: {articleUrl}</p>
        </article>
      </main>
    </NewsShell>
  );
}
