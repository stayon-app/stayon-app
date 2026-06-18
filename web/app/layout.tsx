import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';
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
    <html lang="en">
      <body>
        <PrefsProvider>
          <AuthProvider>
            <Header />
            <main>{children}</main>
            <Footer />
          </AuthProvider>
        </PrefsProvider>
      </body>
    </html>
  );
}
