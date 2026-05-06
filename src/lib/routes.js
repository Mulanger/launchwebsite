export function normalizeAppPath(pathname = '/') {
  const withoutQuery = String(pathname || '/').split('?')[0].split('#')[0];
  const normalized = withoutQuery.replace(/\/+$/, '') || '/';
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

export function matchAppRoute(pathname = '/') {
  const path = normalizeAppPath(pathname);
  return {
    path,
    tradeMatch: path.match(/^\/trade\/([^/]+)$/),
    traderMatch: path.match(/^\/trader\/([^/]+)$/),
  };
}

export function getBrowserPathname(fallback = '/') {
  if (typeof window === 'undefined') return fallback;
  return window.location.pathname;
}
