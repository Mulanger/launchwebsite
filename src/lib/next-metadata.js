import { seoDefaults, seoImage, siteName, siteOrigin } from './seo.js';

export function buildNextMetadata(seo) {
  const metadata = seo || seoDefaults;
  const path = metadata.path === '/' ? '/' : metadata.path || '/';
  const canonical = `${siteOrigin}${path}`;
  const robots = metadata.robots || seoDefaults.robots;
  const image = metadata.image || seoImage;
  const images = [normalizeMetadataImage(image)];

  return {
    metadataBase: new URL(siteOrigin),
    title: metadata.title || seoDefaults.title,
    description: metadata.description || seoDefaults.description,
    keywords: (metadata.keywords || seoDefaults.keywords).split(',').map((keyword) => keyword.trim()),
    alternates: {
      canonical,
    },
    manifest: '/site.webmanifest',
    icons: {
      icon: [{ url: '/favicon.png', type: 'image/png' }],
      apple: [{ url: '/assets/polywatch-icon.png', type: 'image/png' }],
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
      type: metadata.openGraphType || 'website',
      url: canonical,
      images,
      locale: 'en_US',
      ...(metadata.publishedTime ? { publishedTime: metadata.publishedTime } : {}),
      ...(metadata.modifiedTime ? { modifiedTime: metadata.modifiedTime } : {}),
      ...(metadata.authors ? { authors: metadata.authors } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: metadata.title || seoDefaults.title,
      description: metadata.description || seoDefaults.description,
      images,
    },
  };
}

function normalizeMetadataImage(image) {
  if (typeof image === 'string') return image;
  if (image?.url) {
    return {
      url: image.url,
      ...(image.width ? { width: image.width } : {}),
      ...(image.height ? { height: image.height } : {}),
      ...(image.alt ? { alt: image.alt } : {}),
      ...(image.type ? { type: image.type } : {}),
    };
  }
  return seoImage;
}
