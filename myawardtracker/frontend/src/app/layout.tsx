import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import { ToastProvider } from '@/components/ui/Toast';
import { env } from '@/lib/env';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl || 'https://myawardtracker.com'),
  title: {
    default: 'My Award Tracker — Track activities, hours & award progress',
    template: '%s · My Award Tracker',
  },
  description:
    'My Award Tracker helps high school students, families, and organizations log activities, track service hours, and reach award goals — all in one polished dashboard.',
  openGraph: {
    type: 'website',
    siteName: 'My Award Tracker',
    title: 'My Award Tracker',
    description:
      'Track activities, service hours, and award progress in one place.',
  },
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
