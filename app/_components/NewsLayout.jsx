import Link from 'next/link';
import { Activity, BarChart3, Bell, Newspaper, Scale, Users } from 'lucide-react';

function NewsNavItem({ href, icon: Icon, label, badge, active = false, disabled = false }) {
  return (
    <Link
      aria-disabled={disabled ? 'true' : undefined}
      className={`feed-nav-item ${active ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
      href={disabled ? '#' : href}
    >
      <Icon size={17} aria-hidden="true" />
      <span>{label}</span>
      {badge ? <small>{badge}</small> : null}
    </Link>
  );
}

function NewsSidebar() {
  return (
    <aside className="feed-sidebar news-feed-sidebar">
      <Link className="feed-brand" href="/" aria-label="Polywhale home">
        <img src="/assets/polywatch-icon.png" alt="" />
        <span className="feed-brand-text">
          <strong>Polywhale</strong>
          <small>trades</small>
        </span>
      </Link>

      <nav className="feed-nav" aria-label="Product navigation">
        <div className="nav-label">Live</div>
        <NewsNavItem href="/" icon={Activity} label="Whale Feed" badge="Live" />

        <div className="nav-label">Discover</div>
        <NewsNavItem href="/leaderboard" icon={BarChart3} label="Leaderboard" badge="Rank" />
        <NewsNavItem href="/news" icon={Newspaper} label="News" badge="New" active />
        <NewsNavItem href="/compare" icon={Scale} label="Compare" badge="SEO" />
        <NewsNavItem href="/profile/following" icon={Users} label="Following" badge="List" />

        <div className="nav-label">Account</div>
        <NewsNavItem href="/alerts" icon={Bell} label="Alerts" badge="Web" />
      </nav>

      <div className="sidebar-links">
        <Link href="/compare">Compare</Link>
        <Link href="/news" aria-current="page">
          News
        </Link>
        <Link href="/qa">Q&A</Link>
        <Link href="/about">About</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
      </div>
    </aside>
  );
}

export function NewsMobileBottomNav() {
  return (
    <nav className="news-mobile-bottom" aria-label="Mobile navigation">
      <Link href="/">Feed</Link>
      <Link href="/leaderboard">Leaders</Link>
      <Link className="active" href="/news">
        News
      </Link>
      <Link href="/alerts">Alerts</Link>
    </nav>
  );
}

export function NewsShell({ children, rail }) {
  return (
    <div className="feed-shell news-shell">
      <NewsSidebar />
      {children}
      {rail}
      <NewsMobileBottomNav />
    </div>
  );
}

export function NewsRail({ article, related = [] }) {
  const facts = article?.facts;
  return (
    <aside className="feed-rail news-rail">
      {facts ? (
        <section className="rail-section news-fact-rail">
          <h2>Trade facts</h2>
          <dl>
            <div>
              <dt>Wallet</dt>
              <dd>{facts.traderName}</dd>
            </div>
            <div>
              <dt>Market</dt>
              <dd>{facts.marketTitle}</dd>
            </div>
            <div>
              <dt>Side</dt>
              <dd>
                {facts.side} {facts.outcome}
              </dd>
            </div>
            <div>
              <dt>Size</dt>
              <dd>{formatUsd(facts.amountUsd)}</dd>
            </div>
            {facts.lossUsd ? (
              <div>
                <dt>Resolved loss</dt>
                <dd>{formatUsd(facts.lossUsd)}</dd>
              </div>
            ) : null}
          </dl>
        </section>
      ) : null}

      {related.length ? (
        <section className="rail-section">
          <h2>Latest news</h2>
          <div className="news-rail-links">
            {related.slice(0, 5).map((item) => (
              <Link href={`/news/${item.slug}`} key={item.slug}>
                <strong>{item.title}</strong>
                <span>{item.kind === 'whale_loss' ? 'Resolved loss' : 'Whale trade'}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </aside>
  );
}

export function NewsTypePill({ kind }) {
  return <span className={`news-pill ${kind === 'whale_loss' ? 'loss' : ''}`}>{kind === 'whale_loss' ? 'Resolved loss' : 'Whale trade'}</span>;
}

export function formatUsd(value) {
  const number = Number(value || 0);
  return `$${Math.round(Math.abs(number)).toLocaleString('en-US')}`;
}

export function formatNewsDate(value) {
  const date = value ? new Date(value) : new Date();
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(date);
}
