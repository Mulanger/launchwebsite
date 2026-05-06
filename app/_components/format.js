export function formatUsdCompact(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: number >= 1000000 ? 1 : 0,
  }).format(number);
}

export function shortWallet(wallet) {
  if (!wallet) return 'Unknown wallet';
  return `${wallet.slice(0, 6)}..${wallet.slice(-4)}`;
}

export function formatDateTime(timestamp) {
  if (!timestamp) return 'Recent';
  const date = new Date(Number(timestamp) * 1000);
  if (Number.isNaN(date.getTime())) return 'Recent';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}
