import Link from 'next/link';
import { ArrowRight, Scale } from 'lucide-react';
import JsonLd from '../_components/JsonLd.jsx';
import { buildNextMetadata } from '../../src/lib/next-metadata.js';
import { buildCompareHubStructuredData, comparePages } from '../../src/lib/compare-pages.js';

export const revalidate = 86400;

export const metadata = buildNextMetadata({
  title: 'Prediction Market Comparisons | Polymarket, Kalshi & More | Polywhale',
  description:
    'Compare prediction markets by fees, regulation, market coverage, funding methods, liquidity signals, and trader workflows.',
  keywords:
    'prediction market comparisons, Polymarket vs Kalshi, Kalshi alternatives, Polymarket alternatives, prediction market fees',
  path: '/compare',
  robots: 'index,follow,max-image-preview:large',
});

export default function CompareHubPage() {
  return (
    <div className="compare-page-shell">
      <JsonLd data={buildCompareHubStructuredData()} />
      <main className="compare-hub-main">
        <Link className="compare-back-link" href="/">
          Polywhale
        </Link>
        <header className="compare-hub-hero">
          <span className="compare-eyebrow">
            <Scale size={16} aria-hidden="true" />
            Prediction market comparisons
          </span>
          <h1>Compare prediction markets before you trade.</h1>
          <p>
            Plain-English comparisons for traders choosing between Polymarket, Kalshi, and other event-market
            platforms. Each page focuses on fees, regulation, market coverage, funding, and data visibility.
          </p>
        </header>

        <section className="compare-hub-list" aria-label="Available comparisons">
          {comparePages.map((page) => (
            <Link className="compare-hub-item" href={page.path} key={page.slug}>
              <span>
                <strong>{page.h1}</strong>
                <small>{page.description}</small>
              </span>
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}
