import JsonLd from '../_components/JsonLd.jsx';
import HybridPublicRoute from '../_components/HybridPublicRoute.jsx';
import PublicChrome from '../_components/PublicChrome.jsx';
import Link from 'next/link';
import { buildNextMetadata } from '../../src/lib/next-metadata.js';
import { seoByPath } from '../../src/lib/seo.js';

export const metadata = buildNextMetadata(seoByPath['/about']);

export default function AboutPage() {
  return (
    <HybridPublicRoute initialPath="/about">
      <PublicChrome>
        <JsonLd data={seoByPath['/about'].structuredData} />
        <article className="next-public-article">
          <span className="next-public-kicker">About Polywhale</span>
          <h1>Live visibility into large Polymarket trades</h1>
          <p>
            Polywhale is an independent public dashboard for monitoring large Polymarket trades,
            top whale wallets, leaderboard activity, and large-trade alerts. It is built for users
            who want to scan public market flow without placing trades inside the product.
          </p>
          <h2>What Polywhale tracks</h2>
          <p>
            The site highlights whale-sized public trades, including market, side, size, price,
            trader wallet, related wallet activity, and ranked whale volume for the current session.
          </p>
          <p>
            Users can also turn on{' '}
            <Link href="/polymarket-whale-alerts">Polymarket whale alerts</Link>
            {' '}for large trades, mega whales, and followed wallets.
          </p>
          <h2>How the leaderboard works</h2>
          <p>
            Leaderboard rows rank public wallets by whale volume and supporting signals such as
            trade count and average trade size. The public web view focuses on the current New York
            trading session first.
          </p>
          <h2>Independence</h2>
          <p>
            Polywhale is not affiliated with, endorsed by, or operated by Polymarket. It is a
            read-only monitoring surface for public activity.
          </p>
        </article>
      </PublicChrome>
    </HybridPublicRoute>
  );
}
