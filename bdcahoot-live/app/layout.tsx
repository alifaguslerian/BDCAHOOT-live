import type {Metadata} from 'next';
import { Anybody, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { AppProviders } from '@/components/providers/AppProviders';

const anybody = Anybody({
  subsets: ['latin'],
  variable: '--font-anybody',
  weight: ['700', '800', '900'],
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'BDCAHOOT Live Arena',
  description: 'Platform kuis panggung live interaktif untuk kompetisi dan presentasi seru.',
  openGraph: {
    title: 'BDCAHOOT Live Arena',
    description: 'Platform kuis panggung live interaktif untuk kompetisi dan presentasi seru.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BDCAHOOT Live Arena',
    description: 'Platform kuis panggung live interaktif untuk kompetisi dan presentasi seru.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="id" className={`dark ${anybody.variable} ${spaceGrotesk.variable}`}>
      <body className="bg-[#0b0e14] text-[#e1e2eb] font-sans antialiased selection:bg-[#f5a623] selection:text-[#644000]" suppressHydrationWarning>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
