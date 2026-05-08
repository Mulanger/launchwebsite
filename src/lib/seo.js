export const siteOrigin = 'https://www.polywhaletrades.com';
export const siteName = 'Polywhale';
export const seoImage = `${siteOrigin}/assets/polywatch-icon.png`;

export const seoDefaults = {
  title: 'Polywhale | Live Polymarket Whale Trades, Top Whales & Whale Feed',
  description:
    "Track live Polymarket whale trades, today's whale volume, top whales, trader leaderboards, wallet profiles, and large trade alerts with Polywhale.",
  keywords:
    'Polywhale, Polymarket whale trades, live whale feed, Polymarket whales, top whales today, whale leaderboard, whale alerts, Polymarket trader rankings, Polymarket wallet tracking',
  path: '/',
  robots: 'index,follow,max-image-preview:large',
};

export const seoByPath = {
  '/': {
    ...seoDefaults,
    structuredData: [
      buildWebsiteStructuredData(),
      buildSoftwareStructuredData(),
    ],
  },
  '/about': {
    title: 'About Polywhale | Live Polymarket Whale Feed & Top Whale Tracking',
    description:
      'Learn how Polywhale tracks live Polymarket whale trades, top whales today, whale leaderboards, wallet profiles, market activity, and large trade alerts.',
    keywords:
      'about Polywhale, Polymarket whale feed, Polymarket top whales, live whale trades, whale trade alerts, prediction market whales, Polymarket leaderboard',
    path: '/about',
    robots: 'index,follow,max-image-preview:large',
    structuredData: [buildAboutStructuredData(), buildFaqStructuredData()],
  },
  '/leaderboard': {
    title: 'Polymarket Whale Leaderboard | Top Whales Today | Polywhale',
    description:
      "See the top Polymarket whales ranked by whale volume, trades, average trade size, and wallet activity for today's New York session.",
    keywords:
      'Polymarket leaderboard, top Polymarket whales, top whales today, whale volume, wallet rankings, prediction market leaderboard',
    path: '/leaderboard',
    robots: 'index,follow,max-image-preview:large',
  },
  '/qa': {
    title: 'Polymarket Questions & Answers | Polywhale Q&A Hub',
    description:
      'Plain-English answers to high-intent questions about Polymarket legality, taxes, odds, payouts, whale trades, wallets, and prediction market mechanics.',
    keywords:
      'Polymarket questions, Polymarket FAQ, Polymarket Q&A, is Polymarket legal, Polymarket taxes, Polymarket whale trades, Polymarket odds, Polymarket vs Kalshi',
    path: '/qa',
    robots: 'index,follow,max-image-preview:large',
  },
  '/compare': {
    title: 'Prediction Market Comparisons | Polymarket, Kalshi & More | Polywhale',
    description:
      'Compare prediction markets by fees, regulation, market coverage, funding methods, liquidity signals, and trader workflows.',
    keywords:
      'prediction market comparisons, Polymarket vs Kalshi, Kalshi alternatives, Polymarket alternatives, prediction market fees',
    path: '/compare',
    robots: 'index,follow,max-image-preview:large',
  },
  '/privacy': {
    title: 'Privacy Policy | Polywhale',
    description: 'Polywhale privacy policy for live Polymarket whale monitoring, alerts, follows, and anonymous app sessions.',
    path: '/privacy',
    robots: 'index,follow',
  },
  '/terms': {
    title: 'Terms of Service | Polywhale',
    description: 'Terms for using Polywhale, a read-only public Polymarket whale trade monitoring and alert service.',
    path: '/terms',
    robots: 'index,follow',
  },
  '/delete-data': {
    title: 'Delete Data | Polywhale',
    description: 'Request deletion of Polywhale alert, follow, notification, and anonymous session data.',
    path: '/delete-data',
    robots: 'index,follow',
  },
};

export function buildWebsiteStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteName,
    url: siteOrigin,
    description: seoDefaults.description,
    publisher: {
      '@type': 'Organization',
      name: siteName,
      url: siteOrigin,
      logo: seoImage,
    },
  };
}

export function buildSoftwareStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: siteName,
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    url: siteOrigin,
    image: seoImage,
    description:
      'A read-only web dashboard for live Polymarket whale trades, top whales, whale leaderboards, wallet profiles, and large trade alerts.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  };
}

export function buildAboutStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: 'About Polywhale',
    url: `${siteOrigin}/about`,
    isPartOf: {
      '@type': 'WebSite',
      name: siteName,
      url: siteOrigin,
    },
    description:
      'About Polywhale, an independent dashboard for live Polymarket whale trades, top whales, leaderboard rankings, wallet profiles, and whale alerts.',
  };
}

export function buildFaqStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is a Polymarket whale trade?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'A Polymarket whale trade is a large public trade made on a Polymarket market. Polywhale highlights these trades so users can monitor size, side, market, price, and wallet activity.',
        },
      },
      {
        '@type': 'Question',
        name: 'Does Polywhale show a live Polymarket whale feed?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: "Yes. Polywhale provides a live whale feed for large public Polymarket trades, including today's whale volume, active whales, mega trades, and the biggest trade for the current New York session.",
        },
      },
      {
        '@type': 'Question',
        name: 'How does the Polywhale leaderboard rank top whales?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'The leaderboard ranks public wallets by whale volume and shows supporting signals such as trade count and average trade size for the selected timeframe.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can Polywhale send alerts for large Polymarket trades?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Polywhale supports browser alerts for large whale trades. Users can choose a minimum trade size threshold and activate web push notifications from the Alerts page.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is Polywhale affiliated with Polymarket?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'No. Polywhale is an independent monitoring tool for public Polymarket activity and is not affiliated with, endorsed by, or operated by Polymarket.',
        },
      },
    ],
  };
}

export function getSeoForPath(path, tradeMatch, traderMatch, marketMatch) {
  if (seoByPath[path]) return seoByPath[path];

  if (tradeMatch) {
    return {
      title: 'Polymarket Whale Trade Detail | Polywhale',
      description:
        'Inspect a public Polymarket whale trade, including size, price, trader profile, same-market whale trades, and on-chain context.',
      path,
      robots: 'noindex,follow',
    };
  }

  if (traderMatch) {
    return {
      title: 'Polymarket Whale Wallet Profile | Polywhale',
      description:
        'View a public Polymarket whale wallet profile, recent whale trades, wallet rank, volume mix, and large trade history.',
      path,
      robots: 'index,follow,max-image-preview:large',
    };
  }

  if (marketMatch) {
    return {
      title: 'Polymarket Market Whale Trades | Polywhale',
      description:
        'Track large Polymarket whale trades, market-specific whale volume, top whale wallets, and recent activity for a single market on Polywhale.',
      path,
      robots: 'noindex,follow',
    };
  }

  return {
    ...seoDefaults,
    title: `${siteName} App`,
    description:
      'Polywhale app page for monitoring public Polymarket whale trades, followed wallets, alerts, and trader activity.',
    path,
    robots: 'noindex,follow',
  };
}
