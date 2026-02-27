import { Metadata } from 'next'

const siteConfig = {
  siteName: 'PriyoScript',
  siteDescription:
    'Official documentation for PriyoScript: language syntax, runtime architecture, modules, diagnostics, and examples.',
  siteKeywords: [
    'priyoscript',
    'programming language',
    'language documentation',
    'interpreter',
    'bytecode vm',
    'repl',
  ],
  links: {
    twitter: '@nsgpriyanshu',
    github: 'https://github.com/nsgpriyanshu/PriyoScript',
    siteUrl: 'https://nsgpriyanshu.github.io/PriyoScript',
    ogImage: '/assets/android-chrome-512x512.png',
    twitterImage: '/assets/android-chrome-512x512.png',
  },
  themeColors: {
    light: '#ffffff',
    dark: '#0f172a',
  },
  author: {
    name: 'nsgpriyanshu',
    url: 'https://github.com/nsgpriyanshu',
  },
}

type MetadataProps = {
  title?: string
  description?: string
  images?: string | string[]
  icons?: Metadata['icons']
  noIndex?: boolean
  canonicalUrl?: string
}

export const generateMetadata = ({
  title,
  description,
  images = [siteConfig.links.ogImage],
  icons = [
    { rel: 'apple-touch-icon', sizes: '180x180', url: '/assets/apple-touch-icon.png' },
    { rel: 'icon', sizes: '32x32', url: '/assets/favicon-32x32.png' },
    { rel: 'icon', sizes: '16x16', url: '/assets/favicon-16x16.png' },
    { rel: 'shortcut icon', url: '/assets/favicon.ico' },
  ],
  noIndex = false,
  canonicalUrl,
}: MetadataProps = {}): Metadata => {
  const baseUrl = siteConfig.links.siteUrl

  const ogImages = Array.isArray(images)
    ? images.map(img => (img.startsWith('http') ? img : `${baseUrl}${img}`))
    : [`${baseUrl}${images}`]

  return {
    metadataBase: new URL(baseUrl),
    title: title || siteConfig.siteName,
    description: description || siteConfig.siteDescription,
    icons,
    keywords: siteConfig.siteKeywords,
    authors: [{ name: siteConfig.author.name, url: siteConfig.author.url }],
    creator: siteConfig.author.name,
    publisher: siteConfig.siteName,
    applicationName: 'PriyoScript',
    category: 'technology',
    ...(noIndex && { robots: { index: false, follow: false } }),
    openGraph: {
      title: title || siteConfig.siteName,
      description: description || siteConfig.siteDescription,
      url: canonicalUrl || baseUrl,
      type: 'website',
      locale: 'en_US',
      siteName: siteConfig.siteName,
      images: ogImages.map(url => ({
        url,
        width: 1200,
        height: 630,
        alt: siteConfig.siteName,
      })),
    },
    twitter: {
      card: 'summary_large_image',
      title: title || siteConfig.siteName,
      description: description || siteConfig.siteDescription,
      images: ogImages.map(url => ({ url, alt: siteConfig.siteName })),
      site: siteConfig.links.twitter,
      creator: siteConfig.links.twitter,
    },
    alternates: canonicalUrl ? { canonical: canonicalUrl } : undefined,
  }
}
