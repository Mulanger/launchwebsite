import Link from 'next/link';
import { Search } from 'lucide-react';
import JsonLd from '../_components/JsonLd.jsx';
import { QaCategoryPill, QaRail, QaShell } from '../_components/QaLayout.jsx';
import { buildNextMetadata } from '../../src/lib/next-metadata.js';
import {
  buildQnaHubStructuredData,
  getFeaturedQnaItems,
  getQnaGroups,
  qnaCategoryDefinitions,
  qnaItems,
  searchQnaItems,
} from '../../src/lib/qna.js';

export const revalidate = 86400;

export const metadata = buildNextMetadata({
  title: 'Polymarket Questions & Answers | Polywhale Q&A Hub',
  description: `Plain-English answers to ${qnaItems.length} high-intent Polymarket questions about legality, taxes, odds, payouts, whale trades, wallets, and prediction market mechanics.`,
  keywords:
    'Polymarket questions, Polymarket FAQ, Polymarket Q&A, is Polymarket legal, Polymarket taxes, Polymarket whale trades, Polymarket odds, Polymarket vs Kalshi',
  path: '/qa',
  robots: 'index,follow,max-image-preview:large',
});

function normalizeQuery(searchParams) {
  return String(searchParams?.q || '').trim().slice(0, 80);
}

function QaHubItem({ item }) {
  return (
    <Link className="qa-item qa-link-item" href={item.path}>
      <span className="qa-link-question">
        <QaCategoryPill item={item} />
        <strong>{item.question}</strong>
      </span>
      <small>Open answer</small>
    </Link>
  );
}

export default async function QaHubPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const query = normalizeQuery(resolvedSearchParams);
  const matchingItems = query ? searchQnaItems(query, 80) : [];
  const groups = query ? [{ id: 'search-results', label: `Search results for "${query}"`, items: matchingItems }] : getQnaGroups();
  const featured = getFeaturedQnaItems();

  return (
    <QaShell rail={<QaRail related={featured} />}>
      <JsonLd data={buildQnaHubStructuredData()} />
      <main className="feed-main qa-main">
        <div className="feed-breadcrumb">
          <span className="live-dot online" />
          Q&A · Polymarket knowledge base
        </div>

        <header className="qa-hub-head">
          <h1>
            Everything to know about <em>Polymarket</em>.
          </h1>
          <p>
            Plain-English answers to the questions people search before they trade, follow whales, read odds, or compare
            prediction markets. Each answer has its own crawlable URL.
          </p>
        </header>

        <form action="/qa" className="qa-search" role="search">
          <Search size={18} aria-hidden="true" />
          <input
            aria-label="Search Polymarket questions"
            defaultValue={query}
            name="q"
            placeholder={`Search ${qnaItems.length} questions - try "is Polymarket legal"`}
          />
          <button type="submit">Search</button>
        </form>

        <nav className="qa-categories" aria-label="Q&A categories">
          <Link className={`qa-chip ${query ? '' : 'active'}`} href="/qa">
            All <small>{qnaItems.length}</small>
          </Link>
          {qnaCategoryDefinitions.map((category) => {
            const count = qnaItems.filter((item) => item.categoryId === category.id).length;
            return (
              <Link className="qa-chip" href={`/qa#${category.id}`} key={category.id}>
                {category.label} <small>{count}</small>
              </Link>
            );
          })}
        </nav>

        {!query ? (
          <section className="qa-featured" aria-labelledby="qa-featured-title">
            <div className="qa-section-label" id="qa-featured-title">
              Featured answers <span className="line" />
            </div>
            <div className="qa-featured-grid">
              {featured.slice(0, 4).map((item) => (
                <Link className="qa-featured-link" href={item.path} key={item.slug}>
                  <QaCategoryPill item={item} />
                  <strong>{item.question}</strong>
                  <span>{item.description}</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {groups.map((group) => (
          <section className="qa-group" id={group.id} key={group.id}>
            <div className="qa-section-label">
              {group.label} <span className="line" />
            </div>
            {group.items.length ? (
              <div className="qa-list">
                {group.items.map((item) => (
                  <QaHubItem item={item} key={item.slug} />
                ))}
              </div>
            ) : (
              <div className="qa-empty">
                <strong>No matching questions found.</strong>
                <span>Try a broader search, or open the full Q&A index.</span>
                <Link href="/qa">View all questions</Link>
              </div>
            )}
          </section>
        ))}
      </main>
    </QaShell>
  );
}
