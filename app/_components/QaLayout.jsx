import Link from 'next/link';
import { Activity, BarChart3, Bell, Scale, Users } from 'lucide-react';
import { sourceLabel } from '../../src/lib/qna.js';
import QaWhaleRailClient from './QaWhaleRailClient.jsx';

function QaNavItem({ href, icon: Icon, label, badge, active = false, disabled = false }) {
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

function QaSidebar() {
  return (
    <aside className="feed-sidebar qa-feed-sidebar">
      <Link className="feed-brand" href="/" aria-label="Polywhale home">
        <img src="/assets/polywatch-icon.png" alt="" />
        <span className="feed-brand-text">
          <strong>Polywhale</strong>
          <small>trades</small>
        </span>
      </Link>

      <nav className="feed-nav" aria-label="Product navigation">
        <div className="nav-label">Live</div>
        <QaNavItem href="/" icon={Activity} label="Whale Feed" badge="Live" />

        <div className="nav-label">Discover</div>
        <QaNavItem href="/leaderboard" icon={BarChart3} label="Leaderboard" badge="Rank" />
        <QaNavItem href="/compare" icon={Scale} label="Compare" badge="Guide" />
        <QaNavItem href="/profile/following" icon={Users} label="Following" badge="List" />

        <div className="nav-label">Account</div>
        <QaNavItem href="/alerts" icon={Bell} label="Alerts" badge="Web" />
      </nav>

      <div className="sidebar-links">
        <Link href="/compare">Compare</Link>
        <Link href="/news">News</Link>
        <Link href="/qa" aria-current="page">
          Q&A
        </Link>
        <Link href="/polymarket-whale-alerts">Whale alerts</Link>
        <Link href="/about">About</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/delete-data">Delete data</Link>
      </div>
    </aside>
  );
}

export function QaMobileBottomNav() {
  return (
    <nav className="qa-mobile-bottom" aria-label="Mobile navigation">
      <Link href="/">Feed</Link>
      <Link href="/leaderboard">Leaders</Link>
      <Link className="active" href="/qa">
        Q&A
      </Link>
      <Link href="/alerts">Alerts</Link>
    </nav>
  );
}

export function QaShell({ children, rail }) {
  return (
    <div className="feed-shell qa-shell">
      <QaSidebar />
      {children}
      {rail}
      <QaMobileBottomNav />
    </div>
  );
}

export function QaCategoryPill({ item }) {
  return <span className={`qa-pill ${item.category.tone}`}>{item.category.pill}</span>;
}

export function QaSourceLinks({ sources = [] }) {
  if (!sources.length) return null;

  return (
    <section className="qa-source-block" aria-labelledby="qa-sources-title">
      <h2 id="qa-sources-title">Sources</h2>
      <div className="qa-source-links">
        {sources.map((url) => (
          <a href={url} key={url} rel="noopener noreferrer">
            {sourceLabel(url)}
          </a>
        ))}
      </div>
    </section>
  );
}

export function QaRelatedList({ items = [], title = 'Related questions' }) {
  if (!items.length) return null;

  return (
    <section className="qa-related-section" aria-labelledby="qa-related-title">
      <div className="qa-section-label" id="qa-related-title">
        {title} <span className="line" />
      </div>
      <div className="qa-list qa-related-list">
        {items.map((item) => (
          <Link className="qa-item qa-link-item compact" href={item.path} key={item.slug}>
            <span>
              <QaCategoryPill item={item} />
              <strong>{item.question}</strong>
            </span>
            <small>Read answer</small>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function QaRail({ related = [], currentCategory }) {
  return (
    <aside className="feed-rail qa-rail">
      <QaWhaleRailClient />

      {related.length ? (
        <section className="rail-section">
          <h2>More Q&A</h2>
          <div className="qa-rail-related">
            {related.slice(0, 5).map((item) => (
              <Link href={item.path} key={item.slug}>
                <strong>{item.question}</strong>
                <span>{item.category.label}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </aside>
  );
}
