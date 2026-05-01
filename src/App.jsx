import { motion } from 'framer-motion';
import {
  ArrowRight,
  Bell,
  Check,
  FileText,
  LockKeyhole,
  Mail,
  Radio,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react';

const supportEmail = 'support@whaletracker.com';
const lastUpdated = 'May 1, 2026';

const screens = [
  {
    image: '/assets/screen-live-feed.png',
    eyebrow: 'Live feed',
    title: 'High-signal whale flow',
    body: 'Scan large Polymarket trades by size, side, market, and trader without digging through noisy feeds.',
  },
  {
    image: '/assets/screen-leaderboard.png',
    eyebrow: 'Leaderboard',
    title: 'See who is moving markets',
    body: 'Rank active wallets by whale volume across short and long windows.',
  },
  {
    image: '/assets/screen-alerts.png',
    eyebrow: 'Alerts',
    title: 'Follow the traders that matter',
    body: 'Get notified when large trades happen, or narrow alerts to the traders on your following list.',
  },
];

const featureRows = [
  {
    icon: Radio,
    title: 'Real-time monitoring',
    body: 'Whale trades flow through the watcher, API server, and mobile app within seconds.',
  },
  {
    icon: Bell,
    title: 'Noise-controlled alerts',
    body: 'Thresholds, mega-only mode, quiet hours, categories, and followed-trader alerts keep notifications focused.',
  },
  {
    icon: Users,
    title: 'Trader context',
    body: 'Leaderboards and profiles make each trade easier to evaluate before you open a market.',
  },
];

const legalLinks = [
  { href: '/privacy', label: 'Privacy Policy', icon: LockKeyhole },
  { href: '/terms', label: 'Terms of Service', icon: FileText },
  { href: '/delete-data', label: 'Delete Data', icon: ShieldCheck },
];

const reveal = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

function App() {
  const path = window.location.pathname.replace(/\/$/, '') || '/';

  if (path === '/privacy') return <PrivacyPage />;
  if (path === '/terms') return <TermsPage />;
  if (path === '/delete-data') return <DeleteDataPage />;

  return <HomePage />;
}

function SiteChrome({ children, legal = false }) {
  return (
    <div className={legal ? 'site legal-site' : 'site'}>
      <header className="topbar" aria-label="Primary navigation">
        <a className="brand-link" href="/" aria-label="Polywatch home">
          <img src="/assets/polywatch-icon.png" alt="" className="brand-icon" />
          <span>Polywatch</span>
        </a>
        <nav className="nav-links">
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/delete-data">Delete data</a>
        </nav>
      </header>
      {children}
      <Footer />
    </div>
  );
}

function HomePage() {
  return (
    <SiteChrome>
      <main>
        <Hero />
        <SignalSection />
        <ScreensSection />
        <TrustSection />
        <FinalCta />
      </main>
    </SiteChrome>
  );
}

function Hero() {
  return (
    <section className="hero">
      <div className="hero-grid">
        <div className="hero-copy">
          <div className="status-line">
            <span className="pulse" />
            Preparing for Google Play launch
          </div>
          <h1>Polywatch</h1>
          <p className="hero-lede">
            Real-time whale alerts and trader intelligence for Polymarket.
          </p>
          <div className="hero-actions">
            <a
              className="button button-primary"
              href={`mailto:${supportEmail}?subject=Polywatch launch access`}
            >
              Join launch list
              <ArrowRight aria-hidden="true" size={18} />
            </a>
            <a className="button button-secondary" href="#screens">
              See the app
            </a>
          </div>
          <p className="hero-note">
            Independent market monitoring. No trades, bets, deposits, or
            wagering inside the app.
          </p>
        </div>

        <div className="phone-stage" aria-label="Polywatch app screenshots">
          <img
            className="phone-shot phone-shot-side left"
            src="/assets/screen-leaderboard.png"
            alt="Polywatch leaderboard screen"
          />
          <img
            className="phone-shot phone-shot-main"
            src="/assets/screen-live-feed.png"
            alt="Polywatch live whale feed screen"
          />
          <img
            className="phone-shot phone-shot-side right"
            src="/assets/screen-alerts.png"
            alt="Polywatch trader alerts screen"
          />
        </div>
      </div>
    </section>
  );
}

function SignalSection() {
  return (
    <motion.section
      className="signal-section"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.35 }}
      variants={reveal}
    >
      <div className="section-kicker">Why it exists</div>
      <div className="split-heading">
        <h2>Whale trades are useful only when the signal is clean.</h2>
        <p>
          Polywatch turns public market activity into a focused mobile workflow:
          live trade flow, trader context, and alerts that respect your filters.
        </p>
      </div>
      <div className="feature-lines" aria-label="Polywatch features">
        {featureRows.map((item) => (
          <FeatureLine key={item.title} {...item} />
        ))}
      </div>
    </motion.section>
  );
}

function FeatureLine({ icon: Icon, title, body }) {
  return (
    <div className="feature-line">
      <div className="feature-icon" aria-hidden="true">
        <Icon size={22} />
      </div>
      <div>
        <h3>{title}</h3>
        <p>{body}</p>
      </div>
    </div>
  );
}

function ScreensSection() {
  return (
    <section className="screens-section" id="screens">
      <div className="section-kicker">App screens</div>
      <h2>Built around the three decisions whale watchers make every day.</h2>
      <div className="screen-showcase">
        {screens.map((screen, index) => (
          <motion.article
            className="screen-panel"
            key={screen.title}
            initial={{ opacity: 0, y: 36 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{
              duration: 0.72,
              delay: index * 0.08,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <img src={screen.image} alt={`${screen.title} screenshot`} />
            <div className="screen-copy">
              <span>{screen.eyebrow}</span>
              <h3>{screen.title}</h3>
              <p>{screen.body}</p>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}

function TrustSection() {
  return (
    <section className="trust-section">
      <motion.div
        className="trust-copy"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.45 }}
        variants={reveal}
      >
        <div className="section-kicker">Launch ready foundations</div>
        <h2>Clear boundaries for a market-monitoring app.</h2>
        <p>
          Polywatch is designed as an informational companion. The app tracks
          public market activity and sends alerts, but it does not execute
          trades, accept deposits, or provide financial advice.
        </p>
      </motion.div>
      <div className="trust-links">
        {legalLinks.map(({ href, label, icon: Icon }) => (
          <a href={href} key={href} className="legal-pill">
            <Icon size={20} aria-hidden="true" />
            <span>{label}</span>
            <ArrowRight size={18} aria-hidden="true" />
          </a>
        ))}
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="final-cta">
      <img src="/assets/polywatch-icon.png" alt="" className="cta-icon" />
      <div>
        <div className="section-kicker">Coming to Google Play</div>
        <h2>Track the whales before the market notices.</h2>
      </div>
      <a
        className="button button-primary"
        href={`mailto:${supportEmail}?subject=Polywatch launch access`}
      >
        Request access
        <Mail size={18} aria-hidden="true" />
      </a>
    </section>
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
          Polywatch is an independent market-monitoring app for public
          Polymarket activity. It is not affiliated with, endorsed by, or
          operated by Polymarket.
        </p>
      </LegalSection>
      <LegalSection title="Information we collect">
        <ul>
          <li>
            Anonymous app identifiers, including a generated device ID, user ID,
            auth token, platform, and Firebase Cloud Messaging token.
          </li>
          <li>
            Alert settings such as minimum trade size, categories, quiet hours,
            notification preferences, and followed-trader alert preference.
          </li>
          <li>
            Followed trader wallet addresses that you choose to save in the app.
          </li>
          <li>
            Technical service data such as server logs, request metadata,
            delivery status, and error information needed to run and protect the
            service.
          </li>
          <li>
            Public market, trader, wallet, and trade data that is displayed in
            the app.
          </li>
        </ul>
      </LegalSection>
      <LegalSection title="How we use information">
        <p>
          We use this information to run the app, authenticate anonymous
          sessions, deliver push notifications, save your preferences, maintain
          followed-trader features, diagnose issues, prevent abuse, and improve
          reliability.
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
          preferences, notification tokens, or followed-trader lists with
          advertisers.
        </p>
      </LegalSection>
      <LegalSection title="Retention and deletion">
        <p>
          Local app data remains on your device until you clear app storage or
          uninstall the app. Server-side alert and follow data is retained while
          needed to provide the service. You can request deletion at any time at{' '}
          <a href={`mailto:${supportEmail}`}>{supportEmail}</a> or through the{' '}
          <a href="/delete-data">Delete Data</a> page.
        </p>
      </LegalSection>
      <LegalSection title="Children">
        <p>
          Polywatch is not directed to children. The app is intended for users
          who are old enough to view market and financial information in their
          jurisdiction.
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
          Polywatch provides informational views of public market activity,
          trader profiles, leaderboards, and optional push alerts. You may use
          the app only in compliance with applicable laws and platform rules.
        </p>
      </LegalSection>
      <LegalSection title="No financial advice">
        <p>
          Polywatch does not provide financial, investment, legal, tax, trading,
          gambling, or wagering advice. Information in the app may be delayed,
          incomplete, or inaccurate and should not be the sole basis for any
          decision.
        </p>
      </LegalSection>
      <LegalSection title="No trading or wagering service">
        <p>
          Polywatch does not accept deposits, execute trades, facilitate bets,
          or hold user funds. The app is a monitoring and notification tool.
        </p>
      </LegalSection>
      <LegalSection title="Public data and accuracy">
        <p>
          The app relies on public and third-party market data. We work to keep
          the service accurate, but we do not guarantee that all prices, trades,
          trader statistics, rankings, or notifications are complete or current.
        </p>
      </LegalSection>
      <LegalSection title="Account and notification access">
        <p>
          Polywatch may create an anonymous session to save preferences and
          deliver alerts. You are responsible for managing notification
          permission, app settings, and device access.
        </p>
      </LegalSection>
      <LegalSection title="Limitation of liability">
        <p>
          Polywatch is provided as-is. To the maximum extent allowed by law, we
          are not liable for losses, missed alerts, incorrect data, service
          interruptions, or decisions made using information from the app.
        </p>
      </LegalSection>
      <LegalSection title="Changes">
        <p>
          We may update the app or these terms as the service evolves. Continued
          use after updates means you accept the updated terms.
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
            subject line “Delete Polywatch data”.
          </li>
          <li>
            Include your device platform, approximate install date, and any
            support details that help us identify the anonymous app session.
          </li>
          <li>
            We may ask for a confirmation step to verify that the request is
            connected to your device or app session.
          </li>
        </ol>
      </LegalSection>
      <LegalSection title="What we delete">
        <p>
          After verification, we will delete server-side alert subscriptions,
          Firebase notification tokens, followed-trader records, and anonymous
          session records that can be associated with the verified app session.
        </p>
      </LegalSection>
      <LegalSection title="Local device data">
        <p>
          You can remove local app data from your phone by clearing the app’s
          storage or uninstalling Polywatch. Local caches may include recent
          trades, followed traders, alert preferences, and onboarding state.
        </p>
      </LegalSection>
      <LegalSection title="Data we may retain">
        <p>
          We may retain limited logs when required for security, abuse
          prevention, legal obligations, or infrastructure diagnostics.
        </p>
      </LegalSection>
      <div className="legal-action-row">
        <a
          className="button button-primary"
          href={`mailto:${supportEmail}?subject=Delete Polywatch data`}
        >
          Request deletion
          <Mail size={18} aria-hidden="true" />
        </a>
      </div>
    </LegalLayout>
  );
}

function LegalLayout({ eyebrow, title, intro, children }) {
  return (
    <SiteChrome legal>
      <main className="legal-main">
        <section className="legal-hero">
          <div className="section-kicker">{eyebrow}</div>
          <h1>{title}</h1>
          <p>{intro}</p>
          <span>Last updated: {lastUpdated}</span>
        </section>
        <section className="legal-content">{children}</section>
      </main>
    </SiteChrome>
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

function Footer() {
  return (
    <footer className="footer">
      <div>
        <a className="footer-brand" href="/">
          <img src="/assets/polywatch-icon.png" alt="" />
          <span>Polywatch</span>
        </a>
        <p>
          Independent market monitoring for public Polymarket activity. No
          trading or wagering inside the app.
        </p>
      </div>
      <div className="footer-links">
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
        <a href="/delete-data">Delete data</a>
        <a href={`mailto:${supportEmail}`}>Support</a>
      </div>
    </footer>
  );
}

export default App;
