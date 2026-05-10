import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  DollarSign,
  ExternalLink,
  FileText,
  Flame,
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
  X,
  Zap,
} from 'lucide-react';
import { readPublicEnv } from './lib/env.js';
import { getBrowserPathname, matchAppRoute } from './lib/routes.js';
import { getSeoForPath, seoDefaults, seoImage, siteName, siteOrigin } from './lib/seo.js';

const supportEmail = 'support@whaletracker.com';
const lastUpdated = 'May 1, 2026';
const prodApiUrl = 'https://whaleserver-production.up.railway.app';
const apiBaseUrl = normalizeApiBase(readPublicEnv('VITE_API_BASE_URL', '/api'));
const wsBaseUrl = normalizeWsBase(readPublicEnv('VITE_WS_BASE_URL', prodApiUrl));
const authStorageKey = 'polywatch:webAuth';
const deviceIdStorageKey = 'polywatch:webDeviceId';
const followsStorageKey = 'polywatch:followedWallets';
const followsChangedEvent = 'polywatch:follows-changed';
const alertPrefsStorageKey = 'polywatch:webAlertPrefs';
const webAlertsChangedEvent = 'polywatch:web-alerts-changed';
const webAlertToastEvent = 'polywatch:web-alert-toast';
const walletRegex = /^0x[0-9a-fA-F]{40}$/;
const firebaseWebConfig = {
  apiKey: readPublicEnv('VITE_FIREBASE_API_KEY'),
  authDomain: readPublicEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: readPublicEnv('VITE_FIREBASE_PROJECT_ID'),
  messagingSenderId: readPublicEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: readPublicEnv('VITE_FIREBASE_APP_ID'),
};
const firebaseVapidKey = readPublicEnv('VITE_FIREBASE_VAPID_KEY');

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
  { id: '1d', label: '1D', caption: "today's New York session" },
  { id: '7d', label: '7D', caption: 'Last 7 New York days' },
  { id: '30d', label: '30D', caption: 'Last 30 days', locked: true },
  { id: '365d', label: '1Y', caption: 'Last 365 days', locked: true },
];
const walletRecentTradesPageSize = 10;
const lockedLeaderboardWindowIds = new Set(
  leaderboardWindows.filter((option) => option.locked).map((option) => option.id)
);

const leaderboardSortOptions = [
  { id: 'rank', label: 'Volume' },
  { id: 'trades', label: 'Trade count' },
  { id: 'profit', label: 'Profit' },
];

const legalLinks = [
  { href: '/about', label: 'About Polywatch', icon: Radio },
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

function usePageSeo(seo) {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const canonicalUrl = `${siteOrigin}${seo.path === '/' ? '/' : seo.path}`;
    const title = seo.title || seoDefaults.title;
    const description = seo.description || seoDefaults.description;
    const keywords = seo.keywords || seoDefaults.keywords;
    const robots = seo.robots || seoDefaults.robots;

    document.title = title;
    setMetaTag('name', 'description', description);
    setMetaTag('name', 'keywords', keywords);
    setMetaTag('name', 'robots', robots);
    setLinkTag('canonical', canonicalUrl);
    setMetaTag('property', 'og:site_name', siteName);
    setMetaTag('property', 'og:title', title);
    setMetaTag('property', 'og:description', description);
    setMetaTag('property', 'og:type', 'website');
    setMetaTag('property', 'og:url', canonicalUrl);
    setMetaTag('property', 'og:image', seoImage);
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', title);
    setMetaTag('name', 'twitter:description', description);
    setMetaTag('name', 'twitter:image', seoImage);

    const structuredData = seo.structuredData || [];
    const existingScript = document.querySelector('script[data-polywatch-seo="jsonld"]');
    if (!structuredData.length) {
      existingScript?.remove();
      return;
    }

    let script = existingScript;
    if (!script) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.dataset.polywatchSeo = 'jsonld';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(structuredData.length === 1 ? structuredData[0] : structuredData);
  }, [seo]);
}

function setMetaTag(attribute, key, content) {
  let tag = document.querySelector(`meta[${attribute}="${key}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attribute, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

function setLinkTag(rel, href) {
  let tag = document.querySelector(`link[rel="${rel}"]`);
  if (!tag) {
    tag = document.createElement('link');
    tag.setAttribute('rel', rel);
    document.head.appendChild(tag);
  }
  tag.setAttribute('href', href);
}

function App({ initialPath = null, initialData = null }) {
  const { path, tradeMatch, traderMatch } = useMemo(
    () => matchAppRoute(initialPath ?? getBrowserPathname()),
    [initialPath]
  );
  const seo = useMemo(() => getSeoForPath(path, tradeMatch, traderMatch), [path, tradeMatch, traderMatch]);
  const [webAlertToast, setWebAlertToast] = useState(null);

  usePageSeo(seo);

  useEffect(() => {
    let disposed = false;
    let unsubscribe = null;

    const refreshForegroundListener = async () => {
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }

      try {
        const nextUnsubscribe = await registerForegroundWebAlertListener();
        if (disposed) {
          nextUnsubscribe?.();
          return;
        }
        unsubscribe = nextUnsubscribe;
      } catch {
        // Foreground web push is best effort; activation UI reports blocking config/permission issues.
      }
    };

    refreshForegroundListener();
    window.addEventListener(webAlertsChangedEvent, refreshForegroundListener);

    return () => {
      disposed = true;
      window.removeEventListener(webAlertsChangedEvent, refreshForegroundListener);
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (path === '/') {
      setWebAlertToast(null);
      return undefined;
    }

    let timer = null;
    const handleToast = (event) => {
      window.clearTimeout(timer);
      setWebAlertToast({ id: Date.now(), ...(event.detail || {}) });
      timer = window.setTimeout(() => setWebAlertToast(null), 8000);
    };

    window.addEventListener(webAlertToastEvent, handleToast);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(webAlertToastEvent, handleToast);
    };
  }, [path]);

  let page;
  if (path === '/about') page = <AboutPage />;
  else if (path === '/privacy') page = <PrivacyPage />;
  else if (path === '/terms') page = <TermsPage />;
  else if (path === '/delete-data') page = <DeleteDataPage />;
  else if (path === '/leaderboard') page = <LeaderboardPage initialData={initialData?.leaderboard} />;
  else if (path === '/profile/following') page = <FollowingPage />;
  else if (path === '/profile') page = <ProfilePage />;
  else if (path === '/alerts') page = <AlertsPage />;
  else if (tradeMatch) page = <TradeDetailPage tradeId={decodeURIComponent(tradeMatch[1])} />;
  else if (traderMatch) page = <TraderProfilePage wallet={decodeURIComponent(traderMatch[1])} />;
  else page = <WhaleFeedPage initialData={initialData?.feed} />;

  return (
    <>
      {page}
      <ScrollToTopButton />
      <WebAlertToast toast={webAlertToast} onClose={() => setWebAlertToast(null)} />
    </>
  );
}

function ScrollToTopButton({
  threshold = 400,
  bottom = null,
  right = 24,
  container = null,
  onClick,
}) {
  const [visible, setVisible] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    window.matchMedia('(max-width: 760px)').matches
  );

  useEffect(() => {
    const media = window.matchMedia('(max-width: 760px)');
    const sync = (event) => setIsMobileViewport(event.matches);
    setIsMobileViewport(media.matches);
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const target = container?.current || window;
    const getScroll = () => (container?.current ? container.current.scrollTop : window.scrollY);
    const handleScroll = () => setVisible(getScroll() > threshold);

    target.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => target.removeEventListener('scroll', handleScroll);
  }, [threshold, container]);

  const handleClick = () => {
    if (onClick) {
      onClick();
      return;
    }

    if (container?.current) {
      container.current.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const effectiveBottom = bottom ?? (isMobileViewport ? 82 : 24);

  return (
    <button
      type="button"
      className={`scroll-to-top-button ${visible ? 'visible' : ''}`}
      aria-label="Scroll to top"
      onClick={handleClick}
      style={{
        bottom: `${effectiveBottom}px`,
        right: `${right}px`,
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        aria-hidden="true"
      >
        <line x1="12" y1="19" x2="12" y2="5" />
        <polyline points="5 12 12 5 19 12" />
      </svg>
    </button>
  );
}

function WhaleFeedPage({ initialData = null }) {
  const initialFollowingOnly = (() => {
    const query = new URLSearchParams(window.location.search);
    return query.get('following') === '1' || query.get('following') === 'true';
  })();
  const hasInitialFeedData = Boolean(initialData) && !initialFollowingOnly;
  const initialFeedItems = hasInitialFeedData && Array.isArray(initialData?.items) ? initialData.items : [];
  const usedInitialFeedRef = useRef(hasInitialFeedData);
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    window.matchMedia('(max-width: 1020px)').matches
  );
  const [rangeId, setRangeId] = useState('all');
  const [side, setSide] = useState('all');
  const [followingOnly, setFollowingOnly] = useState(initialFollowingOnly);
  const [sort, setSort] = useState('recent');
  const [items, setItems] = useState(initialFeedItems);
  const [cursor, setCursor] = useState(hasInitialFeedData ? initialData?.nextCursor ?? null : null);
  const [loading, setLoading] = useState(!hasInitialFeedData);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(hasInitialFeedData ? initialData?.error || '' : '');
  const [lastUpdatedAt, setLastUpdatedAt] = useState(hasInitialFeedData ? Date.now() : null);
  const [liveState, setLiveState] = useState(hasInitialFeedData ? 'live' : 'connecting');
  const [clock, setClock] = useState(() => Date.now());
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [dashboard, setDashboard] = useState(hasInitialFeedData ? initialData?.dashboard ?? null : null);
  const [followedCount, setFollowedCount] = useState(() => readFollowedWallets().size);
  const todaySession = useMemo(() => getCurrentNewYorkSession(clock), [clock]);

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
    const media = window.matchMedia('(max-width: 1020px)');
    const sync = (event) => setIsMobileViewport(event.matches);
    setIsMobileViewport(media.matches);
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const delay = Math.max(1000, todaySession.nextResetMs - Date.now() + 1000);
    const timer = window.setTimeout(() => {
      setClock(Date.now());
      setRefreshNonce((value) => value + 1);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [todaySession.dateKey]);

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
    if (
      usedInitialFeedRef.current &&
      refreshNonce === 0 &&
      rangeId === 'all' &&
      side === 'all' &&
      !followingOnly
    ) {
      usedInitialFeedRef.current = false;
      return undefined;
    }

    const controller = new AbortController();

    async function loadInitialWhales() {
      setLoading(true);
      setError('');
      setDashboard(null);
      try {
        const data = apiFilter.following
          ? await fetchTodayWhalesForFilter(apiFilter, { signal: controller.signal })
          : await fetchTodayDashboardWithFallback(apiFilter, { signal: controller.signal });
        setItems(Array.isArray(data.items) ? data.items : []);
        setCursor(data.nextCursor ?? null);
        setDashboard(data.dashboard ?? null);
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
  }, [filterKey, refreshNonce, todaySession.dateKey]);

  useEffect(() => {
    if (apiFilter.following) return undefined;

    let closed = false;
    let inFlight = false;
    const controller = new AbortController();

    async function refreshDashboardSilently() {
      if (closed || inFlight || document.hidden) return;
      inFlight = true;

      try {
        const nextDashboard = await fetchTodayDashboard(apiFilter, { signal: controller.signal });
        if (closed) return;

        const incoming = Array.isArray(nextDashboard?.items) ? nextDashboard.items : [];
        setDashboard(nextDashboard ?? null);
        setItems((previous) => sortWhales(mergeWhales(incoming, previous), 'recent'));
        setLastUpdatedAt(Date.now());
        setError('');
      } catch (err) {
        if (!controller.signal.aborted) {
          // Keep the existing dashboard visible; the next interval or websocket update can recover.
        }
      } finally {
        inFlight = false;
      }
    }

    const interval = window.setInterval(refreshDashboardSilently, 30000);
    const onVisible = () => {
      if (!document.hidden) void refreshDashboardSilently();
    };

    document.addEventListener('visibilitychange', onVisible);

    return () => {
      closed = true;
      controller.abort();
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [apiFilter, filterKey, todaySession.dateKey]);

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
          if (message.type === 'resolution_update' && message.data) {
            setItems((previous) => applyResolutionUpdateToTrades(previous, message.data));
            setLastUpdatedAt(Date.now());
            return;
          }

          if (message.type !== 'whale' || !message.data) return;

          const whale = message.data;
          if (!isInNewYorkSession(whale.timestamp, todaySession.dateKey)) return;
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
  }, [filterKey, todaySession.dateKey]);

  const sessionItems = useMemo(() => filterNewYorkSession(items, clock), [items, clock]);
  const visibleItems = useMemo(() => sortWhales(sessionItems, sort), [sessionItems, sort]);

  const localStats = useMemo(() => buildStats(items, clock), [items, clock]);
  const stats = useMemo(() => buildDashboardFeedStats(dashboard, localStats), [dashboard, localStats]);
  const localLastHour = useMemo(() => buildLastHour(sessionItems, clock), [sessionItems, clock]);
  const lastHour = useMemo(() => buildDashboardLastHour(dashboard, localLastHour), [dashboard, localLastHour]);
  const leaderboard = useMemo(() => buildDashboardLeaderboard(dashboard, sessionItems), [dashboard, sessionItems]);
  const volumeSparkline = useMemo(() => buildFeedStatSparkline(lastHour.points), [lastHour.points]);
  const whaleBars = useMemo(() => buildFeedStatBars(lastHour.points), [lastHour.points]);
  const mobileTrades = useMemo(
    () =>
      visibleItems.map((trade) => ({
        id: trade.id,
        side: trade.side === 'SELL' ? 'SELL' : 'BUY',
        timeAgo: relativeTimeAgo(trade.timestamp),
        marketIcon: buildMobileMarketIcon(trade),
        marketHref: buildMarketHref(trade),
        marketName: trade.market?.title || 'Unknown market',
        marketMeta: `${inferCategory(trade).label} - ${trade.outcome || 'Outcome'}`,
        size: formatUsdFull(trade.usdSize),
        price: getPriceValue(trade),
        trader: {
          name: getTraderName(trade),
          wallet: trade.trader?.proxyWallet || '',
          avatarColor: avatarGradient(trade.trader?.proxyWallet || trade.id),
          href: trade.trader?.proxyWallet
            ? `/trader/${encodeURIComponent(trade.trader.proxyWallet)}`
            : null,
        },
        onFollow: async () => {
          const wallet = trade.trader?.proxyWallet?.toLowerCase();
          if (!wallet) return;
          const previous = isWalletFollowedLocally(wallet);
          const next = !previous;
          setWalletFollowedLocally(wallet, next);
          notifyFollowsChanged({ wallet, isFollowing: next });
          try {
            await setWalletFollowedOnServer(wallet, next);
          } catch (err) {
            setWalletFollowedLocally(wallet, previous);
            notifyFollowsChanged({ wallet, isFollowing: previous });
            setError(err.message || 'Follow update failed');
          }
        },
        onOpen: () => {
          cacheTrade(trade);
          window.location.href = `/trade/${encodeURIComponent(trade.id)}`;
        },
        onTraderOpen: () => {
          if (trade.trader?.proxyWallet) {
            window.location.href = `/trader/${encodeURIComponent(trade.trader.proxyWallet)}`;
          }
        },
      })),
    [visibleItems]
  );

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

  if (isMobileViewport) {
    return (
      <MobileFeedScreen
        liveState={liveState}
        stats={{
          volume: formatUsdCompact(stats.volume),
          sparkline: volumeSparkline,
          whales: formatNumber(stats.activeTraders),
          mega: formatNumber(stats.megaTrades),
          biggest: formatUsdCompact(stats.biggestTradeUsd),
        }}
        trades={mobileTrades}
        activeFilter={followingOnly ? 'following' : rangeId}
        activeSide={side === 'all' ? 'all' : side.toLowerCase()}
        sortValue={sort}
        sortOptions={feedSortOptions}
        onFilterChange={(filter) => {
          if (filter === 'following') {
            const next = !followingOnly;
            setFollowingOnly(next);
            updateFollowingQueryParam(next);
            if (next) setRangeId('all');
            return;
          }
          setRangeId(filter);
          if (followingOnly) {
            setFollowingOnly(false);
            updateFollowingQueryParam(false);
          }
        }}
        onSideChange={(next) => setSide(next === 'all' ? 'all' : next.toUpperCase())}
        onSortChange={setSort}
        onRefresh={() => setRefreshNonce((value) => value + 1)}
        activeTab="feed"
        onTabChange={(tab) => {
          if (tab === 'feed') return;
          if (tab === 'leaders') window.location.href = '/leaderboard';
          if (tab === 'following') window.location.href = '/profile/following';
          if (tab === 'alerts') window.location.href = '/alerts';
        }}
        loading={loading}
        error={error}
        canLoadMore={Boolean(cursor)}
        loadingMore={loadingMore}
        onLoadMore={loadMore}
      />
    );
  }

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

function LeaderboardPage({ initialData = null }) {
  const initialLeaderboardItems = Array.isArray(initialData?.items) ? initialData.items : [];
  const hasInitialLeaderboardData = Boolean(initialData);
  const initialLeaderboardWindow = initialData?.windowId || '1d';
  const usedInitialLeaderboardRef = useRef(hasInitialLeaderboardData);
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    window.matchMedia('(max-width: 1020px)').matches
  );
  const [windowId, setWindowId] = useState(initialLeaderboardWindow);
  const [sort, setSort] = useState('rank');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState(initialLeaderboardItems);
  const [cursor, setCursor] = useState(initialData?.nextCursor ?? null);
  const [asOf, setAsOf] = useState(initialData?.asOf ?? null);
  const [loading, setLoading] = useState(!hasInitialLeaderboardData);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(initialData?.error || '');
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [leaderboardProfits, setLeaderboardProfits] = useState({});
  const [profitLoading, setProfitLoading] = useState(false);
  const [clock, setClock] = useState(() => Date.now());
  const todaySession = useMemo(() => getCurrentNewYorkSession(clock), [clock]);
  const leaderboardRequestSort = sort === 'profit' ? 'profit' : 'volume';
  const leaderboardRequestWindow = sort === 'profit' ? '1d' : windowId;
  const leaderboardRequestDateKey = sort === 'profit' ? 'all-time' : todaySession.dateKey;
  const loadedLeaderboardWallets = useMemo(
    () => Array.from(new Set(items.map((item) => normalizeWalletKey(item.proxyWallet)).filter(Boolean))),
    [items]
  );
  const loadedLeaderboardWalletSignature = loadedLeaderboardWallets.join('|');

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1020px)');
    const sync = (event) => setIsMobileViewport(event.matches);
    setIsMobileViewport(media.matches);
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const delay = Math.max(1000, todaySession.nextResetMs - Date.now() + 1000);
    const timer = window.setTimeout(() => {
      setClock(Date.now());
      setRefreshNonce((value) => value + 1);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [todaySession.dateKey]);

  useEffect(() => {
    if (
      usedInitialLeaderboardRef.current &&
      refreshNonce === 0 &&
      leaderboardRequestSort !== 'profit' &&
      leaderboardRequestWindow === initialLeaderboardWindow
    ) {
      usedInitialLeaderboardRef.current = false;
      return undefined;
    }

    const controller = new AbortController();

    async function loadLeaderboard() {
      setLoading(true);
      setError('');
      try {
        const data = await fetchLeaderboardPage(leaderboardRequestWindow, null, {
          signal: controller.signal,
          limit: 100,
          sort: leaderboardRequestSort,
        });
        setItems(Array.isArray(data.items) ? data.items : []);
        setCursor(data.nextCursor ?? null);
        setAsOf(data.asOf ?? Math.floor(Date.now() / 1000));
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
  }, [leaderboardRequestWindow, leaderboardRequestSort, refreshNonce, leaderboardRequestDateKey, initialLeaderboardWindow]);

  useEffect(() => {
    let closed = false;
    let inFlight = false;
    const controller = new AbortController();

    async function refreshLeaderboardSilently() {
      if (closed || inFlight || document.hidden) return;
      inFlight = true;

      try {
        const data = await fetchLeaderboardPage(leaderboardRequestWindow, null, {
          signal: controller.signal,
          limit: 100,
          sort: leaderboardRequestSort,
        });
        if (closed) return;

        setItems(Array.isArray(data.items) ? data.items : []);
        setCursor(data.nextCursor ?? null);
        setAsOf(data.asOf ?? Math.floor(Date.now() / 1000));
        setError('');
      } catch (err) {
        if (!controller.signal.aborted) {
          // The visible leaderboard remains usable; the next interval will retry.
        }
      } finally {
        inFlight = false;
      }
    }

    const interval = window.setInterval(refreshLeaderboardSilently, 30000);
    const onVisible = () => {
      if (!document.hidden) void refreshLeaderboardSilently();
    };

    document.addEventListener('visibilitychange', onVisible);

    return () => {
      closed = true;
      controller.abort();
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [leaderboardRequestWindow, leaderboardRequestSort, leaderboardRequestDateKey]);

  useEffect(() => {
    if (sort !== 'profit') {
      setProfitLoading(false);
      return undefined;
    }

    const walletsToFetch = Array.from(new Set(
      items
        .filter((item) => !getLeaderboardProfitEntryFromItem(item))
        .map((item) => normalizeWalletKey(item.proxyWallet))
        .filter((wallet) => wallet && !leaderboardProfits[wallet])
    ));
    if (!walletsToFetch.length) {
      setProfitLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    setProfitLoading(true);

    fetchLeaderboardProfitSummaries(walletsToFetch, { signal: controller.signal })
      .then((summaries) => {
        if (controller.signal.aborted) return;
        setLeaderboardProfits((previous) => ({ ...previous, ...summaries }));
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setLeaderboardProfits((previous) => {
            const failed = walletsToFetch.reduce(
              (entries, wallet) => ({
                ...entries,
                [wallet]: previous[wallet] || {
                  status: 'unavailable',
                  value: null,
                  hasValue: false,
                  pnlTradeCount: null,
                  historyTradeCount: null,
                  recentResults: [],
                  recentWinRatePct: null,
                  allTimeWinRatePct: null,
                },
              }),
              {}
            );
            return { ...previous, ...failed };
          });
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setProfitLoading(false);
        }
      });

    return () => controller.abort();
  }, [sort, loadedLeaderboardWalletSignature, leaderboardProfits]);

  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = query
      ? items.filter((item) => leaderboardSearchableText(item).includes(query))
      : [...items];
    const withProfit = filtered.map((item) => hydrateLeaderboardProfit(item, leaderboardProfits));
    return sortLeaderboardItems(withProfit, sort);
  }, [items, search, sort, leaderboardProfits]);

  const mobileRows = useMemo(
    () =>
      visibleItems.map((trader, index) => ({
        key: trader.proxyWallet || `${trader.rank || index}-${trader.displayName || trader.pseudonym || ''}`,
        rank: sort === 'rank' ? Number(trader.rank) || index + 1 : index + 1,
        name: leaderboardTraderName(trader),
        wallet: shortWallet(trader.proxyWallet),
        walletFull: trader.proxyWallet || '',
        volume: formatUsdCompact(trader.volume),
        trades: sort === 'profit'
          ? formatLeaderboardProfitTradeCount(trader, profitLoading)
          : formatNumber(trader.tradeCount),
        tradesLabel: sort === 'profit' ? 'P/L trades' : 'Trades',
        avgTrade: formatUsdCompact(
          Number(trader.volume || 0) / Math.max(1, Number(trader.tradeCount || 0))
        ),
        mainMetric: sort === 'profit' ? formatLeaderboardProfit(trader) : formatUsdCompact(trader.volume),
        mainMetricLabel: sort === 'profit' ? 'PROFIT' : 'VOLUME',
        mainMetricTone: sort === 'profit' ? getLeaderboardProfitTone(trader) : 'profit',
        profitLoading: sort === 'profit' && !trader.allTimeProfitKnown && profitLoading,
        showRecentForm: sort === 'profit',
        recentResults: Array.isArray(trader.recentFormResults) ? trader.recentFormResults : [],
        allTimeWinRate: formatLeaderboardAllTimeWinRate(trader),
        avatarColor: avatarGradient(trader.proxyWallet || `${index}`),
        href: trader.proxyWallet ? `/trader/${encodeURIComponent(trader.proxyWallet)}` : null,
      })),
    [visibleItems, sort, profitLoading]
  );

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;

    setLoadingMore(true);
    setError('');
    try {
      const data = await fetchLeaderboardPage(leaderboardRequestWindow, cursor, {
        limit: 100,
        sort: leaderboardRequestSort,
      });
      const incoming = Array.isArray(data.items) ? data.items : [];
      setItems((previous) => mergeLeaderboardItems(previous, incoming));
      setCursor(data.nextCursor ?? null);
      setAsOf(data.asOf ?? Math.floor(Date.now() / 1000));
    } catch (err) {
      setError(err.message || 'Failed to load more leaderboard rows.');
    } finally {
      setLoadingMore(false);
    }
  }, [leaderboardRequestWindow, leaderboardRequestSort, cursor, loadingMore]);
  const handleWindowChange = useCallback((nextWindowId) => {
    if (lockedLeaderboardWindowIds.has(nextWindowId)) return;
    setWindowId(nextWindowId);
  }, []);

  if (isMobileViewport) {
    return (
      <MobileLeaderboardScreen
        windowId={windowId}
        sortValue={sort}
        sortOptions={leaderboardSortOptions}
        rows={mobileRows}
        onWindowChange={handleWindowChange}
        onSortChange={setSort}
        loading={loading}
        profitLoading={profitLoading}
        error={error}
        onRefresh={() => setRefreshNonce((value) => value + 1)}
        canLoadMore={Boolean(cursor)}
        loadingMore={loadingMore}
        onLoadMore={loadMore}
        onTabChange={(tab) => {
          if (tab === 'leaders') return;
          if (tab === 'feed') window.location.href = '/';
          if (tab === 'following') window.location.href = '/profile/following';
          if (tab === 'alerts') window.location.href = '/alerts';
        }}
      />
    );
  }

  return (
    <div className="feed-shell leaderboard-shell no-rail-shell leaderboard-classic-shell">
      <FeedSidebar activePage="leaderboard" liveState="live" />

      <main className="feed-main leaderboard-main leaderboard-classic-main">
        <MobileLeaderboardScreen
          windowId={windowId}
          sortValue={sort}
          sortOptions={leaderboardSortOptions}
          rows={mobileRows}
          onWindowChange={handleWindowChange}
          onSortChange={setSort}
          loading={loading}
          profitLoading={profitLoading}
          error={error}
          onRefresh={() => setRefreshNonce((value) => value + 1)}
          canLoadMore={Boolean(cursor)}
          loadingMore={loadingMore}
          onLoadMore={loadMore}
          showBottomNav={false}
          className="leaderboard-desktop-surface"
        />
      </main>
    </div>
  );
}

function MobileLeaderboardScreen({
  windowId,
  sortValue,
  sortOptions,
  rows,
  onWindowChange,
  onSortChange,
  loading,
  profitLoading,
  error,
  onRefresh,
  canLoadMore,
  loadingMore,
  onLoadMore,
  onTabChange,
  showBottomNav = true,
  className = '',
}) {
  const shellStyle = {
    background: '#0a0a0a',
    minHeight: showBottomNav ? '100vh' : 'auto',
    paddingBottom: showBottomNav ? 92 : 0,
  };
  const isProfitSort = sortValue === 'profit';

  return (
    <div className={`leaderboard-mobile-screen ${className}`.trim()} style={shellStyle}>
      <div className="leaderboard-mobile-content" style={{ padding: '6px 14px 0' }}>
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22d3a5' }} />
            <span style={{ fontSize: 10, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
              RANKED - POLYMARKET
            </span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 500, color: '#fff', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            Whale <span style={{ color: '#22d3a5' }}>leaderboard</span>
          </h1>
        </div>

        <div style={{ marginBottom: 14 }}>
          {isProfitSort ? (
            <div
              aria-label="Profit leaderboard timeframe"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                minHeight: 32,
                borderRadius: 999,
                padding: '0 14px',
                border: '1px solid rgba(34,211,165,0.22)',
                background: 'rgba(34,211,165,0.1)',
                color: '#62e7b0',
                fontSize: 11.5,
                fontWeight: 700,
              }}
            >
              All-time P/L
            </div>
          ) : (
            <div
              style={{
                display: 'inline-flex',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 999,
                padding: 2,
              }}
            >
              {leaderboardWindows.map((option) => {
                const locked = Boolean(option.locked);
                return (
                  <button
                    key={option.id}
                    type="button"
                    title={locked ? 'Coming soon' : option.caption}
                    aria-disabled={locked}
                    onClick={() => {
                      if (!locked) onWindowChange(option.id);
                    }}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 999,
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: locked ? 'default' : 'pointer',
                      border: 0,
                      opacity: locked ? 0.42 : 1,
                      background: windowId === option.id ? '#22d3a5' : 'transparent',
                      color: windowId === option.id ? '#0a3a2a' : 'rgba(255,255,255,0.6)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 8 }}>
            <div style={{ marginLeft: 'auto' }}>
              <MobileSortDropdown
                value={sortValue}
                options={sortOptions}
                onChange={onSortChange}
                prefix="Sort: "
              />
            </div>
          </div>
          {sortValue === 'profit' && profitLoading ? (
            <div
              style={{
                color: 'rgba(255,255,255,0.45)',
                fontSize: 10.5,
                marginTop: 7,
                textAlign: 'right',
              }}
            >
              Calculating all-time profit...
            </div>
          ) : null}
        </div>

        {loading ? (
          <LeaderboardSkeleton />
        ) : error && rows.length === 0 ? (
          <EmptyState title="Leaderboard unavailable" body={error} actionLabel="Try again" onAction={onRefresh} />
        ) : rows.length === 0 ? (
          <EmptyState
            title={isProfitSort ? 'No profit leaders' : 'No ranked traders'}
            body={isProfitSort ? 'No resolved P/L rows are available right now.' : 'No rows are available for this window right now.'}
            actionLabel={isProfitSort ? 'Refresh' : 'Switch window'}
            onAction={isProfitSort ? onRefresh : () => onWindowChange('7d')}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rows.map((row) => (
              <MobileLeaderboardRow key={row.key} row={row} />
            ))}
          </div>
        )}

        {canLoadMore ? (
          <div style={{ marginTop: 12 }}>
            <button
              type="button"
              onClick={onLoadMore}
              disabled={loadingMore}
              style={{
                width: '100%',
                height: 40,
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.04)',
                color: 'rgba(255,255,255,0.84)',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: loadingMore ? 'default' : 'pointer',
              }}
            >
              {loadingMore ? 'Loading...' : 'Load more ranked traders'}
            </button>
          </div>
        ) : null}
      </div>
      {showBottomNav ? <MobileBottomNav activeTab="leaders" onTabChange={onTabChange} /> : null}
    </div>
  );
}

const mobileLeaderboardRankThemes = {
  1: {
    cardBg: 'rgba(255, 200, 60, 0.06)',
    cardBorder: 'rgba(255, 200, 60, 0.25)',
    stripeBg: 'linear-gradient(180deg, rgba(255,200,60,0.15), rgba(255,200,60,0.05))',
    stripeText: '#ffc83c',
    showCrown: true,
  },
  2: {
    cardBg: 'rgba(200, 200, 208, 0.04)',
    cardBorder: 'rgba(200, 200, 208, 0.18)',
    stripeBg: 'linear-gradient(180deg, rgba(200,200,208,0.1), rgba(200,200,208,0.03))',
    stripeText: '#c8c8d0',
    showCrown: false,
  },
  3: {
    cardBg: 'rgba(214, 138, 90, 0.05)',
    cardBorder: 'rgba(214, 138, 90, 0.22)',
    stripeBg: 'linear-gradient(180deg, rgba(214,138,90,0.12), rgba(214,138,90,0.04))',
    stripeText: '#d68a5a',
    showCrown: false,
  },
  default: {
    cardBg: 'rgba(255, 255, 255, 0.025)',
    cardBorder: 'rgba(255, 255, 255, 0.08)',
    stripeBg: 'transparent',
    stripeText: 'rgba(255, 255, 255, 0.4)',
    showCrown: false,
  },
};

function mobileLeaderboardTheme(rank) {
  return mobileLeaderboardRankThemes[rank] || mobileLeaderboardRankThemes.default;
}

function MobileLeaderboardRow({ row }) {
  const [copied, setCopied] = useState(false);
  const theme = mobileLeaderboardTheme(row.rank);
  const metricColor = row.mainMetricTone === 'loss'
    ? '#ff6b8a'
    : row.mainMetricTone === 'muted'
      ? 'rgba(255,255,255,0.5)'
      : '#22d3a5';
  const allTimeWinRateColor = row.allTimeWinRate === '--'
    ? 'rgba(255,255,255,0.45)'
    : row.allTimeWinRate === '0%'
      ? '#ff6b8a'
      : '#62e7b0';

  const copyWallet = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const wallet = row.walletFull || row.wallet;
    if (!wallet) return;
    try {
      await navigator.clipboard.writeText(wallet);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore clipboard errors on unsupported contexts
    }
  };

  const content = (
    <div
      style={{
        background: theme.cardBg,
        border: `1px solid ${theme.cardBorder}`,
        borderRadius: 12,
        display: 'flex',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          background: theme.stripeBg,
          width: 36,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          flexShrink: 0,
        }}
      >
        {theme.showCrown ? (
          <svg width="16" height="11" viewBox="0 0 22 14" fill="none" aria-hidden="true">
            <path d="M2 12 L4 4 L8 8 L11 2 L14 8 L18 4 L20 12 Z" fill={theme.stripeText} strokeLinejoin="round" />
            <rect x="2" y="11" width="18" height="2" fill={theme.stripeText} />
          </svg>
        ) : null}
        <div style={{ color: theme.stripeText, fontWeight: 500, fontSize: theme.showCrown ? 13 : 16 }}>{row.rank}</div>
      </div>

      <div style={{ flex: 1, minWidth: 0, padding: '10px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: '50%', background: row.avatarColor, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#fff',
                lineHeight: 1.15,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {row.name}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginTop: 2,
              }}
            >
              <div
                style={{
                  fontSize: 9.5,
                  color: 'rgba(255,255,255,0.4)',
                  fontFamily: '"SFMono-Regular", Consolas, monospace',
                  lineHeight: 1.2,
                  wordBreak: 'break-all',
                }}
                title={row.walletFull || row.wallet}
              >
                {row.walletFull || row.wallet}
              </div>
              <button
                type="button"
                onClick={copyWallet}
                title={copied ? 'Copied' : 'Copy wallet'}
                aria-label={copied ? 'Wallet copied' : 'Copy wallet'}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 5,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.04)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  cursor: 'pointer',
                  color: copied ? '#22d3a5' : 'rgba(255,255,255,0.58)',
                  flexShrink: 0,
                }}
              >
                <Copy size={9} />
              </button>
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 15, color: metricColor, fontWeight: 600, lineHeight: 1 }}>
              {row.profitLoading ? '...' : row.mainMetric}
            </div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{row.mainMetricLabel}</div>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: row.showRecentForm ? 'auto minmax(0, 1fr)' : 'repeat(2, minmax(0, 1fr))',
            gap: 8,
            paddingTop: 8,
            borderTop: '1px solid rgba(255,255,255,0.05)',
            fontSize: 10.5,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <span style={{ color: 'rgba(255,255,255,0.45)' }}>{row.tradesLabel} </span>
            <span style={{ color: '#fff', fontWeight: 600 }}>{row.trades}</span>
          </div>
          {row.showRecentForm ? (
            <div
              style={{
                minWidth: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 7,
              }}
            >
              <span
                title="All-time resolved win rate"
                style={{ color: allTimeWinRateColor, fontWeight: 700, flexShrink: 0 }}
              >
                {row.profitLoading ? '--' : row.allTimeWinRate}
              </span>
              <LeaderboardRecentFormChips results={row.recentResults} loading={row.profitLoading} />
            </div>
          ) : (
            <div style={{ minWidth: 0, textAlign: 'right' }}>
              <span style={{ color: 'rgba(255,255,255,0.45)' }}>Avg </span>
              <span style={{ color: '#22d3a5', fontWeight: 600 }}>{row.avgTrade}</span>
            </div>
          )}
        </div>
      </div>

    </div>
  );

  if (!row.href) return content;
  return (
    <a href={row.href} style={{ display: 'block', color: 'inherit', textDecoration: 'none' }}>
      {content}
    </a>
  );
}

function LeaderboardRecentFormChips({ results, loading = false }) {
  const paddedResults = [...(Array.isArray(results) ? results.slice(0, 5) : [])];
  while (paddedResults.length < 5) paddedResults.push(null);

  return (
    <div
      aria-label="Recent form"
      style={{ display: 'inline-flex', gap: 3, alignItems: 'center', justifyContent: 'flex-end' }}
    >
      {paddedResults.map((result, index) => {
        const isWin = result === 'W';
        const isLoss = result === 'L';
        return (
          <span
            key={`${result || 'empty'}-${index}`}
            title={loading ? 'Loading result' : isWin ? 'Win' : isLoss ? 'Loss' : 'No resolved trade'}
            style={{
              width: 10,
              height: 14,
              borderRadius: 3,
              background: loading
                ? 'rgba(255,255,255,0.08)'
                : isWin
                  ? 'rgba(94,231,173,0.42)'
                  : isLoss
                    ? 'rgba(244,139,160,0.34)'
                    : 'rgba(255,255,255,0.06)',
            }}
          />
        );
      })}
    </div>
  );
}

function TradeDetailPage({ tradeId }) {
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    window.matchMedia('(max-width: 1020px)').matches
  );
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1020px)');
    const sync = (event) => setIsMobileViewport(event.matches);
    setIsMobileViewport(media.matches);
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadTrade() {
      setLoading(true);
      setError('');
      try {
        const data = await fetchJson(`/v1/whales/${encodeURIComponent(tradeId)}/detail`, {
          signal: controller.signal,
        });
        setDetail(normalizeTradeDetailPayload(data));
      } catch (err) {
        if (err.name === 'AbortError') return;

        const fallback = readCachedTrade(tradeId) ?? (await findRecentTradeById(tradeId, controller.signal));
        if (fallback) {
          setDetail(normalizeTradeDetailPayload(fallback));
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

  const retry = () => setRefreshNonce((value) => value + 1);

  if (isMobileViewport) {
    return (
      <MobileTradeDetailScreen
        detail={detail}
        loading={loading}
        error={error}
        onRetry={retry}
      />
    );
  }

  return (
    <div className="feed-shell detail-shell no-rail-shell">
      <FeedSidebar activePage="detail" liveState="live" />

      <main className="feed-main detail-main">
        {loading ? (
          <DetailSkeleton title="Loading trade" />
        ) : error || !detail?.trade ? (
          <EmptyState
            title="Trade unavailable"
            body={error || 'This trade could not be found.'}
            actionLabel="Try again"
            onAction={retry}
          />
        ) : (
          <TradeDetailRedesign detail={detail} />
        )}
      </main>
    </div>
  );
}

function MobileTradeDetailScreen({ detail, loading, error, onRetry }) {
  const handleTabChange = (tab) => {
    if (tab === 'feed') window.location.href = '/';
    if (tab === 'leaders') window.location.href = '/leaderboard';
    if (tab === 'following') window.location.href = '/profile/following';
    if (tab === 'alerts') window.location.href = '/alerts';
  };

  return (
    <div className="trade-detail-mobile-screen">
      <div className="trade-detail-mobile-content">
        <a className="trade-detail-back" href="/">
          <ArrowLeft size={12} aria-hidden="true" />
          Back
        </a>

        {loading ? (
          <DetailSkeleton title="Loading trade" />
        ) : error || !detail?.trade ? (
          <EmptyState
            title="Trade unavailable"
            body={error || 'This trade could not be found.'}
            actionLabel="Try again"
            onAction={onRetry}
          />
        ) : (
          <MobileTradeDetailContent detail={detail} />
        )}
      </div>
      <MobileBottomNav activeTab="feed" onTabChange={handleTabChange} />
    </div>
  );
}

function MobileTradeDetailContent({ detail }) {
  const trade = detail.trade;
  const market = detail.market || trade.market || {};
  const trader = detail.trader || trade.trader || {};
  const scenario = detail.scenario || buildClientTradeScenario(trade);
  const relatedTrades = Array.isArray(detail.relatedTrades) && detail.relatedTrades.length
    ? detail.relatedTrades
    : [trade];
  const recentTrades = Array.isArray(trader.recentTrades) ? trader.recentTrades : [];

  return (
    <>
      <TradeHeroDetailCard trade={trade} scenario={scenario} />
      <TradeMarketDetailCard trade={trade} market={market} />
      <TradeTraderDetailCard trade={trade} trader={trader} />
      <RelatedTradesDetailCard
        trades={relatedTrades}
        currentTradeId={trade.id}
      />
      <TraderRecentDetailCard trades={recentTrades} />
      <TradeOnChainDetailCard trade={trade} onChain={detail.onChain} />
    </>
  );
}

function TradeDetailRedesign({ detail }) {
  const trade = detail.trade;
  const market = detail.market || trade.market || {};
  const trader = detail.trader || trade.trader || {};
  const scenario = detail.scenario || buildClientTradeScenario(trade);
  const relatedTrades = Array.isArray(detail.relatedTrades) && detail.relatedTrades.length
    ? detail.relatedTrades
    : [trade];
  const recentTrades = Array.isArray(trader.recentTrades) ? trader.recentTrades : [];

  return (
    <section className="trade-detail-redesign">
      <a className="trade-detail-back" href="/">
        <ArrowLeft size={13} aria-hidden="true" />
        Back to feed
      </a>

      <div className="trade-detail-layout">
        <div className="trade-detail-main-column">
          <TradeHeroDetailCard trade={trade} scenario={scenario} />
          <TradeMarketDetailCard trade={trade} market={market} />
          <RelatedTradesDetailCard
            trades={relatedTrades}
            currentTradeId={trade.id}
          />
        </div>

        <aside className="trade-detail-side-column">
          <TradeTraderDetailCard trade={trade} trader={trader} />
          <TraderRecentDetailCard trades={recentTrades} />
          <TradeOnChainDetailCard trade={trade} onChain={detail.onChain} />
        </aside>
      </div>
    </section>
  );
}

function TradeHeroDetailCard({ trade, scenario }) {
  const isSell = trade.side === 'SELL';

  return (
    <section className="trade-hero-card-redesign trade-detail-card-hero">
      <div className="trade-detail-meta-line">
        <span className={`trade-detail-side-pill ${isSell ? 'sell' : 'buy'}`}>{trade.side}</span>
        <span>{relativeTimeAgo(trade.timestamp)} - {formatDateTimeSeconds(trade.timestamp)}</span>
      </div>

      <div className="trade-detail-headline">
        <strong>{formatUsdFull(trade.usdSize)}</strong>
        <span>
          @ <b>{formatPrice(trade)}</b>
        </span>
      </div>

      <div className="trade-detail-subline">
        <strong>{formatShares(trade.shares)}</strong> shares
        <span>{formatTierLabel(trade.tier)}</span>
      </div>

      <TradeResolutionDetailStrip trade={trade} />

      <div className="trade-scenario-grid">
        <ScenarioDetailCell
          label={scenario.payoutLabel}
          value={formatScenarioValue(scenario.payoutIfWin, scenario.mode === 'sell' ? 'money' : 'money')}
          delta={scenario.payoutDelta}
          tone="accent"
        />
        <ScenarioDetailCell
          label={scenario.lossLabel}
          value={scenario.mode === 'sell' ? formatShares(scenario.lossIfLose) : `-${formatUsdFull(scenario.lossIfLose)}`}
          delta={scenario.lossDelta || 'Reduced exposure'}
          tone="muted"
        />
        <ScenarioDetailCell
          label={scenario.probabilityLabel || 'IMPLIED PROBABILITY'}
          value={`${trimNumber(scenario.impliedProbability)}%`}
          delta={scenario.probabilityDelta || 'From execution price'}
          tone="neutral"
        />
      </div>
    </section>
  );
}

function ScenarioDetailCell({ label, value, delta, tone }) {
  return (
    <div className="trade-scenario-cell">
      <span>{label}</span>
      <strong className={tone}>{value}</strong>
      <small className={tone}>{delta}</small>
    </div>
  );
}

function TradeResolutionDetailStrip({ trade }) {
  const resolution = getTradeResolutionBlock(trade);
  if (!isTradeMarketClosed(trade)) return null;

  const outcome = getTraderOutcomeMeta(trade);
  const pnl = Number(resolution?.pnlUsd);
  const hasPnl = Number.isFinite(pnl);
  const pnlTone = hasPnl ? (pnl >= 0 ? 'accent' : 'loss') : 'muted';

  return (
    <div className="trade-resolution-strip">
      <div>
        <span>Resolution</span>
        <strong>{getMarketStatusMeta(trade).label}</strong>
      </div>
      <div>
        <span>Trader result</span>
        <strong className={outcome.tone}>{outcome.label}</strong>
      </div>
      <div>
        <span>Winner</span>
        <strong>{resolution?.winningOutcome || '--'}</strong>
      </div>
      <div>
        <span>P/L</span>
        <strong className={pnlTone}>{hasPnl ? formatSignedUsd(pnl) : '--'}</strong>
      </div>
    </div>
  );
}

function TradeMarketDetailCard({ trade, market }) {
  const marketTrade = { ...trade, market: { ...(trade.market || {}), ...(market || {}) } };
  const executionPrice = getPriceValue(trade);
  const outcome = String(trade.outcome || '').toUpperCase();
  const fallbackYesPrice = outcome === 'YES' ? executionPrice : Math.max(0, 100 - executionPrice);
  const fallbackNoPrice = outcome === 'NO' ? executionPrice : Math.max(0, 100 - executionPrice);
  const yesPrice = Number(market.yesPriceCents ?? trade.market?.yesPriceCents ?? fallbackYesPrice);
  const noPrice = Number(market.noPriceCents ?? trade.market?.noPriceCents ?? fallbackNoPrice);
  const polymarketUrl = market.polymarketUrl || trade.polymarketUrl || trade.market?.polymarketUrl || '#';
  const marketHref = buildMarketHref(marketTrade);
  const marketIdentity = (
    <>
      <MarketIcon trade={marketTrade} category={inferCategory(marketTrade)} />
      <div>
        <strong>{market.title || trade.market?.title || 'Unknown market'}</strong>
        <span>{inferCategory(marketTrade).label} - {trade.outcome || 'Outcome'}</span>
      </div>
    </>
  );

  return (
    <section className="trade-detail-panel-card trade-detail-card-market">
      <div className="trade-detail-section-head">
        <span>Market</span>
        <a href={polymarketUrl} target="_blank" rel="noreferrer">
          View on Polymarket
          <ExternalLink size={12} aria-hidden="true" />
        </a>
      </div>

      {marketHref ? (
        <a className="trade-market-identity trade-market-identity-link" href={marketHref}>
          {marketIdentity}
        </a>
      ) : (
        <div className="trade-market-identity">{marketIdentity}</div>
      )}

      <div className="trade-outcome-grid">
        <OutcomeDetailCard
          label="YES"
          price={yesPrice}
          tone="yes"
        />
        <OutcomeDetailCard
          label="NO"
          price={noPrice}
          tone="no"
        />
      </div>
    </section>
  );
}

function OutcomeDetailCard({ label, price, tone }) {
  return (
    <div className={`trade-outcome-card ${tone || ''}`}>
      <span>{label}</span>
      <div>
        <strong>{trimNumber(Number(price || 0))}c</strong>
      </div>
    </div>
  );
}

function RelatedTradesDetailCard({ trades, currentTradeId }) {
  const [expanded, setExpanded] = useState(false);
  const otherCount = trades.filter((trade) => trade.id !== currentTradeId).length;
  const initialLimit = 4;
  const hasMore = trades.length > initialLimit;
  const visibleTrades = expanded ? trades : trades.slice(0, initialLimit);
  return (
    <section className="trade-detail-panel-card trade-detail-card-related">
      <div className="trade-detail-section-head no-action">
        <span>Related trades on this market</span>
        <small>{otherCount} other whale trades today</small>
      </div>

      <div className="related-trades-list">
        {visibleTrades.map((trade) => (
          <RelatedTradeDetailRow
            key={trade.id}
            trade={trade}
            isCurrent={trade.id === currentTradeId}
          />
        ))}
      </div>

      {hasMore ? (
        <button
          className="trade-detail-wide-button"
          type="button"
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? 'Show fewer trades' : `View all ${trades.length} trades`}
        </button>
      ) : null}
    </section>
  );
}

function RelatedTradeDetailRow({ trade, isCurrent }) {
  const href = `/trade/${encodeURIComponent(trade.id)}`;
  const traderHref = trade.trader?.proxyWallet
    ? `/trader/${encodeURIComponent(trade.trader.proxyWallet)}`
    : null;
  const openTrade = () => {
    cacheTrade(trade);
    window.location.href = href;
  };
  const openTrader = (event) => {
    event.stopPropagation();
    if (traderHref) window.location.href = traderHref;
  };
  return (
    <div
      className={`related-trade-row ${isCurrent ? 'current' : ''}`}
      role="link"
      tabIndex={0}
      onClick={openTrade}
      onKeyDown={(event) => {
        if (event.key === 'Enter') openTrade();
      }}
    >
      <span className={`trade-detail-side-pill ${trade.side === 'SELL' ? 'sell' : 'buy'}`}>{trade.side}</span>
      <div
        className={`related-trader ${traderHref ? '' : 'disabled'}`}
        role={traderHref ? 'link' : undefined}
        tabIndex={traderHref ? 0 : undefined}
        onClick={traderHref ? openTrader : undefined}
        onKeyDown={(event) => {
          if (traderHref && event.key === 'Enter') openTrader(event);
        }}
      >
        <span style={{ background: avatarGradient(trade.trader?.proxyWallet || trade.id) }} />
        <strong>{shortWallet(trade.trader?.proxyWallet) || 'Unknown'}</strong>
        {isCurrent ? <em>THIS</em> : null}
      </div>
      <b>{formatUsdFull(trade.usdSize)}</b>
      <small>
        {formatPrice(trade)} {trade.outcome || ''}
      </small>
      <time>{relativeTimeAgo(trade.timestamp)}</time>
    </div>
  );
}

function TradeTraderDetailCard({ trade, trader }) {
  const wallet = trader.proxyWallet || trade.trader?.proxyWallet;
  const traderHref = wallet ? `/trader/${encodeURIComponent(wallet)}` : null;
  return (
    <section className="trade-detail-panel-card side-card trade-detail-card-trader">
      <div className="trade-detail-section-head no-action">
        <span>Trader</span>
      </div>

      <div className="trade-detail-trader-head">
        <TraderAvatar trade={{ ...trade, trader }} />
        <div>
          <strong>{formatTraderLabel(trader.displayName || trader.pseudonym, wallet)}</strong>
          <span title={wallet}>{shortWallet(wallet) || 'Public wallet'}</span>
        </div>
      </div>

      <div className="trader-detail-stat-grid">
        <TradeTraderStat label="1D Volume" value={formatUsdCompact(trader.volume1d || 0)} accent />
        <TradeTraderStat label="1D Rank" value={trader.rank1d ? `#${trader.rank1d}` : '--'} />
        <TradeTraderStat label="Today Trades" value={formatNumber(trader.tradeCount1d || 0)} />
        <TradeTraderStat label="Wallet" value={shortWallet(wallet) || '--'} />
      </div>

      {wallet ? (
        <div className="trade-detail-action-row">
          <FollowWalletButton wallet={wallet} variant="wide" />
          {traderHref ? <a className="trade-detail-profile-button" href={traderHref}>View profile</a> : null}
        </div>
      ) : null}
    </section>
  );
}

function TradeTraderStat({ label, value, accent = false }) {
  return (
    <div className="trade-trader-stat">
      <span>{label}</span>
      <strong className={accent ? 'accent' : ''}>{value}</strong>
    </div>
  );
}

function TraderRecentDetailCard({ trades = [] }) {
  return (
    <section className="trade-detail-panel-card side-card trade-detail-card-recent">
      <div className="trade-detail-section-head no-action">
        <span>Trader's recent</span>
      </div>
      <div className="trader-recent-list">
        {trades.length ? trades.map((trade) => (
          <a key={trade.id} href={`/trade/${encodeURIComponent(trade.id)}`}>
            <div>
              <strong>{trade.market?.title || 'Unknown market'}</strong>
              <span>{relativeTimeAgo(trade.timestamp)} - {trade.side} {trade.outcome || ''}</span>
            </div>
            <small>
              <b>{formatUsdCompact(trade.usdSize)}</b>
              @{formatPrice(trade)}
            </small>
          </a>
        )) : <p className="trade-detail-muted">No recent trades available.</p>}
      </div>
    </section>
  );
}

function TradeOnChainDetailCard({ trade, onChain }) {
  const txHash = onChain?.transactionHash || trade.transactionHash;
  const explorer = onChain?.explorerUrl || (txHash ? `https://polygonscan.com/tx/${txHash}` : null);
  return (
    <section className="trade-detail-panel-card side-card trade-detail-card-onchain">
      <div className="trade-detail-section-head no-action">
        <span>On-chain</span>
      </div>

      <div className="onchain-detail-rows">
        <OnChainDetailRow label="Trade ID" value={trade.id} />
        <OnChainDetailRow
          label="Transaction"
          value={shortHash(txHash)}
          href={explorer}
        />
        <OnChainDetailRow label="Tier" value={formatTierLabel(trade.tier)} />
      </div>
    </section>
  );
}

function OnChainDetailRow({ label, value, href }) {
  return (
    <div className="onchain-detail-row">
      <span>{label}</span>
      {href ? (
        <a href={href} target="_blank" rel="noreferrer">
          {value || 'Unavailable'}
          <ExternalLink size={10} aria-hidden="true" />
        </a>
      ) : (
        <strong>{value || 'Unavailable'}</strong>
      )}
    </div>
  );
}

function TraderProfilePage({ wallet }) {
  const normalizedWallet = wallet.toLowerCase();
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    window.matchMedia('(max-width: 1020px)').matches
  );
  const [profile, setProfile] = useState(null);
  const [historyTrades, setHistoryTrades] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [windowId, setWindowId] = useState(() => {
    const queryWindow = new URLSearchParams(window.location.search).get('window');
    return leaderboardWindows.some((option) => option.id === queryWindow) ? queryWindow : '7d';
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1020px)');
    const sync = (event) => setIsMobileViewport(event.matches);
    setIsMobileViewport(media.matches);
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

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

  useEffect(() => {
    const controller = new AbortController();

    async function loadTraderHistory() {
      setHistoryLoading(true);
      setHistoryTrades([]);
      try {
        const trades = await fetchTraderHistory(normalizedWallet, { signal: controller.signal });
        setHistoryTrades(trades);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setHistoryTrades([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setHistoryLoading(false);
        }
      }
    }

    loadTraderHistory();
    return () => controller.abort();
  }, [normalizedWallet, refreshNonce]);

  const stats = profile ? getProfileStats(profile, windowId) : emptyProfileStats();
  const profileWallet = profile?.proxyWallet || normalizedWallet;
  const retry = () => setRefreshNonce((value) => value + 1);

  if (isMobileViewport) {
    return (
      <MobileWalletProfileScreen
        profile={profile}
        wallet={profileWallet}
        stats={stats}
        historyTrades={historyTrades}
        historyLoading={historyLoading}
        windowId={windowId}
        onWindowChange={setWindowId}
        loading={loading}
        error={error}
        onRetry={retry}
      />
    );
  }

  return (
    <div className="feed-shell detail-shell no-rail-shell">
      <FeedSidebar activePage="detail" liveState="live" />

      <main className="feed-main detail-main trader-profile-main wallet-profile-main">
        {loading ? (
          <DetailSkeleton title="Loading trader" />
        ) : error || !profile ? (
          <EmptyState
            title="Trader unavailable"
            body={error || 'This trader could not be found.'}
            actionLabel="Try again"
            onAction={retry}
          />
        ) : (
          <WalletProfileRedesign
            profile={profile}
            wallet={profileWallet}
            stats={stats}
            historyTrades={historyTrades}
            historyLoading={historyLoading}
            windowId={windowId}
            onWindowChange={setWindowId}
            onRefresh={retry}
          />
        )}
      </main>
    </div>
  );
}

function MobileWalletProfileScreen({
  profile,
  wallet,
  stats,
  historyTrades,
  historyLoading,
  windowId,
  onWindowChange,
  loading,
  error,
  onRetry,
}) {
  const handleTabChange = (tab) => {
    if (tab === 'leaders') window.location.href = '/leaderboard';
    if (tab === 'feed') window.location.href = '/';
    if (tab === 'following') window.location.href = '/profile/following';
    if (tab === 'alerts') window.location.href = '/alerts';
  };

  return (
    <div className="wallet-profile-mobile-screen">
      <div className="wallet-profile-mobile-content">
        {loading ? (
          <DetailSkeleton title="Loading trader" />
        ) : error || !profile ? (
          <EmptyState
            title="Trader unavailable"
            body={error || 'This trader could not be found.'}
            actionLabel="Try again"
            onAction={onRetry}
          />
        ) : (
          <MobileWalletProfileView
            profile={profile}
            wallet={wallet}
            stats={stats}
            historyTrades={historyTrades}
            historyLoading={historyLoading}
            windowId={windowId}
            onWindowChange={onWindowChange}
            onRefresh={onRetry}
            mobile
          />
        )}
      </div>
      <MobileBottomNav activeTab="feed" onTabChange={handleTabChange} />
    </div>
  );
}

function MobileWalletProfileView({
  profile,
  wallet,
  stats,
  historyTrades = [],
  historyLoading = false,
  windowId,
  onWindowChange,
  onRefresh,
}) {
  const dailyVolume = buildWalletDailyVolume(profile.dailyVolume || []);
  const volumeMix = buildWalletVolumeMix(stats);
  const profileTrades = buildWalletProfileTrades(profile, historyTrades);
  const performance = buildWalletPerformance(profile, profileTrades, windowId, stats);
  const profitSummary = buildWalletProfitSummary(profile, profileTrades);
  const recentResults = performance.recentResults.slice(0, 10);
  const rank = profile.rankBadge?.rank;

  return (
    <section className="wallet-mobile-profile-page">
      <header className="wallet-mobile-header">
        <a className="wallet-mobile-back" href="/leaderboard">
          <ArrowLeft size={15} aria-hidden="true" />
          Back
        </a>
        <span>Trader profile</span>
      </header>

      <section className="wallet-mobile-hero">
        <div className="wallet-mobile-identity-row">
          <ProfileAvatar profile={profile} />
          <div className="wallet-mobile-identity-copy">
            <span>Public wallet</span>
            <strong title={wallet}>{shortWallet(wallet)}</strong>
          </div>
          <div className="wallet-mobile-rank">
            <span>Rank</span>
            <strong>{rank ? `#${rank}` : '--'}</strong>
          </div>
        </div>

        <div className="wallet-mobile-actions">
          <WalletProfitBadge summary={profitSummary} compact />
          <FollowWalletButton wallet={wallet} variant="wide" />
          <MobileWalletCopyButton address={wallet} />
        </div>
      </section>

      <WalletWindowToggle
        windowId={windowId}
        onWindowChange={onWindowChange}
        className="wallet-mobile-window-toggle"
      />

      <section className="wallet-mobile-performance-card">
        <div className="wallet-mobile-performance-head">
          <div>
            <span>Previous win rate</span>
            <div className="wallet-mobile-win-rate">
              <strong className={performance.winRatePct == null ? 'muted' : ''}>{performance.winRateLabel}</strong>
              <small>{formatNumber(performance.tradeCount)} trades</small>
            </div>
          </div>
          <div className="wallet-mobile-streak">
            <span>Longest win streak</span>
            <strong>
              {formatNumber(performance.longestWinStreak)}
              <Flame size={12} aria-hidden="true" />
            </strong>
          </div>
        </div>

        <div className="wallet-mobile-result-label">
          Recent results{historyLoading && !performance.historyCount ? ' - syncing' : ''}
        </div>
        <MobileWalletResultCells results={recentResults} />
      </section>

      <WalletProfileStatCards stats={stats} />
      <div className="wallet-mobile-charts">
        <WalletDailyVolumeCard dailyVolume={dailyVolume} />
        <WalletVolumeMixCard mix={volumeMix} />
      </div>
      <WalletRecentTradesTable key={`${wallet}-mobile-recent`} trades={profileTrades} onRefresh={onRefresh} />
    </section>
  );
}

function MobileWalletCopyButton({ address }) {
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
    <button
      type="button"
      className="wallet-mobile-copy-button"
      onClick={copyAddress}
      aria-label={copied ? 'Wallet address copied' : 'Copy wallet address'}
      title={copied ? 'Copied' : address}
    >
      {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
    </button>
  );
}

function MobileWalletResultCells({ results }) {
  if (!results.length) {
    return <div className="wallet-mobile-result-empty">No resolved trades</div>;
  }

  return (
    <div className="wallet-mobile-result-row">
      {results.map((result, index) => (
        <span
          key={`${result}-${index}`}
          className={`wallet-mobile-result-cell ${result === 'W' ? 'win' : 'loss'}`}
        >
          {result}
        </span>
      ))}
    </div>
  );
}

function WalletProfileRedesign({
  profile,
  wallet,
  stats,
  historyTrades = [],
  historyLoading = false,
  windowId,
  onWindowChange,
  onRefresh,
  mobile = false,
}) {
  const dailyVolume = buildWalletDailyVolume(profile.dailyVolume || []);
  const volumeMix = buildWalletVolumeMix(stats);
  const profileTrades = buildWalletProfileTrades(profile, historyTrades);
  const performance = buildWalletPerformance(profile, profileTrades, windowId, stats);
  const profitSummary = buildWalletProfitSummary(profile, profileTrades);

  return (
    <section className={`wallet-profile-page ${mobile ? 'mobile' : ''}`}>
      <a className="trade-detail-back wallet-profile-back" href="/leaderboard">
        <ArrowLeft size={13} aria-hidden="true" />
        {mobile ? 'Back' : 'Back to leaderboard'}
      </a>

      <WalletProfileHero profile={profile} wallet={wallet} windowId={windowId} profitSummary={profitSummary} />
      <WalletProfilePerformanceBlock
        performance={performance}
        windowId={windowId}
        onWindowChange={onWindowChange}
        historyLoading={historyLoading}
      />
      <WalletProfileStatCards stats={stats} />
      <div className="wallet-profile-charts">
        <WalletDailyVolumeCard dailyVolume={dailyVolume} />
        <WalletVolumeMixCard mix={volumeMix} />
      </div>
      <WalletRecentTradesTable key={wallet} trades={profileTrades} onRefresh={onRefresh} />
    </section>
  );
}

function WalletProfileHero({ profile, wallet, windowId, profitSummary }) {
  const rank = profile.rankBadge?.rank;
  const rankWindow = String(profile.rankBadge?.window || windowId).toUpperCase();

  return (
    <section className="wallet-profile-hero">
      <ProfileAvatar profile={profile} />
      <div className="wallet-profile-identity">
        <div className="wallet-profile-kicker">
          <Wallet size={12} aria-hidden="true" />
          <span>Trader profile - public wallet</span>
        </div>
        <div className="wallet-profile-title-row">
          <h1 title={wallet}>{shortWallet(wallet)}</h1>
          <WalletAddressCopyButton address={wallet} />
        </div>
        <div className="wallet-profile-address-line" title={wallet}>{wallet}</div>
        <div className="wallet-profile-first-seen">
          First seen <span>{profile.firstSeen ? formatDateShort(profile.firstSeen) : 'Unknown'}</span>
        </div>
      </div>
      <div className="wallet-profile-actions">
        <div className="wallet-rank-badge">
          <span>Rank {rankWindow}</span>
          <strong>{rank ? `#${rank}` : '--'}</strong>
        </div>
        <WalletProfitBadge summary={profitSummary} />
        <FollowWalletButton wallet={wallet} variant="wide" />
      </div>
    </section>
  );
}

function WalletProfitBadge({ summary, compact = false }) {
  const value = Number(summary?.value || 0);
  const hasValue = Boolean(summary?.hasValue);
  const tone = !hasValue ? 'muted' : value < 0 ? 'loss' : 'profit';
  const firstTradeLabel = summary?.firstTradeAt ? formatDateShort(summary.firstTradeAt) : 'first tracked trade';

  return (
    <div
      className={`wallet-profit-badge ${tone} ${compact ? 'compact' : ''}`}
      title={`Realized P/L since ${firstTradeLabel}`}
    >
      <span>Profit</span>
      <strong>{hasValue ? formatSignedUsdCompact(value) : '--'}</strong>
    </div>
  );
}

function WalletAddressCopyButton({ address }) {
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
    <button
      type="button"
      className="wallet-copy-button"
      onClick={copyAddress}
      title={copied ? 'Copied' : address}
    >
      {copied ? <Check size={11} aria-hidden="true" /> : <Copy size={11} aria-hidden="true" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function WalletProfileStatCards({ stats }) {
  return (
    <section className="wallet-stat-grid">
      <WalletStatCard label="Whale Volume" value={formatUsdCompact(stats.volume)} />
      <WalletStatCard label="Whale Trades" value={formatNumber(stats.whaleCount || stats.tradeCount)} />
      <WalletStatCard label="Buy Volume" value={formatUsdCompact(stats.buyVolume)} variant="buy" />
      <WalletStatCard label="Sell Volume" value={formatUsdCompact(stats.sellVolume)} variant="sell" />
    </section>
  );
}

function WalletStatCard({ label, value, variant = 'default' }) {
  const isZeroSell = variant === 'sell' && (String(value) === '$0' || String(value) === '0');
  return (
    <div className={`wallet-stat-card ${variant} ${isZeroSell ? 'muted' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function WalletDailyVolumeCard({ dailyVolume }) {
  return (
    <section className="wallet-panel wallet-daily-panel">
      <div className="wallet-panel-heading">
        <div>
          <span>Daily Whale Volume</span>
          <strong>{dailyVolume.avg}</strong>
        </div>
        <small>avg over {dailyVolume.days.length} tracked days</small>
      </div>
      <WalletDailyVolumeChart days={dailyVolume.days} />
    </section>
  );
}

function WalletDailyVolumeChart({ days }) {
  const chartDays = days.length ? days : [{ date: 'No data', volume: 0, label: '' }];
  const max = Math.max(...chartDays.map((day) => Number(day.volume || 0)), 1);
  const width = 600;
  const height = 106;
  const baseY = 82;
  const slot = width / chartDays.length;
  const barWidth = Math.min(64, Math.max(18, slot * 0.46));

  return (
    <svg className="wallet-daily-chart" width="100%" height="106" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <line x1="0" y1={baseY} x2={width} y2={baseY} stroke="rgba(255,255,255,0.07)" />
      {chartDays.map((day, index) => {
        const volume = Number(day.volume || 0);
        const barHeight = volume > 0 ? (volume / max) * 66 + 12 : 3;
        const x = index * slot + slot / 2 - barWidth / 2;
        const y = baseY - barHeight;
        return (
          <g key={`${day.date || day.label}-${index}`}>
            <rect x={x} y={y} width={barWidth} height={barHeight} rx="3" fill="#22d3a5" opacity={index === chartDays.length - 1 ? 1 : 0.82} />
            <text x={index * slot + slot / 2} y="101" textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.42)">
              {day.label || formatDailyLabel(day.date)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function WalletVolumeMixCard({ mix }) {
  return (
    <section className="wallet-panel wallet-mix-panel">
      <div className="wallet-panel-heading compact">
        <span>Volume Mix</span>
      </div>
      <div className="wallet-mix-track" aria-hidden="true">
        <span className="buy" style={{ width: `${mix.buyPct}%` }} />
        <span className="sell" style={{ width: `${mix.sellPct}%` }} />
      </div>
      <div className="wallet-mix-legend">
        <span><i className="buy" /> Buy <b>{trimNumber(mix.buyPct)}%</b></span>
        <span><i className="sell" /> Sell <b>{trimNumber(mix.sellPct)}%</b></span>
      </div>
      <div className="wallet-mix-breakdown">
        <WalletBreakdownRow label="Buy volume" value={formatUsdFull(mix.buyVolume)} tone="buy" />
        <WalletBreakdownRow label="Sell volume" value={formatUsdFull(mix.sellVolume)} tone="sell" muted={!mix.sellVolume} />
        <WalletBreakdownRow label="Total trades" value={formatNumber(mix.totalTrades)} />
      </div>
    </section>
  );
}

function WalletBreakdownRow({ label, value, tone = '', muted = false }) {
  return (
    <div className="wallet-breakdown-row">
      <span>{label}</span>
      <strong className={`${tone} ${muted ? 'muted' : ''}`}>{value}</strong>
    </div>
  );
}

function WalletRecentTradesTable({ trades = [], onRefresh }) {
  const tradeItems = Array.isArray(trades) ? trades : [];
  const totalTrades = tradeItems.length;
  const pageCount = Math.max(1, Math.ceil(totalTrades / walletRecentTradesPageSize));
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage((page) => Math.min(Math.max(page, 1), pageCount));
  }, [pageCount]);

  const pageStart = (currentPage - 1) * walletRecentTradesPageSize;
  const visibleTrades = tradeItems.slice(pageStart, pageStart + walletRecentTradesPageSize);
  const pageEnd = Math.min(pageStart + visibleTrades.length, totalTrades);
  const hasPagination = totalTrades > walletRecentTradesPageSize;

  return (
    <section className="wallet-recent-table">
      <div className="wallet-recent-heading">
        <div>
          <h2>Recent whale trades</h2>
          <p>Latest feed-visible trades from this wallet</p>
        </div>
        <span>{formatNumber(totalTrades)} trades</span>
      </div>
      {totalTrades ? (
        <>
          <div className="wallet-recent-header">
            <span>Side</span>
            <span>Market</span>
            <span>Size</span>
            <span>Price</span>
            <span>When</span>
          </div>
          {visibleTrades.map((trade, index) => (
            <WalletRecentTradeRow
              key={trade.id || `${currentPage}-${index}`}
              trade={trade}
              isLast={index === visibleTrades.length - 1}
            />
          ))}
          {hasPagination ? (
            <WalletRecentTradesPagination
              currentPage={currentPage}
              pageCount={pageCount}
              firstItem={pageStart + 1}
              lastItem={pageEnd}
              totalItems={totalTrades}
              onPageChange={setCurrentPage}
            />
          ) : null}
        </>
      ) : (
        <EmptyState
          title="No recent whale trades"
          body="This wallet has no visible recent whale trades in the current API response."
          actionLabel="Refresh"
          onAction={onRefresh}
        />
      )}
    </section>
  );
}

function WalletRecentTradesPagination({
  currentPage,
  pageCount,
  firstItem,
  lastItem,
  totalItems,
  onPageChange,
}) {
  const pages = buildCompactPagination(currentPage, pageCount);
  const goToPage = (page) => {
    onPageChange(Math.min(Math.max(page, 1), pageCount));
  };

  return (
    <nav className="wallet-recent-pagination" aria-label="Recent whale trades pages">
      <span className="wallet-recent-page-range">
        Showing {formatNumber(firstItem)}-{formatNumber(lastItem)} of {formatNumber(totalItems)}
      </span>
      <div className="wallet-recent-page-controls">
        <button
          type="button"
          className="wallet-page-button icon"
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Previous recent trades page"
        >
          <ChevronLeft size={14} aria-hidden="true" />
        </button>
        {pages.map((page) => (
          typeof page === 'number' ? (
            <button
              key={page}
              type="button"
              className={`wallet-page-button ${page === currentPage ? 'active' : ''}`}
              onClick={() => goToPage(page)}
              aria-current={page === currentPage ? 'page' : undefined}
            >
              {page}
            </button>
          ) : (
            <span key={page} className="wallet-page-ellipsis" aria-hidden="true">...</span>
          )
        ))}
        <button
          type="button"
          className="wallet-page-button icon"
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage >= pageCount}
          aria-label="Next recent trades page"
        >
          <ChevronRight size={14} aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}

function WalletRecentTradeRow({ trade, isLast }) {
  const category = inferCategory(trade);
  const isSell = trade.side === 'SELL';
  const tradeHref = `/trade/${encodeURIComponent(trade.id)}`;
  const openTrade = () => {
    cacheTrade(trade);
    window.location.href = tradeHref;
  };

  return (
    <div
      className={`wallet-recent-row ${isLast ? 'last' : ''}`}
      role="link"
      tabIndex={0}
      onClick={openTrade}
      onKeyDown={(event) => {
        if (event.key === 'Enter') openTrade();
      }}
    >
      <span className={`wallet-side-pill ${isSell ? 'sell' : 'buy'}`}>{trade.side === 'SELL' ? 'SELL' : 'BUY'}</span>
      <div className="wallet-recent-market">
        <MarketIcon trade={trade} category={category} />
        <div>
          <strong title={trade.market?.title || 'Unknown market'}>{trade.market?.title || 'Unknown market'}</strong>
          <span>{category.label} - {trade.outcome || 'Outcome'}</span>
          <TradeResolutionPills trade={trade} compact />
        </div>
      </div>
      <strong className="wallet-recent-size">{formatUsdFull(trade.usdSize)}</strong>
      <div className="wallet-recent-price">
        <strong>{formatPrice(trade)}</strong>
        <span>{trade.outcome || ''}</span>
      </div>
      <time>{relativeTimeAgo(trade.timestamp)}</time>
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
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    window.matchMedia('(max-width: 760px)').matches
  );
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

  useEffect(() => {
    const media = window.matchMedia('(max-width: 760px)');
    const sync = (event) => setIsMobileViewport(event.matches);
    setIsMobileViewport(media.matches);
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  if (isMobileViewport) {
    return (
      <div className="following-mobile-screen">
        <main className="following-mobile-main">
          <FollowingManagedList
            loading={loading}
            error={error}
            items={items}
            visibleItems={visibleItems}
            onClearSearch={() => setSearch('')}
          />
        </main>
        <MobileBottomNav
          activeTab="following"
          onTabChange={(tab) => {
            if (tab === 'following') return;
            if (tab === 'feed') window.location.href = '/';
            if (tab === 'leaders') window.location.href = '/leaderboard';
            if (tab === 'alerts') window.location.href = '/alerts';
          }}
        />
      </div>
    );
  }

  return (
    <div className="feed-shell detail-shell profile-shell no-rail-shell">
      <FeedSidebar activePage="following" liveState="live" />

      <main className="feed-main detail-main profile-main">
        <DetailBackBar href="/profile" label="Back to profile" />

        <section className="stats-strip detail-stats">
          <StatBlock label="Followed Traders" value={formatNumber(items.length)} />
          <StatBlock label="7D Followed Volume" value={formatUsdCompact(totalVolume)} />
          <StatBlock label="Latest Follow" value={items[0]?.followedAt ? relativeTime(items[0].followedAt) : '-'} />
          <StatBlock label="Feed Filter" value="Ready" />
        </section>

        <FollowingManagedList
          loading={loading}
          error={error}
          items={items}
          visibleItems={visibleItems}
          onClearSearch={() => setSearch('')}
        />
      </main>

    </div>
  );
}

function FollowingManagedList({ loading, error, items, visibleItems, onClearSearch }) {
  return (
    <section className="following-list-section" aria-live="polite">
      <div className="section-title-row">
        <div>
          <h2>Manage list</h2>
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
          onAction={onClearSearch}
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
  );
}

function AlertsPage() {
  const [prefs, setPrefs] = useState(() => readWebAlertPrefs());
  const [syncedPrefs, setSyncedPrefs] = useState(() => readWebAlertPrefs());
  const [savedAt, setSavedAt] = useState(null);
  const [status, setStatus] = useState(() => getInitialWebAlertStatus());
  const [actionMessage, setActionMessage] = useState('');
  const [isWorking, setIsWorking] = useState(false);
  const [showWebPushHelp, setShowWebPushHelp] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    window.matchMedia('(max-width: 760px)').matches
  );

  useEffect(() => {
    const media = window.matchMedia('(max-width: 760px)');
    const sync = (event) => setIsMobileViewport(event.matches);
    setIsMobileViewport(media.matches);
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!hasStoredAuth()) {
      setStatus(getInitialWebAlertStatus());
      return () => {
        cancelled = true;
      };
    }

    setStatus((current) => (current === 'missing-config' || current === 'unsupported' ? current : 'checking'));

    authFetchJson('/v1/alerts/me')
      .then((data) => {
        if (cancelled) return;
        const subscription = data?.subscription;
        if (!subscription) {
          setStatus(getInitialWebAlertStatus());
          return;
        }
        const nextPrefs = mergeServerAlertPrefs(prefs, subscription);
        setPrefs(nextPrefs);
        setSyncedPrefs(nextPrefs);
        writeStoredJson(alertPrefsStorageKey, nextPrefs);
        setStatus('active');
      })
      .catch((error) => {
        if (cancelled) return;
        if (error.status === 404) {
          setStatus(getInitialWebAlertStatus());
          return;
        }
        setStatus('error');
        setActionMessage(error.message || 'Could not load alert subscription.');
      });

    return () => {
      cancelled = true;
    };
    // The server hydration should run once per visit; local preference edits stay local until saved.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updatePrefs = (patch) => {
    setPrefs((current) => ({ ...current, ...patch }));
    setSavedAt(null);
    setActionMessage('');
  };

  const activateAlerts = async () => {
    setIsWorking(true);
    setActionMessage('');
    try {
      const token = await getFirebaseWebMessagingToken();
      const nextPrefs = {
        ...prefs,
        enabled: true,
        fcmToken: token,
        permission: 'granted',
        lastSyncedAt: Date.now(),
      };
      await saveWebAlertSubscription(nextPrefs, token);
      writeStoredJson(alertPrefsStorageKey, nextPrefs);
      notifyWebAlertsChanged();
      setPrefs(nextPrefs);
      setSyncedPrefs(nextPrefs);
      setStatus('active');
      setSavedAt(Date.now());
      setActionMessage('System alerts are active on this browser.');
    } catch (error) {
      const nextStatus = deriveWebAlertErrorStatus(error);
      setStatus(nextStatus);
      setActionMessage(error.message || 'Could not activate browser notifications.');
    } finally {
      setIsWorking(false);
    }
  };

  const savePrefs = async () => {
    setIsWorking(true);
    setActionMessage('');
    try {
      if (!prefs.fcmToken) {
        await activateAlerts();
        return;
      }
      const nextPrefs = {
        ...prefs,
        enabled: true,
        permission: getNotificationPermission(),
        lastSyncedAt: Date.now(),
      };
      await saveWebAlertSubscription(nextPrefs, prefs.fcmToken);
      writeStoredJson(alertPrefsStorageKey, nextPrefs);
      notifyWebAlertsChanged();
      setPrefs(nextPrefs);
      setSyncedPrefs(nextPrefs);
      setStatus('active');
      setSavedAt(Date.now());
      setActionMessage('Alert preferences updated.');
    } catch (error) {
      setStatus('error');
      setActionMessage(error.message || 'Could not save alert preferences.');
    } finally {
      setIsWorking(false);
    }
  };

  const turnOffAlerts = async () => {
    setIsWorking(true);
    setActionMessage('');
    try {
      await deleteWebAlertSubscription(prefs.fcmToken);
      await deleteFirebaseWebMessagingToken();
      const nextPrefs = {
        ...prefs,
        enabled: false,
        fcmToken: '',
        permission: getNotificationPermission(),
        lastSyncedAt: Date.now(),
      };
      writeStoredJson(alertPrefsStorageKey, nextPrefs);
      notifyWebAlertsChanged();
      setPrefs(nextPrefs);
      setSyncedPrefs(nextPrefs);
      setStatus(getInitialWebAlertStatus(nextPrefs));
      setSavedAt(Date.now());
      setActionMessage('Web alerts are turned off for this browser.');
    } catch (error) {
      setStatus('error');
      setActionMessage(error.message || 'Could not turn off web alerts.');
    } finally {
      setIsWorking(false);
    }
  };

  const resetPrefs = () => {
    setPrefs(syncedPrefs);
    setSavedAt(null);
    setActionMessage('Unsaved changes reset.');
  };

  const sendTestAlert = async () => {
    setActionMessage('');
    try {
      if (!isActive) {
        setActionMessage('Activate web alerts before sending a test notification.');
        return;
      }
      if (getNotificationPermission() !== 'granted') {
        setStatus(getNotificationPermission() === 'denied' ? 'blocked' : status);
        setActionMessage('Notification permission is not currently allowed.');
        return;
      }
      await authFetchJson('/v1/alerts/test', { method: 'POST' });
      showInAppWebAlertToast({
        title: 'Polywatch test alert',
        body: `Server accepted the test alert for trades over ${formatUsdFull(prefs.minUsd)}.`,
        url: '/alerts',
      });
      setActionMessage('Test alert sent through the server. If no toast appears, check Windows and browser notification settings.');
    } catch (error) {
      if (error.status === 404) {
        try {
          await showLocalBrowserTestAlert(prefs);
          setActionMessage('Local test alert sent. The server test endpoint is still deploying.');
          return;
        } catch (localError) {
          setActionMessage(localError.message || 'Could not send the local test alert.');
          return;
        }
      }
      if (error.status === 502) {
        setActionMessage('Server tried to send the test alert but Firebase rejected it. Reactivate web alerts to refresh the browser token.');
        return;
      }
      setActionMessage(error.message || 'Could not send the test alert.');
    }
  };

  const isActive = status === 'active' && Boolean(prefs.fcmToken);
  const isDenied = status === 'blocked';
  const isUnsupported = status === 'unsupported';
  const isMissingConfig = status === 'missing-config';
  const primaryDisabled = isWorking || isDenied || isUnsupported || isMissingConfig;
  const hasUnsavedChanges = isActive && haveAlertPrefsChanged(prefs, syncedPrefs);
  const serviceWorkerStatus = hasWebPushSupport() ? (isActive ? 'Registered' : 'Ready') : 'Unsupported';
  const permissionLabel = getNotificationPermissionLabel();
  const activeLabel = webAlertStatusLabel(status, isActive);
  const canShowWebPushHelp =
    status === 'blocked' ||
    status === 'error' ||
    /notification permission|check windows|browser notification settings/i.test(actionMessage);

  const alertsSetupContent = (
    <section className="alerts-setup-page">
      <header className="alerts-page-header">
        <div className="alerts-kicker">
          <Bell size={13} aria-hidden="true" />
          Notifications - web
        </div>
        <h1>
          Alerts <em>setup</em>
        </h1>
        <p>Get notified when whales make significant trades.</p>
      </header>

      <AlertsStatusHero
        active={isActive}
        minSize={formatUsdFull(prefs.minUsd)}
        lastAlertTimeAgo={savedAt ? relativeClientTime(savedAt) : null}
        onTestAlert={sendTestAlert}
        testDisabled={!isActive || isWorking}
      />

      <AlertsChannelGrid
        channels={[
          {
            icon: Radio,
            label: 'Web push',
            value: activeLabel,
            active: isActive,
          },
          {
            icon: Users,
            label: 'Following mode',
            value: prefs.followingOnly ? 'On' : 'Off',
            active: prefs.followingOnly,
          },
          {
            icon: DollarSign,
            label: 'Minimum size',
            value: formatUsdCompact(prefs.minUsd),
            active: true,
            accent: true,
          },
        ]}
      />

      <section className="alerts-setup-grid">
        <WebPushStatusCard
          active={isActive}
          status={activeLabel}
          permission={permissionLabel}
          quietHours={prefs.quietHoursEnabled ? '10pm-7am local' : 'Off'}
          serviceWorkerStatus={serviceWorkerStatus}
          actionMessage={actionMessage}
          isDenied={isDenied}
          isMissingConfig={isMissingConfig}
          showHelp={canShowWebPushHelp}
          onNeedHelp={() => setShowWebPushHelp(true)}
          onTurnOff={turnOffAlerts}
          disabled={!isActive || isWorking}
        />

        <AlertPreferencesCard
          prefs={prefs}
          active={isActive}
          hasUnsavedChanges={hasUnsavedChanges}
          isWorking={isWorking}
          primaryDisabled={primaryDisabled}
          savedAt={savedAt}
          onActivate={activateAlerts}
          onSave={savePrefs}
          onReset={resetPrefs}
          onUpdate={updatePrefs}
        />
      </section>
    </section>
  );

  if (isMobileViewport) {
    return (
      <div className="alerts-mobile-screen">
        <main className="alerts-mobile-main">{alertsSetupContent}</main>
        <MobileBottomNav
          activeTab="alerts"
          onTabChange={(tab) => {
            if (tab === 'alerts') return;
            if (tab === 'feed') window.location.href = '/';
            if (tab === 'leaders') window.location.href = '/leaderboard';
            if (tab === 'following') window.location.href = '/profile/following';
          }}
        />
        {showWebPushHelp ? <AlertsNotificationHelpModal onClose={() => setShowWebPushHelp(false)} /> : null}
      </div>
    );
  }

  return (
    <div className="feed-shell detail-shell profile-shell no-rail-shell">
      <FeedSidebar activePage="alerts" liveState="live" />

      <main className="feed-main detail-main profile-main alerts-main">{alertsSetupContent}</main>

      {showWebPushHelp ? <AlertsNotificationHelpModal onClose={() => setShowWebPushHelp(false)} /> : null}
    </div>
  );
}

function WebAlertToast({ toast, onClose }) {
  const [dragStartX, setDragStartX] = useState(null);
  const [dragX, setDragX] = useState(0);
  const [didDrag, setDidDrag] = useState(false);

  useEffect(() => {
    setDragStartX(null);
    setDragX(0);
    setDidDrag(false);
  }, [toast?.id]);

  if (!toast) return null;

  const openToast = () => {
    if (didDrag) return;
    if (toast.url) {
      window.location.href = toast.url;
    }
  };

  const endDrag = () => {
    if (Math.abs(dragX) > 90) {
      onClose();
      return;
    }
    setDragStartX(null);
    setDragX(0);
    window.setTimeout(() => setDidDrag(false), 80);
  };

  return (
    <div
      className={`web-alert-toast ${dragStartX !== null ? 'dragging' : ''}`}
      role="status"
      aria-live="polite"
      style={{
        transform: `translateX(${dragX}px)`,
        opacity: Math.max(0.35, 1 - Math.abs(dragX) / 220),
      }}
      onPointerDown={(event) => {
        setDragStartX(event.clientX);
        setDragX(0);
        setDidDrag(false);
        event.currentTarget.setPointerCapture?.(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (dragStartX === null) return;
        const nextX = event.clientX - dragStartX;
        setDragX(nextX);
        if (Math.abs(nextX) > 8) setDidDrag(true);
      }}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <button className="web-alert-toast-body" type="button" onClick={openToast}>
        <span className="web-alert-toast-icon">
          <Bell size={16} aria-hidden="true" />
        </span>
        <span>
          <strong>{toast.title || 'Polywatch alert'}</strong>
          <small>{toast.body || 'A tracked whale trade matched your alert settings.'}</small>
        </span>
      </button>
      <button className="web-alert-toast-close" type="button" onClick={onClose} aria-label="Dismiss alert">
        x
      </button>
    </div>
  );
}

function AlertsStatusHero({ active, minSize, lastAlertTimeAgo, onTestAlert, testDisabled }) {
  return (
    <section className="alerts-status-hero">
      <div className="alerts-hero-icon">
        <Bell size={18} aria-hidden="true" />
        <span className={active ? 'active' : ''} aria-hidden="true" />
      </div>
      <div className="alerts-hero-copy">
        <div className="alerts-hero-title">
          <strong>{active ? 'Alerts are active' : 'Alerts are not active'}</strong>
          {active ? <span>Live</span> : null}
        </div>
        <p>
          {active ? 'You will get notified' : 'Activate browser notifications'} for whale trades over{' '}
          <strong>{minSize}</strong>
          {lastAlertTimeAgo ? (
            <>
              {' '}
              - last update <strong>{lastAlertTimeAgo}</strong>
            </>
          ) : null}
        </p>
      </div>
      <button className="alerts-ghost-button" type="button" onClick={onTestAlert} disabled={testDisabled}>
        Send test alert
      </button>
    </section>
  );
}

function AlertsChannelGrid({ channels }) {
  return (
    <section className="alerts-channel-grid">
      {channels.map((channel) => (
        <AlertsChannelCard key={channel.label} {...channel} />
      ))}
    </section>
  );
}

function AlertsChannelCard({ icon: Icon, label, value, active, accent = false }) {
  return (
    <div className={`alerts-channel-card ${accent ? 'accent' : ''}`}>
      <div className="alerts-channel-label">
        <Icon size={12} aria-hidden="true" />
        <span>{label}</span>
      </div>
      <div className="alerts-channel-value">
        <strong>{value}</strong>
        {!accent ? <span className={active ? 'active' : ''} aria-hidden="true" /> : null}
      </div>
    </div>
  );
}

function WebPushStatusCard({
  active,
  status,
  permission,
  quietHours,
  serviceWorkerStatus,
  actionMessage,
  isDenied,
  isMissingConfig,
  showHelp,
  onNeedHelp,
  onTurnOff,
  disabled,
}) {
  return (
    <section className="alerts-panel alerts-web-status-card">
      <div className="alerts-panel-heading">
        <Radio size={14} aria-hidden="true" />
        <span>Web push status</span>
      </div>
      <p>
        This browser can receive system notifications for matching whale trades, even when the Polywatch
        tab is not in front.
      </p>

      <div className="alerts-status-list">
        <AlertsStatusListItem
          icon={Bell}
          label="Current delivery"
          subtitle={active ? 'This browser is subscribed' : 'Not subscribed on this browser'}
          status={status}
          active={active}
        />
        <AlertsStatusListItem
          icon={ShieldCheck}
          label="Browser permission"
          subtitle="Controlled by this browser's site settings"
          status={permission}
          active={permission === 'Allowed'}
        />
        <AlertsStatusListItem
          icon={Clock}
          label="Quiet hours"
          subtitle="Suppresses matching alerts overnight"
          status={quietHours}
        />
        <AlertsStatusListItem
          icon={Activity}
          label="Service worker"
          subtitle="Handles delivery while the tab is closed"
          status={serviceWorkerStatus}
          active={serviceWorkerStatus === 'Registered'}
          isLast
        />
      </div>

      {actionMessage ? <p className="alert-status-message">{actionMessage}</p> : null}
      {isDenied ? <BlockedNotificationHelp /> : null}
      {isMissingConfig ? (
        <p className="alert-warning-note">
          Firebase web config is missing. Add the public Firebase web environment variables before activating.
        </p>
      ) : null}

      {showHelp ? (
        <button className="alerts-help-button" type="button" onClick={onNeedHelp}>
          Need help?
        </button>
      ) : null}

      <button className="alerts-danger-button" type="button" onClick={onTurnOff} disabled={disabled}>
        Turn off web alerts
      </button>
    </section>
  );
}

function AlertsNotificationHelpModal({ onClose }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const stopPropagation = (event) => event.stopPropagation();

  return (
    <div className="alerts-help-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="alerts-help-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="alerts-help-title"
        onMouseDown={stopPropagation}
      >
        <header className="alerts-help-modal-head">
          <div>
            <span>Notification help</span>
            <h2 id="alerts-help-title">Turn alerts back on</h2>
            <p>Check both browser site permissions and Windows notification settings, then try activating alerts again.</p>
          </div>
          <button type="button" aria-label="Close notification help" onClick={onClose}>
            <X size={16} aria-hidden="true" />
          </button>
        </header>

        <div className="alerts-help-modal-grid">
          <article className="alerts-help-card">
            <div>
              <strong>1. Allow notifications for Polywatch</strong>
              <small>Open site information in the browser address bar and toggle notifications on.</small>
            </div>
            <img src="/assets/activate-web-notifications.png" alt="Browser site settings showing notifications enabled" />
          </article>

          <article className="alerts-help-card">
            <div>
              <strong>2. Enable Windows notifications</strong>
              <small>Open Windows notification settings and make sure system notifications are on.</small>
            </div>
            <img src="/assets/activate-windows-notifications.png" alt="Windows notifications settings showing notifications enabled" />
          </article>
        </div>
      </section>
    </div>
  );
}

function AlertsStatusListItem({ icon: Icon, label, subtitle, status, active = false, isLast = false }) {
  return (
    <div className={`alerts-status-list-item ${isLast ? 'last' : ''}`}>
      <span className={active ? 'active' : ''}>
        <Icon size={14} aria-hidden="true" />
      </span>
      <div>
        <strong>{label}</strong>
        <small>{subtitle}</small>
      </div>
      <em className={active ? 'active' : ''}>
        {active ? <i aria-hidden="true" /> : null}
        {status}
      </em>
    </div>
  );
}

function AlertPreferencesCard({
  prefs,
  active,
  hasUnsavedChanges,
  isWorking,
  primaryDisabled,
  savedAt,
  onActivate,
  onSave,
  onReset,
  onUpdate,
}) {
  return (
    <section className="alerts-panel alerts-preferences-card">
      <div className="alerts-preferences-heading">
        <div>
          <div className="alerts-panel-heading">
            <SlidersHorizontal size={14} aria-hidden="true" />
            <span>Alert preferences</span>
          </div>
          <p>Tune what triggers a notification.</p>
        </div>
        {hasUnsavedChanges ? <span>Unsaved</span> : null}
      </div>

      <AlertMinSizeControl
        value={prefs.minUsd}
        formattedValue={formatUsdFull(prefs.minUsd)}
        onChange={(value) => onUpdate({ minUsd: value })}
      />
      <AlertPreferenceToggle
        label="Mega whales only"
        subtitle="Trades $250K and above"
        checked={prefs.megaOnly}
        onChange={(value) => onUpdate({ megaOnly: value })}
      />
      <AlertPreferenceToggle
        label="Following list only"
        subtitle="Only traders you follow"
        checked={prefs.followingOnly}
        onChange={(value) => onUpdate({ followingOnly: value })}
      />
      <AlertPreferenceToggle
        label="Quiet hours"
        subtitle="No alerts 10:00 PM - 7:00 AM"
        checked={prefs.quietHoursEnabled}
        onChange={(value) => onUpdate({ quietHoursEnabled: value })}
      />

      <div className="alerts-action-row">
        <button
          className="alerts-primary-button"
          type="button"
          onClick={active ? onSave : onActivate}
          disabled={primaryDisabled}
        >
          {isWorking ? 'Working...' : active ? 'Save changes' : 'Activate system alerts'}
        </button>
        {active ? (
          <button className="alerts-reset-button" type="button" onClick={onReset} disabled={isWorking || !hasUnsavedChanges}>
            Reset
          </button>
        ) : null}
        {savedAt ? <span className="saved-note">Saved {relativeClientTime(savedAt)}</span> : null}
      </div>
    </section>
  );
}

function AlertMinSizeControl({ value, formattedValue, onChange }) {
  const min = 10000;
  const max = 500000;
  const fillPct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

  return (
    <div className="alerts-min-size-control">
      <div>
        <span>
          <strong>Minimum trade size</strong>
          <small>Only alert me about trades above this</small>
        </span>
        <em>{formattedValue}</em>
      </div>
      <label className="alerts-slider" style={{ '--fill': `${fillPct}%` }}>
        <span aria-hidden="true" />
        <input
          type="range"
          min={min}
          max={max}
          step="10000"
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
      </label>
      <div className="alerts-slider-ticks">
        <span>$10K</span>
        <span>$100K</span>
        <span>$250K</span>
        <span>$500K</span>
      </div>
    </div>
  );
}

function AlertPreferenceToggle({ label, subtitle, checked, onChange }) {
  return (
    <label className="alerts-pref-toggle">
      <span>
        <strong>{label}</strong>
        <small>{subtitle}</small>
      </span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <em aria-hidden="true" />
    </label>
  );
}

function BlockedNotificationHelp() {
  const help = getBrowserNotificationHelp();

  const openSettings = () => {
    if (help.settingsUrl) {
      window.open(help.settingsUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    window.location.reload();
  };

  return (
    <div className="alert-unblock-card">
      <div>
        <strong>Notifications are blocked in this browser.</strong>
        <span>{help.summary}</span>
      </div>
      <ol>
        {help.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <div className="alert-unblock-actions">
        <button className="secondary-link-button" type="button" onClick={openSettings}>
          {help.settingsUrl ? 'Open browser settings' : 'Reload after enabling'}
        </button>
        <button className="secondary-link-button" type="button" onClick={() => window.location.reload()}>
          Try again
        </button>
      </div>
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
  const shouldIgnoreRowNavigation = (event) => {
    const target = event.target;
    return target instanceof Element && Boolean(
      target.closest('button, a, input, select, textarea, [role="button"], [data-no-row-nav="true"]')
    );
  };
  const openTrader = () => {
    if (shouldSuppressFollowingRowNav()) return;
    window.location.href = href;
  };

  return (
    <article
      className={`followed-trader-row ${compact ? 'compact' : ''}`}
      role="link"
      tabIndex={0}
      onClick={(event) => {
        if (shouldIgnoreRowNavigation(event)) return;
        openTrader();
      }}
      onKeyDown={(event) => {
        if (shouldIgnoreRowNavigation(event)) return;
        if (event.key === 'Enter') openTrader();
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
      badgeIcon: Trophy,
      badgeLabel: 'Leaderboard',
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
      disabled: true,
      disabledMessage: 'Coming soon',
      active: activePage === 'profile',
    },
  ];

  return (
    <aside className="feed-sidebar">
      <a
        className="feed-brand"
        href="/"
        aria-label="Polywhale home"
        onClick={(event) => {
          event.preventDefault();
          window.location.href = '/';
        }}
      >
        <img src="/assets/polywatch-icon.png" alt="" width="36" height="36" />
        <span className="feed-brand-text">
          <strong>Polywhale</strong>
          <small>trades</small>
        </span>
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

      <div className="sidebar-links">
        <a href="/compare">Compare</a>
        <a href="/news">News</a>
        <a href="/qa">Q&A</a>
        <a href="/about">About</a>
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
        <a href="/delete-data">Delete data</a>
      </div>
    </aside>
  );
}

function NavItem({ label, href, icon: Icon, badge, badgeIcon: BadgeIcon, badgeLabel, active = false, disabled = false, disabledMessage = '' }) {
  return (
    <a
      className={`feed-nav-item ${active ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
      href={disabled ? '#' : href}
      title={disabled ? disabledMessage : undefined}
      aria-disabled={disabled ? 'true' : undefined}
      data-tooltip={disabled ? disabledMessage : undefined}
      onClick={(event) => {
        if (disabled) event.preventDefault();
      }}
    >
      <Icon size={17} aria-hidden="true" />
      <span>{label}</span>
      <small className={BadgeIcon ? 'icon-badge' : ''} aria-label={badgeLabel || badge}>
        {BadgeIcon ? <BadgeIcon size={12} aria-hidden="true" /> : badge}
      </small>
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
  return (
    <button
      className={`filter-pill window-pill ${active ? 'active' : ''}`}
      type="button"
      title={option.caption}
      onClick={() => onSelect(option.id)}
    >
      <span>{option.label}</span>
    </button>
  );
}

function LeaderboardDesktopHeader({ timeframe, caption, onRefresh }) {
  return (
    <header className="leaderboard-desktop-header">
      <div>
        <div className="leaderboard-desktop-kicker">
          <Trophy size={14} aria-hidden="true" />
          Ranked wallets - {caption}
        </div>
        <h1>
          Leaderboard <em>{timeframe}</em>
        </h1>
      </div>

      <button
        className="leaderboard-refresh-button"
        type="button"
        onClick={onRefresh}
        aria-label="Refresh leaderboard"
        title="Refresh"
      >
        <RefreshCw size={15} aria-hidden="true" />
      </button>
    </header>
  );
}

function LeaderboardSummaryCards({ stats }) {
  return (
    <section className="leaderboard-summary-grid" aria-label="Leaderboard summary">
      <LeaderboardSummaryCard label="Session volume" value={formatUsdCompact(stats.volume)} primary />
      <LeaderboardSummaryCard label="Ranked wallets" value={formatNumber(stats.traders)} />
      <LeaderboardSummaryCard label="Total trades" value={formatNumber(stats.trades)} />
      <LeaderboardSummaryCard label="Top wallet" value={formatUsdCompact(stats.topVolume)} accent />
    </section>
  );
}

function LeaderboardSummaryCard({ label, value, primary = false, accent = false }) {
  return (
    <div className={`leaderboard-summary-stat ${primary ? 'primary' : ''} ${accent ? 'accent' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function LeaderboardControlBar({
  windowId,
  sort,
  search,
  onWindowChange,
  onSortChange,
  onSearchChange,
  onFilter,
}) {
  return (
    <section className="leaderboard-controls" aria-label="Leaderboard controls">
      <div className="leaderboard-window-toggle">
        {leaderboardWindows.map((option) => {
          const locked = Boolean(option.locked);
          const classes = [
            windowId === option.id ? 'active' : '',
            locked ? 'locked' : '',
          ].filter(Boolean).join(' ');

          return (
            <button
              key={option.id}
              type="button"
              className={classes}
              aria-disabled={locked}
              onClick={() => {
                if (!locked) onWindowChange(option.id);
              }}
              title={locked ? 'Coming soon' : option.caption}
            >
              {option.label}
              {locked ? <span className="leaderboard-window-tooltip">Coming soon</span> : null}
            </button>
          );
        })}
      </div>

      <div className="leaderboard-control-actions">
        <label className="leaderboard-search">
          <Search size={13} aria-hidden="true" />
          <input
            type="search"
            placeholder="Search wallet"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </label>

        <button className="leaderboard-filter-button" type="button" onClick={onFilter}>
          <SlidersHorizontal size={13} aria-hidden="true" />
          Filter
        </button>

        <SortMenu
          value={sort}
          onChange={onSortChange}
          options={leaderboardSortOptions}
          className="leaderboard-sort desktop-redesign-sort"
        />
      </div>
    </section>
  );
}

function LeaderboardDesktopTable({ wallets }) {
  const maxVolume = Math.max(...wallets.map((wallet) => wallet.volumeNumeric || 0), 1);

  return (
    <section className="leaderboard-desktop-table">
      <div className="leaderboard-desktop-table-head">
        <span>Rank</span>
        <span>Trader</span>
        <span>Whale volume</span>
        <span>Trades</span>
        <span>Avg trade</span>
        <span />
      </div>

      <div className="leaderboard-desktop-list">
        {wallets.map((wallet, index) => (
          <LeaderboardDesktopRow
            key={wallet.walletFull || wallet.rank}
            wallet={wallet}
            maxVolume={maxVolume}
            isLast={index === wallets.length - 1}
          />
        ))}
      </div>
    </section>
  );
}

const leaderboardRankThemes = {
  1: {
    rowGradient: 'linear-gradient(90deg, rgba(255, 200, 60, 0.06), transparent 42%)',
    rankColor: '#ffc83c',
    showCrown: true,
  },
  2: {
    rowGradient: 'linear-gradient(90deg, rgba(200, 200, 208, 0.045), transparent 42%)',
    rankColor: '#c8c8d0',
    showCrown: false,
  },
  3: {
    rowGradient: 'linear-gradient(90deg, rgba(214, 138, 90, 0.055), transparent 42%)',
    rankColor: '#d68a5a',
    showCrown: false,
  },
  default: {
    rowGradient: 'transparent',
    rankColor: 'rgba(255, 255, 255, 0.4)',
    showCrown: false,
  },
};

function getLeaderboardRankTheme(rank) {
  return leaderboardRankThemes[rank] || leaderboardRankThemes.default;
}

function shouldSkipRowNavigation(event) {
  const target = event?.target;
  if (event?.defaultPrevented) return true;
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest('[data-no-row-nav="true"],button,a,input,select,textarea,label'));
}

function LeaderboardDesktopRow({ wallet, maxVolume, isLast }) {
  const theme = getLeaderboardRankTheme(wallet.rank);
  const barWidth = maxVolume > 0 ? Math.max(2, (wallet.volumeNumeric / maxVolume) * 100) : 0;
  const openWallet = () => {
    if (wallet.href) window.location.href = wallet.href;
  };

  return (
    <motion.article
      className={`leaderboard-desktop-row ${isLast ? 'last' : ''}`}
      style={{ background: theme.rowGradient }}
      role={wallet.href ? 'link' : undefined}
      tabIndex={wallet.href ? 0 : undefined}
      onClick={(event) => {
        if (shouldSkipRowNavigation(event)) return;
        openWallet();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') openWallet();
      }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: Math.min((wallet.rank - 1) * 0.015, 0.16) }}
    >
      <LeaderboardDesktopRank rank={wallet.rank} theme={theme} />

      <div className="leaderboard-desktop-trader">
        <div className="trader-avatar fallback" style={{ background: wallet.avatarColor }} aria-hidden="true" />
        <div>
          <strong>{wallet.name}</strong>
          <span title={wallet.walletFull}>{wallet.address}</span>
        </div>
      </div>

      <div className="leaderboard-desktop-volume">
        <strong>{wallet.volume}</strong>
        <div className="volume-track" aria-hidden="true">
          <span style={{ width: `${barWidth}%` }} />
        </div>
      </div>

      <div className="leaderboard-desktop-number">{wallet.trades}</div>
      <div className="leaderboard-desktop-number">{wallet.avgTrade}</div>

      <div className="leaderboard-desktop-actions">
        <button
          type="button"
          data-no-row-nav="true"
          aria-label={`Follow ${wallet.name}`}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (event.nativeEvent?.stopImmediatePropagation) {
              event.nativeEvent.stopImmediatePropagation();
            }
            if (!wallet.walletFull) return;
            const walletKey = wallet.walletFull.toLowerCase();
            const next = !isWalletFollowedLocally(walletKey);
            setWalletFollowedLocally(walletKey, next);
            notifyFollowsChanged({ wallet: walletKey, isFollowing: next });
            setWalletFollowedOnServer(walletKey, next).catch(() => {
              setWalletFollowedLocally(walletKey, !next);
              notifyFollowsChanged({ wallet: walletKey, isFollowing: !next });
            });
          }}
        >
          <UserPlus size={13} aria-hidden="true" />
        </button>
        <button
          type="button"
          data-no-row-nav="true"
          aria-label={`Open ${wallet.name}`}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (event.nativeEvent?.stopImmediatePropagation) {
              event.nativeEvent.stopImmediatePropagation();
            }
            openWallet();
          }}
        >
          <ExternalLink size={13} aria-hidden="true" />
        </button>
      </div>
    </motion.article>
  );
}

function LeaderboardDesktopRank({ rank, theme }) {
  if (theme.showCrown) {
    return (
      <div className="leaderboard-desktop-rank crown-rank" style={{ color: theme.rankColor }}>
        <svg width="14" height="10" viewBox="0 0 22 14" fill="none" aria-hidden="true">
          <path
            d="M2 12 L4 4 L8 8 L11 2 L14 8 L18 4 L20 12 Z"
            fill={theme.rankColor}
            strokeLinejoin="round"
          />
          <rect x="2" y="11" width="18" height="2" fill={theme.rankColor} />
        </svg>
        <span>{rank}</span>
      </div>
    );
  }

  return (
    <div className="leaderboard-desktop-rank" style={{ color: theme.rankColor }}>
      <span>{rank}</span>
    </div>
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
        label="today's VOLUME"
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
        label="today's BIGGEST TRADE"
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

function MobileFeedScreen({
  liveState,
  stats,
  trades,
  activeFilter,
  activeSide,
  sortValue,
  sortOptions,
  onFilterChange,
  onSideChange,
  onSortChange,
  onRefresh,
  activeTab,
  onTabChange,
  loading,
  error,
  canLoadMore,
  loadingMore,
  onLoadMore,
}) {
  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', paddingBottom: 92 }}>
      <div style={{ padding: '10px 14px 0' }}>
        <MobilePageTitle liveState={liveState} />
        <MobileHeroStats {...stats} />
        <MobileFilterBar
          activeFilter={activeFilter}
          activeSide={activeSide}
          sortValue={sortValue}
          sortOptions={sortOptions}
          onFilterChange={onFilterChange}
          onSideChange={onSideChange}
          onSortChange={onSortChange}
        />

        {loading ? (
          <FeedSkeleton />
        ) : error && trades.length === 0 ? (
          <EmptyState title="Feed unavailable" body={error} actionLabel="Try again" onAction={onRefresh} />
        ) : trades.length === 0 ? (
          <EmptyState
            title="No whales match this view"
            body="Change filter settings to widen today's New York session."
            actionLabel="Reset filters"
            onAction={() => {
              onFilterChange('all');
              onSideChange('all');
            }}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {trades.map((trade) => (
              <MobileTradeCard key={trade.id} {...trade} />
            ))}
          </div>
        )}

        {canLoadMore ? (
          <div style={{ marginTop: 12 }}>
            <button
              type="button"
              onClick={onLoadMore}
              disabled={loadingMore}
              style={{
                width: '100%',
                height: 40,
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.04)',
                color: 'rgba(255,255,255,0.84)',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: loadingMore ? 'default' : 'pointer',
              }}
            >
              {loadingMore ? 'Loading...' : 'Load more whales'}
            </button>
          </div>
        ) : null}
      </div>
      <MobileBottomNav activeTab={activeTab} onTabChange={onTabChange} />
    </div>
  );
}

function MobileTopBar({ onRefresh }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 18 }}>
      <div style={{ display: 'flex', gap: 4 }}>
        <MobileIconButton onClick={onRefresh}>
          <RefreshCw size={14} color="rgba(255,255,255,0.65)" />
        </MobileIconButton>
        <MobileIconButton onClick={() => (window.location.href = '/privacy')}>
          <ShieldCheck size={14} color="rgba(255,255,255,0.65)" />
        </MobileIconButton>
      </div>
    </div>
  );
}

function MobileIconButton({ children, onClick, size = 34 }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: size,
        height: size,
        borderRadius: 9,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

function MobilePageTitle({ liveState }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: liveState === 'offline' ? '#f48ba0' : '#22d3a5',
          }}
        />
        <span style={{ fontSize: 10, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
          LIVE - POLYMARKET
        </span>
      </div>
      <h1 style={{ fontSize: 26, fontWeight: 500, color: '#fff', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
        Whale <span style={{ color: '#22d3a5' }}>trades</span>
      </h1>
    </div>
  );
}

function MobileHeroStats({
  volume = '$0',
  sparkline = [4, 8, 6, 12, 10, 16, 18],
  whales = 0,
  mega = 0,
  biggest = '$0',
}) {
  const sparkPath = buildStatSparkPath(sparkline, 80, 28, 2);

  return (
    <div
      style={{
        background: 'linear-gradient(180deg, rgba(34,211,165,0.06) 0%, rgba(34,211,165,0) 100%)',
        border: '1px solid rgba(34,211,165,0.2)',
        borderRadius: 12,
        padding: '12px 14px',
        marginBottom: 16,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 4 }}>
            VOLUME TODAY
          </div>
          <div style={{ fontSize: 22, fontWeight: 500, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1 }}>
            {volume}
          </div>
        </div>
        <svg width="70" height="26" viewBox="0 0 80 28" fill="none" aria-hidden="true">
          <path d={sparkPath} stroke="#22d3a5" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <MobileStatPill label="Whales" value={whales} />
        <MobileStatPill label="Mega" value={mega} />
        <MobileStatPill label="Biggest" value={biggest} accent />
      </div>
    </div>
  );
}

function MobileStatPill({ label, value, accent = false }) {
  return (
    <div
      style={{
        borderRadius: 999,
        padding: '4px 10px',
        fontSize: 11,
        background: accent ? 'rgba(34,211,165,0.12)' : 'rgba(255,255,255,0.04)',
        color: accent ? '#22d3a5' : 'rgba(255,255,255,0.75)',
      }}
    >
      <span style={{ marginRight: 6, color: accent ? 'rgba(34,211,165,0.7)' : 'rgba(255,255,255,0.5)' }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}

const mobileSizeFilters = [
  { id: 'all', label: 'All' },
  { id: '50-100', label: '50k-100k' },
  { id: '100-250', label: '100k-250k' },
  { id: 'mega', label: '250k+' },
];

function MobileFilterBar({
  activeFilter,
  activeSide,
  sortValue,
  sortOptions,
  onFilterChange,
  onSideChange,
  onSortChange,
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div
        className="mobile-scrollbar-hide"
        style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, margin: '0 -14px 10px', paddingInline: 14 }}
      >
        {mobileSizeFilters.map((filter) => (
          <MobileSizePill
            key={filter.id}
            active={activeFilter === filter.id}
            onClick={() => onFilterChange(filter.id)}
          >
            {filter.label}
          </MobileSizePill>
        ))}
        <button
          type="button"
          onClick={() => onFilterChange('following')}
          style={{
            flexShrink: 0,
            padding: '7px 14px',
            borderRadius: 999,
            background: activeFilter === 'following' ? 'rgba(34,211,165,0.16)' : 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(34,211,165,0.35)',
            color: '#22d3a5',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Following
        </button>
      </div>

      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <div
          style={{
            display: 'inline-flex',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 999,
            padding: 2,
          }}
        >
          {[
            { id: 'all', label: 'All' },
            { id: 'buy', label: 'Buy' },
            { id: 'sell', label: 'Sell' },
          ].map((side) => (
            <button
              type="button"
              key={side.id}
              onClick={() => onSideChange(side.id)}
              style={{
                padding: '6px 14px',
                borderRadius: 999,
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer',
                border: 0,
                background: activeSide === side.id ? '#22d3a5' : 'transparent',
                color: activeSide === side.id ? '#0a3a2a' : 'rgba(255,255,255,0.6)',
              }}
            >
              {side.label}
            </button>
          ))}
        </div>

        <div style={{ marginLeft: 'auto' }}>
          <MobileSortDropdown value={sortValue} options={sortOptions} onChange={onSortChange} />
        </div>
      </div>
    </div>
  );
}

function MobileSizePill({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flexShrink: 0,
        padding: '7px 14px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
        background: active ? '#22d3a5' : 'rgba(255,255,255,0.04)',
        border: active ? '1px solid transparent' : '1px solid rgba(255,255,255,0.08)',
        color: active ? '#0a3a2a' : 'rgba(255,255,255,0.7)',
      }}
    >
      {children}
    </button>
  );
}

function MobileSortDropdown({ value, options, onChange, prefix = '' }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.id === value) ?? options[0];

  useEffect(() => {
    if (!open) return undefined;
    const close = () => setOpen(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [open]);

  return (
    <div style={{ position: 'relative' }} onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        style={{
          padding: '7px 12px',
          borderRadius: 8,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: 'rgba(255,255,255,0.74)',
          fontSize: 11.5,
          fontWeight: 600,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
        }}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {prefix}
        {selected?.label || 'Sort'}
        <ChevronDown size={10} />
      </button>

      {open ? (
        <div
          role="menu"
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 6px)',
            minWidth: 164,
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.1)',
            background: '#111416',
            boxShadow: '0 14px 28px rgba(0,0,0,0.38)',
            overflow: 'hidden',
            zIndex: 40,
          }}
        >
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              role="menuitemradio"
              aria-checked={option.id === value}
              onClick={() => {
                onChange(option.id);
                setOpen(false);
              }}
              style={{
                width: '100%',
                height: 34,
                border: 0,
                background: option.id === value ? 'rgba(34,211,165,0.14)' : 'transparent',
                color: option.id === value ? '#22d3a5' : 'rgba(255,255,255,0.82)',
                fontSize: 12,
                fontWeight: option.id === value ? 600 : 500,
                cursor: 'pointer',
                textAlign: 'left',
                padding: '0 10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>{option.label}</span>
              {option.id === value ? <Check size={12} /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MobileTradeCard({
  side = 'BUY',
  timeAgo,
  marketIcon,
  marketHref,
  marketName,
  marketMeta,
  size,
  price,
  trader,
  onFollow,
  onOpen,
  onTraderOpen,
}) {
  const isBuy = side !== 'SELL';
  const hasTraderRoute = Boolean(trader?.href || onTraderOpen);
  const marketContent = (
    <>
      <MobileMarketIcon icon={marketIcon} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: '#fff', fontWeight: 500, lineHeight: 1.3, marginBottom: 2 }}>{marketName}</div>
        <div className="mobile-market-meta-row" title={marketMeta}>
          <span>{marketMeta}</span>
        </div>
      </div>
    </>
  );
  const openTrader = (event) => {
    event.stopPropagation();
    if (onTraderOpen) {
      onTraderOpen();
    } else if (trader?.href) {
      window.location.href = trader.href;
    }
  };

  return (
    <div
      className="mobile-trade-card"
      role="link"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter') onOpen?.();
      }}
      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 12, cursor: 'pointer' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            padding: '3px 7px',
            borderRadius: 5,
            letterSpacing: '0.04em',
            background: isBuy ? 'rgba(34,211,165,0.15)' : 'rgba(244,139,160,0.15)',
            color: isBuy ? '#22d3a5' : '#f48ba0',
          }}
        >
          {side}
        </span>
        <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.45)' }}>{timeAgo}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          {trader?.wallet ? (
            <FollowWalletButton wallet={trader.wallet} variant="icon" />
          ) : (
            <MobileSmallIconButton onClick={onFollow}>
              <UserPlus size={11} color="rgba(255,255,255,0.55)" />
            </MobileSmallIconButton>
          )}
          <MobileSmallIconButton onClick={onOpen}>
            <ExternalLink size={10} color="rgba(255,255,255,0.55)" />
          </MobileSmallIconButton>
        </div>
      </div>

      {marketHref ? (
        <a
          className="mobile-market-link"
          href={marketHref}
          onClick={(event) => event.stopPropagation()}
        >
          {marketContent}
        </a>
      ) : (
        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>{marketContent}</div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div>
          <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em', marginBottom: 2 }}>SIZE</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{size}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em', marginBottom: 2 }}>PRICE</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>
            {trimNumber(price)}
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>c</span>
          </div>
        </div>
        <div
          role={hasTraderRoute ? 'link' : undefined}
          tabIndex={hasTraderRoute ? 0 : undefined}
          onClick={hasTraderRoute ? openTrader : undefined}
          onKeyDown={(event) => {
            if (hasTraderRoute && event.key === 'Enter') openTrader(event);
          }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: hasTraderRoute ? 'pointer' : 'default' }}
        >
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: trader.avatarColor }} />
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: '#fff', fontWeight: 600 }}>{trader.name}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileSmallIconButton({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(event);
      }}
      style={{
        width: 26,
        height: 26,
        borderRadius: 7,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

function MobileMarketIcon({ icon }) {
  if (!icon) return null;
  if (icon.type === 'img') {
    return (
      <div style={{ width: 32, height: 32, borderRadius: 7, flexShrink: 0, overflow: 'hidden' }}>
        <img
          src={icon.value}
          alt=""
          width="32"
          height="32"
          loading="lazy"
          decoding="async"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
    );
  }
  if (icon.type === 'text') {
    return (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 7,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: '#fff',
          fontWeight: 600,
          fontSize: 11,
          background: icon.bg || '#444',
        }}
      >
        {icon.value}
      </div>
    );
  }
  return (
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: 7,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        fontSize: 16,
        background: icon.bg || 'rgba(255,255,255,0.06)',
      }}
    >
      {icon.value}
    </div>
  );
}

const mobileNavTabs = [
  { id: 'feed', label: 'Feed', icon: Activity },
  { id: 'leaders', label: 'Leaders', icon: BarChart3 },
  { id: 'following', label: 'Following', icon: Users },
  { id: 'alerts', label: 'Alerts', icon: Bell },
];

function MobileBottomNav({ activeTab, onTabChange }) {
  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15,15,15,0.95)',
        backdropFilter: 'blur(10px)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '10px 14px 14px',
        display: 'flex',
        justifyContent: 'space-around',
        zIndex: 25,
      }}
    >
      {mobileNavTabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              background: 'transparent',
              border: 0,
              cursor: 'pointer',
              padding: '4px 8px',
            }}
          >
            <Icon size={18} color={isActive ? '#22d3a5' : 'rgba(255,255,255,0.5)'} />
            <span style={{ fontSize: 9.5, color: isActive ? '#22d3a5' : 'rgba(255,255,255,0.5)', fontWeight: isActive ? 600 : 500 }}>
              {tab.label}
            </span>
          </button>
        );
      })}
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
  const marketHref = buildMarketHref(trade);
  const marketContent = (
    <>
      <MarketIcon trade={trade} category={category} loading={index < 6 ? 'eager' : 'lazy'} />
      <div className="market-text">
        <strong title={marketTitle}>{marketTitle}</strong>
        <div className="market-meta-row">
          <span>{category.label} - {trade.outcome || 'Outcome'}</span>
        </div>
      </div>
    </>
  );
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

      {marketHref ? (
        <a
          className="market-cell market-cell-link"
          href={marketHref}
          onClick={(event) => event.stopPropagation()}
        >
          {marketContent}
        </a>
      ) : (
        <div className="market-cell">{marketContent}</div>
      )}

      <MetricCell label="Size" value={formatUsdFull(trade.usdSize)} strong={isMega} hideLabel />
      <MetricCell
        label={`${trade.outcome || 'Outcome'} @`}
        labelTitle={`${trade.outcome || 'Outcome'} @`}
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

function MetricCell({ label, value, strong = false, hideLabel = false, labelTitle = '' }) {
  return (
    <div className="metric-cell">
      {!hideLabel && label ? <span title={labelTitle || label}>{label}</span> : null}
      <strong className={strong ? 'mega-value' : ''}>{value}</strong>
    </div>
  );
}

function WalletProfilePerformanceBlock({ performance, windowId, onWindowChange, historyLoading }) {
  const windowLabel = (leaderboardWindows.find((option) => option.id === windowId)?.label || windowId).toUpperCase();

  return (
    <section className="wallet-performance-grid">
      <section className="wallet-panel wallet-performance-panel">
        <div className="wallet-performance-header">
          <div>
            <div className="wallet-panel-eyebrow">
              Performance - last {windowLabel}
              {historyLoading && !performance.historyCount ? ' - syncing' : ''}
            </div>
            <div className="wallet-performance-rate">
              <strong className={performance.winRatePct == null ? 'muted' : ''}>{performance.winRateLabel}</strong>
              <span>win rate</span>
            </div>
          </div>
          <WalletWindowToggle windowId={windowId} onWindowChange={onWindowChange} />
        </div>

        <div className="wallet-results-section">
          <div className="wallet-panel-eyebrow small">
            Recent results - last {performance.recentResults.length || 0}
          </div>
          <WalletResultCells results={performance.recentResults} />
          {performance.recentResults.length ? (
            <div className="wallet-result-axis">
              <span>most recent</span>
              <span>older -&gt;</span>
            </div>
          ) : null}
        </div>
      </section>

      <section className="wallet-performance-tiles" aria-label="Trader performance summary">
        <WalletPerformanceTile label="Trades" value={formatNumber(performance.tradeCount)} />
        <WalletPerformanceTile
          label="Longest win streak"
          value={formatNumber(performance.longestWinStreak)}
          tone={performance.longestWinStreak ? 'win' : ''}
          icon={performance.longestWinStreak ? Flame : null}
        />
        <WalletPerformanceTile label="Win rate" value={performance.winRateLabel} tone={performance.winRatePct == null ? '' : 'win'} />
        <div className="wallet-performance-tile">
          <span>Recent</span>
          <WalletResultCells results={performance.recentMini} mini />
        </div>
      </section>
    </section>
  );
}

function WalletWindowToggle({ windowId, onWindowChange, className = '' }) {
  return (
    <div className={`wallet-window-toggle ${className}`.trim()}>
      {leaderboardWindows.map((option) => (
        <button
          type="button"
          key={option.id}
          className={windowId === option.id ? 'active' : ''}
          onClick={() => onWindowChange(option.id)}
          title={option.caption}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function WalletPerformanceTile({ label, value, tone = '', icon: Icon = null }) {
  return (
    <div className="wallet-performance-tile">
      <span>{label}</span>
      <strong className={tone}>
        {value}
        {Icon ? <Icon size={15} aria-hidden="true" /> : null}
      </strong>
    </div>
  );
}

function WalletResultCells({ results, mini = false }) {
  if (!results.length) {
    return <div className={`wallet-result-empty ${mini ? 'mini' : ''}`}>No resolved trades</div>;
  }

  return (
    <div className={`wallet-result-row ${mini ? 'mini' : ''}`}>
      {results.map((result, index) => (
        <span
          key={`${result}-${index}`}
          className={`wallet-result-cell ${result === 'W' ? 'win' : 'loss'} ${mini ? 'mini' : ''}`}
        >
          {result}
        </span>
      ))}
    </div>
  );
}

function MarketStatusPill({ trade = null, meta = null, compact = false }) {
  const status = meta || getMarketStatusMeta(trade);
  return (
    <span
      className={`resolution-pill market-status-pill ${status.tone} ${compact ? 'compact' : ''}`}
      title={status.title}
    >
      {status.label}
    </span>
  );
}

function TradeOutcomePill({ trade = null, meta = null, compact = false }) {
  const outcome = meta || getTraderOutcomeMeta(trade);
  return (
    <span
      className={`resolution-pill trade-outcome-pill ${outcome.tone} ${compact ? 'compact' : ''}`}
      title={outcome.title}
    >
      {outcome.label}
    </span>
  );
}

function TradeResolutionPills({ trade, compact = false }) {
  const market = getMarketStatusMeta(trade);
  const outcome = getTraderOutcomeMeta(trade);

  return (
    <span className={`resolution-pill-row ${compact ? 'compact' : ''}`}>
      <MarketStatusPill meta={market} compact={compact} />
      {market.closed ? <TradeOutcomePill meta={outcome} compact={compact} /> : null}
    </span>
  );
}

function MarketIcon({ trade, category, loading = 'lazy' }) {
  const [failedUrls, setFailedUrls] = useState([]);
  const iconUrl = getMarketImageUrls(trade).find((url) => !failedUrls.includes(url));
  if (iconUrl) {
    return (
      <img
        className="market-icon image"
        src={iconUrl}
        alt=""
        width="42"
        height="42"
        loading={loading}
        decoding="async"
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
    return <img className="trader-avatar" src={image} alt="" width="34" height="34" loading="lazy" decoding="async" />;
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
        <TopWhalesToday traders={leaderboard} timeframe="1D" />
      </section>
    </aside>
  );
}

const PLACE_THEMES = {
  gold: {
    color: '#ffc83c',
    bg: 'rgba(255, 200, 60, 0.10)',
    border: 'rgba(255, 200, 60, 0.35)',
    avatarRing: 'rgba(255, 200, 60, 0.5)',
  },
  silver: {
    color: '#c8c8d0',
    bg: 'rgba(200, 200, 208, 0.06)',
    border: 'rgba(200, 200, 208, 0.22)',
    avatarRing: 'rgba(200, 200, 208, 0.35)',
  },
  bronze: {
    color: '#d68a5a',
    bg: 'rgba(214, 138, 90, 0.07)',
    border: 'rgba(214, 138, 90, 0.28)',
    avatarRing: 'rgba(214, 138, 90, 0.35)',
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
    .slice(0, 10);

  if (whales.length === 0) {
    return (
      <div
        style={{
          background: '#0a0a0a',
          borderRadius: 16,
          padding: 20,
          width: '100%',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
          }}
        >
          <h2
            style={{
              fontSize: 17,
              fontWeight: 500,
              color: '#fff',
              margin: 0,
              letterSpacing: '-0.01em',
            }}
          >
            Top whales today
          </h2>
          <div
            style={{
              fontSize: 10,
              letterSpacing: '0.1em',
              color: 'rgba(255,255,255,0.5)',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              padding: '3px 8px',
              borderRadius: 6,
              fontWeight: 500,
            }}
          >
            {timeframe}
          </div>
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
    <div
      style={{
        background: '#0a0a0a',
        borderRadius: 16,
        padding: 20,
        width: '100%',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <h2
          style={{
            fontSize: 17,
            fontWeight: 500,
            color: '#fff',
            margin: 0,
            letterSpacing: '-0.01em',
          }}
        >
          Top whales today
        </h2>
        <div
          style={{
            fontSize: 10,
            letterSpacing: '0.1em',
            color: 'rgba(255,255,255,0.5)',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            padding: '3px 8px',
            borderRadius: 6,
            fontWeight: 500,
          }}
        >
          {timeframe}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1.1fr 1fr',
          gap: 8,
          marginBottom: 14,
          alignItems: 'end',
        }}
      >
        {second ? <TopWhalesPodiumCard whale={second} place="silver" /> : null}
        {first ? <TopWhalesPodiumCard whale={first} place="gold" /> : null}
        {third ? <TopWhalesPodiumCard whale={third} place="bronze" /> : null}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {rest.map((whale) => (
          <TopWhalesRankRow key={whale.key} whale={whale} />
        ))}
      </div>
    </div>
  );
}

function TopWhalesPodiumCard({ whale, place }) {
  const theme = PLACE_THEMES[place];
  const isGold = place === 'gold';
  const content = (
    <div
      style={{
        position: 'relative',
        background: theme.bg,
        border: `1px solid ${theme.border}`,
        borderRadius: 12,
        padding: isGold ? '16px 6px 10px' : '14px 6px 10px',
        marginTop: isGold ? 0 : 6,
        textAlign: 'center',
        minWidth: 0,
      }}
    >
      {isGold ? (
        <div
          style={{
            position: 'absolute',
            top: -9,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#0a0a0a',
            padding: '0 4px',
            lineHeight: 0,
          }}
          aria-hidden="true"
        >
          <svg width="22" height="14" viewBox="0 0 22 14" fill="none">
            <path
              d="M2 12 L4 4 L8 8 L11 2 L14 8 L18 4 L20 12 Z"
              fill={theme.color}
              stroke={theme.color}
              strokeWidth="0.5"
              strokeLinejoin="round"
            />
            <rect x="2" y="11" width="18" height="2" fill={theme.color} />
          </svg>
        </div>
      ) : (
        <div
          style={{
            position: 'absolute',
            top: -8,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#1a1a1a',
            border: `1px solid ${theme.border}`,
            color: theme.color,
            width: 20,
            height: 20,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 500,
          }}
        >
          {whale.rank}
        </div>
      )}

      <div
        style={{
          width: isGold ? 38 : 32,
          height: isGold ? 38 : 32,
          borderRadius: '50%',
          background: whale.avatarColor,
          margin: `${isGold ? 6 : 4}px auto 8px`,
          border: `2px solid ${theme.avatarRing}`,
        }}
        aria-hidden="true"
      />

      <div
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: '#fff',
          lineHeight: 1.2,
          marginBottom: 3,
          minHeight: 26,
          maxHeight: 26,
          overflow: 'hidden',
          wordBreak: 'break-word',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          padding: '0 2px',
        }}
        title={whale.name}
      >
        {whale.name}
      </div>

      <div
        style={{
          fontSize: 9.5,
          color: 'rgba(255,255,255,0.4)',
          marginBottom: 6,
        }}
      >
        {formatNumber(whale.trades)} {whale.trades === 1 ? 'trade' : 'trades'}
      </div>

      <div
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: '#22d3a5',
        }}
      >
        {whale.volume}
      </div>
    </div>
  );

  if (!whale.href) return content;
  return (
    <a href={whale.href} style={{ display: 'block', color: 'inherit', textDecoration: 'none' }}>
      {content}
    </a>
  );
}

function TopWhalesRankRow({ whale }) {
  const content = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 12px',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 10,
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: 'rgba(255,255,255,0.4)',
          fontWeight: 500,
          width: 16,
          textAlign: 'center',
          flexShrink: 0,
        }}
      >
        {whale.rank}
      </div>
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: whale.avatarColor,
          flexShrink: 0,
        }}
        aria-hidden="true"
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 12.5,
            color: '#fff',
            fontWeight: 500,
            lineHeight: 1.2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {whale.name}
        </div>
        <div
          style={{
            fontSize: 10.5,
            color: 'rgba(255,255,255,0.4)',
            marginTop: 2,
          }}
        >
          {formatNumber(whale.trades)} {whale.trades === 1 ? 'trade' : 'trades'}
        </div>
      </div>
      <div
        style={{
          fontSize: 12.5,
          fontWeight: 500,
          color: '#22d3a5',
          flexShrink: 0,
        }}
      >
        {whale.volume}
      </div>
    </div>
  );

  if (!whale.href) return content;
  return (
    <a href={whale.href} style={{ display: 'block', color: 'inherit', textDecoration: 'none' }}>
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
    return <img className="profile-avatar" src={profile.profileImage} alt="" width="82" height="82" decoding="async" />;
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

let suppressFollowingRowNavUntilMs = 0;

function suppressFollowingRowNav(durationMs = 700) {
  suppressFollowingRowNavUntilMs = Date.now() + durationMs;
}

function shouldSuppressFollowingRowNav() {
  return Date.now() < suppressFollowingRowNavUntilMs;
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
    if (event.nativeEvent?.stopImmediatePropagation) {
      event.nativeEvent.stopImmediatePropagation();
    }
    suppressFollowingRowNav();
    if (!normalizedWallet || pending) return;

    const next = !isFollowing;
    const previous = isFollowing;

    setPending(true);
    setError('');
    setWalletFollowedLocally(normalizedWallet, next);
    setIsFollowing(next);
    notifyFollowsChanged({ wallet: normalizedWallet, isFollowing: next });

    try {
      await setWalletFollowedOnServer(normalizedWallet, next);
    } catch (err) {
      setWalletFollowedLocally(normalizedWallet, previous);
      setIsFollowing(previous);
      notifyFollowsChanged({ wallet: normalizedWallet, isFollowing: previous });
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
      data-no-row-nav="true"
      aria-label={`${label} ${shortWallet(normalizedWallet)}`}
      title={error || label}
      onPointerDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onTouchStart={(event) => event.stopPropagation()}
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
        <a
          className="legal-brand"
          href="/"
          aria-label="Polywhale home"
          onClick={(event) => {
            event.preventDefault();
            window.location.href = '/';
          }}
        >
          <img src="/assets/polywatch-icon.png" alt="" />
          <span>Polywatch</span>
        </a>
        <nav className="legal-nav" aria-label="Legal pages">
          <a href="/about">About</a>
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

function AboutPage() {
  return (
    <LegalLayout
      eyebrow="Polymarket whale intelligence"
      title="About Polywatch"
      intro="Polywatch is an independent dashboard for tracking live Polymarket whale trades, top whales today, wallet leaderboards, market activity, and large trade alerts."
      updatedLabel="Built for live public market monitoring"
    >
      <section className="about-seo-panel" aria-label="Polywatch overview">
        <div>
          <span>Live whale feed</span>
          <strong>Large public Polymarket trades as they appear.</strong>
        </div>
        <div>
          <span>Top whales</span>
          <strong>Wallets ranked by whale volume and trade count.</strong>
        </div>
        <div>
          <span>Whale alerts</span>
          <strong>Browser notifications for trades over your threshold.</strong>
        </div>
      </section>

      <LegalSection title="What Polywatch is">
        <p>
          Polywatch is a read-only market intelligence surface for public Polymarket activity.
          The app focuses on large trades, also called whale trades, so users can see which
          wallets are moving size, what markets they are trading, and how today's activity
          compares across the live whale feed, top whales, leaderboard, and wallet profiles.
        </p>
      </LegalSection>

      <LegalSection title="What Polywatch tracks">
        <div className="about-feature-grid">
          <a href="/" className="about-feature-link">
            <Activity size={18} aria-hidden="true" />
            <span>
              <strong>Live Polymarket whale feed</strong>
              <em>Large buy and sell trades with market, price, size, side, and trader context.</em>
            </span>
          </a>
          <a href="/leaderboard" className="about-feature-link">
            <Trophy size={18} aria-hidden="true" />
            <span>
              <strong>Top whales today</strong>
              <em>Wallet leaderboard ranked by whale volume, trades, and average trade size.</em>
            </span>
          </a>
          <a href="/alerts" className="about-feature-link">
            <Bell size={18} aria-hidden="true" />
            <span>
              <strong>Large trade alerts</strong>
              <em>Web push notifications for Polymarket whale trades above your chosen threshold.</em>
            </span>
          </a>
          <a href="/profile/following" className="about-feature-link">
            <Users size={18} aria-hidden="true" />
            <span>
              <strong>Following list</strong>
              <em>Save wallets you care about and keep their whale activity easier to revisit.</em>
            </span>
          </a>
        </div>
      </LegalSection>

      <LegalSection title="Why watch Polymarket whales">
        <p>
          Large public trades can show where attention and conviction are clustering across
          prediction markets. Polywatch helps users monitor whale volume, active whales,
          mega trades, today's biggest trade, same-market activity, and public wallet behavior
          without needing to manually scan every Polymarket market.
        </p>
      </LegalSection>

      <LegalSection title="How today works">
        <p>
          The public feed, today stats, top whales, and leaderboard are designed around the
          current New York session. "Today" resets at New York midnight so daily whale volume,
          active wallets, and largest trades stay aligned across the app.
        </p>
      </LegalSection>

      <LegalSection title="What Polywatch is not">
        <p>
          Polywatch does not execute trades, custody funds, accept deposits, or provide
          financial advice. It is an independent monitoring tool for public Polymarket data
          and is not affiliated with, endorsed by, or operated by Polymarket.
        </p>
      </LegalSection>

      <LegalSection title="Frequently asked questions">
        <div className="about-faq-list">
          <article>
            <h3>What is a Polymarket whale trade?</h3>
            <p>
              A whale trade is a large public trade on a Polymarket market. Polywatch surfaces
              these trades by size so users can track meaningful wallet activity quickly.
            </p>
          </article>
          <article>
            <h3>Does Polywhale show live Polymarket whale trades?</h3>
            <p>
              Yes. The whale feed updates with large public trades and includes details such as
              market, side, price, size, trader name, and today-scoped stats.
            </p>
          </article>
          <article>
            <h3>How are top whales ranked?</h3>
            <p>
              The leaderboard ranks public wallets by whale volume and shows trade count and
              average trade size to make the rank easier to understand.
            </p>
          </article>
          <article>
            <h3>Can I get alerts for large Polymarket trades?</h3>
            <p>
              Yes. The Alerts page lets users activate browser notifications and choose the
              minimum trade size that should trigger a whale alert.
            </p>
          </article>
        </div>
      </LegalSection>

      <div className="about-cta-row">
        <a className="primary-link-button" href="/">
          Open live whale feed
          <ArrowRight size={18} aria-hidden="true" />
        </a>
        <a className="about-secondary-link" href="/leaderboard">
          View top whales
          <Trophy size={16} aria-hidden="true" />
        </a>
      </div>
    </LegalLayout>
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

function LegalLayout({ eyebrow, title, intro, updatedLabel, children }) {
  return (
    <LegalChrome>
      <main className="legal-main">
        <section className="legal-hero">
          <div className="section-kicker">{eyebrow}</div>
          <h1>{title}</h1>
          <p>{intro}</p>
          <span>{updatedLabel || `Last updated: ${lastUpdated}`}</span>
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
  const [loading, setLoading] = useState(() => hasStoredAuth() && buildLocalFollowSummaries().length === 0);
  const [error, setError] = useState('');
  const [refreshNonce, setRefreshNonce] = useState(0);
  const hasLoadedFromServerRef = useRef(false);

  const refresh = useCallback(() => {
    setRefreshNonce((value) => value + 1);
  }, []);

  useEffect(() => {
    const onFollowsChanged = (event) => {
      setItems((previous) => applyFollowSummaryChange(previous, event.detail));
      setRefreshNonce((value) => value + 1);
    };
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
        hasLoadedFromServerRef.current = true;
        setLoading(false);
        setError('');
        return;
      }

      setItems((previous) => reconcileFollowSummaries(previous, localItems));

      if (!hasLoadedFromServerRef.current && localItems.length === 0) {
        setLoading(true);
      } else {
        setLoading(false);
      }
      setError('');

      try {
        const data = await authFetchJson('/v1/users/me/follows', {
          signal: controller.signal,
        });
        if (!active) return;

        const serverSummaries = (data?.items || []).map(normalizeFollowSummary);
        const localWallets = readFollowedWallets();
        const summaries = hasLoadedFromServerRef.current
          ? serverSummaries.filter((item) => localWallets.has(item.proxyWallet))
          : serverSummaries;
        writeFollowedWallets(new Set(summaries.map((item) => item.proxyWallet)));
        setItems(summaries);
        hasLoadedFromServerRef.current = true;
      } catch (err) {
        if (err.name === 'AbortError' || !active) return;
        setItems((previous) => reconcileFollowSummaries(previous, localItems));
        hasLoadedFromServerRef.current = true;
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

async function fetchTodayDashboardWithFallback(filter, options = {}) {
  const { recentLimit, leaderboardLimit, ...requestOptions } = options;
  try {
    const dashboard = await fetchTodayDashboard(filter, { recentLimit, leaderboardLimit, ...requestOptions });
    return {
      items: Array.isArray(dashboard?.items) ? dashboard.items : [],
      nextCursor: dashboard?.nextCursor ?? null,
      dashboard,
    };
  } catch (dashboardError) {
    if (requestOptions?.signal?.aborted) throw dashboardError;
    const fallback = await fetchTodayWhalesForFilter(filter, requestOptions);
    return { ...fallback, dashboard: null };
  }
}

async function fetchTodayDashboard(filter, options = {}) {
  const { recentLimit, leaderboardLimit, ...requestOptions } = options;
  return fetchJson(buildDashboardTodayPath(filter, { recentLimit, leaderboardLimit }), requestOptions);
}

async function fetchLeaderboardPage(windowId, cursor = null, options = {}) {
  const { limit, sort, ...requestOptions } = options;
  return fetchJson(buildLeaderboardPath(windowId, cursor, limit, sort), requestOptions);
}

async function fetchTraderHistory(wallet, options = {}) {
  const { signal, limit = 100, maxPages = 8 } = options;
  const normalizedWallet = wallet.toLowerCase();
  let cursor = null;
  let items = [];

  for (let page = 0; page < maxPages; page += 1) {
    const data = await fetchJson(buildTraderWhalesPath(wallet, cursor, limit), { signal });
    const incoming = Array.isArray(data?.items)
      ? data.items.filter((item) => item.trader?.proxyWallet?.toLowerCase() === normalizedWallet)
      : [];
    items = mergeWhales(items, incoming);

    if (!data?.nextCursor || !incoming.length) break;
    cursor = data.nextCursor;
  }

  return sortWhales(items, 'recent');
}

async function fetchLeaderboardProfitSummaries(wallets, options = {}) {
  const { signal, concurrency = 4 } = options;
  const queue = Array.from(new Set(wallets.map(normalizeWalletKey).filter(Boolean)));
  const summaries = {};
  let index = 0;

  async function worker() {
    while (index < queue.length) {
      if (signal?.aborted) return;
      const wallet = queue[index];
      index += 1;

      try {
        const trades = await fetchTraderHistory(wallet, { signal });
        const summary = buildWalletProfitSummary(null, trades);
        const recentForm = buildLeaderboardRecentForm(trades);
        summaries[wallet] = {
          status: summary.hasValue ? 'ready' : 'empty',
          value: summary.hasValue ? summary.value : null,
          hasValue: summary.hasValue,
          pnlTradeCount: summary.pnlTradeCount,
          historyTradeCount: trades.length,
          recentResults: recentForm.results,
          recentWinRatePct: recentForm.winRatePct,
          allTimeWinRatePct: recentForm.allTimeWinRatePct,
        };
      } catch (err) {
        if (err.name === 'AbortError') throw err;
        summaries[wallet] = {
          status: 'unavailable',
          value: null,
          hasValue: false,
          pnlTradeCount: null,
          historyTradeCount: null,
          recentResults: [],
          recentWinRatePct: null,
          allTimeWinRatePct: null,
        };
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, () => worker()));
  return summaries;
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
  let data;
  try {
    data = await fetchJson('/v1/auth/anonymous', {
      method: 'POST',
      body: {
        deviceId,
        platform: 'web',
      },
    });
  } catch (error) {
    if (error.status !== 400) throw error;
    data = await fetchJson('/v1/auth/anonymous', {
      method: 'POST',
      body: {
        deviceId,
        platform: 'unknown',
      },
    });
  }

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

function reconcileFollowSummaries(previous, localItems) {
  if (!Array.isArray(previous) || !previous.length) return localItems;
  const localWallets = new Set(localItems.map((item) => item.proxyWallet).filter(Boolean));
  const kept = previous.filter((item) => localWallets.has(item.proxyWallet));
  const seen = new Set(kept.map((item) => item.proxyWallet));

  for (const item of localItems) {
    if (!seen.has(item.proxyWallet)) kept.push(item);
  }

  return kept;
}

function applyFollowSummaryChange(previous, detail) {
  if (!Array.isArray(previous) || !detail?.wallet) return previous;
  const wallet = detail.wallet.toLowerCase();
  if (!detail.isFollowing) {
    return previous.filter((item) => item.proxyWallet !== wallet);
  }

  if (previous.some((item) => item.proxyWallet === wallet)) return previous;
  return [
    ...previous,
    normalizeFollowSummary({
      proxyWallet: wallet,
      pseudonym: shortWallet(wallet),
      profileImage: null,
      vol7d: 0,
      followedAt: null,
    }),
  ];
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

function hasWebPushSupport() {
  return Boolean(
    typeof window !== 'undefined' &&
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window
  );
}

function hasFirebaseWebPushConfig() {
  return Boolean(
    firebaseVapidKey &&
      firebaseWebConfig.apiKey &&
      firebaseWebConfig.authDomain &&
      firebaseWebConfig.projectId &&
      firebaseWebConfig.messagingSenderId &&
      firebaseWebConfig.appId
  );
}

function getNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

function getNotificationPermissionLabel() {
  const permission = getNotificationPermission();
  if (permission === 'granted') return 'Allowed';
  if (permission === 'denied') return 'Blocked';
  if (permission === 'default') return 'Not requested';
  return 'Unsupported';
}

function getBrowserNotificationHelp() {
  const ua = navigator.userAgent || '';
  const isEdge = /Edg\//.test(ua);
  const isChrome = /Chrome\//.test(ua) && !isEdge;
  const isFirefox = /Firefox\//.test(ua);
  const isSafari = /Safari\//.test(ua) && !/Chrome\//.test(ua) && !isEdge;
  const origin = window.location.origin;

  if (isEdge) {
    return {
      summary: 'Edge requires you to change the site permission manually.',
      settingsUrl: 'edge://settings/content/notifications',
      steps: [
        'Open browser settings, then find Notifications.',
        `Move ${origin} from Block to Allow.`,
        'Return to Polywatch, reload, then press Activate again.',
      ],
    };
  }

  if (isChrome) {
    return {
      summary: 'Chrome requires you to change the site permission manually.',
      settingsUrl: 'chrome://settings/content/notifications',
      steps: [
        'Open browser settings, then find Notifications.',
        `Move ${origin} from Not allowed to Allowed.`,
        'Return to Polywatch, reload, then press Activate again.',
      ],
    };
  }

  if (isFirefox) {
    return {
      summary: 'Firefox keeps notification permissions under Privacy & Security.',
      settingsUrl: 'about:preferences#privacy',
      steps: [
        'Open Privacy & Security settings.',
        'Find Permissions, then Notifications settings.',
        `Remove the block for ${origin} or set it to Allow, then reload Polywatch.`,
      ],
    };
  }

  if (isSafari) {
    return {
      summary: 'Safari notification permissions are managed in browser or system settings.',
      settingsUrl: '',
      steps: [
        'Open Safari Settings, then Websites.',
        'Choose Notifications and set Polywatch to Allow.',
        'On iPhone, install Polywatch to the Home Screen if Safari does not offer web push.',
      ],
    };
  }

  return {
    summary: 'Browsers do not let websites unblock notifications automatically.',
    settingsUrl: '',
    steps: [
      'Open the site controls beside the address bar.',
      'Set Notifications to Allow for Polywatch.',
      'Reload this page, then press Activate again.',
    ],
  };
}

function getInitialWebAlertStatus(prefs = readWebAlertPrefs()) {
  if (!hasWebPushSupport()) return 'unsupported';
  if (!hasFirebaseWebPushConfig()) return 'missing-config';
  if (getNotificationPermission() === 'denied') return 'blocked';
  if (prefs.enabled && prefs.fcmToken) return 'active';
  return 'inactive';
}

function webAlertStatusLabel(status, isActive = false) {
  if (isActive) return 'Active';
  if (status === 'checking') return 'Checking';
  if (status === 'blocked') return 'Blocked';
  if (status === 'unsupported') return 'Unsupported';
  if (status === 'missing-config') return 'Config needed';
  if (status === 'error') return 'Needs attention';
  return 'Inactive';
}

function deriveWebAlertErrorStatus(error) {
  if (error?.code === 'permission-denied' || getNotificationPermission() === 'denied') return 'blocked';
  if (error?.code === 'unsupported') return 'unsupported';
  if (error?.code === 'missing-config') return 'missing-config';
  return 'error';
}

function mergeServerAlertPrefs(current, subscription) {
  return {
    ...current,
    enabled: true,
    fcmToken: subscription.fcmToken || current.fcmToken || '',
    minUsd: Number(subscription.minUsd || current.minUsd || 50000),
    megaOnly: Boolean(subscription.megaOnly),
    followingOnly: Boolean(subscription.followingOnly),
    quietHoursEnabled: Boolean(subscription.quietHours),
    permission: getNotificationPermission(),
    lastSyncedAt: Date.now(),
  };
}

function haveAlertPrefsChanged(a, b) {
  return (
    Number(a?.minUsd || 0) !== Number(b?.minUsd || 0) ||
    Boolean(a?.megaOnly) !== Boolean(b?.megaOnly) ||
    Boolean(a?.followingOnly) !== Boolean(b?.followingOnly) ||
    Boolean(a?.quietHoursEnabled) !== Boolean(b?.quietHoursEnabled)
  );
}

function buildAlertQuietHours(prefs) {
  if (!prefs.quietHoursEnabled) return null;
  return {
    start: '22:00',
    end: '07:00',
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  };
}

function buildWebAlertPayload(prefs, fcmToken) {
  return {
    fcmToken,
    minUsd: Number(prefs.minUsd || 50000),
    megaOnly: Boolean(prefs.megaOnly),
    followingOnly: Boolean(prefs.followingOnly),
    categories: [],
    quietHours: buildAlertQuietHours(prefs),
  };
}

async function saveWebAlertSubscription(prefs, fcmToken) {
  await authFetchJson('/v1/alerts/subscribe', {
    method: 'POST',
    body: buildWebAlertPayload(prefs, fcmToken),
  });
}

async function deleteWebAlertSubscription(fcmToken) {
  if (!fcmToken) return;
  await authFetchJson('/v1/alerts/subscribe', {
    method: 'DELETE',
    body: { fcmToken },
  });
}

function buildFirebaseServiceWorkerUrl() {
  const params = new URLSearchParams(firebaseWebConfig);
  return `/firebase-messaging-sw.js?${params.toString()}`;
}

async function getFirebaseMessagingContext() {
  if (!hasWebPushSupport()) {
    const error = new Error('This browser does not support web push notifications.');
    error.code = 'unsupported';
    throw error;
  }
  if (!hasFirebaseWebPushConfig()) {
    const error = new Error('Firebase web push configuration is missing.');
    error.code = 'missing-config';
    throw error;
  }

  const messagingModule = await import('firebase/messaging');
  const supported = await messagingModule.isSupported();
  if (!supported) {
    const error = new Error('Firebase messaging is not supported in this browser.');
    error.code = 'unsupported';
    throw error;
  }

  const { initializeApp, getApps, getApp } = await import('firebase/app');
  const appName = 'polywatch-web-push';
  const app = getApps().some((candidate) => candidate.name === appName)
    ? getApp(appName)
    : initializeApp(firebaseWebConfig, appName);
  const registration = await navigator.serviceWorker.register(buildFirebaseServiceWorkerUrl());
  await navigator.serviceWorker.ready;

  return {
    messaging: messagingModule.getMessaging(app),
    registration,
    getToken: messagingModule.getToken,
    deleteToken: messagingModule.deleteToken,
    onMessage: messagingModule.onMessage,
  };
}

async function getFirebaseWebMessagingToken() {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    const error = new Error('Notification permission was not granted.');
    error.code = 'permission-denied';
    throw error;
  }

  const { messaging, registration, getToken } = await getFirebaseMessagingContext();
  const token = await getToken(messaging, {
    vapidKey: firebaseVapidKey,
    serviceWorkerRegistration: registration,
  });

  if (!token) {
    throw new Error('Firebase did not return a web messaging token.');
  }

  return token;
}

async function deleteFirebaseWebMessagingToken() {
  if (!hasWebPushSupport() || !hasFirebaseWebPushConfig()) return;
  try {
    const { messaging, deleteToken } = await getFirebaseMessagingContext();
    await deleteToken(messaging);
  } catch {
    // Server-side unsubscribe is the source of truth. Token deletion is best effort.
  }
}

async function registerForegroundWebAlertListener() {
  const prefs = readWebAlertPrefs();
  if (!prefs.enabled || !prefs.fcmToken) return null;
  if (getNotificationPermission() !== 'granted') return null;
  const { messaging, onMessage } = await getFirebaseMessagingContext();
  return onMessage(messaging, (payload) => {
    showFirebasePayloadNotification(payload).catch(() => {
      // If the OS/browser suppresses the toast, do not break the app runtime.
    });
  });
}

async function showFirebasePayloadNotification(payload) {
  if (getNotificationPermission() !== 'granted') {
    throw new Error('Notification permission is not currently allowed.');
  }
  const data = payload?.data || {};
  const notification = payload?.notification || {};
  const title = notification.title || 'Polywatch whale alert';
  const body = notification.body || 'A tracked whale trade matched your alert settings.';
  const url = data.url || (data.tradeId ? `/trade/${encodeURIComponent(data.tradeId)}` : '/alerts');
  showInAppWebAlertToast({ title, body, url });
  const registration = await navigator.serviceWorker.ready;
  await registration.showNotification(title, {
    body,
    icon: '/assets/polywatch-icon.png',
    badge: '/assets/polywatch-icon.png',
    tag: data.tradeId ? `polywatch-whale-${data.tradeId}` : data.type === 'test' ? 'polywatch-test-alert' : 'polywatch-whale-alert',
    data: {
      ...data,
      url,
    },
  });
}

async function showLocalBrowserTestAlert(prefs) {
  if (getNotificationPermission() !== 'granted') {
    throw new Error('Notification permission is not currently allowed.');
  }
  const registration = await navigator.serviceWorker.ready;
  await registration.showNotification('Polywatch test alert', {
    body: `You will be notified for whale trades over ${formatUsdFull(prefs.minUsd)}.`,
    icon: '/assets/polywatch-icon.png',
    badge: '/assets/polywatch-icon.png',
    tag: 'polywatch-test-alert',
    data: { url: '/alerts' },
  });
  showInAppWebAlertToast({
    title: 'Polywatch test alert',
    body: `You will be notified for whale trades over ${formatUsdFull(prefs.minUsd)}.`,
    url: '/alerts',
  });
}

function readWebAlertPrefs() {
  const stored = readStoredJson(alertPrefsStorageKey);
  return {
    minUsd: Number(stored?.minUsd || 50000),
    megaOnly: Boolean(stored?.megaOnly),
    followingOnly: Boolean(stored?.followingOnly),
    quietHoursEnabled: Boolean(stored?.quietHoursEnabled),
    enabled: Boolean(stored?.enabled),
    fcmToken: typeof stored?.fcmToken === 'string' ? stored.fcmToken : '',
    permission: typeof stored?.permission === 'string' ? stored.permission : getNotificationPermission(),
    lastSyncedAt: Number(stored?.lastSyncedAt || 0),
  };
}

function notifyFollowsChanged(detail = {}) {
  window.dispatchEvent(new CustomEvent(followsChangedEvent, { detail }));
}

function notifyWebAlertsChanged() {
  window.dispatchEvent(new CustomEvent(webAlertsChangedEvent));
}

function showInAppWebAlertToast(detail) {
  window.dispatchEvent(new CustomEvent(webAlertToastEvent, { detail }));
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

function buildTraderWhalesPath(wallet, cursor = null, limit = 100) {
  const params = new URLSearchParams();
  params.set('limit', String(limit || 100));
  params.set('minUsd', '10000');
  params.set('traderWallet', wallet.toLowerCase());
  if (cursor) params.set('cursor', cursor);
  return `/v1/whales?${params.toString()}`;
}

function buildLeaderboardPath(windowId, cursor = null, limit = 50, sort = 'volume') {
  const params = new URLSearchParams();
  if (sort === 'profit') {
    params.set('sort', 'profit');
  } else {
    params.set('window', windowId);
  }
  params.set('limit', String(limit || 50));
  if (cursor) params.set('cursor', cursor);
  return `/v1/leaderboard?${params.toString()}`;
}

function buildDashboardTodayPath(filter, options = {}) {
  const params = new URLSearchParams();
  params.set('recentLimit', String(options.recentLimit ?? 100));
  params.set('leaderboardLimit', String(options.leaderboardLimit ?? 50));
  const compact = compactFilter({ ...filter, following: undefined });

  Object.entries(compact).forEach(([key, value]) => {
    params.set(key, String(value));
  });

  return `/v1/dashboard/today?${params.toString()}`;
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

function buildTodayLeaderboardFromTrades(trades, nowMs = Date.now()) {
  const grouped = new Map();

  filterNewYorkSession(Array.isArray(trades) ? trades : [], nowMs).forEach((trade) => {
    const wallet = trade.trader?.proxyWallet?.toLowerCase();
    if (!wallet) return;

    const existing = grouped.get(wallet) || {
      proxyWallet: wallet,
      pseudonym: trade.trader?.pseudonym || null,
      displayName: trade.trader?.displayName || null,
      profileImage: trade.trader?.profileImage || null,
      volume: 0,
      tradeCount: 0,
      whaleCount: 0,
      topCategory: null,
    };

    existing.volume += Number(trade.usdSize || 0);
    existing.tradeCount += 1;
    existing.whaleCount += 1;
    if (!existing.displayName && trade.trader?.displayName) existing.displayName = trade.trader.displayName;
    if (!existing.pseudonym && trade.trader?.pseudonym) existing.pseudonym = trade.trader.pseudonym;
    if (!existing.profileImage && trade.trader?.profileImage) existing.profileImage = trade.trader.profileImage;

    grouped.set(wallet, existing);
  });

  return [...grouped.values()]
    .sort((a, b) => {
      const volumeDiff = Number(b.volume || 0) - Number(a.volume || 0);
      if (volumeDiff !== 0) return volumeDiff;
      return String(a.proxyWallet).localeCompare(String(b.proxyWallet));
    })
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

function filterNewYorkSession(items, nowMs = Date.now()) {
  const todayKey = newYorkDateKeyFromMs(nowMs);
  return items.filter((item) => newYorkDateKeyFromSeconds(item.timestamp) === todayKey);
}

function isInCurrentNewYorkSession(timestampSeconds) {
  return newYorkDateKeyFromSeconds(timestampSeconds) === newYorkDateKeyFromMs(Date.now());
}

function isInNewYorkSession(timestampSeconds, dateKey) {
  return newYorkDateKeyFromSeconds(timestampSeconds) === dateKey;
}

function sortWhales(items, sort) {
  const sorted = [...items];
  if (sort === 'largest') {
    return sorted.sort((a, b) => b.usdSize - a.usdSize);
  }
  return sorted.sort((a, b) => b.timestamp - a.timestamp);
}

function normalizeWalletKey(wallet) {
  if (!wallet) return '';
  return String(wallet).trim().toLowerCase();
}

function getLeaderboardProfitEntryFromItem(item) {
  const value = firstFiniteNumber(item?.allTimeProfitUsd);
  const pnlTradeCount = firstFiniteNumber(item?.allTimePnlTradeCount);
  const historyTradeCount = firstFiniteNumber(item?.allTimeHistoryTradeCount);
  const recentResults = Array.isArray(item?.recentFormResults) ? item.recentFormResults : [];
  const recentWinRatePct = firstFiniteNumber(item?.recentFormWinRatePct);
  const allTimeWinRatePct = firstFiniteNumber(item?.allTimeWinRatePct);
  const hasProfitFlag = typeof item?.allTimeProfitKnown === 'boolean';
  const hasProfitValue = value != null || item?.allTimeProfitKnown === true;
  const hasProfitMeta = pnlTradeCount != null || historyTradeCount != null || recentResults.length > 0;

  if (!hasProfitFlag && !hasProfitValue && !hasProfitMeta) return null;

  return {
    status: hasProfitValue ? 'ready' : 'empty',
    value: value ?? null,
    hasValue: hasProfitValue,
    pnlTradeCount: pnlTradeCount ?? null,
    historyTradeCount: historyTradeCount ?? pnlTradeCount ?? null,
    recentResults,
    recentWinRatePct: recentWinRatePct ?? null,
    allTimeWinRatePct: allTimeWinRatePct ?? recentWinRatePct ?? null,
  };
}

function hydrateLeaderboardProfit(item, profitEntries) {
  const wallet = normalizeWalletKey(item.proxyWallet);
  const entry = getLeaderboardProfitEntryFromItem(item) || (wallet ? profitEntries[wallet] : null);
  if (!entry || !Number.isFinite(entry.value)) {
    return {
      ...item,
      allTimeProfitUsd: null,
      allTimeProfitKnown: false,
      allTimeProfitStatus: entry?.status || 'pending',
      allTimePnlTradeCount: Number.isFinite(entry?.pnlTradeCount) ? entry.pnlTradeCount : null,
      allTimeHistoryTradeCount: Number.isFinite(entry?.historyTradeCount) ? entry.historyTradeCount : null,
      recentFormResults: Array.isArray(entry?.recentResults) ? entry.recentResults : [],
      recentFormWinRatePct: Number.isFinite(entry?.recentWinRatePct) ? entry.recentWinRatePct : null,
      allTimeWinRatePct: Number.isFinite(entry?.allTimeWinRatePct) ? entry.allTimeWinRatePct : null,
    };
  }

  return {
    ...item,
    allTimeProfitUsd: entry.value,
    allTimeProfitKnown: true,
    allTimeProfitStatus: entry.status || 'ready',
    allTimePnlTradeCount: Number.isFinite(entry.pnlTradeCount) ? entry.pnlTradeCount : null,
    allTimeHistoryTradeCount: Number.isFinite(entry.historyTradeCount) ? entry.historyTradeCount : null,
    recentFormResults: Array.isArray(entry.recentResults) ? entry.recentResults : [],
    recentFormWinRatePct: Number.isFinite(entry.recentWinRatePct) ? entry.recentWinRatePct : null,
    allTimeWinRatePct: Number.isFinite(entry.allTimeWinRatePct) ? entry.allTimeWinRatePct : null,
  };
}

function sortLeaderboardItems(items, sort) {
  const sorted = [...items];
  if (sort === 'volume' || sort === 'rank') {
    return sorted.sort((a, b) => {
      const volumeDiff = Number(b.volume || 0) - Number(a.volume || 0);
      if (volumeDiff !== 0) return volumeDiff;
      return Number(a.rank || 0) - Number(b.rank || 0);
    });
  }
  if (sort === 'trades') {
    return sorted.sort((a, b) => Number(b.tradeCount || 0) - Number(a.tradeCount || 0));
  }
  if (sort === 'profit') {
    return sorted.sort((a, b) => {
      const aHasProfit = Boolean(a.allTimeProfitKnown);
      const bHasProfit = Boolean(b.allTimeProfitKnown);
      if (aHasProfit !== bHasProfit) return aHasProfit ? -1 : 1;
      if (aHasProfit && bHasProfit) {
        const profitDiff = Number(b.allTimeProfitUsd || 0) - Number(a.allTimeProfitUsd || 0);
        if (profitDiff !== 0) return profitDiff;
      }
      return Number(a.rank || 0) - Number(b.rank || 0);
    });
  }
  return sorted.sort((a, b) => Number(b.volume || 0) - Number(a.volume || 0));
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

function buildWalletProfileTrades(profile, historyTrades) {
  const recentTrades = Array.isArray(profile?.recentWhales) ? profile.recentWhales : [];
  const fetchedTrades = Array.isArray(historyTrades) ? historyTrades : [];
  return sortWhales(mergeWhales([], [...fetchedTrades, ...recentTrades]), 'recent');
}

function buildCompactPagination(currentPage, pageCount) {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  let start = Math.max(2, currentPage - 1);
  let end = Math.min(pageCount - 1, currentPage + 1);

  if (currentPage <= 3) {
    end = 4;
  } else if (currentPage >= pageCount - 2) {
    start = pageCount - 3;
  }

  const pages = [1];
  if (start > 2) pages.push('gap-start');

  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }

  if (end < pageCount - 1) pages.push('gap-end');
  pages.push(pageCount);
  return pages;
}

function buildWalletPerformance(profile, trades, windowId, stats) {
  const sourceTrades = Array.isArray(trades) ? trades : [];
  const fullResults = buildWalletResultEntries(sourceTrades);
  const marketResults = buildWalletMarketResultEntries(fullResults);
  const resolvedWindow = profile?.resolved?.windows?.[windowId] || null;
  const resolvedLongestWinStreak = firstFiniteNumber(profile?.resolved?.longestWinStreak);
  const resolvedRecentResults = normalizeResolvedResultList(profile?.resolved?.recentResults, 15);
  const windowResults = fullResults.filter((entry) => isWalletTradeInWindow(entry.trade, windowId));
  const windowTrades = sourceTrades.filter((trade) => isWalletTradeInWindow(trade, windowId));
  const statTradeCount = resolvedWindow
    ? firstFiniteNumber(resolvedWindow.buyCount)
    : firstFiniteNumber(stats?.tradeCount, stats?.whaleCount);
  const tradeCount = statTradeCount ?? windowTrades.length;
  const suppliedWinRate = normalizeWinRatePercent(resolvedWindow
    ? firstFiniteNumber(resolvedWindow.winRate)
    : firstFiniteNumber(
      stats?.winRate,
      stats?.winRatePct,
      stats?.winRatePercent,
      profile?.performance?.[windowId]?.winRate,
      profile?.performance?.[windowId]?.winRatePct
    ));
  const suppliedWins = resolvedWindow
    ? firstFiniteNumber(resolvedWindow.winCount)
    : firstFiniteNumber(stats?.wins, stats?.winCount, stats?.resolvedWins);
  const suppliedLosses = resolvedWindow
    ? firstFiniteNumber(resolvedWindow.lossCount)
    : firstFiniteNumber(stats?.losses, stats?.lossCount, stats?.resolvedLosses);
  const computedWins = windowResults.filter((entry) => entry.result === 'W').length;
  const computedLosses = windowResults.filter((entry) => entry.result === 'L').length;
  const resolvedWindowCount = computedWins + computedLosses;
  let winRatePct = suppliedWinRate;

  if (winRatePct == null && suppliedWins != null && suppliedLosses != null && suppliedWins + suppliedLosses > 0) {
    winRatePct = (suppliedWins / (suppliedWins + suppliedLosses)) * 100;
  }

  if (winRatePct == null && resolvedWindowCount > 0) {
    winRatePct = (computedWins / resolvedWindowCount) * 100;
  }

  const recentResults = resolvedRecentResults.length
    ? resolvedRecentResults
    : fullResults
      .slice(-15)
      .reverse()
      .map((entry) => entry.result);

  return {
    tradeCount,
    winRatePct,
    winRateLabel: winRatePct == null ? '--' : `${trimNumber(winRatePct)}%`,
    longestWinStreak: resolvedLongestWinStreak ?? longestWinningStreak(marketResults),
    recentResults,
    recentMini: recentResults.slice(0, 5),
    historyCount: sourceTrades.length,
    resolvedCount: fullResults.length,
  };
}

function buildWalletResultEntries(trades) {
  return (Array.isArray(trades) ? trades : [])
    .map((trade) => {
      const result = getWalletTradeResult(trade);
      if (!result) return null;
      const resolution = getTradeResolutionBlock(trade);
      return {
        trade,
        result,
        timestamp: Number(trade?.timestamp || resolution?.resolvedAt || 0),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.timestamp - b.timestamp);
}

function buildWalletMarketResultEntries(resultEntries) {
  const groups = new Map();

  for (const entry of Array.isArray(resultEntries) ? resultEntries : []) {
    const key = getWalletMarketResultKey(entry.trade);
    const existing = groups.get(key);
    const pnl = getWalletTradePnl(entry.trade);

    if (!existing) {
      groups.set(key, {
        key,
        trade: entry.trade,
        timestamp: entry.timestamp,
        resultCounts: { W: entry.result === 'W' ? 1 : 0, L: entry.result === 'L' ? 1 : 0 },
        pnl: Number.isFinite(pnl) ? pnl : null,
      });
      continue;
    }

    existing.timestamp = Math.min(existing.timestamp, entry.timestamp);
    existing.resultCounts[entry.result] += 1;
    if (Number.isFinite(pnl)) {
      existing.pnl = existing.pnl == null ? pnl : existing.pnl + pnl;
    }
  }

  return [...groups.values()]
    .map((group) => {
      let result = null;
      if (group.pnl != null && group.pnl > 0) result = 'W';
      else if (group.pnl != null && group.pnl < 0) result = 'L';
      else if (group.resultCounts.W > group.resultCounts.L) result = 'W';
      else if (group.resultCounts.L > group.resultCounts.W) result = 'L';
      if (!result) return null;

      return {
        trade: group.trade,
        result,
        timestamp: group.timestamp,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.timestamp - b.timestamp);
}

function getWalletMarketResultKey(trade) {
  const marketKey = normalizeKeyToken(
    trade?.market?.conditionId ||
    trade?.market?.slug ||
    trade?.market?.eventSlug ||
    trade?.conditionId ||
    trade?.marketSlug ||
    trade?.eventSlug ||
    trade?.id
  );
  return marketKey;
}

function getWalletTradeResult(trade) {
  const resolution = getTradeResolutionBlock(trade);
  const explicitResult = normalizeWalletResult(
    resolution?.traderResult,
    resolution?.result,
    resolution?.outcomeResult,
    trade?.traderResult,
    trade?.result,
    trade?.outcomeResult,
    resolution?.status,
    resolution?.marketStatus
  );
  if (explicitResult) return explicitResult;

  const pnl = getWalletTradePnl(trade);
  if (pnl > 0) return 'W';
  if (pnl < 0) return 'L';

  return inferBuyTradeResultFromWinningOutcome(trade, resolution);
}

function normalizeWalletResult(...values) {
  for (const value of values) {
    const token = normalizeStatusToken(value);
    if (!token) continue;
    if (['w', 'win', 'won', 'profit', 'profitable', 'resolved_win'].includes(token)) return 'W';
    if (['l', 'loss', 'lost', 'unprofitable', 'resolved_loss'].includes(token)) return 'L';
  }
  return null;
}

function normalizeResolvedResultList(values, limit = 15) {
  if (!Array.isArray(values)) return [];
  return values
    .map((value) => normalizeWalletResult(value))
    .filter(Boolean)
    .slice(0, limit);
}

function getWalletTradePnl(trade) {
  const resolution = getTradeResolutionBlock(trade);
  const explicitPnl = firstFiniteNumber(
    resolution?.pnlUsd,
    resolution?.profitUsd,
    resolution?.netProfitUsd,
    resolution?.profit,
    trade?.pnlUsd,
    trade?.profitUsd,
    trade?.netProfitUsd,
    trade?.profit
  );
  if (explicitPnl != null) return explicitPnl;

  const payout = firstFiniteNumber(resolution?.payoutUsd, trade?.payoutUsd);
  const cost = firstFiniteNumber(trade?.usdSize, trade?.sizeUsd);
  if (trade?.side !== 'SELL' && payout != null && cost != null && isTradeMarketClosed(trade)) {
    return payout - cost;
  }

  return null;
}

function inferBuyTradeResultFromWinningOutcome(trade, resolution) {
  if (!isTradeMarketClosed(trade) || trade?.side === 'SELL') return null;
  const winningOutcome = normalizeOutcomeValue(
    resolution?.winningOutcome ||
    resolution?.winner ||
    resolution?.resolvedOutcome ||
    resolution?.winningToken
  );
  const tradeOutcome = normalizeOutcomeValue(trade?.outcome || trade?.outcomeLabel || trade?.tokenOutcome);

  if (!winningOutcome || !tradeOutcome) return null;
  return winningOutcome === tradeOutcome ? 'W' : 'L';
}

function normalizeOutcomeValue(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeKeyToken(value) {
  return normalizeOutcomeValue(value).replace(/[^a-z0-9]+/g, '_') || 'unknown';
}

function buildWalletProfitSummary(profile, trades) {
  const resolvedProfit = firstFiniteNumber(profile?.resolved?.realizedPnlUsd);
  const resolvedTradeCount = firstFiniteNumber(profile?.resolved?.buyCount);

  if (resolvedProfit != null && resolvedTradeCount != null && resolvedTradeCount > 0) {
    return {
      value: resolvedProfit,
      hasValue: true,
      pnlTradeCount: resolvedTradeCount,
      firstTradeAt: firstFiniteNumber(profile?.resolved?.firstTradeAt, profile?.firstSeen),
    };
  }

  const sourceTrades = Array.isArray(trades) ? trades : [];
  const pnlValues = sourceTrades
    .map((trade) => getWalletTradePnl(trade))
    .filter((value) => Number.isFinite(value));
  const value = pnlValues.reduce((total, pnl) => total + pnl, 0);
  const tradeTimestamps = sourceTrades
    .map((trade) => Number(trade?.timestamp || 0))
    .filter((timestamp) => timestamp > 0);
  const firstTradeAt = tradeTimestamps.length
    ? Math.min(...tradeTimestamps)
    : Number(profile?.firstSeen || 0);

  return {
    value,
    hasValue: pnlValues.length > 0,
    pnlTradeCount: pnlValues.length,
    firstTradeAt,
  };
}

function buildLeaderboardRecentForm(trades) {
  const entries = buildWalletResultEntries(trades);
  const results = entries
    .slice(-5)
    .reverse()
    .map((entry) => entry.result);
  const wins = results.filter((result) => result === 'W').length;
  const allTimeWins = entries.filter((entry) => entry.result === 'W').length;

  return {
    results,
    winRatePct: results.length ? (wins / results.length) * 100 : null,
    allTimeWinRatePct: entries.length ? (allTimeWins / entries.length) * 100 : null,
  };
}

function isWalletTradeInWindow(trade, windowId) {
  const timestamp = Number(trade?.timestamp || 0);
  if (!timestamp) return false;
  if (windowId === '1d') return isInCurrentNewYorkSession(timestamp);

  const days = {
    '7d': 7,
    '30d': 30,
    '365d': 365,
  }[windowId];

  if (!days) return true;
  const tradeDateKey = newYorkDateKeyFromSeconds(timestamp);
  const currentDateKey = newYorkDateKeyFromMs(Date.now());
  return tradeDateKey >= getNewYorkWindowStartDateKey(days, currentDateKey) && tradeDateKey <= currentDateKey;
}

function getNewYorkWindowStartDateKey(days, currentDateKey) {
  const [year, month, day] = String(currentDateKey || '').split('-').map(Number);
  if (!year || !month || !day) return currentDateKey;
  const start = new Date(Date.UTC(year, month - 1, day - (days - 1)));
  return start.toISOString().slice(0, 10);
}

function longestWinningStreak(results) {
  let current = 0;
  let longest = 0;

  for (const entry of results) {
    if (entry.result === 'W') {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }

  return longest;
}

function normalizeWinRatePercent(value) {
  if (value == null) return null;
  const rate = Number(value);
  if (!Number.isFinite(rate)) return null;
  return rate <= 1 ? rate * 100 : rate;
}

function firstFiniteNumber(...values) {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue;
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return null;
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

function buildWalletVolumeMix(stats) {
  const buyVolume = Number(stats.buyVolume || 0);
  const sellVolume = Number(stats.sellVolume || 0);
  const totalVolume = buyVolume + sellVolume;
  return {
    buyVolume,
    sellVolume,
    totalTrades: Number(stats.tradeCount || stats.whaleCount || 0),
    buyPct: totalVolume > 0 ? (buyVolume / totalVolume) * 100 : 50,
    sellPct: totalVolume > 0 ? (sellVolume / totalVolume) * 100 : 50,
  };
}

function buildWalletDailyVolume(points) {
  const days = (Array.isArray(points) ? points : [])
    .slice(-14)
    .map((point) => ({
      date: point.date || point.day || point.timestamp || '',
      label: formatDailyLabel(point.date || point.day || point.timestamp),
      volume: Number(point.volume || 0),
    }));
  const total = days.reduce((sum, day) => sum + day.volume, 0);
  const avg = days.length ? total / days.length : 0;
  return {
    avg: formatUsdCompact(avg),
    days,
  };
}

function formatDailyLabel(value) {
  if (!value) return '';
  const date = typeof value === 'number'
    ? new Date(value * (value > 100000000000 ? 1 : 1000))
    : new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return String(value).slice(5) || String(value);
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
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

function buildDashboardFeedStats(dashboard, fallback) {
  const today = dashboard?.today;
  if (!today) return fallback;

  const biggestTrade = today.biggestTrade || null;
  return {
    ...fallback,
    volume: Number(today.volumeUsd || 0),
    activeTraders: Number(today.activeWhales || 0),
    megaTrades: Number(today.megaTrades || 0),
    biggestTradeUsd: Number(biggestTrade?.usdSize || 0),
    biggestTradeSide: biggestTrade?.side === 'SELL' ? 'SELL' : 'BUY',
  };
}

function buildDashboardLastHour(dashboard, fallback) {
  const last60m = dashboard?.last60m;
  if (!last60m || !Array.isArray(last60m.buckets)) return fallback;

  const buckets = last60m.buckets.map((value) => Number(value || 0));
  const bucketCount = Math.max(buckets.length, 2);
  const max = Math.max(...buckets, 1);
  const points = buckets.map((value, index) => {
    const x = (index / (bucketCount - 1)) * 280;
    const y = 54 - (value / max) * 46;
    return [Number(x.toFixed(2)), Number(y.toFixed(2))];
  });

  return {
    count: Number(last60m.tradeCount || 0),
    volume: Number(last60m.volumeUsd || 0),
    points,
  };
}

function buildDashboardLeaderboard(dashboard, fallbackTrades) {
  if (Array.isArray(dashboard?.leaderboard)) {
    return dashboard.leaderboard;
  }

  return buildTodayLeaderboardFromTrades(fallbackTrades);
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

function buildMobileMarketIcon(trade) {
  const imageUrl = getMarketImageUrls(trade)[0];
  if (imageUrl) {
    return { type: 'img', value: imageUrl };
  }

  const outcome = String(trade.outcome || '').trim();
  if (outcome) {
    const short = outcome.slice(0, 3).toUpperCase();
    return {
      type: 'text',
      value: short,
      bg: trade.side === 'SELL' ? '#6b2a3c' : '#1f4a3e',
    };
  }

  const category = inferCategory(trade);
  const categoryTone = {
    politics: '#4a3d77',
    sports: '#4f3a21',
    crypto: '#204153',
    econ: '#1f4a3e',
  }[category.id];

  return {
    type: 'text',
    value: category.label.slice(0, 3).toUpperCase(),
    bg: categoryTone || '#3b3b3b',
  };
}

function buildMarketHref(trade) {
  const slug = trade?.market?.slug;
  return slug ? `/market/${encodeURIComponent(slug)}` : null;
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
  return /^0x[0-9a-fA-F]{40}/i.test(String(value || '').trim());
}

function isWalletishLabel(value) {
  return /^0x[0-9a-fA-F.]{4,}/i.test(String(value || '').trim());
}

function formatTraderLabel(name, wallet) {
  const normalizedName = String(name || '').trim();
  if (normalizedName && !isWalletishLabel(normalizedName)) {
    return normalizedName.length > 42 ? `${normalizedName.slice(0, 30)}...${normalizedName.slice(-6)}` : normalizedName;
  }
  return shortWallet(wallet || normalizedName) || 'Unknown trader';
}

function normalizeTradeDetailPayload(payload) {
  if (!payload) return null;
  if (payload.trade) {
    const trade = payload.trade;
    return {
      ...payload,
      trade,
      market: payload.market || trade.market || {},
      trader: payload.trader || trade.trader || {},
      relatedTrades: Array.isArray(payload.relatedTrades) && payload.relatedTrades.length
        ? payload.relatedTrades
        : [trade],
      scenario: payload.scenario || buildClientTradeScenario(trade),
      onChain: payload.onChain || buildClientOnChain(trade),
    };
  }

  return {
    trade: payload,
    market: payload.market || {},
    trader: payload.trader || {},
    relatedTrades: [payload],
    scenario: buildClientTradeScenario(payload),
    onChain: buildClientOnChain(payload),
  };
}

function buildClientOnChain(trade) {
  const transactionHash = trade?.transactionHash || null;
  return {
    transactionHash,
    explorerUrl: transactionHash ? `https://polygonscan.com/tx/${transactionHash}` : null,
  };
}

function buildClientTradeScenario(trade) {
  const side = trade?.side === 'SELL' ? 'SELL' : 'BUY';
  const outcome = String(trade?.outcome || 'YES').trim().toUpperCase() || 'YES';
  const usdSize = Number(trade?.usdSize || 0);
  const shares = Number(trade?.shares || 0);
  const impliedProbability = Number(getPriceValue(trade || {}).toFixed(2));

  if (side === 'SELL') {
    return {
      mode: 'sell',
      payoutLabel: 'SALE PROCEEDS',
      payoutIfWin: usdSize,
      payoutDelta: 'Position reduced',
      lossLabel: 'SHARES SOLD',
      lossIfLose: shares,
      lossDelta: null,
      probabilityLabel: 'IMPLIED PROBABILITY',
      impliedProbability,
      probabilityDelta: 'From execution price',
    };
  }

  const payout = shares;
  const profit = payout - usdSize;
  const profitPct = usdSize > 0 ? (profit / usdSize) * 100 : 0;

  return {
    mode: 'buy',
    payoutLabel: `IF ${outcome} PAYOUT`,
    payoutIfWin: payout,
    payoutDelta: `${profit >= 0 ? '+' : '-'}${formatUsdFull(Math.abs(profit))} (${profitPct >= 0 ? '+' : '-'}${trimNumber(Math.abs(profitPct))}%)`,
    lossLabel: `IF ${otherBinaryOutcome(outcome)} LOSS`,
    lossIfLose: usdSize,
    lossDelta: '-100%',
    probabilityLabel: 'IMPLIED PROBABILITY',
    impliedProbability,
    probabilityDelta: 'From execution price',
  };
}

function otherBinaryOutcome(outcome) {
  if (outcome === 'YES') return 'NO';
  if (outcome === 'NO') return 'YES';
  return outcome ? `NOT ${outcome}` : 'OTHER';
}

function formatScenarioValue(value) {
  return formatUsdFull(value);
}

function formatTierLabel(tier) {
  return String(tier || 'whale').trim().toUpperCase();
}

function shortHash(hash) {
  const value = String(hash || '');
  if (!value) return '';
  if (value.length <= 18) return value;
  return `${value.slice(0, 10)}...${value.slice(-6)}`;
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

function formatSignedUsdCompact(value) {
  const amount = Number(value || 0);
  const prefix = amount >= 0 ? '+' : '-';
  return `${prefix}${formatUsdCompact(Math.abs(amount))}`;
}

function formatLeaderboardProfit(trader) {
  return trader?.allTimeProfitKnown ? formatSignedUsdCompact(trader.allTimeProfitUsd) : '--';
}

function getLeaderboardProfitTone(trader) {
  if (!trader?.allTimeProfitKnown) return 'muted';
  return Number(trader.allTimeProfitUsd || 0) < 0 ? 'loss' : 'profit';
}

function formatLeaderboardAllTimeWinRate(trader) {
  const value = firstFiniteNumber(trader?.allTimeWinRatePct, trader?.recentFormWinRatePct);
  return value != null ? `${trimNumber(value)}%` : '--';
}

function formatLeaderboardProfitTradeCount(trader, loading = false) {
  if (Number.isFinite(trader?.allTimePnlTradeCount)) return formatNumber(trader.allTimePnlTradeCount);
  if (Number.isFinite(trader?.allTimeHistoryTradeCount)) return formatNumber(trader.allTimeHistoryTradeCount);
  return loading ? '...' : '--';
}

function formatSignedUsd(value) {
  const amount = Number(value || 0);
  const prefix = amount > 0 ? '+' : amount < 0 ? '-' : '';
  return `${prefix}${formatUsdFull(Math.abs(amount))}`;
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

function getTradeResolutionBlock(trade) {
  const outcomeObject = trade?.outcome && typeof trade.outcome === 'object' ? trade.outcome : null;
  return (
    trade?.resolution ||
    trade?.tradeResolution ||
    trade?.marketResolution ||
    trade?.market?.resolution ||
    outcomeObject ||
    null
  );
}

function normalizeResolutionStatus(resolution) {
  return normalizeStatusToken(resolution?.status || resolution?.marketStatus || '');
}

function normalizeStatusToken(value) {
  return String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function isClosedResolutionStatus(status) {
  return ['closed', 'resolved', 'resolved_win', 'resolved_loss', 'invalid'].includes(status);
}

function isTradeMarketClosed(trade) {
  const resolution = getTradeResolutionBlock(trade);
  const status = normalizeResolutionStatus(resolution);
  return Boolean(resolution?.closed || resolution?.resolvedAt || isClosedResolutionStatus(status));
}

function getMarketStatusMeta(trade) {
  const resolution = getTradeResolutionBlock(trade);
  const status = normalizeResolutionStatus(resolution);
  const closed = isTradeMarketClosed(trade);

  if (!closed) {
    return {
      label: 'Open',
      tone: 'open',
      closed: false,
      title: 'Market is still open or no resolver outcome has been materialized yet.',
    };
  }

  const detail =
    status === 'closed'
      ? 'Market is closed; final trade result is still pending.'
      : status === 'invalid'
        ? 'Market resolution was flagged invalid by the resolver.'
        : 'Market has resolved.';

  return {
    label: 'Closed',
    tone: status === 'invalid' ? 'invalid' : 'closed',
    closed: true,
    title: detail,
  };
}

function getTraderOutcomeMeta(trade) {
  const resolution = getTradeResolutionBlock(trade);
  const status = normalizeResolutionStatus(resolution);
  const side = trade?.side === 'SELL' ? 'SELL' : 'BUY';
  const winningOutcome = resolution?.winningOutcome ? ` Winning outcome: ${resolution.winningOutcome}.` : '';

  if (!isTradeMarketClosed(trade)) {
    return {
      label: side === 'SELL' ? 'Sold' : 'Open',
      tone: 'open',
      title: 'Trade result is not resolved yet.',
    };
  }

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

function applyResolutionUpdateToTrades(trades, payload) {
  if (!Array.isArray(trades) || !payload) return trades;

  let changed = false;
  const updated = trades.map((trade) => {
    if (!tradeMatchesResolutionEvent(trade, payload)) return trade;

    changed = true;
    const existing = getTradeResolutionBlock(trade) || {};
    const existingStatus = normalizeResolutionStatus(existing);
    const nextStatus = existingStatus && existingStatus !== 'open'
      ? (existing.status || existing.marketStatus)
      : payload.type === 'invalid'
        ? 'invalid'
        : 'closed';

    return {
      ...trade,
      resolution: {
        ...existing,
        status: nextStatus,
        winningOutcome: payload.winningOutcome ?? existing.winningOutcome ?? null,
        payoutUsd: existing.payoutUsd ?? null,
        pnlUsd: existing.pnlUsd ?? null,
        resolvedAt: payload.resolvedAt ?? existing.resolvedAt ?? null,
        closed: true,
      },
    };
  });

  return changed ? updated : trades;
}

function tradeMatchesResolutionEvent(trade, payload) {
  const eventConditionId = String(payload.conditionId || '').trim().toLowerCase();
  const eventSlug = String(payload.slug || '').trim().toLowerCase();
  const tradeConditionId = String(
    trade?.market?.conditionId ||
    trade?.market?.conditionID ||
    trade?.market?.condition_id ||
    trade?.conditionId ||
    ''
  ).trim().toLowerCase();
  const tradeSlug = String(trade?.market?.slug || trade?.slug || '').trim().toLowerCase();

  return Boolean(
    (eventConditionId && tradeConditionId && eventConditionId === tradeConditionId) ||
    (eventSlug && tradeSlug && eventSlug === tradeSlug)
  );
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

function formatDateShort(timestampSeconds) {
  if (!timestampSeconds) return 'Unknown';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
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

function getCurrentNewYorkSession(nowMs = Date.now()) {
  const dateKey = newYorkDateKeyFromMs(nowMs);
  return {
    dateKey,
    timezone: 'America/New_York',
    nextResetMs: findNextNewYorkDateChangeMs(nowMs, dateKey),
  };
}

function findNextNewYorkDateChangeMs(nowMs, currentDateKey) {
  let low = nowMs;
  let high = nowMs + 36 * 60 * 60 * 1000;

  while (newYorkDateKeyFromMs(high) === currentDateKey) {
    high += 12 * 60 * 60 * 1000;
  }

  for (let step = 0; step < 48; step += 1) {
    const mid = Math.floor((low + high) / 2);
    if (newYorkDateKeyFromMs(mid) === currentDateKey) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return high;
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
