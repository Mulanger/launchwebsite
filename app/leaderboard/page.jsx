import HybridPublicRoute from '../_components/HybridPublicRoute.jsx';
import PublicChrome from '../_components/PublicChrome.jsx';
import { formatUsdCompact, shortWallet } from '../_components/format.js';
import { buildNextMetadata } from '../../src/lib/next-metadata.js';
import { fetchPublicLeaderboard } from '../../src/lib/server-api.js';
import { seoByPath } from '../../src/lib/seo.js';

export const revalidate = 60;
export const metadata = buildNextMetadata(seoByPath['/leaderboard']);

async function loadLeaderboard() {
  try {
    const data = await fetchPublicLeaderboard('1d', 50);
    return {
      items: Array.isArray(data?.items) ? data.items : [],
      error: '',
    };
  } catch (error) {
    return {
      items: [],
      error: error.message || 'Leaderboard unavailable',
    };
  }
}

export default async function LeaderboardPage() {
  const { items, error } = await loadLeaderboard();
  const topVolume = items[0]?.volume || 0;

  return (
    <HybridPublicRoute initialPath="/leaderboard">
      <PublicChrome>
        <section className="next-public-hero">
          <div>
            <span className="next-public-kicker">Polymarket whale leaderboard</span>
            <h1 className="next-public-title">Top whales today</h1>
            <p className="next-public-copy">
              Public wallets ranked by whale volume, trade count, and average activity for the current
              New York session.
            </p>
          </div>
          <aside className="next-public-panel">
            <div className="next-public-panel-inner">
              <div className="next-public-grid">
                <div className="next-public-card">
                  <span>Wallets</span>
                  <strong>{items.length}</strong>
                </div>
                <div className="next-public-card">
                  <span>Top volume</span>
                  <strong>{formatUsdCompact(topVolume)}</strong>
                </div>
                <div className="next-public-card">
                  <span>Window</span>
                  <strong>1D</strong>
                </div>
              </div>
              {error ? <p className="next-public-copy">{error}</p> : null}
            </div>
          </aside>
        </section>

        <section className="next-public-section" aria-labelledby="leaderboard-heading">
          <h2 id="leaderboard-heading">Ranked wallets</h2>
          <ul className="next-public-list">
            {items.map((wallet, index) => (
              <li className="next-public-row" key={wallet.proxyWallet || index}>
                <span className="next-public-rank">#{wallet.rank || index + 1}</span>
                <div>
                  <strong>{wallet.displayName || wallet.pseudonym || shortWallet(wallet.proxyWallet)}</strong>
                  <span>
                    {shortWallet(wallet.proxyWallet)} · {wallet.tradeCount || 0} trades · avg{' '}
                    {formatUsdCompact(Number(wallet.volume || 0) / Math.max(1, Number(wallet.tradeCount || 0)))}
                  </span>
                </div>
                <b className="next-public-value">{formatUsdCompact(wallet.volume)}</b>
              </li>
            ))}
          </ul>
        </section>
      </PublicChrome>
    </HybridPublicRoute>
  );
}
