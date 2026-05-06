import PublicChrome from '../_components/PublicChrome.jsx';
import { buildNextMetadata } from '../../src/lib/next-metadata.js';
import { seoByPath } from '../../src/lib/seo.js';

export const metadata = buildNextMetadata(seoByPath['/delete-data']);

export default function DeleteDataPage() {
  return (
    <PublicChrome>
      <article className="next-public-article">
        <span className="next-public-kicker">Data deletion</span>
        <h1>Delete Data</h1>
        <p>
          Users can request deletion of server-side Polywhale alert, follow, notification, and
          anonymous session data associated with their web app session.
        </p>
        <h2>What to include</h2>
        <p>
          Send the request from the browser or account context where possible, and include enough
          information for support to identify the affected anonymous session or notification setup.
        </p>
        <h2>Contact</h2>
        <p>Deletion requests can be sent to support@whaletracker.com.</p>
      </article>
    </PublicChrome>
  );
}
