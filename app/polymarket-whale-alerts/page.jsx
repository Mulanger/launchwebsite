import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  Bell,
  CheckCircle2,
  Clock,
  Radio,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Users,
} from 'lucide-react';
import JsonLd from '../_components/JsonLd.jsx';
import { buildNextMetadata } from '../../src/lib/next-metadata.js';
import { seoImage, siteName, siteOrigin } from '../../src/lib/seo.js';

const pagePath = '/polymarket-whale-alerts';
const pageUrl = `${siteOrigin}${pagePath}`;
const pageTitle = 'Polymarket Whale Alerts | Real-Time Trade Notifications';
const pageDescription =
  'Get real-time Polymarket whale alerts for large trades with custom thresholds, following-only filters, quiet hours, browser push, Android alerts, and live whale feed context.';

const faqItems = [
  {
    question: 'What are Polymarket whale alerts?',
    answer:
      'Polymarket whale alerts are notifications for large public Polymarket trades. Polywhale watches the live feed, identifies whale-sized trades, and sends alerts when a trade matches your settings.',
  },
  {
    question: 'Are Polywhale Polymarket whale alerts free?',
    answer:
      'The public Polywhale web alert setup is currently available without a paid plan. You can activate browser push alerts and choose a minimum trade size from the alerts page.',
  },
  {
    question: 'Can I customize the minimum trade size?',
    answer:
      'Yes. Polywhale lets you choose a minimum trade size and can also limit notifications to mega whale trades when you only want the largest activity.',
  },
  {
    question: 'Can I get alerts for wallets I follow?',
    answer:
      'Yes. Polywhale supports following-only alerts, so notifications can be limited to public wallets you have added to your following list.',
  },
  {
    question: 'Do I need Telegram to receive Polymarket whale alerts?',
    answer:
      'No. Polywhale focuses on browser push and app-style notifications, so alerts can reach your browser or Android device without joining a Telegram channel.',
  },
  {
    question: 'Are Polymarket whale alerts trading advice?',
    answer:
      'No. Polywhale is a read-only monitoring tool for public activity. Whale alerts show market flow and wallet activity, but they are not financial advice or trade recommendations.',
  },
  {
    question: 'How do I turn on Polymarket whale alerts?',
    answer:
      'Open the Polywhale alerts setup page, allow browser notifications, choose your minimum trade size, and activate system alerts. You can send a test alert afterward.',
  },
];

const controls = [
  {
    icon: SlidersHorizontal,
    title: 'Minimum size',
    copy: 'Choose the trade size that should trigger a notification instead of receiving every feed update.',
  },
  {
    icon: Activity,
    title: 'Mega-only mode',
    copy: 'Filter for the biggest trades when you only want high-conviction whale flow.',
  },
  {
    icon: Users,
    title: 'Following-only alerts',
    copy: 'Limit alerts to public wallets you follow from profiles and leaderboards.',
  },
  {
    icon: Clock,
    title: 'Quiet hours',
    copy: 'Suppress matching alerts overnight so monitoring does not become noise.',
  },
];

const comparisonRows = [
  {
    feature: 'Primary delivery',
    polywhale: 'Browser push and Android alerts',
    others: 'Often Telegram, Discord, or social-feed based',
  },
  {
    feature: 'Trade context',
    polywhale: 'Alert links back to live feed, market, trader, and trade detail pages',
    others: 'Usually a message feed or single external alert stream',
  },
  {
    feature: 'Personal filters',
    polywhale: 'Minimum size, mega-only mode, following-only mode, and quiet hours',
    others: 'Varies by tool and usually depends on channel rules',
  },
  {
    feature: 'SEO-visible product',
    polywhale: 'Public dashboard plus a crawlable alert workflow',
    others: 'Mostly standalone tracker or channel pages',
  },
];

function buildStructuredData() {
  const faqStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Polymarket Whale Alerts',
      url: pageUrl,
      description: pageDescription,
      isPartOf: {
        '@type': 'WebSite',
        name: siteName,
        url: siteOrigin,
      },
      about: [
        'Polymarket whale alerts',
        'Polymarket whale tracker',
        'Polymarket smart money alerts',
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Polywhale Polymarket Whale Alerts',
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Web, Android',
      url: pageUrl,
      image: seoImage,
      description: pageDescription,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
    },
    faqStructuredData,
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Polywhale',
          item: siteOrigin,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Polymarket Whale Alerts',
          item: pageUrl,
        },
      ],
    },
  ];
}

export const metadata = buildNextMetadata({
  title: pageTitle,
  description: pageDescription,
  keywords:
    'Polymarket whale alerts, Polymarket whale tracker, Polymarket smart money alerts, whale trade alerts, free Polymarket alerts, Polywhale alerts',
  path: pagePath,
  robots: 'index,follow,max-image-preview:large',
  image: `${siteOrigin}/assets/screen-alerts.png`,
});

function FeatureStep({ number, title, copy }) {
  return (
    <li>
      <span>{number}</span>
      <div>
        <strong>{title}</strong>
        <p>{copy}</p>
      </div>
    </li>
  );
}

function ControlItem({ icon: Icon, title, copy }) {
  return (
    <article className="alerts-seo-control">
      <Icon size={18} aria-hidden="true" />
      <strong>{title}</strong>
      <p>{copy}</p>
    </article>
  );
}

export default function PolymarketWhaleAlertsPage() {
  return (
    <div className="alerts-seo-shell">
      <JsonLd data={buildStructuredData()} />

      <header className="alerts-seo-nav">
        <Link className="alerts-seo-brand" href="/">
          <img src="/assets/polywatch-icon.png" alt="" width="36" height="36" />
          <span>
            <strong>Polywhale</strong>
            <small>trades</small>
          </span>
        </Link>
        <nav aria-label="Primary">
          <Link href="/">Live feed</Link>
          <Link href="/leaderboard">Leaderboard</Link>
          <Link href="/qa">Q&A</Link>
          <Link href="/alerts">Activate alerts</Link>
        </nav>
      </header>

      <main>
        <section className="alerts-seo-hero">
          <div className="alerts-seo-hero-copy">
            <span className="alerts-seo-kicker">
              <Bell size={14} aria-hidden="true" />
              Real-time trade notifications
            </span>
            <h1>Polymarket Whale Alerts</h1>
            <p>
              Get notified when large public Polymarket trades hit the tape. Set your own threshold,
              follow the wallets that matter, and jump from each alert into live market context.
            </p>
            <div className="alerts-seo-actions">
              <Link className="alerts-seo-button primary" href="/alerts">
                Activate alerts <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <Link className="alerts-seo-button secondary" href="/">
                View live whale feed
              </Link>
            </div>
          </div>

          <div className="alerts-seo-visual" aria-label="Polywhale alerts setup preview">
            <img
              src="/assets/screen-alerts.png"
              alt="Polywhale alert setup screen with web push status and alert preferences"
              width="960"
              height="720"
              fetchPriority="high"
            />
          </div>
        </section>

        <section className="alerts-seo-proof" aria-label="Alert capabilities">
          <span>
            <strong>Web push</strong>
            Browser notifications without a Telegram channel.
          </span>
          <span>
            <strong>Android alerts</strong>
            Same alert subscription system as the mobile app.
          </span>
          <span>
            <strong>Live context</strong>
            Open the matching trade, market, and wallet profile.
          </span>
        </section>

        <section className="alerts-seo-section alerts-seo-two-col" id="what-are-polymarket-whale-alerts">
          <div>
            <span className="alerts-seo-section-label">What they are</span>
            <h2>Whale alerts for large Polymarket trades, not generic price pings.</h2>
          </div>
          <div>
            <p>
              A Polymarket whale alert should tell you when meaningful public flow happens: who traded,
              which market moved, whether the trade was a buy or sell, and how large the position was.
              Polywhale connects alerts to the same live whale feed, leaderboard, trader profiles, and
              trade detail pages used across the site.
            </p>
          </div>
        </section>

        <section className="alerts-seo-section alerts-seo-workflow" aria-labelledby="alerts-workflow-title">
          <div className="alerts-seo-section-head">
            <span className="alerts-seo-section-label">How it works</span>
            <h2 id="alerts-workflow-title">From public trade to notification.</h2>
          </div>
          <ol>
            <FeatureStep
              number="1"
              title="Watch the live feed"
              copy="Polywhale monitors public Polymarket whale trades and normalizes size, side, market, price, and wallet context."
            />
            <FeatureStep
              number="2"
              title="Match your filters"
              copy="The alert engine checks your minimum size, mega-only setting, following-only mode, category filters, and quiet hours."
            />
            <FeatureStep
              number="3"
              title="Send the alert"
              copy="Matching alerts are delivered through the saved browser or app token and link back into the relevant Polywhale page."
            />
          </ol>
        </section>

        <section className="alerts-seo-section" aria-labelledby="alert-controls-title">
          <div className="alerts-seo-section-head compact">
            <span className="alerts-seo-section-label">Controls</span>
            <h2 id="alert-controls-title">Tune the alert stream before it becomes noise.</h2>
          </div>
          <div className="alerts-seo-controls">
            {controls.map((item) => (
              <ControlItem key={item.title} {...item} />
            ))}
          </div>
        </section>

        <section className="alerts-seo-section alerts-seo-comparison" aria-labelledby="alerts-comparison-title">
          <div className="alerts-seo-section-head">
            <span className="alerts-seo-section-label">Comparison</span>
            <h2 id="alerts-comparison-title">Why Polywhale is different from channel-first alert tools.</h2>
            <p>
              Competitor features change over time, so this comparison stays focused on the product
              workflow Polywhale controls: browser/app delivery, personal filters, and links into
              market and wallet context.
            </p>
          </div>
          <div className="alerts-seo-table">
            <div className="alerts-seo-table-row head">
              <span>Feature</span>
              <span>Polywhale</span>
              <span>Other alert tools</span>
            </div>
            {comparisonRows.map((row) => (
              <div className="alerts-seo-table-row" key={row.feature}>
                <strong>{row.feature}</strong>
                <span>{row.polywhale}</span>
                <span>{row.others}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="alerts-seo-section alerts-seo-delivery" aria-labelledby="alerts-delivery-title">
          <div>
            <span className="alerts-seo-section-label">Delivery</span>
            <h2 id="alerts-delivery-title">Built for people who want alerts outside a chat feed.</h2>
            <p>
              Telegram and Discord streams can be useful, but they mix every alert into a channel.
              Polywhale alerts are personal: the notification is attached to your browser or Android
              session, your threshold, and your followed-wallet list.
            </p>
          </div>
          <div className="alerts-seo-delivery-list">
            <span>
              <Radio size={17} aria-hidden="true" />
              Web push for desktop and mobile browsers that support notifications.
            </span>
            <span>
              <Smartphone size={17} aria-hidden="true" />
              Android delivery through the same backend alert subscription system.
            </span>
            <span>
              <ShieldCheck size={17} aria-hidden="true" />
              Read-only monitoring. No wallet connection is required to watch public trades.
            </span>
          </div>
        </section>

        <section className="alerts-seo-section alerts-seo-faq" aria-labelledby="alerts-faq-title">
          <div className="alerts-seo-section-head compact">
            <span className="alerts-seo-section-label">FAQ</span>
            <h2 id="alerts-faq-title">Polymarket whale alerts questions.</h2>
          </div>
          <div className="alerts-seo-faq-list">
            {faqItems.map((item) => (
              <details key={item.question}>
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="alerts-seo-section alerts-seo-final" aria-label="Activate Polywhale alerts">
          <div>
            <span className="alerts-seo-section-label">Start</span>
            <h2>Turn on whale alerts in Polywhale.</h2>
            <p>
              Activate browser notifications, pick your threshold, send a test alert, and keep the
              live feed open when you want deeper context.
            </p>
          </div>
          <Link className="alerts-seo-button primary" href="/alerts">
            Open alerts setup <CheckCircle2 size={16} aria-hidden="true" />
          </Link>
        </section>
      </main>
    </div>
  );
}
