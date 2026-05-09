const defaultApiBase = 'https://whaleserver-production.up.railway.app';

export function getServerApiBase() {
  return (process.env.API_BASE_URL || defaultApiBase).replace(/\/$/, '');
}

export async function fetchServerJson(path, options = {}) {
  const url = new URL(path, getServerApiBase());
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed with ${response.status}`);
  }

  return response.json();
}

export async function fetchPublicWhales(limit = 12) {
  const params = new URLSearchParams({
    limit: String(limit),
    minUsd: '10000',
  });
  return fetchServerJson(`/v1/whales?${params.toString()}`, {
    next: { revalidate: 60 },
  });
}

export async function fetchPublicDashboardToday(recentLimit = 100, leaderboardLimit = 50) {
  const params = new URLSearchParams({
    recentLimit: String(recentLimit),
    leaderboardLimit: String(leaderboardLimit),
  });
  return fetchServerJson(`/v1/dashboard/today?${params.toString()}`, {
    next: { revalidate: 60 },
  });
}

export async function fetchPublicLeaderboard(windowId = '1d', limit = 20) {
  const params = new URLSearchParams({
    window: windowId,
    limit: String(limit),
  });
  return fetchServerJson(`/v1/leaderboard?${params.toString()}`, {
    next: { revalidate: 60 },
  });
}

export async function fetchPublicMarketPage(slug) {
  return fetchServerJson(`/v1/market-pages/${encodeURIComponent(slug)}`, {
    next: { revalidate: 300 },
  });
}

export async function fetchPublicMarketPageIndex(limit = 250) {
  const params = new URLSearchParams({
    indexable: 'true',
    limit: String(limit),
  });
  return fetchServerJson(`/v1/market-pages?${params.toString()}`, {
    next: { revalidate: 300 },
  });
}

export async function fetchPublicTraderPageIndex(limit = 500) {
  const params = new URLSearchParams({
    indexable: 'true',
    limit: String(limit),
  });
  return fetchServerJson(`/v1/trader-pages?${params.toString()}`, {
    next: { revalidate: 300 },
  });
}
