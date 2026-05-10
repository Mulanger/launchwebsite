import Link from 'next/link';
import { Activity, BarChart3, Bell, Users } from 'lucide-react';
import { formatUsdCompact, shortWallet } from './format.js';

const sizeFilters = ['All', '50k-100k', '100k-250k', '250k+', 'Following'];
const sideFilters = ['All', 'Buy', 'Sell'];
const leaderboardWindows = ['1D', '7D', '30D', '1Y'];

function formatUsdFull(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(number);
}

function formatPrice(trade) {
  const raw =
    trade.price ??
    trade.executionPrice ??
    trade.outcomePrice ??
    trade.priceCents ??
    (trade.priceMillicents ? Number(trade.priceMillicents) / 100 : undefined);
  const number = Number(raw);
  if (!Number.isFinite(number)) return '--';
  const cents = number <= 1 ? number * 100 : number;
  return `${Math.round(cents)}c`;
}

function formatPlainPrice(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '--';
  const cents = number <= 1 ? number * 100 : number;
  return `${Math.round(cents)}c`;
}

function relativeTimeAgo(timestamp) {
  const seconds = Number(timestamp || 0);
  if (!seconds) return 'Recent';
  const diffMs = Math.max(0, Date.now() - seconds * 1000);
  const minutes = Math.max(1, Math.floor(diffMs / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function inferCategory(trade) {
  const raw = `${trade.market?.category || ''} ${trade.market?.title || ''} ${trade.market?.slug || ''}`.toLowerCase();
  if (raw.includes('bitcoin') || raw.includes('crypto') || raw.includes('btc') || raw.includes('ethereum')) {
    return { id: 'crypto', label: 'Crypto', short: 'B' };
  }
  if (raw.includes('election') || raw.includes('trump') || raw.includes('biden') || raw.includes('politic')) {
    return { id: 'politics', label: 'Politics', short: 'P' };
  }
  if (raw.includes('nba') || raw.includes('nfl') || raw.includes('soccer') || raw.includes('tennis') || raw.includes('sports')) {
    return { id: 'sports', label: 'Sports', short: 'S' };
  }
  if (raw.includes('fed') || raw.includes('inflation') || raw.includes('rate') || raw.includes('econom')) {
    return { id: 'econ', label: 'Economy', short: 'E' };
  }
  return { id: 'general', label: 'Market', short: 'M' };
}

function marketImageUrl(trade) {
  return [
    trade.marketIcon,
    trade.marketImage,
    trade.marketImageUrl,
    trade.icon,
    trade.image,
    trade.market?.icon,
    trade.market?.image,
    trade.market?.imageUrl,
  ].find(Boolean);
}

function marketHrefForSlug(slug) {
  return slug ? `/market/${encodeURIComponent(slug)}` : null;
}

function getTraderName(trade) {
  return trade.trader?.displayName || trade.trader?.pseudonym || shortWallet(trade.trader?.proxyWallet);
}

function hashString(value) {
  return String(value || 'polywhale').split('').reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, 0);
}

function avatarGradient(value) {
  const hue = Math.abs(hashString(value)) % 360;
  return `linear-gradient(135deg, hsl(${hue} 70% 58%), hsl(${(hue + 46) % 360} 62% 36%))`;
}

function sparkPath(values, width = 80, height = 28) {
  const points = values.length ? values : [4, 8, 6, 12, 10, 16, 18];
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = Math.max(1, max - min);
  return points
    .map((value, index) => {
      const x = (index / Math.max(1, points.length - 1)) * width;
      const y = height - ((value - min) / range) * (height - 4) - 2;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

function normalizeTrade(trade, index) {
  const category = inferCategory(trade);
  const wallet = trade.trader?.proxyWallet || '';
  const imageUrl = marketImageUrl(trade);
  return {
    id: trade.id || `${wallet}-${index}`,
    href: trade.id ? `/trade/${encodeURIComponent(trade.id)}` : '/',
    marketHref: marketHrefForSlug(trade.market?.slug),
    side: trade.side === 'SELL' ? 'SELL' : 'BUY',
    timeAgo: relativeTimeAgo(trade.timestamp),
    category,
    imageUrl,
    marketName: trade.market?.title || 'Unknown market',
    marketMeta: `${category.label} - ${trade.outcome || 'Outcome'}`,
    size: formatUsdFull(trade.usdSize),
    compactSize: formatUsdCompact(trade.usdSize),
    price: formatPrice(trade),
    traderName: getTraderName(trade),
    traderWallet: wallet,
    traderHref: wallet ? `/trader/${encodeURIComponent(wallet)}` : null,
    avatar: avatarGradient(wallet || trade.id || index),
    isMega: Number(trade.usdSize || 0) >= 250000 || trade.tier === 'mega',
  };
}

function normalizeLeader(wallet, index) {
  const proxyWallet = wallet.proxyWallet || '';
  const rank = wallet.rank || index + 1;
  const trades = Number(wallet.tradeCount || 0);
  const volume = Number(wallet.volume || 0);
  const profit = Number(wallet.allTimeProfitUsd);
  const profitKnown = Boolean(wallet.allTimeProfitKnown) && Number.isFinite(profit);
  const pnlTrades = Number(wallet.allTimePnlTradeCount || wallet.allTimeHistoryTradeCount || trades || 0);
  const allTimeWinRatePct = Number(wallet.allTimeWinRatePct);
  const recentResults = Array.isArray(wallet.recentFormResults) ? wallet.recentFormResults.slice(0, 5) : [];
  return {
    key: proxyWallet || `${rank}-${index}`,
    rank,
    name: wallet.displayName || wallet.pseudonym || shortWallet(proxyWallet),
    wallet: proxyWallet,
    shortWallet: shortWallet(proxyWallet),
    href: proxyWallet ? `/trader/${encodeURIComponent(proxyWallet)}` : '/leaderboard',
    volume: formatUsdCompact(volume),
    fullVolume: formatUsdFull(volume),
    trades,
    pnlTrades,
    avgTrade: formatUsdCompact(volume / Math.max(1, trades)),
    profit: profitKnown ? formatSignedUsdCompact(profit) : '--',
    profitTone: !profitKnown ? 'muted' : profit < 0 ? 'loss' : 'profit',
    allTimeWinRate: Number.isFinite(allTimeWinRatePct) ? `${trimNumber(allTimeWinRatePct)}%` : '--',
    recentResults,
    avatar: avatarGradient(proxyWallet || rank),
  };
}

function formatSignedUsdCompact(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return '--';
  const prefix = number > 0 ? '+' : number < 0 ? '-' : '';
  return `${prefix}${formatUsdCompact(Math.abs(number))}`;
}

function trimNumber(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return '0';
  return number % 1 === 0 ? String(number) : number.toFixed(1);
}

function PublicSidebar({ activePage = 'feed' }) {
  const links = [
    { label: 'Whale Feed', href: '/', badge: 'Live', active: activePage === 'feed' },
    { label: 'Leaderboard', href: '/leaderboard', badge: 'Rank', active: activePage === 'leaderboard' },
    { label: 'Following', href: '/profile/following', badge: 'List', active: false },
    { label: 'Alerts', href: '/alerts', badge: 'Web', active: false },
    { label: 'Profile', href: '/profile', badge: 'Soon', active: false, disabled: true },
  ];

  return (
    <aside className="next-app-sidebar" aria-label="Product navigation">
      <Link className="next-app-brand" href="/">
        <img src="/assets/polywatch-icon.png" alt="" width="36" height="36" />
        <span>
          <strong>Polywhale</strong>
          <small>trades</small>
        </span>
      </Link>

      <nav className="next-app-nav">
        <span className="next-app-nav-label">Live</span>
        {links.slice(0, 1).map((item) => (
          <Link className={`next-app-nav-item ${item.active ? 'active' : ''}`} href={item.href} key={item.label}>
            <span>{item.label}</span>
            <small>{item.badge}</small>
          </Link>
        ))}
        <span className="next-app-nav-label">Discover</span>
        {links.slice(1, 3).map((item) => (
          <Link className={`next-app-nav-item ${item.active ? 'active' : ''}`} href={item.href} key={item.label}>
            <span>{item.label}</span>
            <small>{item.badge}</small>
          </Link>
        ))}
        <span className="next-app-nav-label">Account</span>
        {links.slice(3).map((item) => (
          <Link className={`next-app-nav-item ${item.disabled ? 'disabled' : ''}`} href={item.disabled ? '#' : item.href} key={item.label}>
            <span>{item.label}</span>
            <small>{item.badge}</small>
          </Link>
        ))}
      </nav>

      <div className="next-app-sidebar-links">
        <Link href="/compare">Compare</Link>
        <Link href="/news">News</Link>
        <Link href="/qa">Q&A</Link>
        <Link href="/about">About</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/delete-data">Delete data</Link>
      </div>
    </aside>
  );
}

function DesktopTradeRow({ trade, index = 0 }) {
  const marketContent = (
    <>
      <MarketThumb trade={trade} size="desktop" loading={index < 6 ? 'eager' : 'lazy'} />
      <span>
        <strong>{trade.marketName}</strong>
        <small className="next-app-market-meta-row">
          <span>{trade.marketMeta}</span>
        </small>
      </span>
    </>
  );

  return (
    <article className={`next-app-trade-row ${trade.isMega ? 'mega' : ''} ${trade.side === 'SELL' ? 'sell' : ''}`}>
      <div className="next-app-tag-stack">
        {trade.isMega ? <span className="next-app-trade-tag mega">Mega</span> : null}
        <span className={`next-app-trade-tag ${trade.side === 'SELL' ? 'sell' : 'buy'}`}>{trade.side === 'SELL' ? 'Sell' : 'Buy'}</span>
        <span className="next-app-trade-tag time">{trade.timeAgo}</span>
      </div>
      {trade.marketHref ? (
        <Link className="next-app-market-cell next-app-market-cell-link" href={trade.marketHref}>
          {marketContent}
        </Link>
      ) : (
        <div className="next-app-market-cell">{marketContent}</div>
      )}
      <div className="next-app-metric">
        <strong>{trade.size}</strong>
      </div>
      <div className="next-app-metric">
        <span>Price</span>
        <strong>{trade.price}</strong>
      </div>
      <div className="next-app-trader-cell">
        <i style={{ background: trade.avatar }} />
        <strong>{trade.traderName}</strong>
      </div>
      <div className="next-app-row-actions">
        <span>+</span>
        <Link href={trade.href}>Go</Link>
      </div>
    </article>
  );
}

function MobileTradeCard({ trade }) {
  const marketContent = (
    <>
      <MarketThumb trade={trade} size="mobile" loading="eager" />
      <span>
        <strong>{trade.marketName}</strong>
        <small className="next-app-market-meta-row">
          <span>{trade.marketMeta}</span>
        </small>
      </span>
    </>
  );

  return (
    <article className="next-app-mobile-card">
      <div className="next-app-mobile-card-top">
        <span className={`next-app-side-badge ${trade.side === 'SELL' ? 'sell' : 'buy'}`}>{trade.side}</span>
        <span>{trade.timeAgo}</span>
        <div>
          <small>+</small>
          <Link href={trade.href}>Go</Link>
        </div>
      </div>
      {trade.marketHref ? (
        <Link className="next-app-mobile-market next-app-market-cell-link" href={trade.marketHref}>
          {marketContent}
        </Link>
      ) : (
        <div className="next-app-mobile-market">{marketContent}</div>
      )}
      <div className="next-app-mobile-metrics">
        <span>
          <small>SIZE</small>
          <strong>{trade.size}</strong>
        </span>
        <span>
          <small>PRICE</small>
          <strong>{trade.price}</strong>
        </span>
        <span className="trader">
          <i style={{ background: trade.avatar }} />
          <strong>{trade.traderName}</strong>
        </span>
      </div>
    </article>
  );
}

function MarketThumb({ trade, size, loading = 'lazy' }) {
  if (trade.imageUrl) {
    const dimension = size === 'desktop' ? 42 : 32;
    return (
      <img
        className={`next-app-market-thumb ${size}`}
        src={trade.imageUrl}
        alt=""
        width={dimension}
        height={dimension}
        loading={loading}
        decoding="async"
        referrerPolicy="no-referrer"
      />
    );
  }
  return <span className={`next-app-market-thumb fallback ${trade.category.id} ${size}`}>{trade.category.short}</span>;
}

function StatPanel({ volume, whales, biggest }) {
  return (
    <section className="next-app-stat-panel" aria-label="Today whale volume">
      <div className="next-app-stat-panel-head">
        <span>
          <small>VOLUME TODAY</small>
          <strong>{formatUsdCompact(volume)}</strong>
        </span>
        <svg width="70" height="26" viewBox="0 0 80 28" fill="none" aria-hidden="true">
          <path d={sparkPath([4, 8, 6, 12, 10, 16, 18])} stroke="#22d3a5" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="next-app-stat-pills">
        <span>
          <small>Whales</small>
          {whales}
        </span>
        <span>
          <small>Mega</small>
          {Math.max(0, Math.min(whales, Math.round(whales / 3)))}
        </span>
        <span className="accent">
          <small>Biggest</small>
          {formatUsdCompact(biggest)}
        </span>
      </div>
    </section>
  );
}

function FeedFilters() {
  return (
    <div className="next-app-filter-block">
      <div className="next-app-size-filters">
        {sizeFilters.map((label, index) => (
          <span className={index === 0 ? 'active' : ''} key={label}>
            {label}
          </span>
        ))}
      </div>
      <div className="next-app-side-filters">
        {sideFilters.map((label, index) => (
          <span className={index === 0 ? 'active' : ''} key={label}>
            {label}
          </span>
        ))}
        <b>Most recent</b>
      </div>
    </div>
  );
}

function MobileBottomNav({ active = 'feed' }) {
  const tabs = [
    { id: 'feed', label: 'Feed', href: '/', icon: Activity },
    { id: 'leaders', label: 'Leaders', href: '/leaderboard', icon: BarChart3 },
    { id: 'following', label: 'Following', href: '/profile/following', icon: Users },
    { id: 'alerts', label: 'Alerts', href: '/alerts', icon: Bell },
  ];
  return (
    <nav className="next-app-mobile-bottom" aria-label="Mobile navigation">
      {tabs.map(({ id, label, href, icon: Icon }) => (
        <Link className={active === id ? 'active' : ''} href={href} key={id}>
          <Icon size={18} aria-hidden="true" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}

function FeedRail({ leaders }) {
  return (
    <aside className="next-app-rail" aria-label="Top whales today">
      <section>
        <span className="next-app-rail-kicker">Top whales today</span>
        <div className="next-app-rail-list">
          {leaders.slice(0, 6).map((leader) => (
            <Link className="next-app-rail-row" href={leader.href} key={leader.key}>
              <i style={{ background: leader.avatar }} />
              <span>
                <strong>{leader.name}</strong>
                <small>{leader.shortWallet}</small>
              </span>
              <b>{leader.volume}</b>
            </Link>
          ))}
        </div>
      </section>
    </aside>
  );
}

function normalizeMarketTrade(trade, index) {
  return normalizeTrade(trade, index);
}

function MarketStatCard({ label, value, tone = '' }) {
  return (
    <span className={tone}>
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
  );
}

function MarketRail({ data, leaders }) {
  const { market, stats, relatedMarkets } = data;
  return (
    <aside className="next-app-rail next-app-market-rail" aria-label="Market context">
      <section className="next-app-market-rail-card">
        <span className="next-app-rail-kicker">Market snapshot</span>
        <div className="next-app-market-rail-market">
          {market.icon ? <img src={market.icon} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <span>M</span>}
          <strong>{market.title}</strong>
        </div>
        <div className="next-app-market-outcome-pair">
          <span>
            <small>YES</small>
            <strong>{formatPlainPrice(market.yesPriceCents)}</strong>
          </span>
          <span>
            <small>NO</small>
            <strong>{formatPlainPrice(market.noPriceCents)}</strong>
          </span>
        </div>
        <div className="next-app-market-rail-stats">
          <span>
            <small>Whale volume</small>
            <strong>{formatUsdCompact(stats.whaleVolume)}</strong>
          </span>
          <span>
            <small>Latest trade</small>
            <strong>{relativeTimeAgo(stats.latestTradeTs)}</strong>
          </span>
        </div>
        <p>{data.seo.reason}. Data refreshes through the public whale feed snapshot.</p>
        {market.polymarketUrl ? (
          <a className="next-app-market-external" href={market.polymarketUrl} target="_blank" rel="noreferrer">
            View on Polymarket
          </a>
        ) : null}
      </section>

      {relatedMarkets.length ? (
        <section className="next-app-market-rail-card">
          <span className="next-app-rail-kicker">Related markets</span>
          <div className="next-app-related-list">
            {relatedMarkets.map((item) => (
              <Link href={marketHrefForSlug(item.slug)} key={item.slug}>
                <span>{item.title}</span>
                <b>{formatUsdCompact(item.whaleVolume)}</b>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <span className="next-app-rail-kicker">Top whales today</span>
        <div className="next-app-rail-list">
          {leaders.slice(0, 6).map((leader) => (
            <Link className="next-app-rail-row" href={leader.href} key={leader.key}>
              <i style={{ background: leader.avatar }} />
              <span>
                <strong>{leader.name}</strong>
                <small>{leader.shortWallet}</small>
              </span>
              <b>{leader.volume}</b>
            </Link>
          ))}
        </div>
      </section>
    </aside>
  );
}

function MarketTradesTable({ trades }) {
  return (
    <section className="next-app-feed-list next-app-market-table" aria-label="Recent whale trades for this market">
      <div className="next-app-feed-head">
        <span>Signal</span>
        <span>Outcome</span>
        <span>Size</span>
        <span>Price</span>
        <span>Trader</span>
        <span />
      </div>
      {trades.map((trade) => (
        <article className={`next-app-trade-row ${trade.isMega ? 'mega' : ''} ${trade.side === 'SELL' ? 'sell' : ''}`} key={trade.id}>
          <div className="next-app-tag-stack">
            {trade.isMega ? <span className="next-app-trade-tag mega">Mega</span> : null}
            <span className={`next-app-trade-tag ${trade.side === 'SELL' ? 'sell' : 'buy'}`}>{trade.side === 'SELL' ? 'Sell' : 'Buy'}</span>
            <span className="next-app-trade-tag time">{trade.timeAgo}</span>
          </div>
          <div className="next-app-market-outcome-cell">
            <strong>{trade.marketMeta.split(' - ').pop() || 'Outcome'}</strong>
            <small>{trade.marketName}</small>
          </div>
          <div className="next-app-metric">
            <strong>{trade.size}</strong>
          </div>
          <div className="next-app-metric">
            <span>Price</span>
            <strong>{trade.price}</strong>
          </div>
          <Link className="next-app-trader-cell" href={trade.traderHref || trade.href}>
            <i style={{ background: trade.avatar }} />
            <strong>{trade.traderName}</strong>
          </Link>
          <div className="next-app-row-actions">
            <span>+</span>
            <Link href={trade.href}>Go</Link>
          </div>
        </article>
      ))}
    </section>
  );
}

function MarketWalletList({ wallets }) {
  return (
    <section className="next-app-market-wallet-section" aria-label="Top whale wallets for this market">
      <div className="next-app-market-section-head">
        <span>Top market wallets</span>
        <small>Ranked by tracked whale volume on this market</small>
      </div>
      <div className="next-app-market-wallet-list">
        {wallets.map((wallet) => (
          <Link className="next-app-market-wallet-row" href={wallet.href} key={wallet.key}>
            <span className="rank">#{wallet.rank}</span>
            <i style={{ background: wallet.avatar }} />
            <strong>{wallet.name}</strong>
            <small>{wallet.trades} trades</small>
            <b>{wallet.volume}</b>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function MarketDashboardSnapshot({ data }) {
  const trades = data.recentTrades.map(normalizeMarketTrade);
  const marketWallets = data.topWallets.map(normalizeLeader);
  const topWhalesToday = data.topWhalesToday.map(normalizeLeader);
  const { market, stats } = data;
  const marketImage = market.icon ? (
    <img src={market.icon} alt="" loading="lazy" referrerPolicy="no-referrer" />
  ) : (
    <span>M</span>
  );

  return (
    <div className="next-app-snapshot">
      <div className="next-app-desktop">
        <PublicSidebar activePage="market" />
        <main className="next-app-main next-app-market-main">
          <header className="next-app-page-head next-app-market-head">
            <Link className="next-app-market-back" href="/">Back to whale feed</Link>
            <span className="next-app-live-kicker"><i /> Market - Polymarket</span>
            <div className="next-app-market-title-row">
              <h1>{market.title}</h1>
              <div className="next-app-market-hero-image" aria-hidden="true">
                {marketImage}
              </div>
            </div>
            <p>This page shows how many millionaire whales have traded {market.title}, including tracked whale volume, recent large trades, and top wallets.</p>
          </header>
          <div className="next-app-stats-grid next-app-market-stats-grid">
            <MarketStatCard label="Whale volume" value={formatUsdFull(stats.whaleVolume)} tone="primary" />
            <MarketStatCard label="Whale trades" value={stats.whaleTradeCount} />
            <MarketStatCard label="Unique whales" value={stats.uniqueWhales} />
            <MarketStatCard label="Biggest trade" value={formatUsdFull(stats.biggestTradeUsd)} tone="accent" />
          </div>
          <div className="next-app-market-control-row">
            <span className={data.seo.indexable ? 'indexable' : 'weak'}>{data.seo.indexable ? 'Indexable market' : 'Noindex until stronger'}</span>
            <span>YES {formatPlainPrice(market.yesPriceCents)}</span>
            <span>NO {formatPlainPrice(market.noPriceCents)}</span>
          </div>
          <MarketTradesTable trades={trades} />
          <MarketWalletList wallets={marketWallets} />
        </main>
        <MarketRail data={data} leaders={topWhalesToday} />
      </div>

      <main className="next-app-mobile next-app-market-mobile">
        <header className="next-app-mobile-title">
          <Link className="next-app-market-back mobile" href="/">Back to whale feed</Link>
          <span><i /> MARKET - POLYMARKET</span>
          <div className="next-app-market-title-row mobile">
            <h1>{market.title}</h1>
            <div className="next-app-market-hero-image" aria-hidden="true">
              {marketImage}
            </div>
          </div>
        </header>
        <div className="next-app-stats-grid next-app-market-stats-grid mobile">
          <MarketStatCard label="Whale volume" value={formatUsdCompact(stats.whaleVolume)} tone="primary" />
          <MarketStatCard label="Whale trades" value={stats.whaleTradeCount} />
          <MarketStatCard label="Unique whales" value={stats.uniqueWhales} />
        </div>
        <div className="next-app-market-control-row mobile">
          <span>YES {formatPlainPrice(market.yesPriceCents)}</span>
          <span>NO {formatPlainPrice(market.noPriceCents)}</span>
        </div>
        <section className="next-app-mobile-list" aria-label="Recent whale trades for this market">
          {trades.map((trade) => (
            <MobileTradeCard trade={trade} key={trade.id} />
          ))}
        </section>
        <MarketWalletList wallets={marketWallets.slice(0, 6)} />
        <MobileBottomNav active="feed" />
      </main>
    </div>
  );
}

function LeaderboardSummary({ leaders }) {
  const topVolume = leaders[0]?.fullVolume || '$0';
  const totalVolume = leaders.reduce((sum, leader) => sum + Number(String(leader.fullVolume).replace(/[^0-9.-]/g, '') || 0), 0);
  return (
    <div className="next-app-leader-summary">
      <span className="primary">
        <small>Top volume</small>
        <strong>{topVolume}</strong>
      </span>
      <span>
        <small>Ranked wallets</small>
        <strong>{leaders.length}</strong>
      </span>
      <span>
        <small>Total volume</small>
        <strong>{formatUsdCompact(totalVolume)}</strong>
      </span>
      <span className="accent">
        <small>Window</small>
        <strong>1D</strong>
      </span>
    </div>
  );
}

function MobileLeaderboardRow({ leader, sort = 'volume' }) {
  const isProfit = sort === 'profit';
  const metric = isProfit ? leader.profit : leader.volume;
  const metricLabel = isProfit ? 'PROFIT' : 'VOLUME';
  const metricColor = isProfit
    ? leader.profitTone === 'loss'
      ? '#ff6b8a'
      : leader.profitTone === 'muted'
        ? 'rgba(255,255,255,0.58)'
        : '#22d3a5'
    : undefined;

  return (
    <Link className={`next-app-mobile-leader ${leader.rank <= 3 ? `rank-${leader.rank}` : ''}`} href={leader.href}>
      <span className="rank">{leader.rank}</span>
      <div className="copy">
        <i style={{ background: leader.avatar }} />
        <span>
          <strong>{leader.name}</strong>
          <small>{leader.wallet || leader.shortWallet}</small>
        </span>
      </div>
      <div className="value">
        <strong style={metricColor ? { color: metricColor } : undefined}>{metric}</strong>
        <small>{metricLabel}</small>
      </div>
      <div className="meta">
        {isProfit ? (
          <>
            <span>P/L trades <b>{leader.pnlTrades}</b></span>
            <span className="center">All time winrate: <b>{leader.allTimeWinRate}</b></span>
            <span className="recent">Recent form: <SnapshotRecentFormChips results={leader.recentResults} /></span>
          </>
        ) : (
          <>
            <span>Trades <b>{leader.trades}</b></span>
            <span>Avg <b>{leader.avgTrade}</b></span>
          </>
        )}
      </div>
    </Link>
  );
}

function SnapshotRecentFormChips({ results }) {
  const paddedResults = [...(Array.isArray(results) ? results.slice(0, 5) : [])];
  while (paddedResults.length < 5) paddedResults.push(null);

  return (
    <span className="next-app-recent-form-chips" aria-hidden="true">
      {paddedResults.map((result, index) => (
        <i className={result === 'W' ? 'win' : result === 'L' ? 'loss' : ''} key={`${result || 'empty'}-${index}`} />
      ))}
    </span>
  );
}

export function PublicFeedSnapshot({ whales = [], leaders = [], error = '' }) {
  const trades = whales.map(normalizeTrade);
  const normalizedLeaders = leaders.map(normalizeLeader);
  const volume = whales.reduce((total, trade) => total + Number(trade.usdSize || 0), 0);
  const biggest = whales.reduce((max, trade) => Math.max(max, Number(trade.usdSize || 0)), 0);
  const activeWhales = new Set(whales.map((trade) => trade.trader?.proxyWallet).filter(Boolean)).size;
  const megaTrades = whales.filter((trade) => Number(trade.usdSize || 0) >= 250000).length;

  return (
    <div className="next-app-snapshot">
      <div className="next-app-desktop">
        <PublicSidebar activePage="feed" />
        <main className="next-app-main">
          <header className="next-app-page-head">
            <span className="next-app-live-kicker"><i /> Live Feed - Polymarket</span>
            <h1>Polymarket <em>Whale Trades</em></h1>
          </header>
          <div className="next-app-stats-grid">
            <span>
              <small>today's volume</small>
              <strong>{formatUsdCompact(volume)}</strong>
            </span>
            <span>
              <small>Active whales</small>
              <strong>{activeWhales || trades.length}</strong>
            </span>
            <span>
              <small>Mega trades</small>
              <strong>{megaTrades}</strong>
            </span>
            <span>
              <small>today's biggest trade</small>
              <strong>{formatUsdCompact(biggest)}</strong>
            </span>
          </div>
          <FeedFilters />
          {error ? <p className="next-app-error">{error}</p> : null}
          <section className="next-app-feed-list" aria-label="Recent whale trades">
            <div className="next-app-feed-head">
              <span>Signal</span>
              <span>Market</span>
              <span>Size</span>
              <span>Price</span>
              <span>Trader</span>
              <span />
            </div>
            {trades.map((trade, index) => (
              <DesktopTradeRow trade={trade} index={index} key={trade.id} />
            ))}
          </section>
        </main>
        <FeedRail leaders={normalizedLeaders} />
      </div>

      <main className="next-app-mobile">
        <header className="next-app-mobile-title">
          <span><i /> LIVE - POLYMARKET</span>
          <h1>Whale <em>trades</em></h1>
        </header>
        <StatPanel volume={volume} whales={trades.length} biggest={biggest} />
        <FeedFilters />
        {error ? <p className="next-app-error">{error}</p> : null}
        <section className="next-app-mobile-list" aria-label="Recent whale trades">
          {trades.map((trade) => (
            <MobileTradeCard trade={trade} key={trade.id} />
          ))}
        </section>
        <MobileBottomNav active="feed" />
      </main>
    </div>
  );
}

export function PublicLeaderboardSnapshot({ items = [], sort = 'profit', error = '' }) {
  const leaders = items.map(normalizeLeader);
  const isProfit = sort === 'profit';

  return (
    <div className="next-app-snapshot">
      <div className="next-app-desktop leaderboard">
        <PublicSidebar activePage="leaderboard" />
        <main className="next-app-main next-app-leader-main compact">
          <section className="next-app-leader-compact">
            <header className="next-app-mobile-title next-app-leader-title">
              <span><i /> RANKED - POLYMARKET</span>
              <h1>Whale <em>leaderboard</em></h1>
            </header>
            <div className="next-app-leader-windows compact">
              {isProfit ? (
                <span className="active">All-time P/L</span>
              ) : (
                leaderboardWindows.map((window, index) => (
                  <span className={index === 0 ? 'active' : index >= 2 ? 'locked' : ''} key={window}>{window}</span>
                ))
              )}
              <b>Sort: {isProfit ? 'Profit' : 'Volume'}</b>
            </div>
            {error ? <p className="next-app-error">{error}</p> : null}
            <section className="next-app-mobile-list next-app-leader-list" aria-label="Ranked whale wallets">
              {leaders.map((leader) => (
                <MobileLeaderboardRow leader={leader} sort={sort} key={leader.key} />
              ))}
            </section>
          </section>
        </main>
      </div>

      <main className="next-app-mobile">
        <header className="next-app-mobile-title">
          <span><i /> RANKED - POLYMARKET</span>
          <h1>Whale <em>leaderboard</em></h1>
        </header>
        <div className="next-app-leader-windows mobile">
          {isProfit ? (
            <span className="active">All-time P/L</span>
          ) : (
            leaderboardWindows.map((window, index) => (
              <span className={index === 0 ? 'active' : index >= 2 ? 'locked' : ''} key={window}>{window}</span>
            ))
          )}
          <b>Sort: {isProfit ? 'Profit' : 'Volume'}</b>
        </div>
        {error ? <p className="next-app-error">{error}</p> : null}
        <section className="next-app-mobile-list" aria-label="Ranked whale wallets">
          {leaders.map((leader) => (
            <MobileLeaderboardRow leader={leader} sort={sort} key={leader.key} />
          ))}
        </section>
        <MobileBottomNav active="leaders" />
      </main>
    </div>
  );
}
