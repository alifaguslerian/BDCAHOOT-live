import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { AppProviders } from '@/components/providers/AppProviders';

const anybody = localFont({ src: './fonts/anybody-latin.woff2', weight: '100 900', display: 'swap', variable: '--font-anybody-local' });
const spaceGrotesk = localFont({ src: './fonts/space-grotesk-latin.woff2', weight: '300 700', display: 'swap', variable: '--font-space-local' });

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const appDescription =
  'Platform kuis panggung live interaktif untuk kompetisi dan presentasi seru. Pimpin kuis multiplayer real-time via smartphone dan proyektor panggung.';

export const viewport: Viewport = {
  themeColor: '#0b0e14',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'BDCAHOOT Live Arena',
    template: '%s | BDCAHOOT Live Arena',
  },
  description: appDescription,
  applicationName: 'BDCAHOOT Live Arena',
  authors: [{ name: 'BDCAHOOT Arena Systems' }],
  keywords: ['kuis', 'interaktif', 'panggung', 'real-time', 'kahoot alternative', 'arena', 'multiplayer'],
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    url: '/',
    title: 'BDCAHOOT Live Arena',
    description: appDescription,
    siteName: 'BDCAHOOT Live Arena',
    locale: 'id_ID',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BDCAHOOT Live Arena',
    description: appDescription,
  },
};

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'BDCAHOOT Live Arena',
  url: baseUrl,
  applicationCategory: 'GameApplication',
  operatingSystem: 'All',
  description: appDescription,
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'IDR',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`dark ${anybody.variable} ${spaceGrotesk.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className="bg-[#0b0e14] text-[#e1e2eb] font-sans antialiased selection:bg-[#f5a623] selection:text-[#644000]" suppressHydrationWarning>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
