import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  BellOff,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  DollarSign,
  ExternalLink,
  FileText,
  Hash,
  Layers,
  LockKeyhole,
  Mail,
  Moon,
  Radio,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Target,
  Trophy,
  User,
  UserPlus,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';

const supportEmail = 'support@whaletracker.com';
const lastUpdated = 'May 1, 2026';
const prodApiUrl = 'https://whaleserver-production.up.railway.app';
const apiBaseUrl = normalizeApiBase(import.meta.env.VITE_API_BASE_URL || '/api');
const wsBaseUrl = normalizeWsBase(import.meta.env.VITE_WS_BASE_URL || prodApiUrl);
const authStorageKey = 'polywatch:webAuth';
const deviceIdStorageKey = 'polywatch:webDeviceId';
const followsStorageKey = 'polywatch:followedWallets';
const followsChangedEvent = 'polywatch:follows-changed';
const alertPrefsStorageKey = 'polywatch:webAlertPrefs';
const walletRegex = /^0x[0-9a-fA-F]{40}$/;

const rangeOptions = [
  { id: 'all', label: 'All', minUsd: 10000 },
  { id: '50-100', label: '50k-100k', minUsd: 50000, maxUsd: 100000 },
  { id: '100-250', label: '100k-250k', minUsd: 100000, maxUsd: 250000 },
  { id: 'mega', label: '250k+', minUsd: 250000 },
];

const sideOptions = [
  { id: 'all', label: 'All sides' },
  { id: 'BUY', label: 'Buy' },
  { id: 'SELL', label: 'Sell' },
];

const feedSortOptions = [
  { id: 'recent', label: 'Most recent' },
  { id: 'largest', label: 'Largest size' },
];

const leaderboardWindows = [
  { id: '7d', label: '7D', caption: 'Last 7 days' },
  { id: '30d', label: '30D', caption: 'Last 30 days' },
  { id: '365d', label: '1Y', caption: 'Last 365 days' },
];

const leaderboardSortOptions = [
  { id: 'rank', label: 'Rank' },
  { id: 'volume', label: 'Whale volume' },
  { id: 'trades', label: 'Trade count' },
];

const legalLinks = [
  { href: '/privacy', label: 'Privacy Policy', icon: LockKeyhole },
  { href: '/terms', label: 'Terms of Service', icon: FileText },
  { href: '/delete-data', label: 'Delete Data', icon: ShieldCheck },
];

const reveal = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
};

function App() {
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  const tradeMatch = path.match(/^\/trade\/([^/]+)$/);
  const traderMatch = path.match(/^\/trader\/([^/]+)$/);

  if (path === '/privacy') return <PrivacyPage />;
  if (path === '/terms') return <TermsPage />;
  if (path === '/delete-data') return <DeleteDataPage />;
  if (path === '/leaderboard') return <LeaderboardPage />;
  if (path === '/profile/following') return <FollowingPage />;
  if (path === '/profile') return <ProfilePage />;
  if (path === '/alerts') return <AlertsPage />;
  if (tradeMatch) return <TradeDetailPage tradeId={decodeURIComponent(tradeMatch[1])} />;
  if (traderMatch) return <TraderProfilePage wallet={decodeURIComponent(traderMatch[1])} />;

  return <WhaleFeedPage />;
}

function WhaleFeedPage() {
  const [rangeId, setRangeId] = useState('all');
  const [side, setSide] = useState('all');
  const [followingOnly, setFollowingOnly] = useState(() => {
    const query = new URLSearchParams(window.location.search);
    return query.get('following') === '1' || query.get('following') === 'true';
  });
  const [sort, setSort] = useState('recent');
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [liveState, setLiveState] = useState('connecting');
  const [clock, setClock] = useState(() => Date.now());
  const [leaderboard, setLeaderboard] = useState([]);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [followedCount, setFollowedCount] = useState(() => readFollowedWallets().size);

  const selectedRange = useMemo(
    () => rangeOptions.find((option) => option.id === rangeId) ?? rangeOptions[0],
    [rangeId]
  );

  const apiFilter = useMemo(
    () => ({
      minUsd: selectedRange.minUsd,
      maxUsd: selectedRange.maxUsd,
      side: side === 'all' ? undefined : side,
      following: followingOnly ? true : undefined,
    }),
    [selectedRange, side, followingOnly]
  );

  const filterKey = useMemo(() => JSON.stringify(apiFilter), [apiFilter]);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const refreshFollowState = () => {
      setFollowedCount(readFollowedWallets().size);
    };

    refreshFollowState();

    if (hasStoredAuth()) {
      syncFollowedWalletsFromServer()
        .then(refreshFollowState)
        .catch(() => {
          // Local follows still keep the personal feed usable if sync is unavailable.
        });
    }

    window.addEventListener(followsChangedEvent, refreshFollowState);
    return () => window.removeEventListener(followsChangedEvent, refreshFollowState);
  }, [followingOnly]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadInitialWhales() {
      setLoading(true);
      setError('');
      try {
        const data = await fetchTodayWhalesForFilter(apiFilter, { signal: controller.signal });
        setItems(Array.isArray(data.items) ? data.items : []);
        setCursor(data.nextCursor ?? null);
        setLastUpdatedAt(Date.now());
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Failed to load whale feed.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadInitialWhales();
    return () => controller.abort();
  }, [filterKey, refreshNonce]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadLeaderboard() {
      try {
        const data = await fetchJson('/v1/leaderboard?window=7d&limit=15', {
          signal: controller.signal,
        });
        setLeaderboard(Array.isArray(data.items) ? data.items : []);
      } catch {
        setLeaderboard([]);
      }
    }

    loadLeaderboard();
    return () => controller.abort();
  }, [refreshNonce]);

  useEffect(() => {
    let closed = false;
    let socket;
    let retryTimer;
    const hydrateController = new AbortController();
    const hydratingTradeIds = new Set();

    if (apiFilter.following) {
      setLiveState('filtered');
      return undefined;
    }

    function connect() {
      setLiveState('connecting');
      socket = new WebSocket(joinUrl(wsBaseUrl, '/v1/whales/stream'));

      socket.onopen = () => {
        setLiveState('live');
        socket.send(
          JSON.stringify({
            type: 'subscribe',
            filter: compactFilter(apiFilter),
          })
        );
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type !== 'whale' || !message.data) return;

          const whale = message.data;
          if (!passesFilter(whale, apiFilter)) return;

          setItems((previous) => {
            const enrichedWhale = enrichWhaleWithExistingMarketMedia(whale, previous);
            return upsertWhale(previous, enrichedWhale, { promote: true }).slice(0, 120);
          });

          if (!hasMarketImage(whale) && whale.id && !hydratingTradeIds.has(whale.id)) {
            hydratingTradeIds.add(whale.id);
            hydrateWhaleTrade(whale.id, hydrateController.signal)
              .then((hydratedWhale) => {
                if (closed || !hydratedWhale || !hasMarketImage(hydratedWhale)) return;
                setItems((previous) => {
                  const enrichedWhale = enrichWhaleWithExistingMarketMedia(hydratedWhale, previous);
                  return upsertWhale(previous, enrichedWhale, {
                    promote: false,
                    insertIfMissing: false,
                  });
                });
              })
              .catch(() => {
                // The next REST refresh/load can still provide market media.
              })
              .finally(() => hydratingTradeIds.delete(whale.id));
          }

          setLastUpdatedAt(Date.now());
        } catch {
          // Ignore malformed socket payloads. The REST refresh is the source of truth.
        }
      };

      socket.onerror = () => {
        if (!closed) setLiveState('offline');
      };

      socket.onclose = () => {
        if (closed) return;
        setLiveState('reconnecting');
        retryTimer = window.setTimeout(connect, 3500);
      };
    }

    connect();

    return () => {
      closed = true;
      window.clearTimeout(retryTimer);
      hydrateController.abort();
      if (socket && socket.readyState <= WebSocket.OPEN) {
        socket.close(1000, 'route changed');
      }
    };
  }, [filterKey]);

  const sessionItems = useMemo(() => filterNewYorkSession(items, clock), [items, clock]);
  const visibleItems = useMemo(() => sortWhales(sessionItems, sort), [sessionItems, sort]);

  const stats = useMemo(() => buildStats(items, clock), [items, clock]);
  const lastHour = useMemo(() => buildLastHour(items, clock), [items, clock]);
  const volumeSparkline = useMemo(() => buildFeedStatSparkline(lastHour.points), [lastHour.points]);
  const whaleBars = useMemo(() => buildFeedStatBars(lastHour.points), [lastHour.points]);

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;

    setLoadingMore(true);
    setError('');
    try {
      const data = await fetchWhalesForFilter(apiFilter, cursor);
      const incoming = Array.isArray(data.items) ? data.items : [];
      setItems((previous) => mergeWhales(previous, incoming));
      setCursor(data.nextCursor ?? null);
      setLastUpdatedAt(Date.now());
    } catch (err) {
      setError(err.message || 'Failed to load more whales.');
    } finally {
      setLoadingMore(false);
    }
  }, [apiFilter, cursor, loadingMore]);

  return (
    <div className="feed-shell">
      <FeedSidebar activePage="feed" liveState={liveState} />

      <main className="feed-main">
        <header className="feed-topbar">
          <div>
            <div className="feed-breadcrumb">
              <LiveDot state={liveState} />
              Live Feed - Polymarket
            </div>
            <h1>
              Polymarket <em>Whale Trades</em>
            </h1>
          </div>

          <div className="feed-topbar-actions">
            <button
              className="icon-button"
              type="button"
              onClick={() => setRefreshNonce((value) => value + 1)}
              aria-label="Refresh whale feed"
              title="Refresh"
            >
              <RefreshCw size={17} aria-hidden="true" />
            </button>
            <a
              className="icon-button"
              href="/privacy"
              aria-label="Privacy policy"
              title="Privacy"
            >
              <ShieldCheck size={17} aria-hidden="true" />
            </a>
          </div>
        </header>

        <motion.section initial="hidden" animate="visible" variants={reveal}>
          <FeedStatCards
            todaysVolume={formatUsdCompact(stats.volume)}
            volumeSparkline={volumeSparkline}
            activeWhales={formatNumber(stats.activeTraders)}
            whaleBars={whaleBars}
            megaTrades={formatNumber(stats.megaTrades)}
            biggestTrade={formatUsdCompact(stats.biggestTradeUsd)}
            biggestTradeSide={stats.biggestTradeUsd > 0 ? stats.biggestTradeSide : '--'}
          />
        </motion.section>

        <section className="filter-row" aria-label="Feed filters">
          <div className="pill-group">
            {rangeOptions.map((option) => (
              <button
                className={`filter-pill ${rangeId === option.id ? 'active' : ''}`}
                key={option.id}
                type="button"
                onClick={() => setRangeId(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="filter-divider" />

          <button
            className={`filter-pill personal ${followingOnly ? 'active' : ''}`}
            type="button"
            onClick={() => {
              const next = !followingOnly;
              setFollowingOnly(next);
              updateFollowingQueryParam(next);
            }}
            title={followedCount ? 'Show only traders you follow' : 'Follow traders from the leaderboard or profile pages'}
          >
            Following{followedCount ? ` (${followedCount})` : ''}
          </button>

          <div className="filter-divider" />

          <div className="pill-group compact">
            {sideOptions.map((option) => (
              <button
                className={`filter-pill ${side === option.id ? 'active' : ''}`}
                key={option.id}
                type="button"
                onClick={() => setSide(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <SortMenu value={sort} onChange={setSort} options={feedSortOptions} />
        </section>

        <section className="feed-table" aria-live="polite">
          <div className="feed-table-head">
            <span>Type / Time</span>
            <span>Market</span>
            <span>Size</span>
            <span>Price</span>
            <span>Trader</span>
            <span />
          </div>

          {loading ? (
            <FeedSkeleton />
          ) : error && visibleItems.length === 0 ? (
            <EmptyState
              title="Feed unavailable"
              body={error}
              actionLabel="Try again"
              onAction={() => setRefreshNonce((value) => value + 1)}
            />
          ) : visibleItems.length === 0 ? (
            <EmptyState
              title={followingOnly ? 'No followed whale trades' : 'No whales match this view'}
              body={
                followingOnly
                  ? followedCount
                    ? "The traders you follow do not have whale trades in today's New York session."
                    : 'Follow traders from the leaderboard or trader profiles to build a personal feed.'
                  : "Change the size or side filter to widen today's New York session."
              }
              actionLabel={followingOnly && !followedCount ? 'Browse leaderboard' : 'Reset filters'}
              onAction={() => {
                if (followingOnly && !followedCount) {
                  window.location.href = '/leaderboard';
                  return;
                }
                setRangeId('all');
                setSide('all');
                setFollowingOnly(false);
                updateFollowingQueryParam(false);
              }}
            />
          ) : (
            <div className="feed-list">
              {visibleItems.map((trade, index) => (
                <TradeRow trade={trade} key={trade.id} index={index} />
              ))}
            </div>
          )}
        </section>

        <div className="feed-footer-action">
          {error && visibleItems.length > 0 ? <span>{error}</span> : null}
          <button
            className="load-more-button"
            type="button"
            disabled={!cursor || loadingMore}
            onClick={loadMore}
          >
            {loadingMore ? 'Loading...' : cursor ? 'Load more whales' : 'End of visible feed'}
          </button>
        </div>
      </main>

      <FeedRail
        leaderboard={leaderboard}
        lastHour={lastHour}
      />
    </div>
  );
}

function LeaderboardPage() {
  const [windowId, setWindowId] = useState('7d');
  const [sort, setSort] = useState('rank');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [asOf, setAsOf] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadLeaderboard() {
      setLoading(true);
      setError('');
      try {
        const data = await fetchJson(buildLeaderboardPath(windowId), {
          signal: controller.signal,
        });
        setItems(Array.isArray(data.items) ? data.items : []);
        setCursor(data.nextCursor ?? null);
        setAsOf(data.asOf ?? null);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Failed to load leaderboard.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadLeaderboard();
    return () => controller.abort();
  }, [windowId, refreshNonce]);

  const selectedWindow = useMemo(
    () => leaderboardWindows.find((option) => option.id === windowId) ?? leaderboardWindows[0],
    [windowId]
  );

  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = query
      ? items.filter((item) => leaderboardSearchableText(item).includes(query))
      : [...items];
    return sortLeaderboardItems(filtered, sort);
  }, [items, search, sort]);

  const stats = useMemo(() => buildLeaderboardStats(items), [items]);

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;

    setLoadingMore(true);
    setError('');
    try {
      const data = await fetchJson(buildLeaderboardPath(windowId, cursor));
      const incoming = Array.isArray(data.items) ? data.items : [];
      setItems((previous) => mergeLeaderboardItems(previous, incoming));
      setCursor(data.nextCursor ?? null);
      setAsOf(data.asOf ?? asOf);
    } catch (err) {
      setError(err.message || 'Failed to load more leaderboard rows.');
    } finally {
      setLoadingMore(false);
    }
  }, [asOf, cursor, loadingMore, windowId]);

  return (
    <div className="feed-shell leaderboard-shell">
      <FeedSidebar activePage="leaderboard" liveState="live" />

      <main className="feed-main leaderboard-main">
        <header className="feed-topbar leaderboard-topbar">
          <div>
            <div className="feed-breadcrumb">
              <Trophy size={14} aria-hidden="true" />
              Ranked wallets - {selectedWindow.caption}
            </div>
            <h1>
              Leaderboard <em>{selectedWindow.label}</em>
            </h1>
          </div>

          <div className="feed-topbar-actions">
            <button
              className="icon-button"
              type="button"
              onClick={() => setRefreshNonce((value) => value + 1)}
              aria-label="Refresh leaderboard"
              title="Refresh"
            >
              <RefreshCw size={17} aria-hidden="true" />
            </button>
          </div>
        </header>

        <motion.section
          className="stats-strip leaderboard-stats"
          initial="hidden"
          animate="visible"
          variants={reveal}
        >
          <StatBlock label="Loaded Volume" value={formatUsdCompact(stats.volume)} />
          <StatBlock label="Ranked Traders" value={formatNumber(stats.traders)} />
          <StatBlock label="Tracked Trades" value={formatNumber(stats.trades)} />
          <StatBlock label="Top Wallet" value={formatUsdCompact(stats.topVolume)} />
        </motion.section>

        <section className="filter-row" aria-label="Leaderboard filters">
          <div className="pill-group">
            {leaderboardWindows.map((option) => (
              <WindowFilterButton
                key={option.id}
                option={option}
                active={windowId === option.id}
                onSelect={setWindowId}
              />
            ))}
          </div>

          <SortMenu
            value={sort}
            onChange={setSort}
            options={leaderboardSortOptions}
            className="leaderboard-sort"
          />
        </section>

        <section className="leaderboard-table" aria-live="polite">
          <div className="leaderboard-table-head">
            <span>Rank</span>
            <span>Trader</span>
            <span>Whale volume</span>
            <span>Trades</span>
            <span>Avg trade</span>
          </div>

          {loading ? (
            <LeaderboardSkeleton />
          ) : error && visibleItems.length === 0 ? (
            <EmptyState
              title="Leaderboard unavailable"
              body={error}
              actionLabel="Try again"
              onAction={() => setRefreshNonce((value) => value + 1)}
            />
          ) : visibleItems.length === 0 ? (
            <EmptyState
              title="No ranked traders match this search"
              body="Change the window or search term to widen the leaderboard."
              actionLabel="Reset search"
              onAction={() => setSearch('')}
            />
          ) : (
            <div className="leaderboard-list">
              {visibleItems.map((trader, index) => (
                <LeaderboardRow
                  key={trader.proxyWallet}
                  trader={trader}
                  index={index}
                  maxVolume={stats.topVolume}
                />
              ))}
            </div>
          )}
        </section>

        <div className="feed-footer-action">
          {error && visibleItems.length > 0 ? <span>{error}</span> : null}
          <button
            className="load-more-button"
            type="button"
            disabled={!cursor || loadingMore}
            onClick={loadMore}
          >
            {loadingMore ? 'Loading...' : cursor ? 'Load more ranked traders' : 'End of leaderboard'}
          </button>
        </div>
      </main>

      <LeaderboardRail
        items={items}
        asOf={asOf}
        selectedWindow={selectedWindow}
        stats={stats}
      />
    </div>
  );
}

function TradeDetailPage({ tradeId }) {
  const [trade, setTrade] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadTrade() {
      setLoading(true);
      setError('');
      try {
        const data = await fetchJson(`/v1/whales/${encodeURIComponent(tradeId)}`, {
          signal: controller.signal,
        });
        setTrade(data);
      } catch (err) {
        if (err.name === 'AbortError') return;

        const fallback = readCachedTrade(tradeId) ?? (await findRecentTradeById(tradeId, controller.signal));
        if (fallback) {
          setTrade(fallback);
          setError('');
        } else {
          setError(err.message || 'Failed to load trade.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadTrade();
    return () => controller.abort();
  }, [tradeId, refreshNonce]);

  const traderHref = trade?.trader?.proxyWallet
    ? `/trader/${encodeURIComponent(trade.trader.proxyWallet)}`
    : null;

  return (
    <div className="feed-shell detail-shell no-rail-shell">
      <FeedSidebar activePage="detail" liveState="live" />

      <main className="feed-main detail-main">
        <DetailBackBar href="/" label="Back to feed" />

        {loading ? (
          <DetailSkeleton title="Loading trade" />
        ) : error || !trade ? (
          <EmptyState
            title="Trade unavailable"
            body={error || 'This trade could not be found.'}
            actionLabel="Try again"
            onAction={() => setRefreshNonce((value) => value + 1)}
          />
        ) : (
          <>
            <header className="detail-hero trade-hero">
              <div className="feed-breadcrumb">
                <Activity size={14} aria-hidden="true" />
                Trade - {relativeTime(trade.timestamp)} ago
              </div>
              <div className="detail-title-row">
                <div>
                  <h1>
                    {formatUsdFull(trade.usdSize)} <em>{trade.side}</em>
                  </h1>
                  <p>{trade.market?.title || 'Unknown market'}</p>
                </div>
              </div>
            </header>

            <section className="stats-strip detail-stats">
              <StatBlock label="USD Size" value={formatUsdCompact(trade.usdSize)} />
              <StatBlock label="Price" value={formatPrice(trade)} />
              <StatBlock label="Shares" value={formatShares(trade.shares)} />
              <StatBlock label="Side" value={trade.side} tone={trade.side === 'SELL' ? 'down' : 'up'} />
            </section>

            <section className="detail-grid">
              <div className="detail-panel primary-detail-panel">
                <div className="panel-heading">
                  <Hash size={16} aria-hidden="true" />
                  <span>Trade Details</span>
                </div>
                <DetailRows
                  rows={[
                    ['Trade ID', trade.id],
                    ['Transaction', trade.transactionHash || 'Unknown'],
                    ['Timestamp', formatDateTimeSeconds(trade.timestamp)],
                    ['Tier', trade.tier || 'whale'],
                    ['Polymarket URL', trade.polymarketUrl || trade.market?.polymarketUrl || 'Unavailable'],
                  ]}
                />
              </div>

              <div className="detail-panel">
                <div className="panel-heading panel-heading-with-action">
                  <span>
                    <Layers size={16} aria-hidden="true" />
                    Market
                  </span>
                  <span className="market-price-badge">{formatPrice(trade)}</span>
                </div>
                <div className="market-detail-card">
                  <MarketIcon trade={trade} category={inferCategory(trade)} />
                  <div>
                    <strong>{trade.market?.title || 'Unknown market'}</strong>
                    <span>{inferCategory(trade).label} - {trade.outcome || 'Outcome'}</span>
                  </div>
                </div>
                <div className="detail-action-row">
                  <a
                    className="secondary-link-button"
                    href={trade.polymarketUrl || trade.market?.polymarketUrl || '#'}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open market
                    <ExternalLink size={16} aria-hidden="true" />
                  </a>
                </div>
              </div>

              <div className="detail-panel trader-detail-panel">
                <div className="panel-heading">
                  <Wallet size={16} aria-hidden="true" />
                  <span>Trader</span>
                </div>
                <div className="trader-profile-strip">
                  <TraderAvatar trade={trade} />
                  <div>
                    <strong>{getTraderName(trade)}</strong>
                    <span>{shortWallet(trade.trader?.proxyWallet) || 'Public wallet'}</span>
                  </div>
                </div>
                {traderHref ? (
                  <div className="detail-action-row">
                    <FollowWalletButton wallet={trade.trader?.proxyWallet} variant="wide" />
                    <a className="primary-link-button" href={traderHref}>
                      View trader profile
                      <ArrowRightIcon />
                    </a>
                  </div>
                ) : null}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function TraderProfilePage({ wallet }) {
  const normalizedWallet = wallet.toLowerCase();
  const [profile, setProfile] = useState(null);
  const [windowId, setWindowId] = useState(() => {
    const queryWindow = new URLSearchParams(window.location.search).get('window');
    return queryWindow === '7d' ? queryWindow : '7d';
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadTrader() {
      setLoading(true);
      setError('');
      try {
        const data = await fetchJson(`/v1/traders/${encodeURIComponent(normalizedWallet)}`, {
          signal: controller.signal,
        });
        setProfile(data);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Failed to load trader profile.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadTrader();
    return () => controller.abort();
  }, [normalizedWallet, refreshNonce]);

  const stats = profile ? getProfileStats(profile, windowId) : emptyProfileStats();
  const volumeMix = buildVolumeMix(stats);
  const headingName = profile ? traderProfileName(profile) : '';
  const profileWallet = profile?.proxyWallet || normalizedWallet;

  return (
    <div className="feed-shell detail-shell">
      <FeedSidebar activePage="detail" liveState="live" />

      <main className="feed-main detail-main trader-profile-main">
        <DetailBackBar href="/leaderboard" label="Back to leaderboard" />

        {loading ? (
          <DetailSkeleton title="Loading trader" />
        ) : error || !profile ? (
          <EmptyState
            title="Trader unavailable"
            body={error || 'This trader could not be found.'}
            actionLabel="Try again"
            onAction={() => setRefreshNonce((value) => value + 1)}
          />
        ) : (
          <>
            <header className="detail-hero trader-hero">
              <div className="feed-breadcrumb">
                <Wallet size={14} aria-hidden="true" />
                Trader profile - public wallet
              </div>
              <div className="trader-hero-row">
                <ProfileAvatar profile={profile} />
                <div className="trader-identity">
                  <h1 title={traderProfileFullName(profile)}>{headingName}</h1>
                  <WalletAddressLine address={profileWallet} />
                </div>
                <div className="profile-actions">
                  {profile.rankBadge ? (
                    <span className="rank-badge">
                      #{profile.rankBadge.rank} - {String(profile.rankBadge.window).toUpperCase()}
                    </span>
                  ) : null}
                  <FollowWalletButton wallet={profile.proxyWallet} variant="wide" />
                </div>
              </div>
            </header>

            <section className="filter-row profile-window-row" aria-label="Trader stat window">
              <div className="pill-group">
                {leaderboardWindows.map((option) => (
                  <WindowFilterButton
                    key={option.id}
                    option={option}
                    active={windowId === option.id}
                    onSelect={setWindowId}
                  />
                ))}
              </div>
            </section>

            <section className="stats-strip detail-stats">
              <StatBlock label="Whale Volume" value={formatUsdCompact(stats.volume)} />
              <StatBlock label="Whale Trades" value={formatNumber(stats.whaleCount)} />
              <StatBlock label="Buy Volume" value={formatUsdCompact(stats.buyVolume)} />
              <StatBlock label="Sell Volume" value={formatUsdCompact(stats.sellVolume)} tone="down" />
            </section>

            <section className="trader-profile-grid">
              <div className="detail-panel trader-chart-panel">
                <div className="panel-heading">
                  <BarChart3 size={16} aria-hidden="true" />
                  <span>Daily Whale Volume</span>
                </div>
                <DailyVolumeChart points={profile.dailyVolume || []} />
              </div>

              <div className="detail-panel volume-mix-panel">
                <div className="panel-heading">
                  <Target size={16} aria-hidden="true" />
                  <span>Volume Mix</span>
                </div>
                <VolumeMixBar mix={volumeMix} />
                <DetailRows
                  rows={[
                    ['Buy volume', formatUsdFull(stats.buyVolume)],
                    ['Sell volume', formatUsdFull(stats.sellVolume)],
                    ['Total trades', formatNumber(stats.tradeCount)],
                    ['First seen', formatDateTimeSeconds(profile.firstSeen)],
                  ]}
                />
              </div>
            </section>

            <section className="recent-section">
              <div className="section-title-row">
                <div>
                  <h2>Recent whale trades</h2>
                  <p>Latest feed-visible trades from this wallet.</p>
                </div>
              </div>
              {profile.recentWhales?.length ? (
                <div className="feed-list">
                  {profile.recentWhales.map((trade, index) => (
                    <TradeRow trade={trade} key={trade.id} index={index} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No recent whale trades"
                  body="This wallet has no visible recent whale trades in the current API response."
                  actionLabel="Refresh"
                  onAction={() => setRefreshNonce((value) => value + 1)}
                />
              )}
            </section>
          </>
        )}
      </main>

      <TraderProfileRail profile={profile} stats={stats} />
    </div>
  );
}

function ProfilePage() {
  const { items, loading, error, refresh } = useFollowedTraders();
  const previewItems = items.slice(0, 5);
  const totalVolume = items.reduce((total, item) => total + Number(item.vol7d || 0), 0);

  return (
    <div className="feed-shell detail-shell profile-shell">
      <FeedSidebar activePage="profile" liveState="live" />

      <main className="feed-main detail-main profile-main">
        <header className="feed-topbar profile-topbar">
          <div>
            <div className="feed-breadcrumb">
              <User size={14} aria-hidden="true" />
              Account - web profile
            </div>
            <h1>
              Profile <em>Free</em>
            </h1>
          </div>

          <div className="feed-topbar-actions">
            <button
              className="icon-button"
              type="button"
              onClick={refresh}
              aria-label="Refresh profile"
              title="Refresh"
            >
              <RefreshCw size={17} aria-hidden="true" />
            </button>
          </div>
        </header>

        <motion.section
          className="stats-strip detail-stats"
          initial="hidden"
          animate="visible"
          variants={reveal}
        >
          <StatBlock label="Account" value="Free user" />
          <StatBlock label="Following" value={formatNumber(items.length)} />
          <StatBlock label="7D Followed Volume" value={formatUsdCompact(totalVolume)} />
          <StatBlock label="Web Alerts" value="Setup" tone="down" />
        </motion.section>

        <section className="profile-settings-grid">
          <ProfilePanel icon={Settings} title="Account">
            <div className="settings-list">
              <SettingsRow icon={User} label="Plan" value="Free user" />
              <SettingsRow icon={Moon} label="Theme" value="Dark" />
              <SettingsRow icon={DollarSign} label="Currency" value="$ USD" />
            </div>
          </ProfilePanel>

          <ProfilePanel icon={Users} title="Following">
            {loading ? (
              <FollowingSkeleton rows={3} />
            ) : error && !items.length ? (
              <p className="profile-panel-note">{error}</p>
            ) : previewItems.length ? (
              <>
                <div className="profile-following-list">
                  {previewItems.map((item) => (
                    <FollowedTraderRow item={item} key={item.proxyWallet} compact />
                  ))}
                </div>
                {items.length > 5 ? (
                  <a className="profile-panel-action" href="/profile/following">
                    View all following
                    <span>{formatNumber(items.length)}</span>
                    <ChevronRight size={16} aria-hidden="true" />
                  </a>
                ) : null}
              </>
            ) : (
              <div className="profile-empty-following">
                <p>You're not following anyone yet.</p>
                <a href="/leaderboard">Browse leaderboard</a>
              </div>
            )}
          </ProfilePanel>

          <ProfilePanel icon={Bell} title="Notifications">
            <div className="settings-list">
              <a className="settings-row link-row" href="/alerts">
                <span className="settings-row-icon">
                  <Bell size={16} aria-hidden="true" />
                </span>
                <span>
                  <strong>Alert settings</strong>
                  <small>Android alerts are live. Web push is next.</small>
                </span>
                <ChevronRight size={16} aria-hidden="true" />
              </a>
            </div>
          </ProfilePanel>

          <ProfilePanel icon={ShieldCheck} title="About">
            <div className="settings-list">
              <SettingsRow icon={FileText} label="Version" value="1.0.0 web" />
              <a className="settings-row link-row" href="/privacy">
                <span className="settings-row-icon">
                  <LockKeyhole size={16} aria-hidden="true" />
                </span>
                <span>
                  <strong>Privacy Policy</strong>
                  <small>launchwebsite-production-e827.up.railway.app/privacy</small>
                </span>
                <ChevronRight size={16} aria-hidden="true" />
              </a>
              <a className="settings-row link-row" href="/terms">
                <span className="settings-row-icon">
                  <FileText size={16} aria-hidden="true" />
                </span>
                <span>
                  <strong>Terms of Service</strong>
                  <small>launchwebsite-production-e827.up.railway.app/terms</small>
                </span>
                <ChevronRight size={16} aria-hidden="true" />
              </a>
              <a className="settings-row link-row" href={`mailto:${supportEmail}?subject=Polywatch feedback`}>
                <span className="settings-row-icon">
                  <Mail size={16} aria-hidden="true" />
                </span>
                <span>
                  <strong>Send Feedback</strong>
                  <small>{supportEmail}</small>
                </span>
                <ChevronRight size={16} aria-hidden="true" />
              </a>
            </div>
          </ProfilePanel>
        </section>
      </main>

      <DetailRail
        title="Profile Status"
        items={[
          ['Plan', 'Free user is the default web account label.'],
          ['Following', "Uses the same follow API, scoped to this browser's anonymous web user."],
          ['Notifications', 'Browser push needs a Firebase web worker before it can match Android alerts.'],
        ]}
      />
    </div>
  );
}

function FollowingPage() {
  const { items, loading, error, refresh } = useFollowedTraders();
  const [search, setSearch] = useState('');
  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) =>
      [item.displayName, item.pseudonym, item.proxyWallet]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }, [items, search]);
  const totalVolume = items.reduce((total, item) => total + Number(item.vol7d || 0), 0);

  return (
    <div className="feed-shell detail-shell profile-shell">
      <FeedSidebar activePage="following" liveState="live" />

      <main className="feed-main detail-main profile-main">
        <DetailBackBar href="/profile" label="Back to profile" />

        <header className="feed-topbar profile-topbar">
          <div>
            <div className="feed-breadcrumb">
              <Users size={14} aria-hidden="true" />
              Traders you follow
            </div>
            <h1>
              Following <em>{formatNumber(items.length)}</em>
            </h1>
          </div>

          <div className="feed-topbar-actions">
            <label className="feed-search">
              <Search size={15} aria-hidden="true" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search followed wallets..."
              />
            </label>
            <button
              className="icon-button"
              type="button"
              onClick={refresh}
              aria-label="Refresh following list"
              title="Refresh"
            >
              <RefreshCw size={17} aria-hidden="true" />
            </button>
          </div>
        </header>

        <section className="stats-strip detail-stats">
          <StatBlock label="Followed Traders" value={formatNumber(items.length)} />
          <StatBlock label="7D Followed Volume" value={formatUsdCompact(totalVolume)} />
          <StatBlock label="Latest Follow" value={items[0]?.followedAt ? relativeTime(items[0].followedAt) : '-'} />
          <StatBlock label="Feed Filter" value="Ready" />
        </section>

        <section className="following-list-section" aria-live="polite">
          <div className="section-title-row">
            <div>
              <h2>Managed list</h2>
              <p>Unfollow directly here or open any trader profile.</p>
            </div>
            {error ? <span className="section-error">{error}</span> : null}
          </div>

          {loading ? (
            <FollowingSkeleton rows={8} />
          ) : visibleItems.length ? (
            <div className="following-list">
              {visibleItems.map((item) => (
                <FollowedTraderRow item={item} key={item.proxyWallet} />
              ))}
            </div>
          ) : items.length ? (
            <EmptyState
              title="No followed trader matches this search"
              body="Clear the search field to show the full following list."
              actionLabel="Clear search"
              onAction={() => setSearch('')}
            />
          ) : (
            <EmptyState
              title="You're not following anyone yet"
              body="Open the leaderboard or a trader profile and follow wallets you want to track."
              actionLabel="Browse leaderboard"
              onAction={() => {
                window.location.href = '/leaderboard';
              }}
            />
          )}
        </section>
      </main>

      <DetailRail
        title="Following"
        items={[
          ['Feed filter', 'Use the Following chip on the live feed to show only followed wallets.'],
          ['Identity', "Web follows are tied to this browser until account sign-in exists."],
          ['Limit', 'The API returns up to 500 followed traders for this account.'],
        ]}
      />
    </div>
  );
}

function AlertsPage() {
  const [prefs, setPrefs] = useState(() => readWebAlertPrefs());
  const [savedAt, setSavedAt] = useState(null);

  const updatePrefs = (patch) => {
    setPrefs((current) => ({ ...current, ...patch }));
    setSavedAt(null);
  };

  const savePrefs = () => {
    writeStoredJson(alertPrefsStorageKey, prefs);
    setSavedAt(Date.now());
  };

  return (
    <div className="feed-shell detail-shell profile-shell">
      <FeedSidebar activePage="alerts" liveState="live" />

      <main className="feed-main detail-main profile-main">
        <header className="feed-topbar profile-topbar">
          <div>
            <div className="feed-breadcrumb">
              <Bell size={14} aria-hidden="true" />
              Notifications - web
            </div>
            <h1>
              Alerts <em>Setup</em>
            </h1>
          </div>
        </header>

        <section className="stats-strip detail-stats">
          <StatBlock label="Android FCM" value="Live" />
          <StatBlock label="Web Push" value="Pending" tone="down" />
          <StatBlock label="Following Mode" value={prefs.followingOnly ? 'On' : 'Off'} />
          <StatBlock label="Minimum Size" value={formatUsdCompact(prefs.minUsd)} />
        </section>

        <section className="profile-settings-grid alerts-grid">
          <ProfilePanel icon={BellOff} title="Web push status">
            <p className="profile-panel-note">
              The website can store alert preferences, but browser push delivery still needs Firebase Web
              Messaging and a service worker before it can receive notifications like Android.
            </p>
            <div className="settings-list">
              <SettingsRow icon={Bell} label="Current delivery" value="Android app" />
              <SettingsRow icon={ShieldCheck} label="Backend support" value="FCM mobile token" />
              <SettingsRow icon={Clock} label="Next web step" value="Service worker" />
            </div>
          </ProfilePanel>

          <ProfilePanel icon={SlidersHorizontal} title="Preference draft">
            <div className="alert-control-stack">
              <label className="range-control">
                <span>
                  <strong>Minimum size</strong>
                  <small>{formatUsdFull(prefs.minUsd)}</small>
                </span>
                <input
                  type="range"
                  min="10000"
                  max="500000"
                  step="10000"
                  value={prefs.minUsd}
                  onChange={(event) => updatePrefs({ minUsd: Number(event.target.value) })}
                />
              </label>
              <ToggleRow
                title="Mega whale only"
                subtitle="$250K+ trades only"
                checked={prefs.megaOnly}
                onChange={(value) => updatePrefs({ megaOnly: value })}
              />
              <ToggleRow
                title="Following list only"
                subtitle="Only traders you follow"
                checked={prefs.followingOnly}
                onChange={(value) => updatePrefs({ followingOnly: value })}
              />
              <ToggleRow
                title="Quiet hours"
                subtitle="10pm to 7am"
                checked={prefs.quietHoursEnabled}
                onChange={(value) => updatePrefs({ quietHoursEnabled: value })}
              />
              <div className="detail-action-row">
                <button className="load-more-button" type="button" onClick={savePrefs}>
                  Save web draft
                </button>
                {savedAt ? <span className="saved-note">Saved {relativeClientTime(savedAt)}</span> : null}
              </div>
            </div>
          </ProfilePanel>
        </section>
      </main>

      <DetailRail
        title="Alert Parity"
        items={[
          ['Android', 'FCM notifications remain the production alert channel.'],
          ['Web', 'The UI is ready, but delivery needs Firebase Web Messaging configuration.'],
          ['Following-only', 'The server already checks followed wallets for mobile alert subscriptions.'],
        ]}
      />
    </div>
  );
}

function ProfilePanel({ icon: Icon, title, children }) {
  return (
    <section className="detail-panel profile-panel">
      <div className="panel-heading">
        <Icon size={16} aria-hidden="true" />
        <span>{title}</span>
      </div>
      {children}
    </section>
  );
}

function SettingsRow({ icon: Icon, label, value }) {
  return (
    <div className="settings-row">
      <span className="settings-row-icon">
        <Icon size={16} aria-hidden="true" />
      </span>
      <span>
        <strong>{label}</strong>
      </span>
      <small>{value}</small>
    </div>
  );
}

function ToggleRow({ title, subtitle, checked, onChange }) {
  return (
    <label className="toggle-row">
      <span>
        <strong>{title}</strong>
        <small>{subtitle}</small>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="toggle-visual" aria-hidden="true" />
    </label>
  );
}

function FollowedTraderRow({ item, compact = false }) {
  const href = `/trader/${encodeURIComponent(item.proxyWallet)}`;
  const name = followedTraderName(item);

  return (
    <article
      className={`followed-trader-row ${compact ? 'compact' : ''}`}
      role="link"
      tabIndex={0}
      onClick={() => {
        window.location.href = href;
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') window.location.href = href;
      }}
    >
      <FollowedAvatar item={item} />
      <div className="followed-trader-copy">
        <strong title={name}>{name}</strong>
        <span>{shortWallet(item.proxyWallet)}</span>
      </div>
      <div className="followed-trader-actions">
        <div className="followed-trader-meta">
          <strong>{formatUsdCompact(item.vol7d)}</strong>
          <span>7D volume</span>
        </div>
        {compact ? <ChevronRight size={16} aria-hidden="true" /> : <FollowWalletButton wallet={item.proxyWallet} variant="icon" />}
      </div>
    </article>
  );
}

function FollowedAvatar({ item }) {
  const imageUrl = item.profileImage;
  const [failed, setFailed] = useState(false);

  if (imageUrl && !failed) {
    return (
      <img
        className="trader-avatar followed-avatar"
        src={imageUrl}
        alt=""
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <span
      className="trader-avatar followed-avatar"
      style={{ background: avatarGradient(item.proxyWallet) }}
      aria-hidden="true"
    />
  );
}

function FollowingSkeleton({ rows = 4 }) {
  return (
    <div className="following-list">
      {Array.from({ length: rows }).map((_, index) => (
        <div className="followed-trader-row skeleton-followed-row" key={index}>
          <div />
          <div />
          <div />
        </div>
      ))}
    </div>
  );
}

function FeedSidebar({ activePage, liveState }) {
  const navItems = [
    {
      label: 'Whale Feed',
      href: '/',
      icon: Activity,
      badge: liveStateLabel(liveState),
      active: activePage === 'feed',
    },
    {
      label: 'Leaderboard',
      href: '/leaderboard',
      icon: BarChart3,
      badge: '7d',
      active: activePage === 'leaderboard',
    },
    {
      label: 'Following',
      href: '/profile/following',
      icon: Users,
      badge: 'List',
      active: activePage === 'following',
    },
    {
      label: 'Alerts',
      href: '/alerts',
      icon: Bell,
      badge: 'Web',
      active: activePage === 'alerts',
    },
    {
      label: 'Profile',
      href: '/profile',
      icon: User,
      badge: 'Free',
      active: activePage === 'profile',
    },
  ];

  return (
    <aside className="feed-sidebar">
      <a className="feed-brand" href="/" aria-label="Polywatch home">
        <img src="/assets/polywatch-icon.png" alt="" />
        <span>Polywatch</span>
      </a>

      <nav className="feed-nav" aria-label="Product navigation">
        <div className="nav-label">Live</div>
        {navItems.slice(0, 1).map((item) => (
          <NavItem key={item.label} {...item} />
        ))}

        <div className="nav-label">Discover</div>
        {navItems.slice(1, 3).map((item) => (
          <NavItem key={item.label} {...item} />
        ))}

        <div className="nav-label">Account</div>
        {navItems.slice(3).map((item) => (
          <NavItem key={item.label} {...item} />
        ))}
      </nav>

      <div className="sidebar-panel">
        <div className="sidebar-panel-icon">
          <Radio size={17} aria-hidden="true" />
        </div>
        <div>
          <strong>Public web beta</strong>
          <span>Read-only feed. Trading stays outside Polywatch.</span>
        </div>
      </div>

      <div className="sidebar-links">
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
        <a href="/delete-data">Delete data</a>
      </div>
    </aside>
  );
}

function NavItem({ label, href, icon: Icon, badge, active = false }) {
  return (
    <a className={`feed-nav-item ${active ? 'active' : ''}`} href={href}>
      <Icon size={17} aria-hidden="true" />
      <span>{label}</span>
      <small>{badge}</small>
    </a>
  );
}

function SortMenu({ value, onChange, options, className = '' }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.id === value) ?? options[0];

  useEffect(() => {
    if (!open) return undefined;

    const close = () => setOpen(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [open]);

  return (
    <div className={`sort-menu ${className}`} onClick={(event) => event.stopPropagation()}>
      <button
        className="sort-menu-trigger"
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <SlidersHorizontal size={14} aria-hidden="true" />
        <span>{selected.label}</span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>

      {open ? (
        <div className="sort-menu-popover" role="menu">
          {options.map((option) => (
            <button
              className={`sort-menu-option ${option.id === value ? 'active' : ''}`}
              type="button"
              role="menuitemradio"
              aria-checked={option.id === value}
              key={option.id}
              onClick={() => {
                onChange(option.id);
                setOpen(false);
              }}
            >
              <span>{option.label}</span>
              {option.id === value ? <Check size={14} aria-hidden="true" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function WindowFilterButton({ option, active, onSelect }) {
  const locked = option.id !== '7d';

  return (
    <button
      className={`filter-pill window-pill ${active ? 'active' : ''} ${locked ? 'locked' : ''}`}
      type="button"
      aria-disabled={locked}
      title={locked ? 'Coming soon' : option.caption}
      onClick={() => {
        if (!locked) onSelect(option.id);
      }}
    >
      <span>{option.label}</span>
      {locked ? <LockKeyhole className="locked-icon" size={13} aria-hidden="true" /> : null}
      {locked ? <span className="locked-tooltip">Coming soon</span> : null}
    </button>
  );
}

function StatBlock({ label, value, tone = 'up' }) {
  return (
    <div className="stat-block">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function FeedStatCards({
  todaysVolume = '$0',
  volumeSparkline = [4, 8, 6, 12, 10, 16, 18],
  activeWhales = 0,
  whaleBars = [0.3, 0.5, 0.4, 0.7, 0.6, 0.9, 1.0],
  megaTrades = 0,
  biggestTrade = '$0',
  biggestTradeSide = 'BUY',
}) {
  const sparkPath = buildStatSparkPath(volumeSparkline, 50, 22, 2);

  return (
    <div className="feed-stat-cards">
      <FeedStatCard
        label="TODAY'S VOLUME"
        value={todaysVolume}
        accent="green"
        rightSlot={
          <svg width="50" height="22" viewBox="0 0 50 22" fill="none" aria-hidden="true">
            <path
              d={sparkPath}
              stroke="#22d3a5"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        }
      />

      <FeedStatCard
        label="ACTIVE WHALES"
        value={activeWhales}
        rightSlot={
          <div className="feed-stat-bars" aria-hidden="true">
            {whaleBars.map((height, index) => (
              <span
                key={index}
                style={{
                  height: `${Math.max(10, Number(height || 0) * 100)}%`,
                  opacity: 0.25 + Number(height || 0) * 0.45,
                }}
              />
            ))}
          </div>
        }
      />

      <FeedStatCard
        label="MEGA TRADES"
        value={megaTrades}
        muted={Number(megaTrades) === 0}
        rightSlot={<div className="feed-stat-meta">$250k+</div>}
      />

      <FeedStatCard
        label="TODAY'S BIGGEST TRADE"
        value={biggestTrade}
        valueClassName="accent"
        accent="green-border"
        rightSlot={
          <div className="feed-stat-side">
            <span className="dot" />
            <span>{biggestTradeSide}</span>
          </div>
        }
      />
    </div>
  );
}

function FeedStatCard({
  label,
  value,
  rightSlot,
  accent,
  muted = false,
  labelClassName = '',
  valueClassName = '',
}) {
  const classes = ['feed-stat-card'];
  if (accent === 'green') classes.push('accent-green');
  if (accent === 'green-border') classes.push('accent-green-border');

  return (
    <div className={classes.join(' ')}>
      <div className={`feed-stat-label ${labelClassName}`}>{label}</div>
      <div className="feed-stat-value-row">
        <div className={`feed-stat-value ${valueClassName} ${muted ? 'muted' : ''}`}>{value}</div>
        {rightSlot}
      </div>
    </div>
  );
}

function TradeRow({ trade, index }) {
  const category = inferCategory(trade);
  const isMega = trade.tier === 'mega' || trade.usdSize >= 250000;
  const isSell = trade.side === 'SELL';
  const traderName = getTraderName(trade);
  const marketTitle = trade.market?.title || 'Unknown market';
  const polymarketUrl = trade.polymarketUrl || trade.market?.polymarketUrl || '#';
  const traderHref = trade.trader?.proxyWallet
    ? `/trader/${encodeURIComponent(trade.trader.proxyWallet)}`
    : null;
  const tradeHref = `/trade/${encodeURIComponent(trade.id)}`;
  const openTrade = () => {
    cacheTrade(trade);
    window.location.href = tradeHref;
  };

  return (
    <motion.article
      className={`trade-row ${isMega ? 'mega' : ''} ${isSell ? 'sell' : ''}`}
      role="link"
      tabIndex={0}
      onClick={openTrade}
      onKeyDown={(event) => {
        if (event.key === 'Enter') openTrade();
      }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.025, 0.18) }}
    >
      <div className="tag-stack">
        {isMega ? <span className="trade-tag mega-tag">Mega</span> : null}
        <span className={`trade-tag ${isSell ? 'sell-tag' : 'buy-tag'}`}>
          {trade.side === 'SELL' ? 'Sell' : 'Buy'}
        </span>
        <span className="trade-tag time-tag">{relativeTimeAgo(trade.timestamp)}</span>
      </div>

      <div className="market-cell">
        <MarketIcon trade={trade} category={category} />
        <div className="market-text">
          <strong title={marketTitle}>{marketTitle}</strong>
          <span>
            {category.label} - {trade.outcome || 'Outcome'}
          </span>
        </div>
      </div>

      <MetricCell label="Size" value={formatUsdFull(trade.usdSize)} strong={isMega} />
      <MetricCell
        label={`${trade.outcome || 'Outcome'} @`}
        value={formatPrice(trade)}
      />

      <a
        className={`trader-cell ${traderHref ? '' : 'disabled'}`}
        href={traderHref || tradeHref}
        onClick={(event) => event.stopPropagation()}
      >
        <TraderAvatar trade={trade} />
        <div>
          <strong title={trade.trader?.proxyWallet}>{traderName}</strong>
          <span>{formatTraderMeta(trade)}</span>
        </div>
      </a>

      <div className="row-actions">
        <FollowWalletButton wallet={trade.trader?.proxyWallet} variant="icon" />
        <a
          className="row-icon-button"
          href={polymarketUrl}
          target="_blank"
          rel="noreferrer"
          title="Open on Polymarket"
          aria-label="Open on Polymarket"
          onClick={(event) => event.stopPropagation()}
        >
          <ExternalLink size={15} aria-hidden="true" />
        </a>
      </div>
    </motion.article>
  );
}

function MetricCell({ label, value, strong = false }) {
  return (
    <div className="metric-cell">
      <span>{label}</span>
      <strong className={strong ? 'mega-value' : ''}>{value}</strong>
    </div>
  );
}

function MarketIcon({ trade, category }) {
  const [failedUrls, setFailedUrls] = useState([]);
  const iconUrl = getMarketImageUrls(trade).find((url) => !failedUrls.includes(url));
  if (iconUrl) {
    return (
      <img
        className="market-icon image"
        src={iconUrl}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailedUrls((previous) => [...previous, iconUrl])}
      />
    );
  }

  return <div className="market-icon market-icon-empty" aria-hidden="true" />;
}

function TraderAvatar({ trade }) {
  const image = trade.trader?.profileImage;
  if (image) {
    return <img className="trader-avatar" src={image} alt="" loading="lazy" />;
  }

  return (
    <div
      className="trader-avatar fallback"
      style={{ background: avatarGradient(trade.trader?.proxyWallet || trade.id) }}
      aria-hidden="true"
    />
  );
}

function FeedRail({ leaderboard, lastHour }) {
  return (
    <aside className="feed-rail">
      <div className="rail-card volume-card">
        <span className="rail-label">Last 60 minutes</span>
        <strong>
          {formatUsdCompact(lastHour.volume)}
          <small>{lastHour.count} trades</small>
        </strong>
        <MiniVolumeChart points={lastHour.points} />
      </div>

      <section className="rail-section">
        <TopWhalesToday traders={leaderboard} timeframe="7D" />
      </section>
    </aside>
  );
}

const topWhalesPlaceStyles = {
  gold: {
    card: 'top-whales-podium-card gold',
    avatar: 'top-whales-avatar gold',
    badge: 'top-whales-badge gold',
    name: 'top-whales-name-lg',
    value: 'top-whales-value-lg',
  },
  silver: {
    card: 'top-whales-podium-card silver',
    avatar: 'top-whales-avatar',
    badge: 'top-whales-badge silver',
    name: 'top-whales-name-sm',
    value: 'top-whales-value-sm',
  },
  bronze: {
    card: 'top-whales-podium-card bronze',
    avatar: 'top-whales-avatar',
    badge: 'top-whales-badge bronze',
    name: 'top-whales-name-sm',
    value: 'top-whales-value-sm',
  },
};

function TopWhalesToday({ traders, timeframe = '7D' }) {
  const whales = traders
    .map((trader, index) => ({
      rank: Number(trader.rank) || index + 1,
      name: leaderboardTraderName(trader),
      trades: Number(trader.tradeCount || 0),
      volume: formatUsdCompact(trader.volume),
      avatarColor: avatarGradient(trader.proxyWallet || `${trader.rank}-${index}`),
      href: trader.proxyWallet ? `/trader/${encodeURIComponent(trader.proxyWallet)}` : null,
      key: trader.proxyWallet || `${trader.rank}-${trader.displayName || trader.pseudonym || index}`,
    }))
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 15);

  if (whales.length === 0) {
    return (
      <div className="top-whales-card">
        <div className="top-whales-header">
          <h2>Top whales today</h2>
          <span>{timeframe}</span>
        </div>
        <div className="rail-empty">Leaderboard unavailable</div>
      </div>
    );
  }

  const top3 = whales.slice(0, 3);
  const first = top3.find((whale) => whale.rank === 1);
  const second = top3.find((whale) => whale.rank === 2);
  const third = top3.find((whale) => whale.rank === 3);
  const rest = whales.slice(3);

  return (
    <div className="top-whales-card">
      <div className="top-whales-header">
        <h2>Top whales today</h2>
        <span>{timeframe}</span>
      </div>

      <div className="top-whales-podium">
        {second ? <TopWhalesPodiumCard whale={second} place="silver" /> : null}
        {first ? <TopWhalesPodiumCard whale={first} place="gold" /> : null}
        {third ? <TopWhalesPodiumCard whale={third} place="bronze" /> : null}
      </div>

      <div className="top-whales-list">
        {rest.map((whale) => (
          <TopWhalesRankRow key={whale.key} whale={whale} />
        ))}
      </div>
    </div>
  );
}

function TopWhalesPodiumCard({ whale, place }) {
  const style = topWhalesPlaceStyles[place];
  const isGold = place === 'gold';
  const content = (
    <div className={style.card}>
      {isGold ? (
        <div className="top-whales-crown" aria-hidden="true">
          <svg width="22" height="14" viewBox="0 0 22 14" fill="none">
            <path
              d="M2 12 L4 4 L8 8 L11 2 L14 8 L18 4 L20 12 Z"
              fill="#ffc83c"
              stroke="#ffc83c"
              strokeWidth="0.5"
              strokeLinejoin="round"
            />
            <rect x="2" y="11" width="18" height="2" fill="#ffc83c" />
          </svg>
        </div>
      ) : (
        <div className={style.badge}>{whale.rank}</div>
      )}

      <div className={style.avatar} style={{ background: whale.avatarColor }} aria-hidden="true" />
      <div className={style.name}>{whale.name}</div>
      <div className="top-whales-trades">
        {formatNumber(whale.trades)} {whale.trades === 1 ? 'trade' : 'trades'}
      </div>
      <div className={style.value}>{whale.volume}</div>
    </div>
  );

  if (!whale.href) return content;
  return (
    <a href={whale.href} className="top-whales-link">
      {content}
    </a>
  );
}

function TopWhalesRankRow({ whale }) {
  const content = (
    <div className="top-whales-row">
      <div className="top-whales-row-rank">{whale.rank}</div>
      <div className="top-whales-row-avatar" style={{ background: whale.avatarColor }} aria-hidden="true" />
      <div className="top-whales-row-main">
        <div className="top-whales-row-name">{whale.name}</div>
        <div className="top-whales-row-trades">
          {formatNumber(whale.trades)} {whale.trades === 1 ? 'trade' : 'trades'}
        </div>
      </div>
      <div className="top-whales-row-volume">{whale.volume}</div>
    </div>
  );

  if (!whale.href) return content;
  return (
    <a href={whale.href} className="top-whales-link">
      {content}
    </a>
  );
}

function LeaderboardRow({ trader, index, maxVolume }) {
  const name = leaderboardTraderName(trader);
  const volumeShare = maxVolume ? Math.max(4, Math.min(100, (trader.volume / maxVolume) * 100)) : 0;
  const avgTrade = Number(trader.volume || 0) / Math.max(1, Number(trader.tradeCount || 0));
  const traderHref = `/trader/${encodeURIComponent(trader.proxyWallet)}`;
  const openTrader = () => {
    window.location.href = traderHref;
  };

  return (
    <motion.article
      className="leaderboard-row"
      role="link"
      tabIndex={0}
      onClick={openTrader}
      onKeyDown={(event) => {
        if (event.key === 'Enter') openTrader();
      }}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay: Math.min(index * 0.02, 0.18) }}
    >
      <div className="leaderboard-rank-cell">
        <span className={`rank rank-${trader.rank}`}>{trader.rank}</span>
      </div>

      <div className="leaderboard-trader-cell">
        <div
          className="trader-avatar fallback"
          style={{ background: avatarGradient(trader.proxyWallet) }}
          aria-hidden="true"
        />
        <div>
          <strong title={trader.proxyWallet}>{name}</strong>
          <span>{shortWallet(trader.proxyWallet)}</span>
        </div>
      </div>

      <div className="leaderboard-volume-cell">
        <strong>{formatUsdCompact(trader.volume)}</strong>
        <div className="volume-track" aria-hidden="true">
          <span style={{ width: `${volumeShare}%` }} />
        </div>
      </div>

      <MetricCell label="Trades" value={formatNumber(trader.tradeCount)} />

      <div className="leaderboard-signal-cell">
        <span>{formatUsdCompact(avgTrade)}</span>
        <small>avg trade</small>
      </div>
    </motion.article>
  );
}

function LeaderboardRail({ items, asOf, selectedWindow, stats }) {
  const podium = items.slice(0, 3);

  return (
    <aside className="feed-rail leaderboard-rail">
      <section className="rail-section podium-section">
        <h2>
          Podium <span>{selectedWindow.label}</span>
        </h2>
        <div className="podium-list">
          {podium.length === 0 ? (
            <div className="rail-empty">No podium data yet</div>
          ) : (
            podium.map((trader) => (
              <div className="podium-item" key={trader.proxyWallet}>
                <div className={`rank rank-${trader.rank}`}>{trader.rank}</div>
                <div>
                  <strong>{leaderboardTraderName(trader)}</strong>
                  <span>{formatUsdCompact(trader.volume)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <div className="rail-card leaderboard-summary-card">
        <span className="rail-label">Loaded sample</span>
        <strong>{formatUsdCompact(stats.volume)}</strong>
        <p>
          {formatNumber(stats.traders)} ranked traders with {formatNumber(stats.trades)} tracked trades.
        </p>
      </div>

      <section className="rail-section method-section">
        <h2>
          Method <span>live</span>
        </h2>
        <div className="method-list">
          <div>
            <strong>Rank basis</strong>
            <span>USD volume of feed-visible whale trades.</span>
          </div>
          <div>
            <strong>Intent filter</strong>
            <span>Uses the backend trade classification already powering the app.</span>
          </div>
          <div>
            <strong>Snapshot</strong>
            <span>{asOf ? formatSnapshotTime(asOf) : 'Waiting for API snapshot'}</span>
          </div>
        </div>
      </section>
    </aside>
  );
}

function LeaderboardSkeleton() {
  return (
    <div className="leaderboard-list">
      {Array.from({ length: 10 }).map((_, index) => (
        <div className="leaderboard-row leaderboard-skeleton-row" key={index}>
          <div />
          <div />
          <div />
          <div />
          <div />
          <div />
        </div>
      ))}
    </div>
  );
}

function DetailBackBar({ href, label }) {
  return (
    <div className="detail-backbar">
      <a href={href}>
        <ArrowLeft size={16} aria-hidden="true" />
        {label}
      </a>
    </div>
  );
}

function DetailSkeleton({ title }) {
  return (
    <div className="detail-skeleton">
      <div className="feed-breadcrumb">{title}</div>
      <div className="detail-skeleton-title" />
      <div className="stats-strip detail-stats">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="stat-block skeleton-stat" key={index}>
            <span />
            <strong />
            <small />
          </div>
        ))}
      </div>
      <div className="detail-grid">
        <div className="detail-panel skeleton-panel" />
        <div className="detail-panel skeleton-panel" />
        <div className="detail-panel skeleton-panel" />
      </div>
    </div>
  );
}

function DetailRows({ rows }) {
  return (
    <div className="detail-rows">
      {rows.map(([label, value]) => (
        <div className="detail-row" key={label}>
          <span>{label}</span>
          <strong title={String(value)}>{value}</strong>
        </div>
      ))}
    </div>
  );
}

function DetailRail({ title, items }) {
  return (
    <aside className="feed-rail detail-rail">
      <section className="rail-section method-section">
        <h2>
          {title} <span>web</span>
        </h2>
        <div className="method-list">
          {items.map(([label, value]) => (
            <div key={label}>
              <strong>{label}</strong>
              <span>{value}</span>
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
}

function TraderProfileRail({ profile, stats }) {
  const rankText = profile?.rankBadge
    ? `#${profile.rankBadge.rank} in ${String(profile.rankBadge.window).toUpperCase()}`
    : 'No top-100 badge yet';

  return (
    <aside className="feed-rail detail-rail">
      <section className="rail-section method-section">
        <h2>
          Wallet <span>context</span>
        </h2>
        <div className="method-list">
          <div>
            <strong>Rank badge</strong>
            <span>{rankText}</span>
          </div>
          <div>
            <strong>Loaded window</strong>
            <span>{formatUsdCompact(stats.volume)} whale volume.</span>
          </div>
          <div>
            <strong>Address</strong>
            <span>{profile?.proxyWallet || 'Waiting for profile'}</span>
          </div>
        </div>
      </section>
    </aside>
  );
}

function ProfileAvatar({ profile }) {
  if (profile.profileImage) {
    return <img className="profile-avatar" src={profile.profileImage} alt="" />;
  }

  return (
    <div
      className="profile-avatar fallback"
      style={{ background: avatarGradient(profile.proxyWallet) }}
      aria-hidden="true"
    />
  );
}

function WalletAddressLine({ address }) {
  const [copied, setCopied] = useState(false);

  const copyAddress = async () => {
    if (!address || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="wallet-address-line">
      <span title={address}>{address}</span>
      <button
        type="button"
        onClick={copyAddress}
        aria-label={copied ? 'Wallet address copied' : 'Copy wallet address'}
        title={copied ? 'Copied' : 'Copy wallet address'}
      >
        {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
      </button>
    </div>
  );
}

function DailyVolumeChart({ points }) {
  const dailyPoints = Array.isArray(points) ? points : [];
  const bars = buildDailyVolumeBars(dailyPoints);
  const total = dailyPoints.reduce((sum, point) => sum + Number(point.volume || 0), 0);
  const rowLabel = dailyPoints.length === 1 ? '1 tracked day' : `${dailyPoints.length || 0} tracked days`;

  return (
    <div className="daily-volume-chart">
      <div className="chart-summary">
        <div>
          <strong>{formatUsdCompact(total)}</strong>
          <span>{rowLabel}</span>
        </div>
        <span className="chart-window-label">7D</span>
      </div>
      <svg viewBox="0 0 320 128" role="img" aria-label="Daily whale volume chart" preserveAspectRatio="none">
        <defs>
          <linearGradient id="dailyVolumeBarGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#5ee7ad" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#5ee7ad" stopOpacity="0.28" />
          </linearGradient>
        </defs>
        <g className="chart-grid" aria-hidden="true">
          <line x1="20" y1="28" x2="300" y2="28" />
          <line x1="20" y1="64" x2="300" y2="64" />
          <line x1="20" y1="100" x2="300" y2="100" />
        </g>
        <line className="chart-baseline" x1="20" y1="100" x2="300" y2="100" aria-hidden="true" />
        {bars.length ? (
          bars.map((bar) => (
            <rect
              className="chart-bar"
              key={bar.key}
              x={bar.x}
              y={bar.y}
              width={bar.width}
              height={bar.height}
              rx="5"
              fill="url(#dailyVolumeBarGradient)"
            />
          ))
        ) : (
          <text className="chart-empty-label" x="160" y="68" textAnchor="middle">
            No daily volume yet
          </text>
        )}
      </svg>
    </div>
  );
}

function VolumeMixBar({ mix }) {
  return (
    <div className="volume-mix">
      <div className="volume-mix-track" aria-hidden="true">
        <span className="buy" style={{ width: `${mix.buyPct}%` }} />
        <span className="sell" style={{ width: `${mix.sellPct}%` }} />
      </div>
      <div className="volume-mix-labels">
        <span>Buy {trimNumber(mix.buyPct)}%</span>
        <span>Sell {trimNumber(mix.sellPct)}%</span>
      </div>
    </div>
  );
}

function ArrowRightIcon() {
  return <ArrowRight size={16} aria-hidden="true" />;
}

function MiniVolumeChart({ points }) {
  const line = pointsToPath(points, false);
  const area = pointsToPath(points, true);

  return (
    <svg className="mini-chart" viewBox="0 0 280 62" role="img" aria-label="Last hour volume chart">
      <path d={area} fill="rgba(94, 231, 173, 0.18)" />
      <path d={line} fill="none" stroke="#5ee7ad" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function FeedSkeleton() {
  return (
    <div className="feed-list">
      {Array.from({ length: 8 }).map((_, index) => (
        <div className="trade-row skeleton-row" key={index}>
          <div />
          <div />
          <div />
          <div />
          <div />
          <div />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ title, body, actionLabel, onAction }) {
  return (
    <div className="empty-state">
      <Zap size={22} aria-hidden="true" />
      <h2>{title}</h2>
      <p>{body}</p>
      <button type="button" onClick={onAction}>
        {actionLabel}
      </button>
    </div>
  );
}

function FollowWalletButton({ wallet, variant = 'wide' }) {
  const normalizedWallet = wallet?.toLowerCase();
  const [isFollowing, setIsFollowing] = useState(() => isWalletFollowedLocally(normalizedWallet));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!normalizedWallet) return undefined;

    const refreshFromLocal = () => setIsFollowing(isWalletFollowedLocally(normalizedWallet));
    refreshFromLocal();

    if (hasStoredAuth()) {
      syncFollowedWalletsFromServer()
        .then(refreshFromLocal)
        .catch(() => {
          // Local state remains useful if the sync is unavailable.
        });
    }

    window.addEventListener(followsChangedEvent, refreshFromLocal);
    return () => window.removeEventListener(followsChangedEvent, refreshFromLocal);
  }, [normalizedWallet]);

  const toggleFollow = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!normalizedWallet || pending) return;

    const next = !isFollowing;
    const previous = isFollowing;

    setPending(true);
    setError('');
    setWalletFollowedLocally(normalizedWallet, next);
    setIsFollowing(next);
    notifyFollowsChanged();

    try {
      await setWalletFollowedOnServer(normalizedWallet, next);
    } catch (err) {
      setWalletFollowedLocally(normalizedWallet, previous);
      setIsFollowing(previous);
      notifyFollowsChanged();
      setError(err.message || 'Follow update failed');
    } finally {
      setPending(false);
    }
  };

  if (!normalizedWallet) {
    return null;
  }

  const compact = variant === 'icon';
  const label = pending ? 'Saving' : isFollowing ? 'Unfollow' : 'Follow';

  return (
    <button
      className={`follow-button ${compact ? 'compact' : 'wide'} ${isFollowing ? 'following' : ''}`}
      type="button"
      aria-label={`${label} ${shortWallet(normalizedWallet)}`}
      title={error || label}
      onClick={toggleFollow}
      disabled={pending}
    >
      {isFollowing ? <Check size={compact ? 15 : 16} aria-hidden="true" /> : <UserPlus size={compact ? 15 : 16} aria-hidden="true" />}
      {compact ? null : <span>{label}</span>}
    </button>
  );
}

function LiveDot({ state }) {
  return <span className={`live-dot ${state === 'live' || state === 'filtered' ? 'online' : ''}`} aria-hidden="true" />;
}

function LegalChrome({ children }) {
  return (
    <div className="legal-site">
      <header className="legal-topbar">
        <a className="legal-brand" href="/" aria-label="Polywatch home">
          <img src="/assets/polywatch-icon.png" alt="" />
          <span>Polywatch</span>
        </a>
        <nav className="legal-nav" aria-label="Legal pages">
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/delete-data">Delete data</a>
        </nav>
      </header>
      {children}
      <LegalFooter />
    </div>
  );
}

function PrivacyPage() {
  return (
    <LegalLayout
      eyebrow="Privacy"
      title="Privacy Policy"
      intro="This policy explains what Polywatch collects, why it is used, and how users can request deletion."
    >
      <LegalSection title="Overview">
        <p>
          Polywatch is an independent market-monitoring app for public Polymarket
          activity. It is not affiliated with, endorsed by, or operated by Polymarket.
        </p>
      </LegalSection>
      <LegalSection title="Information we collect">
        <ul>
          <li>
            Anonymous app identifiers, including a generated device ID, user ID,
            auth token, platform, and Firebase Cloud Messaging token.
          </li>
          <li>
            Alert settings such as minimum trade size, quiet hours, notification
            preferences, and followed-trader alert preference.
          </li>
          <li>Followed trader wallet addresses that you choose to save in the app.</li>
          <li>
            Technical service data such as server logs, request metadata, delivery
            status, and error information needed to run and protect the service.
          </li>
          <li>Public market, trader, wallet, and trade data displayed in the app.</li>
        </ul>
      </LegalSection>
      <LegalSection title="How we use information">
        <p>
          We use this information to run the app, authenticate anonymous sessions,
          deliver push notifications, save preferences, maintain followed-trader
          features, diagnose issues, prevent abuse, and improve reliability.
        </p>
      </LegalSection>
      <LegalSection title="Service providers">
        <p>
          Polywatch may use infrastructure providers such as Firebase Cloud
          Messaging, hosting providers, databases, and monitoring tools. These
          providers process data only as needed to operate the app.
        </p>
      </LegalSection>
      <LegalSection title="Data sharing and sale">
        <p>
          We do not sell personal information. We do not share user alert
          preferences, notification tokens, or followed-trader lists with advertisers.
        </p>
      </LegalSection>
      <LegalSection title="Retention and deletion">
        <p>
          Local app data remains on your device until you clear app storage or
          uninstall the app. Server-side alert and follow data is retained while
          needed to provide the service. You can request deletion at{' '}
          <a href={`mailto:${supportEmail}`}>{supportEmail}</a> or through the{' '}
          <a href="/delete-data">Delete Data</a> page.
        </p>
      </LegalSection>
      <LegalSection title="Children">
        <p>
          Polywatch is not directed to children. The app is intended for users who
          are old enough to view market and financial information in their jurisdiction.
        </p>
      </LegalSection>
      <LegalSection title="Contact">
        <p>
          Questions about this policy can be sent to{' '}
          <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}

function TermsPage() {
  return (
    <LegalLayout
      eyebrow="Terms"
      title="Terms of Service"
      intro="These terms describe the rules for using Polywatch and the limits of the service."
    >
      <LegalSection title="Use of Polywatch">
        <p>
          Polywatch provides informational views of public market activity, trader
          profiles, leaderboards, and optional push alerts. You may use the app only
          in compliance with applicable laws and platform rules.
        </p>
      </LegalSection>
      <LegalSection title="No financial advice">
        <p>
          Polywatch does not provide financial, investment, legal, tax, trading,
          gambling, or wagering advice. Information in the app may be delayed,
          incomplete, or inaccurate and should not be the sole basis for any decision.
        </p>
      </LegalSection>
      <LegalSection title="No trading or wagering service">
        <p>
          Polywatch does not accept deposits, execute trades, facilitate bets, or
          hold user funds. The app is a monitoring and notification tool.
        </p>
      </LegalSection>
      <LegalSection title="Public data and accuracy">
        <p>
          The app relies on public and third-party market data. We work to keep the
          service accurate, but we do not guarantee that all prices, trades, trader
          statistics, rankings, or notifications are complete or current.
        </p>
      </LegalSection>
      <LegalSection title="Account and notification access">
        <p>
          Polywatch may create an anonymous session to save preferences and deliver
          alerts. You are responsible for managing notification permission, app
          settings, and device access.
        </p>
      </LegalSection>
      <LegalSection title="Limitation of liability">
        <p>
          Polywatch is provided as-is. To the maximum extent allowed by law, we are
          not liable for losses, missed alerts, incorrect data, service interruptions,
          or decisions made using information from the app.
        </p>
      </LegalSection>
      <LegalSection title="Changes">
        <p>
          We may update the app or these terms as the service evolves. Continued use
          after updates means you accept the updated terms.
        </p>
      </LegalSection>
      <LegalSection title="Contact">
        <p>
          Questions about these terms can be sent to{' '}
          <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}

function DeleteDataPage() {
  return (
    <LegalLayout
      eyebrow="Data deletion"
      title="Delete Polywatch Data"
      intro="Use this page to request deletion of server-side alert, follow, and notification data connected to your app session."
    >
      <LegalSection title="How to request deletion">
        <ol>
          <li>
            Email <a href={`mailto:${supportEmail}`}>{supportEmail}</a> with the
            subject line "Delete Polywatch data".
          </li>
          <li>
            Include your device platform, approximate install date, and any support
            details that help us identify the anonymous app session.
          </li>
          <li>
            We may ask for a confirmation step to verify that the request is connected
            to your device or app session.
          </li>
        </ol>
      </LegalSection>
      <LegalSection title="What we delete">
        <p>
          After verification, we will delete server-side alert subscriptions,
          Firebase notification tokens, followed-trader records, and anonymous session
          records that can be associated with the verified app session.
        </p>
      </LegalSection>
      <LegalSection title="Local device data">
        <p>
          You can remove local app data from your phone by clearing the app storage or
          uninstalling Polywatch. Local caches may include recent trades, followed
          traders, alert preferences, and onboarding state.
        </p>
      </LegalSection>
      <LegalSection title="Data we may retain">
        <p>
          We may retain limited logs when required for security, abuse prevention,
          legal obligations, or infrastructure diagnostics.
        </p>
      </LegalSection>
      <div className="legal-action-row">
        <a className="primary-link-button" href={`mailto:${supportEmail}?subject=Delete Polywatch data`}>
          Request deletion
          <Mail size={18} aria-hidden="true" />
        </a>
      </div>
    </LegalLayout>
  );
}

function LegalLayout({ eyebrow, title, intro, children }) {
  return (
    <LegalChrome>
      <main className="legal-main">
        <section className="legal-hero">
          <div className="section-kicker">{eyebrow}</div>
          <h1>{title}</h1>
          <p>{intro}</p>
          <span>Last updated: {lastUpdated}</span>
        </section>
        <section className="legal-content">{children}</section>
      </main>
    </LegalChrome>
  );
}

function LegalSection({ title, children }) {
  return (
    <section className="legal-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function LegalFooter() {
  return (
    <footer className="legal-footer">
      <div>
        <a className="legal-brand footer-brand" href="/">
          <img src="/assets/polywatch-icon.png" alt="" />
          <span>Polywatch</span>
        </a>
        <p>
          Independent market monitoring for public Polymarket activity. No trading
          or wagering inside the app.
        </p>
      </div>
      <div className="legal-footer-links">
        {legalLinks.map(({ href, label, icon: Icon }) => (
          <a href={href} key={href}>
            <Icon size={16} aria-hidden="true" />
            {label}
          </a>
        ))}
      </div>
    </footer>
  );
}

function useFollowedTraders() {
  const [items, setItems] = useState(() => buildLocalFollowSummaries());
  const [loading, setLoading] = useState(() => hasStoredAuth());
  const [error, setError] = useState('');
  const [refreshNonce, setRefreshNonce] = useState(0);

  const refresh = useCallback(() => {
    setRefreshNonce((value) => value + 1);
  }, []);

  useEffect(() => {
    const onFollowsChanged = () => setRefreshNonce((value) => value + 1);
    window.addEventListener(followsChangedEvent, onFollowsChanged);
    return () => window.removeEventListener(followsChangedEvent, onFollowsChanged);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadFollows() {
      const localItems = buildLocalFollowSummaries();

      if (!hasStoredAuth()) {
        setItems(localItems);
        setLoading(false);
        setError('');
        return;
      }

      setLoading(true);
      setError('');

      try {
        const data = await authFetchJson('/v1/users/me/follows', {
          signal: controller.signal,
        });
        if (!active) return;

        const summaries = (data?.items || []).map(normalizeFollowSummary);
        writeFollowedWallets(new Set(summaries.map((item) => item.proxyWallet)));
        setItems(summaries);
      } catch (err) {
        if (err.name === 'AbortError' || !active) return;
        setItems(localItems);
        setError(err.message || 'Could not load followed traders');
      } finally {
        if (active && !controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadFollows();
    return () => {
      active = false;
      controller.abort();
    };
  }, [refreshNonce]);

  return { items, loading, error, refresh };
}

async function fetchWhalesForFilter(filter, cursor = null, options = {}) {
  if (filter.following === true) {
    if (hasStoredAuth()) {
      return authFetchJson(buildWhalesPath(filter, cursor), options);
    }

    const followedWallets = readFollowedWallets();
    if (!followedWallets.size) {
      return { items: [], nextCursor: null };
    }

    const publicFilter = { ...filter, following: undefined };
    const data = await fetchJson(buildWhalesPath(publicFilter, cursor), options);
    const items = Array.isArray(data?.items)
      ? data.items.filter((trade) => followedWallets.has(trade.trader?.proxyWallet?.toLowerCase()))
      : [];
    return { ...data, items };
  }

  return fetchJson(buildWhalesPath(filter, cursor), options);
}

async function fetchTodayWhalesForFilter(filter, options = {}) {
  const maxPages = 5;
  let cursor = null;
  let items = [];
  let nextCursor = null;

  for (let page = 0; page < maxPages; page += 1) {
    const data = await fetchWhalesForFilter(filter, cursor, options);
    const incoming = Array.isArray(data?.items) ? data.items : [];
    items = mergeWhales(items, incoming);
    nextCursor = data?.nextCursor ?? null;

    const reachedPreviousSession = incoming.some((trade) => !isInCurrentNewYorkSession(trade.timestamp));
    if (!nextCursor || reachedPreviousSession) {
      return { items, nextCursor: null };
    }

    cursor = nextCursor;
  }

  return { items, nextCursor };
}

async function fetchJson(path, options = {}) {
  const headers = {
    Accept: 'application/json',
    ...(options.headers || {}),
  };
  let body = options.body;

  if (body && typeof body !== 'string') {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    body = JSON.stringify(body);
  }

  const response = await fetch(joinUrl(apiBaseUrl, path), {
    ...options,
    headers,
    body,
  });

  if (!response.ok) {
    const error = new Error(`API returned ${response.status}`);
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) return null;

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function authFetchJson(path, options = {}, retry = true) {
  const auth = await getWebAuth();

  try {
    return await fetchJson(path, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${auth.token}`,
      },
    });
  } catch (error) {
    if (retry && error.status === 401) {
      clearStoredAuth();
      const nextAuth = await getWebAuth(true);
      return fetchJson(path, {
        ...options,
        headers: {
          ...(options.headers || {}),
          Authorization: `Bearer ${nextAuth.token}`,
        },
      });
    }
    throw error;
  }
}

async function getWebAuth(force = false) {
  if (!force) {
    const stored = readStoredJson(authStorageKey);
    if (stored?.token && stored?.userId) return stored;
  }

  const deviceId = getOrCreateDeviceId();
  const data = await fetchJson('/v1/auth/anonymous', {
    method: 'POST',
    body: {
      deviceId,
      platform: 'unknown',
    },
  });

  const auth = {
    token: data.token,
    userId: data.userId,
    deviceId,
  };
  writeStoredJson(authStorageKey, auth);
  return auth;
}

function getOrCreateDeviceId() {
  let deviceId = window.localStorage.getItem(deviceIdStorageKey);
  if (!deviceId) {
    deviceId = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : createFallbackUuid();
    window.localStorage.setItem(deviceIdStorageKey, deviceId);
  }
  return deviceId;
}

function clearStoredAuth() {
  window.localStorage.removeItem(authStorageKey);
}

function hasStoredAuth() {
  const stored = readStoredJson(authStorageKey);
  return Boolean(stored?.token && stored?.userId);
}

let followsSyncPromise = null;

async function syncFollowedWalletsFromServer() {
  if (!followsSyncPromise) {
    followsSyncPromise = authFetchJson('/v1/users/me/follows')
      .then((data) => {
        const wallets = new Set(
          (data?.items || [])
            .map((item) => item.proxyWallet?.toLowerCase())
            .filter(Boolean)
        );
        const previous = readFollowedWallets();
        writeFollowedWallets(wallets);
        if (!setsEqual(previous, wallets)) {
          notifyFollowsChanged();
        }
        return wallets;
      })
      .finally(() => {
        followsSyncPromise = null;
      });
  }
  return followsSyncPromise;
}

async function setWalletFollowedOnServer(wallet, shouldFollow) {
  if (shouldFollow) {
    await authFetchJson('/v1/users/me/follows', {
      method: 'POST',
      body: { proxyWallet: wallet.toLowerCase() },
    });
    return;
  }

  await authFetchJson(`/v1/users/me/follows/${encodeURIComponent(wallet.toLowerCase())}`, {
    method: 'DELETE',
  });
}

function isWalletFollowedLocally(wallet) {
  if (!wallet) return false;
  return readFollowedWallets().has(wallet.toLowerCase());
}

function setWalletFollowedLocally(wallet, shouldFollow) {
  const follows = readFollowedWallets();
  const normalized = wallet.toLowerCase();
  if (shouldFollow) {
    follows.add(normalized);
  } else {
    follows.delete(normalized);
  }
  writeFollowedWallets(follows);
}

function readFollowedWallets() {
  const items = readStoredJson(followsStorageKey);
  if (!Array.isArray(items)) return new Set();
  return new Set(items.map((wallet) => String(wallet).toLowerCase()).filter(Boolean));
}

function setsEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const value of a) {
    if (!b.has(value)) return false;
  }
  return true;
}

function writeFollowedWallets(wallets) {
  writeStoredJson(followsStorageKey, [...wallets].sort());
}

function buildLocalFollowSummaries() {
  return [...readFollowedWallets()].map((wallet) =>
    normalizeFollowSummary({
      proxyWallet: wallet,
      pseudonym: shortWallet(wallet),
      profileImage: null,
      vol7d: 0,
      followedAt: null,
    })
  );
}

function normalizeFollowSummary(item) {
  const wallet = item.proxyWallet?.toLowerCase() || '';
  return {
    proxyWallet: wallet,
    displayName: item.displayName || item.pseudonym || shortWallet(wallet) || wallet,
    pseudonym: item.pseudonym || null,
    profileImage: item.profileImage || null,
    vol7d: Number(item.vol7d || 0),
    followedAt: item.followedAt || null,
  };
}

function followedTraderName(item) {
  return formatTraderLabel(item.displayName || item.pseudonym, item.proxyWallet);
}

function updateFollowingQueryParam(enabled) {
  const url = new URL(window.location.href);
  if (enabled) {
    url.searchParams.set('following', '1');
  } else {
    url.searchParams.delete('following');
  }
  window.history.replaceState({}, '', url);
}

function readWebAlertPrefs() {
  const stored = readStoredJson(alertPrefsStorageKey);
  return {
    minUsd: Number(stored?.minUsd || 50000),
    megaOnly: Boolean(stored?.megaOnly),
    followingOnly: Boolean(stored?.followingOnly),
    quietHoursEnabled: Boolean(stored?.quietHoursEnabled),
  };
}

function notifyFollowsChanged() {
  window.dispatchEvent(new CustomEvent(followsChangedEvent));
}

function readStoredJson(key) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeStoredJson(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage errors; in-memory React state still reflects the click.
  }
}

function createFallbackUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

async function findRecentTradeById(tradeId, signal) {
  try {
    const data = await fetchJson('/v1/whales?limit=100&minUsd=10000', { signal });
    const found = Array.isArray(data.items)
      ? data.items.find((item) => item.id === tradeId)
      : null;
    if (found) cacheTrade(found);
    return found || null;
  } catch {
    return null;
  }
}

async function hydrateWhaleTrade(tradeId, signal) {
  try {
    const detail = await fetchJson(`/v1/whales/${encodeURIComponent(tradeId)}`, { signal });
    if (detail?.id) return detail;
  } catch {
    // Some deployments only expose the trade through the recent feed endpoint.
  }

  return findRecentTradeById(tradeId, signal);
}

function cacheTrade(trade) {
  try {
    window.sessionStorage.setItem(`polywatch:trade:${trade.id}`, JSON.stringify(trade));
  } catch {
    // Storage can be unavailable in private contexts; the API fallback still works.
  }
}

function readCachedTrade(tradeId) {
  try {
    const raw = window.sessionStorage.getItem(`polywatch:trade:${tradeId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function buildWhalesPath(filter, cursor = null) {
  const params = new URLSearchParams();
  params.set('limit', '100');
  const compact = compactFilter(filter);

  Object.entries(compact).forEach(([key, value]) => {
    params.set(key, String(value));
  });

  if (cursor) params.set('cursor', cursor);

  return `/v1/whales?${params.toString()}`;
}

function buildLeaderboardPath(windowId, cursor = null) {
  const params = new URLSearchParams();
  params.set('window', windowId);
  params.set('limit', '50');
  if (cursor) params.set('cursor', cursor);
  return `/v1/leaderboard?${params.toString()}`;
}

function compactFilter(filter) {
  return Object.fromEntries(
    Object.entries(filter).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
}

function passesFilter(trade, filter) {
  if (filter.minUsd != null && trade.usdSize < filter.minUsd) return false;
  if (filter.maxUsd != null && trade.usdSize > filter.maxUsd) return false;
  if (filter.side && trade.side !== filter.side) return false;
  if (filter.following && !readFollowedWallets().has(trade.trader?.proxyWallet?.toLowerCase())) return false;
  return true;
}

function mergeWhales(existing, incoming) {
  return incoming.reduce(
    (items, item) => upsertWhale(items, item, { promote: false }),
    Array.isArray(existing) ? [...existing] : []
  );
}

function upsertWhale(existing, incoming, options = {}) {
  if (!incoming?.id) return existing;

  const promote = options.promote ?? true;
  const insertIfMissing = options.insertIfMissing ?? true;
  const index = existing.findIndex((item) => item.id === incoming.id);

  if (index === -1) {
    if (!insertIfMissing) return existing;
    return promote ? [incoming, ...existing] : [...existing, incoming];
  }

  const merged = mergeWhaleTrade(existing[index], incoming);
  const withoutExisting = existing.filter((item) => item.id !== incoming.id);

  if (promote) return [merged, ...withoutExisting];

  const next = [...existing];
  next[index] = merged;
  return next;
}

function mergeWhaleTrade(existing = {}, incoming = {}) {
  const merged = mergeMeaningfulValues(existing, incoming);
  merged.market = mergeMeaningfulValues(existing.market, incoming.market);
  merged.trader = mergeMeaningfulValues(existing.trader, incoming.trader);
  return merged;
}

function mergeMeaningfulValues(existing = {}, incoming = {}) {
  const merged = { ...(existing || {}) };

  Object.entries(incoming || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      merged[key] = value;
    } else if (!(key in merged)) {
      merged[key] = value;
    }
  });

  return merged;
}

function enrichWhaleWithExistingMarketMedia(trade, existingItems) {
  if (hasMarketImage(trade)) return trade;

  const identityKeys = marketIdentityKeys(trade);
  if (!identityKeys.length) return trade;

  const matchingTrade = existingItems.find(
    (item) => hasMarketImage(item) && marketIdentityKeys(item).some((key) => identityKeys.includes(key))
  );

  if (!matchingTrade?.market) return trade;
  return mergeWhaleTrade({ market: pickMarketMedia(matchingTrade.market) }, trade);
}

function pickMarketMedia(market = {}) {
  return [
    'icon',
    'image',
    'imageUrl',
    'eventIcon',
    'eventImage',
    'thumbnail',
  ].reduce((media, key) => {
    if (market?.[key]) media[key] = market[key];
    return media;
  }, {});
}

function marketIdentityKeys(trade) {
  return [
    trade?.market?.conditionId,
    trade?.market?.slug,
    trade?.market?.eventSlug,
    trade?.market?.title,
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());
}

function hasMarketImage(trade) {
  return getMarketImageUrls(trade).length > 0;
}

function mergeLeaderboardItems(existing, incoming) {
  const seen = new Set();
  return [...existing, ...incoming].filter((item) => {
    if (!item?.proxyWallet || seen.has(item.proxyWallet)) return false;
    seen.add(item.proxyWallet);
    return true;
  });
}

function filterNewYorkSession(items, nowMs = Date.now()) {
  const todayKey = newYorkDateKeyFromMs(nowMs);
  return items.filter((item) => newYorkDateKeyFromSeconds(item.timestamp) === todayKey);
}

function isInCurrentNewYorkSession(timestampSeconds) {
  return newYorkDateKeyFromSeconds(timestampSeconds) === newYorkDateKeyFromMs(Date.now());
}

function sortWhales(items, sort) {
  const sorted = [...items];
  if (sort === 'largest') {
    return sorted.sort((a, b) => b.usdSize - a.usdSize);
  }
  return sorted.sort((a, b) => b.timestamp - a.timestamp);
}

function sortLeaderboardItems(items, sort) {
  const sorted = [...items];
  if (sort === 'volume') {
    return sorted.sort((a, b) => Number(b.volume || 0) - Number(a.volume || 0));
  }
  if (sort === 'trades') {
    return sorted.sort((a, b) => Number(b.tradeCount || 0) - Number(a.tradeCount || 0));
  }
  return sorted.sort((a, b) => Number(a.rank || 0) - Number(b.rank || 0));
}

function searchableText(trade) {
  return [
    trade.market?.title,
    trade.market?.slug,
    trade.market?.category,
    trade.outcome,
    trade.side,
    trade.trader?.displayName,
    trade.trader?.pseudonym,
    trade.trader?.proxyWallet,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function leaderboardSearchableText(trader) {
  return [
    trader.displayName,
    trader.pseudonym,
    trader.proxyWallet,
    trader.topCategory,
    trader.rank,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function buildStats(items, nowMs) {
  const source = filterNewYorkSession(items, nowMs);
  const volume = source.reduce((total, item) => total + Number(item.usdSize || 0), 0);
  const activeTraders = new Set(source.map((item) => item.trader?.proxyWallet).filter(Boolean)).size;
  const megaTrades = source.filter((item) => item.tier === 'mega' || item.usdSize >= 250000).length;
  const biggestTrade = source.reduce(
    (top, item) => {
      const size = Number(item.usdSize || 0);
      return size > top.usdSize ? { usdSize: size, side: item.side === 'SELL' ? 'SELL' : 'BUY' } : top;
    },
    { usdSize: 0, side: 'BUY' }
  );
  const average = source.length
    ? source.reduce((total, item) => total + getPriceValue(item), 0) / source.length
    : 0;

  return {
    volume,
    activeTraders,
    megaTrades,
    averagePrice: average ? `${trimNumber(average)}c` : '0c',
    averageTone: average >= 50 ? 'up' : 'down',
    biggestTradeUsd: biggestTrade.usdSize,
    biggestTradeSide: biggestTrade.side,
  };
}

function buildLeaderboardStats(items) {
  const volume = items.reduce((total, item) => total + Number(item.volume || 0), 0);
  const whales = items.reduce((total, item) => total + Number(item.whaleCount || 0), 0);
  const trades = items.reduce((total, item) => total + Number(item.tradeCount || 0), 0);
  const topVolume = items.reduce((top, item) => Math.max(top, Number(item.volume || 0)), 0);

  return {
    volume,
    whales,
    trades,
    traders: items.length,
    topVolume,
  };
}

function emptyProfileStats() {
  return {
    volume: 0,
    tradeCount: 0,
    whaleCount: 0,
    buyVolume: 0,
    sellVolume: 0,
  };
}

function getProfileStats(profile, windowId) {
  return profile?.stats?.[windowId] || emptyProfileStats();
}

function buildVolumeMix(stats) {
  const buy = Number(stats.buyVolume || 0);
  const sell = Number(stats.sellVolume || 0);
  const total = buy + sell;

  if (!total) {
    return { buyPct: 50, sellPct: 50 };
  }

  return {
    buyPct: (buy / total) * 100,
    sellPct: (sell / total) * 100,
  };
}

function normalizeDailyVolume(points) {
  const bucketCount = Math.max(points.length, 2);
  const max = Math.max(...points.map((point) => Number(point.volume || 0)), 1);

  if (!points.length) {
    return [
      [0, 54],
      [280, 54],
    ];
  }

  return points.map((point, index) => {
    const x = (index / (bucketCount - 1)) * 280;
    const y = 54 - (Number(point.volume || 0) / max) * 46;
    return [Number(x.toFixed(2)), Number(y.toFixed(2))];
  });
}

function buildDailyVolumeBars(points) {
  const values = (Array.isArray(points) ? points : []).slice(-7);
  const max = Math.max(...values.map((point) => Number(point.volume || 0)), 1);
  const chartLeft = 20;
  const chartBottom = 100;
  const plotWidth = 280;
  const plotHeight = 72;
  const slotWidth = values.length ? plotWidth / values.length : plotWidth;
  const barWidth = Math.min(34, Math.max(14, slotWidth * 0.42));

  return values.map((point, index) => {
    const volume = Number(point.volume || 0);
    const height = volume > 0 ? Math.max(8, (volume / max) * plotHeight) : 3;
    const centerX = values.length === 1 ? chartLeft + plotWidth / 2 : chartLeft + slotWidth * index + slotWidth / 2;

    return {
      key: `${point.date || point.day || index}-${volume}`,
      x: Number((centerX - barWidth / 2).toFixed(2)),
      y: Number((chartBottom - height).toFixed(2)),
      width: Number(barWidth.toFixed(2)),
      height: Number(height.toFixed(2)),
    };
  });
}

function buildLastHour(items, nowMs) {
  const nowSeconds = Math.floor(nowMs / 1000);
  const bucketCount = 14;
  const secondsPerBucket = 3600 / bucketCount;
  const buckets = Array.from({ length: bucketCount }, () => 0);
  let count = 0;
  let volume = 0;

  items.forEach((item) => {
    const age = nowSeconds - item.timestamp;
    if (age < 0 || age > 3600) return;
    const index = Math.min(bucketCount - 1, Math.floor((3600 - age) / secondsPerBucket));
    buckets[index] += Number(item.usdSize || 0);
    count += 1;
    volume += Number(item.usdSize || 0);
  });

  const max = Math.max(...buckets, 1);
  const points = buckets.map((value, index) => {
    const x = (index / (bucketCount - 1)) * 280;
    const y = 54 - (value / max) * 46;
    return [Number(x.toFixed(2)), Number(y.toFixed(2))];
  });

  return { count, volume, points };
}

function pointsToPath(points, closeArea) {
  if (!points.length) return 'M0,54 L280,54';
  const line = points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x},${y}`).join(' ');
  if (!closeArea) return line;
  return `${line} L280,62 L0,62 Z`;
}

function buildFeedStatSparkline(points) {
  if (!Array.isArray(points) || points.length < 2) return [4, 8, 6, 12, 10, 16, 18];
  return points.map(([, y]) => Math.max(0, 54 - Number(y || 0)));
}

function buildFeedStatBars(points) {
  if (!Array.isArray(points) || points.length < 2) return [0.3, 0.5, 0.4, 0.7, 0.6, 0.9, 1.0];
  const values = points.map(([, y]) => Math.max(0, 54 - Number(y || 0)));
  const groups = 7;
  const groupSize = Math.ceil(values.length / groups);
  const condensed = Array.from({ length: groups }, (_, index) => {
    const start = index * groupSize;
    const slice = values.slice(start, start + groupSize);
    if (!slice.length) return 0;
    const total = slice.reduce((sum, value) => sum + value, 0);
    return total / slice.length;
  });

  const max = Math.max(...condensed, 1);
  return condensed.map((value) => Number((value / max).toFixed(3)));
}

function buildStatSparkPath(points, width, height, padding = 2) {
  if (!Array.isArray(points) || points.length < 2) return '';
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const stepX = (width - padding * 2) / (points.length - 1);

  return points
    .map((value, index) => {
      const x = padding + index * stepX;
      const y = height - padding - ((value - min) / range) * (height - padding * 2);
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

function inferCategory(trade) {
  const raw = `${trade.market?.category || ''} ${trade.market?.title || ''} ${trade.market?.slug || ''}`.toLowerCase();

  if (raw.includes('bitcoin') || raw.includes('crypto') || raw.includes('btc') || raw.includes('ethereum')) {
    return { id: 'crypto', label: 'Crypto', short: 'B' };
  }
  if (raw.includes('election') || raw.includes('trump') || raw.includes('senate') || raw.includes('politic')) {
    return { id: 'politics', label: 'Politics', short: 'P' };
  }
  if (raw.includes('nba') || raw.includes('nfl') || raw.includes('mlb') || raw.includes('spread')) {
    return { id: 'sports', label: 'Sports', short: 'S' };
  }
  if (raw.includes('lol') || raw.includes('cs2') || raw.includes('league') || raw.includes('gaming')) {
    return { id: 'gaming', label: 'Gaming', short: 'G' };
  }
  if (raw.includes('fed') || raw.includes('rate') || raw.includes('econom')) {
    return { id: 'econ', label: 'Economics', short: 'E' };
  }

  return { id: 'general', label: trade.market?.category || 'Market', short: 'M' };
}

function getMarketImageUrls(trade) {
  return [
    trade.marketIcon,
    trade.marketImage,
    trade.marketImageUrl,
    trade.icon,
    trade.image,
    trade.imageUrl,
    trade.eventIcon,
    trade.eventImage,
    trade.market?.icon,
    trade.market?.image,
    trade.market?.imageUrl,
    trade.market?.eventIcon,
    trade.market?.eventImage,
    trade.market?.thumbnail,
  ]
    .filter(Boolean)
    .map((url) => String(url).trim())
    .filter(Boolean)
    .filter((url, index, urls) => urls.indexOf(url) === index);
}

function getTraderName(trade) {
  return formatTraderLabel(
    trade.trader?.displayName || trade.trader?.pseudonym,
    trade.trader?.proxyWallet
  );
}

function leaderboardTraderName(trader) {
  return formatTraderLabel(trader.displayName || trader.pseudonym, trader.proxyWallet);
}

function traderProfileName(profile) {
  const raw = traderProfileFullName(profile);
  if (!raw) return 'Unknown trader';
  if (isWalletishLabel(raw)) return shortWalletPrefix(profile.proxyWallet || raw);
  if (raw.length > 34) return `${raw.slice(0, 24)}...${raw.slice(-6)}`;
  return raw;
}

function traderProfileFullName(profile) {
  return profile.displayName || profile.pseudonym || profile.shortAddress || shortWallet(profile.proxyWallet) || '';
}

function isWalletLike(value) {
  return /^0x[0-9a-fA-F]{40}/.test(String(value || ''));
}

function isWalletishLabel(value) {
  return /^0x[0-9a-fA-F.]{4,}/.test(String(value || ''));
}

function formatTraderLabel(name, wallet) {
  if (name && !isWalletLike(name)) {
    return name.length > 42 ? `${name.slice(0, 30)}...${name.slice(-6)}` : name;
  }
  return shortWallet(name || wallet) || 'Unknown trader';
}

function formatTraderMeta(trade) {
  const vol30d = trade.trader?.vol30d;
  const tradeCount = trade.trader?.tradeCount;

  if (vol30d) return `${formatUsdCompact(vol30d)} 30d`;
  if (tradeCount) return `${formatNumber(tradeCount)} trades`;
  return shortWallet(trade.trader?.proxyWallet) || 'Public wallet';
}

function formatUsdFull(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatUsdCompact(value) {
  const amount = Number(value || 0);
  if (amount >= 1_000_000) return `$${trimNumber(amount / 1_000_000)}M`;
  if (amount >= 1_000) return `$${trimNumber(amount / 1_000)}K`;
  return formatUsdFull(amount);
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(Number(value || 0));
}

function formatShares(value) {
  return new Intl.NumberFormat('en-US', {
    notation: Number(value || 0) >= 100000 ? 'compact' : 'standard',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatPrice(trade) {
  const price = getPriceValue(trade);
  return `${trimNumber(price)}c`;
}

function getPriceValue(trade) {
  if (trade.priceMillicents != null) return Number(trade.priceMillicents) / 100;
  return Number(trade.priceCents || 0);
}

function trimNumber(value) {
  if (!Number.isFinite(value)) return '0';
  if (value >= 100 || Number.isInteger(value)) return value.toFixed(0);
  if (value >= 10) return value.toFixed(1).replace(/\.0$/, '');
  return value.toFixed(2).replace(/\.?0+$/, '');
}

function relativeTime(timestamp) {
  const seconds = Math.max(0, Math.floor(Date.now() / 1000) - Number(timestamp || 0));
  if (seconds < 60) return 'now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(
    new Date(Number(timestamp || 0) * 1000)
  );
}

function relativeTimeAgo(timestamp) {
  const value = relativeTime(timestamp);
  return value === 'now' || value.includes(' ') ? value : `${value} ago`;
}

function relativeClientTime(timestampMs) {
  const seconds = Math.max(0, Math.floor((Date.now() - timestampMs) / 1000));
  if (seconds < 15) return 'now';
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

function formatSnapshotTime(timestampSeconds) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(Number(timestampSeconds || 0) * 1000));
}

function formatDateTimeSeconds(timestampSeconds) {
  if (!timestampSeconds) return 'Unknown';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(Number(timestampSeconds) * 1000));
}

function newYorkDateKeyFromSeconds(timestampSeconds) {
  return newYorkDateKeyFromMs(Number(timestampSeconds || 0) * 1000);
}

function newYorkDateKeyFromMs(timestampMs) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(timestampMs));
}

function shortWallet(wallet) {
  if (!wallet) return '';
  const raw = String(wallet);
  const leadingWallet = raw.match(/^0x[0-9a-fA-F]{40}/)?.[0] || raw;
  return leadingWallet.length > 12
    ? `${leadingWallet.slice(0, 6)}...${leadingWallet.slice(-4)}`
    : leadingWallet;
}

function shortWalletPrefix(wallet) {
  if (!wallet) return '';
  const raw = String(wallet);
  const leadingWallet = raw.match(/^0x[0-9a-fA-F]{40}/)?.[0] || raw;
  return leadingWallet.length > 6 ? `${leadingWallet.slice(0, 6)}..` : leadingWallet;
}

function truncate(value, length) {
  if (!value || value.length <= length) return value || '';
  return `${value.slice(0, length - 3)}...`;
}

function avatarGradient(seed) {
  const palettes = [
    ['#67e8f9', '#2563eb'],
    ['#fda4af', '#f43f5e'],
    ['#c4b5fd', '#7c3aed'],
    ['#fde047', '#f97316'],
    ['#86efac', '#10b981'],
    ['#93c5fd', '#06b6d4'],
  ];
  const index = Math.abs(hashString(seed)) % palettes.length;
  const [a, b] = palettes[index];
  return `linear-gradient(135deg, ${a}, ${b})`;
}

function hashString(value) {
  return String(value || '')
    .split('')
    .reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, 0);
}

function liveStateLabel(state) {
  if (state === 'live') return 'Live';
  if (state === 'filtered') return 'Follow';
  if (state === 'reconnecting') return 'Retry';
  if (state === 'offline') return 'Offline';
  return 'Sync';
}

function normalizeApiBase(base) {
  return String(base || '/api').replace(/\/$/, '');
}

function normalizeWsBase(base) {
  const normalized = String(base || prodApiUrl).replace(/\/$/, '');
  if (normalized.startsWith('https://')) return normalized.replace(/^https:/, 'wss:');
  if (normalized.startsWith('http://')) return normalized.replace(/^http:/, 'ws:');
  return normalized;
}

function joinUrl(base, path) {
  return `${String(base).replace(/\/$/, '')}/${String(path).replace(/^\//, '')}`;
}

export default App;
