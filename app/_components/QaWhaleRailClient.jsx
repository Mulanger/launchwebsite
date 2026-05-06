'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatUsdCompact } from './format.js';

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

function marketShortLabel(trade) {
  const title = `${trade.market?.title || ''} ${trade.market?.slug || ''}`.toLowerCase();
  if (title.includes('bitcoin') || title.includes('crypto') || title.includes('btc')) return 'C';
  if (title.includes('election') || title.includes('trump') || title.includes('politic')) return 'P';
  if (title.includes('nba') || title.includes('nfl') || title.includes('sports')) return 'S';
  return 'M';
}

function normalizeRailTrade(trade, index) {
  const id = trade.id || `${trade.trader?.proxyWallet || 'trade'}-${index}`;
  return {
    id,
    href: trade.id ? `/trade/${encodeURIComponent(trade.id)}` : '/',
    side: trade.side === 'SELL' ? 'SELL' : 'BUY',
    timeAgo: relativeTimeAgo(trade.timestamp),
    imageUrl: marketImageUrl(trade),
    fallback: marketShortLabel(trade),
    marketName: trade.market?.title || 'Unknown market',
    outcome: typeof trade.outcome === 'string' ? trade.outcome : 'Outcome',
    size: formatUsdCompact(trade.usdSize),
    isMega: Number(trade.usdSize || 0) >= 250000 || trade.tier === 'mega',
  };
}

export default function QaWhaleRailClient() {
  const [trades, setTrades] = useState([]);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let cancelled = false;

    async function loadTrades() {
      try {
        const response = await fetch('/api/v1/whales?limit=4&minUsd=10000', {
          headers: { Accept: 'application/json' },
        });

        if (!response.ok) throw new Error(`Whale feed failed with ${response.status}`);

        const data = await response.json();
        const items = Array.isArray(data?.items) ? data.items : [];

        if (!cancelled) {
          setTrades(items.map(normalizeRailTrade));
          setStatus(items.length ? 'ready' : 'empty');
        }
      } catch {
        if (!cancelled) {
          setTrades([]);
          setStatus('error');
        }
      }
    }

    loadTrades();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="rail-section qa-whale-feed-rail" aria-label="Recent whale trades">
      <h2>
        Recent whales <span>Live</span>
      </h2>

      <div className="qa-mini-feed">
        {status === 'loading'
          ? Array.from({ length: 3 }).map((_, index) => (
              <div className="qa-mini-trade skeleton" key={index}>
                <i />
                <span />
                <b />
              </div>
            ))
          : null}

        {trades.map((trade) => (
          <Link className={`qa-mini-trade ${trade.isMega ? 'mega' : ''}`} href={trade.href} key={trade.id}>
            {trade.imageUrl ? (
              <img src={trade.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />
            ) : (
              <i>{trade.fallback}</i>
            )}
            <span>
              <strong>{trade.marketName}</strong>
              <small>
                <em className={trade.side.toLowerCase()}>{trade.side}</em>
                {trade.outcome} · {trade.timeAgo}
              </small>
            </span>
            <b>{trade.size}</b>
          </Link>
        ))}

        {status === 'empty' || status === 'error' ? (
          <div className="qa-mini-feed-empty">
            <strong>Whale feed unavailable</strong>
            <span>Open the live feed for the latest large Polymarket trades.</span>
          </div>
        ) : null}
      </div>

      <Link className="qa-view-all-trades" href="/">
        View all trades
      </Link>
    </section>
  );
}
