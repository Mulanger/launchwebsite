import Link from 'next/link';
import JsonLd from './_components/JsonLd.jsx';
import PublicChrome from './_components/PublicChrome.jsx';
import { formatDateTime, formatUsdCompact, shortWallet } from './_components/format.js';
import { buildNextMetadata } from '../src/lib/next-metadata.js';
import { fetchPublicLeaderboard, fetchPublicWhales } from '../src/lib/server-api.js';
import { seoByPath } from '../src/lib/seo.js';

export const revalidate = 60;
export const metadata = buildNextMetadata(seoByPath['/']);

async function loadHomeData() {
  try {
    const [whales, leaderboard] = await Promise.all([
      fetchPublicWhales(8),
      fetchPublicLeaderboard('1d', 8),
    ]);
    return {
      whales: Array.isArray(whales?.items) ? whales.items : [],
      leaders: Array.isArray(leaderboard?.items) ? leaderboard.items : [],
      error: '',
    };
  } catch (error) {
    return {
      whales: [],
      leaders: [],
      error: error.message || 'Live data unavailable',
    };
  }
}

export default async function HomePage() {
  const { whales, leaders, error } = await loadHomeData();
  const volume = whales.reduce((total, trade) => total + Number(trade.usdSize || 0), 0);

  return (
    <PublicChrome>
      <JsonLd data={seoByPath['/'].structuredData} />
      <section className="next-public-hero">
        <div>
          <span className="next-public-kicker">Live Polymarket whale tracking</span>
          <h1 className="next-public-title">Polywhale</h1>
          <p className="next-public-copy">
            Track large public Polymarket trades, top whale wallets, market activity, and trader
            leaderboards from a fast public dashboard built for scanning live prediction-market flow.
          </p>
          <div className="next-public-actions">
            <Link className="next-public-button" href="/leaderboard">
              View leaderboard
            </Link>
            <Link className="next-public-button secondary" href="/about">
              How it works
            </Link>
          </div>
        </div>
        <aside className="next-public-panel" aria-label="Current whale feed snapshot">
          <div className="next-public-panel-inner">
            <div className="next-public-grid">
              <div className="next-public-card">
                <span>Loaded volume</span>
                <strong>{formatUsdCompact(volume)}</strong>
              </div>
              <div className="next-public-card">
                <span>Recent whales</span>
                <strong>{whales.length}</strong>
              </div>
              <div className="next-public-card">
                <span>Ranked wallets</span>
                <strong>{leaders.length}</strong>
              </div>
            </div>
            {error ? <p className="next-public-copy">{error}</p> : null}
          </div>
        </aside>
      </section>

      <section className="next-public-section" aria-labelledby="recent-whales-heading">
        <h2 id="recent-whales-heading">Recent large trades</h2>
        <ul className="next-public-list">
          {whales.map((trade, index) => (
            <li className="next-public-row" key={trade.id || `${trade.trader?.proxyWallet}-${index}`}>
              <span className="next-public-rank">{index + 1}</span>
              <div>
                <strong>{trade.market?.title || 'Polymarket trade'}</strong>
                <span>
                  {shortWallet(trade.trader?.proxyWallet)} · {trade.side || 'Trade'} · {formatDateTime(trade.timestamp)}
                </span>
              </div>
              <b className="next-public-value">{formatUsdCompact(trade.usdSize)}</b>
            </li>
          ))}
        </ul>
      </section>

      <section className="next-public-section" aria-labelledby="top-whales-heading">
        <h2 id="top-whales-heading">Top whales today</h2>
        <ul className="next-public-list">
          {leaders.map((wallet, index) => (
            <li className="next-public-row" key={wallet.proxyWallet || index}>
              <span className="next-public-rank">#{wallet.rank || index + 1}</span>
              <div>
                <strong>{wallet.displayName || wallet.pseudonym || shortWallet(wallet.proxyWallet)}</strong>
                <span>{shortWallet(wallet.proxyWallet)} · {wallet.tradeCount || 0} trades</span>
              </div>
              <b className="next-public-value">{formatUsdCompact(wallet.volume)}</b>
            </li>
          ))}
        </ul>
      </section>
    </PublicChrome>
  );
}
