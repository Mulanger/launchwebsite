import '../src/styles.css';
import './next-public.css';
import Script from 'next/script';
import { buildNextMetadata } from '../src/lib/next-metadata.js';
import { seoDefaults } from '../src/lib/seo.js';

export const metadata = buildNextMetadata(seoDefaults);
export const viewport = {
  themeColor: '#07100d',
};

function buildPublicEnv() {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.VITE_API_BASE_URL || '';
  const wsBaseUrl = process.env.NEXT_PUBLIC_WS_BASE_URL || process.env.VITE_WS_BASE_URL || '';
  const firebaseApiKey =
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || '';
  const firebaseAuthDomain =
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || process.env.VITE_FIREBASE_AUTH_DOMAIN || '';
  const firebaseProjectId =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || '';
  const firebaseSenderId =
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
    process.env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    '';
  const firebaseAppId =
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID || process.env.VITE_FIREBASE_APP_ID || '';
  const firebaseVapidKey =
    process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || process.env.VITE_FIREBASE_VAPID_KEY || '';

  return {
    VITE_API_BASE_URL: apiBaseUrl,
    NEXT_PUBLIC_API_BASE_URL: apiBaseUrl,
    VITE_WS_BASE_URL: wsBaseUrl,
    NEXT_PUBLIC_WS_BASE_URL: wsBaseUrl,
    VITE_FIREBASE_API_KEY: firebaseApiKey,
    NEXT_PUBLIC_FIREBASE_API_KEY: firebaseApiKey,
    VITE_FIREBASE_AUTH_DOMAIN: firebaseAuthDomain,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: firebaseAuthDomain,
    VITE_FIREBASE_PROJECT_ID: firebaseProjectId,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: firebaseProjectId,
    VITE_FIREBASE_MESSAGING_SENDER_ID: firebaseSenderId,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: firebaseSenderId,
    VITE_FIREBASE_APP_ID: firebaseAppId,
    NEXT_PUBLIC_FIREBASE_APP_ID: firebaseAppId,
    VITE_FIREBASE_VAPID_KEY: firebaseVapidKey,
    NEXT_PUBLIC_FIREBASE_VAPID_KEY: firebaseVapidKey,
  };
}

function serializePublicEnv() {
  return JSON.stringify(buildPublicEnv()).replace(/</g, '\\u003c');
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="next-public-body">
        <Script
          id="polywhale-public-env"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `window.__POLYWHALE_PUBLIC_ENV__=${serializePublicEnv()};`,
          }}
        />
        <Script
          id="polywhale-ga-src"
          src="https://www.googletagmanager.com/gtag/js?id=G-TMS7KN5K7G"
          strategy="afterInteractive"
        />
        <Script
          id="polywhale-ga"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-TMS7KN5K7G');
            `,
          }}
        />
        {children}
      </body>
    </html>
  );
}
