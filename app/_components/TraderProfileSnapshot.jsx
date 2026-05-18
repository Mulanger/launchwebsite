import Link from 'next/link';
import { Activity, BarChart3, Bell, Users } from 'lucide-react';
import { formatUsdCompact, shortWallet as shortWalletLabel } from './format.js';
import QaWhaleRailClient from './QaWhaleRailClient.jsx';
import {
  buildTraderDescription,
  getTraderDisplayName,
  getTraderStats,
  shortWallet,
  traderPathForWallet,
} from '../../src/lib/trader-pages.js';

function formatUsdFull(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(number);
}

function formatNumber(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return '0';
  return new Intl.NumberFormat('en-US').format(number);
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

function formatDate(value) {
  if (!value) return 'Unknown';
  const date = new Date(Number(value) * 1000);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
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

function marketFallback(trade) {
  const raw = `${trade.market?.category || ''} ${trade.market?.title || ''} ${trade.market?.slug || ''}`.toLowerCase();
  if (raw.includes('bitcoin') || raw.includes('crypto') || raw.includes('btc')) return 'C';
  if (raw.includes('election') || raw.includes('trump') || raw.includes('politic')) return 'P';
  if (raw.includes('nba') || raw.includes('nfl') || raw.includes('sports')) return 'S';
  return 'M';
}

function avatarGradient(value) {
  const hash = String(value || 'polywhale').split('').reduce((total, char) => ((total << 5) - total + char.charCodeAt(0)) | 0, 0);
  const hue = Math.abs(hash) % 360;
  return `linear-gradient(135deg, hsl(${hue} 70% 58%), hsl(${(hue + 46) % 360} 62% 36%))`;
}

function getTradeResolutionBlock(trade) {
  const outcomeObject = trade?.outcome && typeof trade.outcome === 'object' ? trade.outcome : null;
  return trade?.resolution || trade?.tradeResolution || trade?.marketResolution || trade?.market?.resolution || outcomeObject || null;
}

function normalizeResolutionStatus(resolution) {
  return String(resolution?.status || resolution?.marketStatus || '').trim().toLowerCase();
}

function isTradeMarketClosed(trade) {
  const resolution = getTradeResolutionBlock(trade);
  const status = normalizeResolutionStatus(resolution);
  return Boolean(
    resolution?.closed ||
      resolution?.resolvedAt ||
      ['closed', 'resolved', 'resolved_win', 'resolved_loss', 'invalid'].includes(status)
  );
}

function getMarketStatusMeta(trade) {
  const resolution = getTradeResolutionBlock(trade);
  const status = normalizeResolutionStatus(resolution);
  const closed = isTradeMarketClosed(trade);

  return {
    label: closed ? 'Closed' : 'Open',
    tone: closed ? (status === 'invalid' ? 'invalid' : 'closed') : 'open',
    closed,
    title: closed ? 'Market has closed or resolved.' : 'Market is still open.',
  };
}

function getTraderOutcomeMeta(trade) {
  const resolution = getTradeResolutionBlock(trade);
  const status = normalizeResolutionStatus(resolution);
  const winningOutcome = resolution?.winningOutcome ? ` Winning outcome: ${resolution.winningOutcome}.` : '';

  if (status === 'invalid') {
    return {
      label: 'Invalid',
      tone: 'invalid',
      title: `Resolution is invalid.${winningOutcome}`,
    };
  }

  if (status === 'resolved_win') {
    return {
      label: 'Win',
      tone: 'win',
      title: `Closed. Trader won this trade.${winningOutcome}`,
    };
  }

  if (status === 'resolved_loss') {
    return {
      label: 'Loss',
      tone: 'loss',
      title: `Closed. Trader lost this trade.${winningOutcome}`,
    };
  }

  return {
    label: 'Closed',
    tone: 'closed',
    title: `Market is closed; trade result is not materialized yet.${winningOutcome}`,
  };
}

function TraderResolutionPills({ trade }) {
  const market = getMarketStatusMeta(trade);
  const outcome = getTraderOutcomeMeta(trade);

  return (
    <span className="resolution-pill-row compact trader-seo-resolution-row">
      <span className={`resolution-pill market-status-pill ${market.tone} compact`} title={market.title}>
        {market.label}
      </span>
      {market.closed ? (
        <span className={`resolution-pill trade-outcome-pill ${outcome.tone} compact`} title={outcome.title}>
          {outcome.label}
        </span>
      ) : null}
    </span>
  );
}

function TraderNavItem({ href, icon: Icon, label, badge }) {
  return (
    <Link className="feed-nav-item" href={href}>
      <Icon size={17} aria-hidden="true" />
      <span>{label}</span>
      {badge ? <small>{badge}</small> : null}
    </Link>
  );
}

function TraderSidebar() {
  return (
    <aside className="feed-sidebar trader-seo-sidebar">
      <Link className="feed-brand" href="/" aria-label="Polywhale home">
        <img src="/assets/polywatch-icon.png" alt="" />
        <span className="feed-brand-text">
          <strong>Polywhale</strong>
          <small>trades</small>
        </span>
      </Link>

      <nav className="feed-nav" aria-label="Product navigation">
        <div className="nav-label">Live</div>
        <TraderNavItem href="/" icon={Activity} label="Whale Feed" badge="Live" />

        <div className="nav-label">Discover</div>
        <TraderNavItem href="/leaderboard" icon={BarChart3} label="Leaderboard" badge="Rank" />
        <TraderNavItem href="/profile/following" icon={Users} label="Following" badge="List" />

        <div className="nav-label">Account</div>
        <TraderNavItem href="/alerts" icon={Bell} label="Alerts" badge="Web" />
      </nav>

      <div className="sidebar-links">
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

function DailyVolumeMiniChart({ points = [] }) {
  const days = points.slice(-14);
  const chartDays = days.length ? days : [{ date: 'No data', volume: 0 }];
  const max = Math.max(...chartDays.map((day) => Number(day.volume || 0)), 1);

  return (
    <div className="trader-seo-chart" aria-label="Daily whale volume chart">
      {chartDays.map((day, index) => {
        const height = Number(day.volume || 0) > 0 ? Math.max(12, (Number(day.volume || 0) / max) * 100) : 4;
        return (
          <span key={`${day.date || index}-${index}`}>
            <i style={{ height: `${height}%` }} />
            <small>{String(day.date || '').slice(5) || '--'}</small>
          </span>
        );
      })}
    </div>
  );
}

function TraderStat({ label, value, tone = '' }) {
  return (
    <span className={tone}>
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
  );
}

function RecentTradeRow({ trade }) {
  const imageUrl = marketImageUrl(trade);
  const side = trade.side === 'SELL' ? 'SELL' : 'BUY';
  const tradeHref = trade.id ? `/trade/${encodeURIComponent(trade.id)}` : traderPathForWallet(trade.trader?.proxyWallet);

  return (
    <Link className="trader-seo-trade-row" href={tradeHref}>
      <span className={`trader-seo-side ${side.toLowerCase()}`}>{side}</span>
      <span className="trader-seo-market">
        {imageUrl ? <img src={imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <i>{marketFallback(trade)}</i>}
        <span>
          <strong>{trade.market?.title || 'Unknown market'}</strong>
          <TraderResolutionPills trade={trade} />
          <small>{trade.outcome || 'Outcome'} · {relativeTimeAgo(trade.timestamp)}</small>
        </span>
      </span>
      <strong className="trader-seo-size">{formatUsdFull(trade.usdSize)}</strong>
      <span className="trader-seo-price">{formatPrice(trade)}</span>
    </Link>
  );
}

function TraderRail() {
  return (
    <aside className="feed-rail trader-seo-rail">
      <QaWhaleRailClient />
    </aside>
  );
}

export default function TraderProfileSnapshot({ profile }) {
  const stats = getTraderStats(profile, '30d');
  const oneDayStats = getTraderStats(profile, '1d');
  const wallet = profile.proxyWallet;
  const name = getTraderDisplayName(profile);
  const recentTrades = Array.isArray(profile.recentWhales) ? profile.recentWhales.slice(0, 12) : [];
  const rank = profile.rankBadge?.rank;
  const rankWindow = String(profile.rankBadge?.window || '1d').toUpperCase();
  const description = buildTraderDescription(profile, stats);
  const avatar = profile.profileImage ? (
    <img src={profile.profileImage} alt="" loading="lazy" referrerPolicy="no-referrer" />
  ) : (
    <span style={{ background: avatarGradient(wallet) }}>{name.slice(0, 1).toUpperCase()}</span>
  );

  return (
    <div className="feed-shell trader-seo-shell">
      <TraderSidebar />
      <main className="feed-main trader-seo-main">
        <Link className="qa-back-button trader-seo-back" href="/leaderboard">
          Back to leaderboard
        </Link>

        <section className="trader-seo-hero">
          <div className="trader-seo-avatar">{avatar}</div>
          <div className="trader-seo-identity">
            <div className="feed-breadcrumb">
              <span className="live-dot online" />
              Trader profile · public wallet
            </div>
            <h1 className="wallet-title" title={wallet}>{shortWallet(wallet)}</h1>
            <p>{description}</p>
            <div className="trader-seo-wallet-line">
              <code>{wallet}</code>
              {profile.pseudonym ? <span>{profile.pseudonym}</span> : null}
            </div>
          </div>
          <div className="trader-seo-rank">
            <span>Rank {rankWindow}</span>
            <strong>{rank ? `#${rank}` : '--'}</strong>
          </div>
        </section>

        <section className="trader-seo-stats" aria-label="Trader whale stats">
          <TraderStat label="30D whale volume" value={formatUsdCompact(stats.volume)} tone="primary" />
          <TraderStat label="30D whale trades" value={formatNumber(stats.whaleCount || stats.tradeCount)} />
          <TraderStat label="Today volume" value={formatUsdCompact(oneDayStats.volume)} tone="accent" />
          <TraderStat label="First seen" value={formatDate(profile.firstSeen)} />
        </section>

        <section className="trader-seo-two-col">
          <section className="trader-seo-panel">
            <div className="trader-seo-section-head">
              <h2>Daily whale volume</h2>
              <span>{profile.dailyVolume?.length || 0} tracked days</span>
            </div>
            <DailyVolumeMiniChart points={profile.dailyVolume || []} />
          </section>

          <section className="trader-seo-panel">
            <div className="trader-seo-section-head">
              <h2>Volume mix</h2>
              <span>30D</span>
            </div>
            <div className="trader-seo-mix">
              <span>
                <small>Buy volume</small>
                <strong>{formatUsdFull(stats.buyVolume)}</strong>
              </span>
              <span>
                <small>Sell volume</small>
                <strong>{formatUsdFull(stats.sellVolume)}</strong>
              </span>
              <span>
                <small>Wallet</small>
                <strong>{shortWalletLabel(wallet) || shortWallet(wallet)}</strong>
              </span>
            </div>
          </section>
        </section>

        <section className="trader-seo-trades">
          <div className="trader-seo-section-head">
            <h2>Recent whale trades</h2>
            <span>{formatNumber(recentTrades.length)} visible trades</span>
          </div>
          {recentTrades.length ? (
            <div className="trader-seo-trade-list">
              {recentTrades.map((trade, index) => (
                <RecentTradeRow trade={trade} key={trade.id || index} />
              ))}
            </div>
          ) : (
            <div className="trader-seo-empty">
              <strong>No recent whale trades</strong>
              <span>This wallet has no recent feed-visible whale trades in the current API response.</span>
            </div>
          )}
        </section>
      </main>
      <TraderRail />
    </div>
  );
}
