import Link from 'next/link';
import JsonLd from '../_components/JsonLd.jsx';
import { NewsRail, NewsShell, NewsTypePill, formatNewsDate } from '../_components/NewsLayout.jsx';
import { buildNextMetadata } from '../../src/lib/next-metadata.js';
import { fetchNewsIndex } from '../../src/lib/news-pages.js';
import { siteOrigin } from '../../src/lib/seo.js';

export const revalidate = 60;

export async function generateMetadata() {
  return buildNextMetadata({
    title: 'Polymarket Whale News | Latest Whale Trades & Resolved Losses | Polywhale',
    description:
      'Read the latest Polywhale news on large Polymarket whale trades, resolved whale losses, market-moving wallets, and public prediction-market activity.',
    keywords:
      'Polymarket news, Polymarket whale news, whale trades, Polymarket losses, prediction market news, Polywhale news',
    path: '/news',
    robots: 'index,follow,max-image-preview:large',
  });
}

function NewsListItem({ item }) {
  return (
    <Link className="news-list-item" href={`/news/${item.slug}`}>
      <span className="news-list-type">
        <NewsTypePill kind={item.kind} />
        <small>{formatNewsDate(item.publishedAt)}</small>
      </span>
      <strong>{item.title}</strong>
      <p>{item.dek}</p>
    </Link>
  );
}

export default async function NewsHubPage() {
  const articles = await fetchNewsIndex(50);
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Polywhale News',
    url: `${siteOrigin}/news`,
    description: 'Latest Polymarket whale trade and resolved-loss stories tracked by Polywhale.',
  };

  return (
    <NewsShell rail={<NewsRail related={articles} />}>
      <JsonLd data={structuredData} />
      <main className="feed-main news-main">
        <div className="feed-breadcrumb">
          <span className="live-dot online" />
          News - Polymarket whale coverage
        </div>

        <header className="news-hub-head">
          <h1>
            Polymarket whale <em>news</em>.
          </h1>
          <p>Follow the biggest Polymarket whale trades, market moves, and resolved losses as they happen.</p>
        </header>

        <section className="news-list" aria-label="Latest Polywhale news">
          {articles.length ? (
            articles.map((item) => <NewsListItem item={item} key={item.slug} />)
          ) : (
            <div className="news-empty">
              <strong>No news articles are published yet.</strong>
              <span>Once the autonews worker is connected on Railway, qualifying whale trades will appear here.</span>
            </div>
          )}
        </section>
      </main>
    </NewsShell>
  );
}
