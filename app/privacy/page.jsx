import HybridPublicRoute from '../_components/HybridPublicRoute.jsx';
import PublicChrome from '../_components/PublicChrome.jsx';
import { buildNextMetadata } from '../../src/lib/next-metadata.js';
import { seoByPath } from '../../src/lib/seo.js';

export const metadata = buildNextMetadata(seoByPath['/privacy']);

export default function PrivacyPage() {
  return (
    <HybridPublicRoute initialPath="/privacy">
      <PublicChrome>
        <article className="next-public-article">
          <span className="next-public-kicker">Privacy</span>
          <h1>Privacy Policy</h1>
          <p>
            Polywhale provides a read-only public market monitoring dashboard. The site may store
            browser-local preferences, followed wallet selections, anonymous session identifiers,
            and alert settings required to support app features.
          </p>
          <h2>Public market data</h2>
          <p>
            Trade, market, and wallet information shown by Polywhale comes from public Polymarket
            activity and related public metadata.
          </p>
          <h2>Alerts and follows</h2>
          <p>
            When users activate alerts or follow wallets, Polywhale stores the minimum information
            needed to deliver those features, such as anonymous session data, notification tokens,
            wallet addresses, and alert preferences.
          </p>
          <h2>Contact</h2>
          <p>Privacy and deletion requests can be sent to support@whaletracker.com.</p>
        </article>
      </PublicChrome>
    </HybridPublicRoute>
  );
}
