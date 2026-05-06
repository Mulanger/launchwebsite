import Link from 'next/link';

export default function PublicChrome({ children }) {
  return (
    <div className="next-public-shell">
      <header className="next-public-nav">
        <Link className="next-public-brand" href="/">
          Polywhale
        </Link>
        <nav className="next-public-nav-links" aria-label="Primary">
          <Link href="/">Live feed</Link>
          <Link href="/leaderboard">Leaderboard</Link>
          <Link href="/about">About</Link>
          <Link href="/alerts">Alerts</Link>
        </nav>
      </header>
      <main className="next-public-main">{children}</main>
    </div>
  );
}
