import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bell,
  Check,
  Coins,
  ExternalLink,
  Globe2,
  Landmark,
  Scale,
  Users,
} from 'lucide-react';
import JsonLd from '../../_components/JsonLd.jsx';
import { buildNextMetadata } from '../../../src/lib/next-metadata.js';
import {
  COMPARE_LAST_MODIFIED,
  buildCompareStructuredData,
  comparisonFaq,
  comparisonRows,
  comparisonSources,
  polymarketVsKalshi,
} from '../../../src/lib/compare-pages.js';

export const revalidate = 86400;

export const metadata = buildNextMetadata({
  title: polymarketVsKalshi.title,
  description: polymarketVsKalshi.description,
  keywords: polymarketVsKalshi.keywords,
  path: polymarketVsKalshi.path,
  robots: 'index,follow,max-image-preview:large',
});

const updatedDate = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
}).format(new Date(COMPARE_LAST_MODIFIED));

const verdicts = [
  {
    title: 'Choose Polymarket if',
    icon: Globe2,
    items: [
      'You are crypto-native and comfortable with USDC.',
      'You care about broad global event coverage.',
      'You want public wallet transparency for whale-flow analysis.',
    ],
  },
  {
    title: 'Choose Kalshi if',
    icon: Landmark,
    items: [
      'You are a US user who wants a CFTC-regulated event exchange.',
      'You prefer bank-funded dollar deposits over crypto rails.',
      'You value regulated access more than wallet-level transparency.',
    ],
  },
];

const platformStats = [
  {
    name: 'Polymarket',
    label: 'Crypto-native prediction market',
    logo: {
      src: '/assets/compare/polymarket-icon-blue.svg',
      alt: 'Polymarket logo',
    },
    tone: 'poly',
    facts: [
      ['Funding', 'USDC / crypto rails'],
      ['Fees', 'Market-dependent taker fees'],
      ['Visibility', 'Public wallets'],
      ['Best for', 'Global event flow'],
    ],
  },
  {
    name: 'Kalshi',
    label: 'US regulated event exchange',
    logo: {
      src: '/assets/compare/kalshi-logo.png',
      alt: 'Kalshi logo',
    },
    tone: 'kalshi',
    facts: [
      ['Funding', 'Bank transfer / dollars'],
      ['Fees', 'Expected-earnings based'],
      ['Visibility', 'Exchange model'],
      ['Best for', 'US regulated access'],
    ],
  },
];

function CompareSidebar() {
  return (
    <aside className="feed-sidebar compare-sidebar">
      <Link className="feed-brand" href="/" aria-label="Polywhale home">
        <img src="/assets/polywatch-icon.png" alt="" />
        <span className="feed-brand-text">
          <strong>Polywhale</strong>
          <small>trades</small>
        </span>
      </Link>

      <nav className="feed-nav" aria-label="Product navigation">
        <div className="nav-label">Live</div>
        <Link className="feed-nav-item" href="/">
          <Activity size={17} aria-hidden="true" />
          <span>Whale Feed</span>
          <small>Live</small>
        </Link>

        <div className="nav-label">Discover</div>
        <Link className="feed-nav-item" href="/leaderboard">
          <BarChart3 size={17} aria-hidden="true" />
          <span>Leaderboard</span>
          <small>Rank</small>
        </Link>
        <Link className="feed-nav-item active" href="/compare">
          <Scale size={17} aria-hidden="true" />
          <span>Compare</span>
          <small>Guide</small>
        </Link>
        <Link className="feed-nav-item" href="/profile/following">
          <Users size={17} aria-hidden="true" />
          <span>Following</span>
          <small>List</small>
        </Link>

        <div className="nav-label">Account</div>
        <Link className="feed-nav-item" href="/alerts">
          <Bell size={17} aria-hidden="true" />
          <span>Alerts</span>
          <small>Web</small>
        </Link>
      </nav>

      <div className="sidebar-links">
        <Link href="/compare" aria-current="page">
          Compare
        </Link>
        <Link href="/news">News</Link>
        <Link href="/qa">Q&A</Link>
        <Link href="/about">About</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
      </div>
    </aside>
  );
}

function PlatformPanel({ platform }) {
  return (
    <section className={`compare-platform ${platform.tone}`}>
      <div className="compare-platform-head">
        <span className="compare-platform-logo">
          <img src={platform.logo.src} alt={platform.logo.alt} />
        </span>
        <span>
          <strong>{platform.name}</strong>
          <small>{platform.label}</small>
        </span>
      </div>
      <dl className="compare-fact-grid">
        {platform.facts.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default function PolymarketVsKalshiPage() {
  return (
    <div className="feed-shell compare-shell">
      <JsonLd data={buildCompareStructuredData(polymarketVsKalshi)} />
      <CompareSidebar />

      <main className="feed-main compare-main">
        <nav className="compare-breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Polywhale</Link>
          <span>/</span>
          <Link href="/compare">Compare</Link>
          <span>/</span>
          <span>Polymarket vs Kalshi</span>
        </nav>

        <article>
          <header className="compare-hero">
            <span className="compare-eyebrow">
              <Scale size={16} aria-hidden="true" />
              Updated {updatedDate}
            </span>
            <h1>
              Polymarket <em>vs</em> Kalshi
            </h1>
            <p>
              Polymarket is usually the better fit for crypto-native traders who want broad global event coverage and
              public wallet transparency. Kalshi is usually the better fit for US users who want a CFTC-regulated event
              exchange, dollar funding, and familiar compliance rails.
            </p>
          </header>

          <section className="compare-platform-grid" aria-label="Polymarket and Kalshi overview">
            {platformStats.map((platform) => (
              <PlatformPanel key={platform.name} platform={platform} />
            ))}
          </section>

          <section className="compare-verdict" aria-labelledby="quick-verdict">
            <div className="compare-section-label" id="quick-verdict">
              Quick verdict <span />
            </div>
            <div className="compare-verdict-grid">
              {verdicts.map((verdict) => {
                const Icon = verdict.icon;
                return (
                  <div className="compare-verdict-column" key={verdict.title}>
                    <h2>
                      <Icon size={18} aria-hidden="true" />
                      {verdict.title}
                    </h2>
                    <ul>
                      {verdict.items.map((item) => (
                        <li key={item}>
                          <Check size={15} aria-hidden="true" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="compare-section" aria-labelledby="comparison-table">
            <div className="compare-section-label" id="comparison-table">
              Side-by-side comparison <span />
            </div>
            <div className="compare-table" role="table" aria-label="Polymarket vs Kalshi comparison table">
              <div className="compare-table-row head" role="row">
                <div role="columnheader">Feature</div>
                <div role="columnheader">Polymarket</div>
                <div role="columnheader">Kalshi</div>
              </div>
              {comparisonRows.map((row) => (
                <div className="compare-table-row" role="row" key={row.feature}>
                  <div className="compare-feature" role="cell">
                    {row.feature}
                  </div>
                  <div role="cell">{row.polymarket}</div>
                  <div role="cell">{row.kalshi}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="compare-section compare-two-col" aria-labelledby="fees-and-funding">
            <div>
              <div className="compare-section-label" id="fees-and-funding">
                Fees and funding <span />
              </div>
              <h2>Polymarket is more crypto-native. Kalshi is more bank-native.</h2>
              <p>
                The practical difference is not just the fee formula. Polymarket users need to understand USDC,
                Polygon, wallet custody, and market-dependent fee rules. Kalshi users get a more familiar US exchange
                workflow, but fees are part of the trading model.
              </p>
            </div>
            <div className="compare-callout">
              <Coins size={22} aria-hidden="true" />
              <strong>Active traders should compare both the price and the fee model.</strong>
              <span>
                A market showing the same implied probability on both platforms can still have a different effective
                return after fees, spread, funding method, and withdrawal workflow.
              </span>
            </div>
          </section>

          <section className="compare-section compare-two-col reverse" aria-labelledby="why-polywhale">
            <div className="compare-callout">
              <Activity size={22} aria-hidden="true" />
              <strong>Polywhale gives Polymarket an extra data layer.</strong>
              <span>
                Public wallet activity lets Polywhale show whale trades, trader profiles, market-specific flows, and
                leaderboard movement that ordinary platform comparison pages miss.
              </span>
            </div>
            <div>
              <div className="compare-section-label" id="why-polywhale">
                Whale data angle <span />
              </div>
              <h2>For market intelligence, public wallet flow matters.</h2>
              <p>
                Kalshi is built like a regulated exchange. Polymarket is more transparent at the wallet layer. That
                makes Polymarket especially useful for studying large traders, repeated positions, same-market whale
                activity, and public wallet behavior over time.
              </p>
            </div>
          </section>

          <section className="compare-section" aria-labelledby="faqs">
            <div className="compare-section-label" id="faqs">
              Frequently asked questions <span />
            </div>
            <div className="compare-faq-list">
              {comparisonFaq.map((item, index) => (
                <details className="compare-faq-item" key={item.question} open={index === 0}>
                  <summary>{item.question}</summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </section>

          <section className="compare-section compare-sources" aria-labelledby="sources">
            <div className="compare-section-label" id="sources">
              Sources <span />
            </div>
            <p>
              This comparison uses platform documentation where possible. Platform rules, fees, availability, and market
              coverage can change, so traders should verify current terms before trading.
            </p>
            <div className="compare-source-grid">
              {comparisonSources.map((source) => (
                <a href={source.url} key={source.url} rel="noopener noreferrer">
                  <span>{source.label}</span>
                  <ExternalLink size={14} aria-hidden="true" />
                </a>
              ))}
            </div>
          </section>

          <section className="compare-cta" aria-label="Open Polywhale">
            <span>
              <strong>Track the Polymarket whale side of the comparison.</strong>
              <small>Open live whale trades, wallet profiles, and market-specific flow on Polywhale.</small>
            </span>
            <Link href="/">
              Open whale feed <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </section>

          <p className="compare-disclaimer">
            Polywhale is independent and is not affiliated with Polymarket or Kalshi. This page is informational only,
            not financial, legal, tax, or trading advice.
          </p>
        </article>
      </main>

      <aside className="feed-rail compare-rail">
        <section className="rail-section">
          <h2>On this page</h2>
          <div className="compare-rail-links">
            <a href="#quick-verdict">Quick verdict</a>
            <a href="#comparison-table">Comparison table</a>
            <a href="#fees-and-funding">Fees and funding</a>
            <a href="#why-polywhale">Whale data angle</a>
            <a href="#faqs">FAQ</a>
          </div>
        </section>

        <section className="rail-section">
          <h2>Related</h2>
          <div className="compare-rail-links">
            <Link href="/qa/are-polymarket-and-kalshi-the-same">Are Polymarket and Kalshi the same?</Link>
            <Link href="/qa/is-polymarket-legal">Is Polymarket legal?</Link>
            <Link href="/qa/how-do-polymarket-fees-work">How do Polymarket fees work?</Link>
          </div>
        </section>
      </aside>

      <nav className="qa-mobile-bottom compare-mobile-bottom" aria-label="Mobile navigation">
        <Link href="/">Feed</Link>
        <Link href="/leaderboard">Leaders</Link>
        <Link className="active" href="/compare">
          Compare
        </Link>
        <Link href="/alerts">Alerts</Link>
      </nav>
    </div>
  );
}
