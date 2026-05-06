import '../src/styles.css';
import './next-public.css';
import { buildNextMetadata } from '../src/lib/next-metadata.js';
import { seoDefaults } from '../src/lib/seo.js';

export const metadata = buildNextMetadata(seoDefaults);

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="next-public-body">{children}</body>
    </html>
  );
}
