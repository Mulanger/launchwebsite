import { notFound } from 'next/navigation';
import { MarketDashboardSnapshot } from '../../_components/PublicAppSnapshot.jsx';
import { buildNextMetadata } from '../../../src/lib/next-metadata.js';
import { fetchMarketPageData, marketPathForSlug } from '../../../src/lib/market-pages.js';

export const revalidate = 300;

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const data = await fetchMarketPageData(slug);

  if (!data) {
    return buildNextMetadata({
      title: 'Polymarket Market Not Found | Polywhale',
      description: 'This Polywhale market page is not available because no tracked whale trades were found for the market.',
      path: marketPathForSlug(slug) || '/market',
      robots: 'noindex,follow',
    });
  }

  const title = `${data.market.title} | Polymarket Whale Trades | Polywhale`;
  const description = `Track Polywhale whale volume, recent large trades, top whale wallets, and price signals for ${data.market.title} on Polymarket.`;

  return buildNextMetadata({
    title,
    description,
    keywords: [
      data.market.title,
      `Polymarket ${data.market.title}`,
      'Polymarket whale trades',
      'Polywhale market',
      'Polymarket market whale volume',
    ].join(', '),
    path: marketPathForSlug(data.market.slug),
    robots: data.seo.indexable ? 'index,follow,max-image-preview:large' : 'noindex,follow',
  });
}

export default async function MarketPage({ params }) {
  const { slug } = await params;
  const data = await fetchMarketPageData(slug);

  if (!data) {
    notFound();
  }

  return <MarketDashboardSnapshot data={data} />;
}
