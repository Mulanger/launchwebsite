import { notFound, permanentRedirect } from 'next/navigation';
import JsonLd from '../../_components/JsonLd.jsx';
import TraderProfileSnapshot from '../../_components/TraderProfileSnapshot.jsx';
import { buildNextMetadata } from '../../../src/lib/next-metadata.js';
import {
  buildTraderDescription,
  buildTraderProfileStructuredData,
  fetchTraderProfile,
  getTraderDisplayName,
  getTraderStats,
  isWalletAddress,
  normalizeWallet,
  resolveTraderAlias,
  traderPathForWallet,
} from '../../../src/lib/trader-pages.js';

export const revalidate = 300;

async function resolveTraderParam(rawParam) {
  const decoded = decodeURIComponent(String(rawParam || '').trim());

  if (isWalletAddress(decoded)) {
    const wallet = normalizeWallet(decoded);
    return {
      wallet,
      canonicalPath: traderPathForWallet(wallet),
      redirectPath: wallet === decoded ? '' : traderPathForWallet(wallet),
    };
  }

  const aliasMatch = await resolveTraderAlias(decoded);

  if (!aliasMatch?.proxyWallet) {
    return null;
  }

  return {
    wallet: normalizeWallet(aliasMatch.proxyWallet),
    canonicalPath: traderPathForWallet(aliasMatch.proxyWallet),
    redirectPath: traderPathForWallet(aliasMatch.proxyWallet),
  };
}

export async function generateMetadata({ params }) {
  const { wallet: rawWallet } = await params;
  const resolved = await resolveTraderParam(rawWallet);

  if (!resolved) {
    return buildNextMetadata({
      title: 'Polymarket Trader Not Found | Polywhale',
      description: 'This Polywhale trader profile is not available.',
      path: '/leaderboard',
      robots: 'noindex,follow',
    });
  }

  const profile = await fetchTraderProfile(resolved.wallet);

  if (!profile) {
    return buildNextMetadata({
      title: 'Polymarket Trader Not Found | Polywhale',
      description: 'This Polywhale trader profile is not available.',
      path: resolved.canonicalPath,
      robots: 'noindex,follow',
    });
  }

  const stats = getTraderStats(profile, '30d');
  const name = getTraderDisplayName(profile);

  return buildNextMetadata({
    title: `${name} Polymarket Trader Profile | Polywhale`,
    description: buildTraderDescription(profile, stats),
    keywords: [
      name,
      profile.proxyWallet,
      profile.pseudonym,
      profile.displayName,
      'Polymarket trader profile',
      'Polymarket whale wallet',
      'Polywhale trader',
      'Polymarket whale trades',
    ]
      .filter(Boolean)
      .join(', '),
    path: traderPathForWallet(profile.proxyWallet),
    robots: 'index,follow,max-image-preview:large',
  });
}

export default async function TraderPage({ params }) {
  const { wallet: rawWallet } = await params;
  const resolved = await resolveTraderParam(rawWallet);

  if (!resolved) {
    notFound();
  }

  if (resolved.redirectPath) {
    permanentRedirect(resolved.redirectPath);
  }

  const profile = await fetchTraderProfile(resolved.wallet);

  if (!profile) {
    notFound();
  }

  return (
    <>
      <JsonLd data={buildTraderProfileStructuredData(profile)} />
      <TraderProfileSnapshot profile={profile} />
    </>
  );
}
