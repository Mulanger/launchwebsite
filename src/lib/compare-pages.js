import { seoImage, siteName, siteOrigin } from './seo.js';

export const COMPARE_LAST_MODIFIED = '2026-05-08T00:00:00.000Z';

export const comparePages = [
  {
    slug: 'polymarket-vs-kalshi',
    path: '/compare/polymarket-vs-kalshi',
    title: 'Polymarket vs Kalshi: Fees, Regulation, Markets | Polywhale',
    h1: 'Polymarket vs Kalshi',
    description:
      'Compare Polymarket and Kalshi on fees, regulation, deposits, market coverage, liquidity signals, and trader fit before choosing a prediction market.',
    keywords:
      'Polymarket vs Kalshi, Kalshi vs Polymarket, prediction markets comparison, Polymarket fees, Kalshi fees, Polymarket alternatives, Kalshi alternatives',
  },
];

export const polymarketVsKalshi = comparePages[0];

export const comparisonSources = [
  {
    label: 'Polymarket fee documentation',
    url: 'https://docs.polymarket.com/trading/fees',
  },
  {
    label: 'Polymarket deposit documentation',
    url: 'https://docs.polymarket.com/polymarket-learn/get-started/how-to-deposit',
  },
  {
    label: 'Kalshi fee documentation',
    url: 'https://help.kalshi.com/trading/fees',
  },
  {
    label: 'Kalshi fee schedule',
    url: 'https://kalshi.com/fee-schedule',
  },
  {
    label: 'Kalshi regulation documentation',
    url: 'https://help.kalshi.com/en/articles/13823765-how-is-kalshi-regulated',
  },
  {
    label: 'Kalshi bank deposit documentation',
    url: 'https://help.kalshi.com/en/articles/13823798-bank-deposits',
  },
];

export const comparisonRows = [
  {
    feature: 'Best default fit',
    polymarket: 'Crypto-native global traders who want broad event coverage and public wallet transparency.',
    kalshi: 'US-based traders who want a federally regulated exchange and familiar dollar funding rails.',
  },
  {
    feature: 'Trading fees',
    polymarket:
      'Market dependent. Polymarket docs say some markets charge taker fees, makers are not charged, and some categories are fee-free.',
    kalshi:
      'Kalshi charges transaction fees based on expected earnings; some markets can have different or maker-specific fees.',
  },
  {
    feature: 'Funding',
    polymarket:
      'Uses USDC on Polygon for transactions; deposits can come from supported crypto rails and card providers.',
    kalshi:
      'Supports bank transfer for US users, plus other transfer methods described in Kalshi help documentation.',
  },
  {
    feature: 'Regulatory posture',
    polymarket:
      'Crypto prediction market with jurisdiction-dependent availability and a separate US regulatory path through Polymarket US.',
    kalshi:
      'Kalshi says it is CFTC-regulated as a Designated Contract Market for event contracts.',
  },
  {
    feature: 'Market catalog',
    polymarket:
      'Strong for global news, crypto, sports, politics, culture, and fast-moving event markets.',
    kalshi:
      'Strong for US-focused event contracts, economic data, politics, weather, sports, and regulated product access.',
  },
  {
    feature: 'Transparency',
    polymarket:
      'Public wallet activity makes whale tracking, trader profiles, and on-chain behavior easier to inspect.',
    kalshi:
      'Exchange order books and account funding are more familiar to US finance users, but wallet-level on-chain tracking is not the product model.',
  },
];

export const comparisonFaq = [
  {
    question: 'Is Polymarket or Kalshi better for beginners?',
    answer:
      'Kalshi is usually simpler for US beginners because it uses familiar account and bank funding flows. Polymarket can be more natural for crypto-native users who already understand wallets, USDC, and Polygon transactions.',
  },
  {
    question: 'Which platform has lower fees?',
    answer:
      'It depends on the market and order type. Polymarket documents market-dependent taker fees with maker fees at zero, while Kalshi documents transaction fees based on expected earnings and market-specific schedules.',
  },
  {
    question: 'Can traders use both Polymarket and Kalshi?',
    answer:
      'Yes, where permitted by local rules and platform eligibility. Many prediction-market users compare prices across both because the same real-world event can trade at different implied probabilities.',
  },
  {
    question: 'Why does Polywhale focus more on Polymarket data?',
    answer:
      'Polywhale tracks public Polymarket whale activity, wallets, market pages, and trader profiles. Public wallet transparency makes Polymarket especially useful for whale-flow analysis.',
  },
];

export function comparePathForSlug(slug) {
  return `/compare/${slug}`;
}

export function getComparePageBySlug(slug) {
  return comparePages.find((page) => page.slug === slug) || null;
}

export function buildCompareHubStructuredData() {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Prediction market comparisons',
      url: `${siteOrigin}/compare`,
      description:
        'Polywhale comparison pages for prediction markets, fees, regulation, market coverage, liquidity, and trader workflows.',
      isPartOf: {
        '@type': 'WebSite',
        name: siteName,
        url: siteOrigin,
      },
      mainEntity: {
        '@type': 'ItemList',
        itemListElement: comparePages.map((page, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: page.h1,
          url: `${siteOrigin}${page.path}`,
        })),
      },
    },
  ];
}

export function buildCompareStructuredData(page = polymarketVsKalshi) {
  const url = `${siteOrigin}${page.path}`;
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: page.h1,
    description: page.description,
    image: seoImage,
    datePublished: COMPARE_LAST_MODIFIED,
    dateModified: COMPARE_LAST_MODIFIED,
    inLanguage: 'en-US',
    isAccessibleForFree: true,
    mainEntityOfPage: url,
    author: {
      '@type': 'Organization',
      name: siteName,
      url: siteOrigin,
    },
    publisher: {
      '@type': 'Organization',
      name: siteName,
      url: siteOrigin,
      logo: {
        '@type': 'ImageObject',
        url: seoImage,
      },
    },
    about: [
      { '@type': 'Organization', name: 'Polymarket', url: 'https://polymarket.com' },
      { '@type': 'Organization', name: 'Kalshi', url: 'https://kalshi.com' },
      { '@type': 'Thing', name: 'Prediction markets' },
    ],
    citation: comparisonSources.map((source) => source.url),
  };

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: page.h1,
      url,
      description: page.description,
      inLanguage: 'en-US',
      datePublished: COMPARE_LAST_MODIFIED,
      dateModified: COMPARE_LAST_MODIFIED,
      isPartOf: {
        '@type': 'WebSite',
        name: siteName,
        url: siteOrigin,
      },
      mainEntity: article,
    },
    article,
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: siteName,
          item: siteOrigin,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Compare',
          item: `${siteOrigin}/compare`,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: page.h1,
          item: url,
        },
      ],
    },
  ];
}
