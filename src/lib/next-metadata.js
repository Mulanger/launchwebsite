import { seoDefaults, seoImage, siteName, siteOrigin } from './seo.js';

export function buildNextMetadata(seo) {
  const metadata = seo || seoDefaults;
  const path = metadata.path === '/' ? '/' : metadata.path || '/';
  const canonical = `${siteOrigin}${path}`;
  const robots = metadata.robots || seoDefaults.robots;

  return {
    metadataBase: new URL(siteOrigin),
    title: metadata.title || seoDefaults.title,
    description: metadata.description || seoDefaults.description,
    keywords: (metadata.keywords || seoDefaults.keywords).split(',').map((keyword) => keyword.trim()),
    alternates: {
      canonical,
    },
    robots: {
      index: !robots.includes('noindex'),
      follow: !robots.includes('nofollow'),
      googleBot: {
        index: !robots.includes('noindex'),
        follow: !robots.includes('nofollow'),
        'max-image-preview': 'large',
      },
    },
    openGraph: {
      siteName,
      title: metadata.title || seoDefaults.title,
      description: metadata.description || seoDefaults.description,
      type: 'website',
      url: canonical,
      images: [seoImage],
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: metadata.title || seoDefaults.title,
      description: metadata.description || seoDefaults.description,
      images: [seoImage],
    },
  };
}
