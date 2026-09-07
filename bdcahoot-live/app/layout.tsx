import type {Metadata} from 'next';
import './globals.css';
import { AppProviders } from '@/components/providers/AppProviders';

export const metadata: Metadata = {
  title: 'BDCAHOOT Minigames',
  description: 'Interactive multiplayer quiz arena with live host projector display, speed-bonus scoring, and real-time player controls.',
  openGraph: {
    title: 'BDCAHOOT Minigames',
    description: 'Interactive multiplayer quiz arena with live host projector display, speed-bonus scoring, and real-time player controls.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BDCAHOOT Minigames',
    description: 'Interactive multiplayer quiz arena with live host projector display, speed-bonus scoring, and real-time player controls.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="id" className="dark">
      <body className="bg-[#0B0E14] text-[#F5F7FA] antialiased min-h-screen" suppressHydrationWarning>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}

