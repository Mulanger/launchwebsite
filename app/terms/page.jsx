import PublicChrome from '../_components/PublicChrome.jsx';
import { buildNextMetadata } from '../../src/lib/next-metadata.js';
import { seoByPath } from '../../src/lib/seo.js';

export const metadata = buildNextMetadata(seoByPath['/terms']);

export default function TermsPage() {
  return (
    <PublicChrome>
      <article className="next-public-article">
        <span className="next-public-kicker">Terms</span>
        <h1>Terms of Service</h1>
        <p>
          Polywhale is a read-only monitoring surface for public Polymarket activity. The product
          does not provide trading, wagering, financial advice, or investment advice.
        </p>
        <h2>Use of the service</h2>
        <p>
          Users are responsible for how they interpret public market information shown by the site.
          Data may be delayed, incomplete, or unavailable during upstream service interruptions.
        </p>
        <h2>No affiliation</h2>
        <p>
          Polywhale is independent and is not affiliated with, endorsed by, or operated by
          Polymarket.
        </p>
      </article>
    </PublicChrome>
  );
}
