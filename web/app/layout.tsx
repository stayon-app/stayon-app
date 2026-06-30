import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';
import { PrefsProvider } from '@/components/PrefsProvider';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'StayOn — 0% fee stays. Hosts keep 100%.',
  description:
    'Book extraordinary stays with zero platform fees. StayOn is a 0%-commission marketplace — guests pay less, hosts keep 100%.',
  openGraph: {
    title: 'StayOn — stay beyond ordinary',
    description: '0%-fee stays. Hosts keep 100%.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      appearance={{ variables: { colorPrimary: '#0d9488' } }}
      afterSignOutUrl="/"
    >
      <html lang="en">
        <body>
          <PrefsProvider>
            <Header />
            <main>{children}</main>
            <Footer />
          </PrefsProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
