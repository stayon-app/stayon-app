import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

// The website uses the SAME system font as the StayOn mobile apps
// (their `fontFamily: 'System'`) — no webfont — so type reads identically
// across the user app, host app and website. Stack lives in globals.css.
import { PrefsProvider } from '@/components/PrefsProvider';
import { StayonBridge } from '@/components/StayonBridge';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'StayOn — stay beyond ordinary',
  description:
    'Book premium, hand-picked homes, villas and hideaways with no booking fees. The price you see is the price you pay.',
  openGraph: {
    title: 'StayOn — stay beyond ordinary',
    description: 'Premium stays, no booking fees. The price you see is the price you pay.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      appearance={{ variables: { colorPrimary: '#0d9488' } }}
      afterSignOutUrl="/"
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
    >
      <html lang="en">
        <body>
          <PrefsProvider>
            <StayonBridge />
            <Header />
            <main>{children}</main>
            <Footer />
          </PrefsProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
