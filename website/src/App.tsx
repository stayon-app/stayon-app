import React from 'react';
import { AppProvider, useApp } from './store';
import { Header, Footer, Toast, BackendStatus } from './ui';
import { HomeScreen, ExploreScreen } from './screens-home';
import { StayScreen } from './screens-stay';
import { AuthScreen, BookScreen, ConfirmScreen } from './screens-flow';
import { DestPage, AttractionPage } from './screens-dest';
import { TripsScreen, ProfileScreen } from './screens-misc';
import { HostChrome, HostLanding, HostToday, HostListings, HostReservations, HostEarnings, HostCalendar, HostCreate } from './screens-host';

function Router() {
  const { route } = useApp();
  // Auth, booking and confirmation are full-screen flows without the marketing chrome.
  const bare = route.name === 'auth';
  const slim = route.name === 'book' || route.name === 'confirm';

  // Host landing — standalone marketing page (its own chrome), shown before the dashboard.
  if (route.name === 'host-landing') return <><HostLanding /><Toast /></>;
  // Listing wizard — full-screen flow with its own top bar + footer (no host nav/tabs).
  if (route.name === 'host-create') return <><HostCreate /><Toast /></>;

  // Host portal — separate chrome.
  if (route.name.startsWith('host-')) {
    let hs: React.ReactNode;
    switch (route.name) {
      case 'host-today': hs = <HostToday />; break;
      case 'host-listings': hs = <HostListings />; break;
      case 'host-reservations': hs = <HostReservations />; break;
      case 'host-earnings': hs = <HostEarnings />; break;
      case 'host-calendar': hs = <HostCalendar />; break;
      default: hs = <HostToday />;
    }
    return <><HostChrome>{hs}</HostChrome><Toast /></>;
  }

  let screen: React.ReactNode;
  switch (route.name) {
    case 'home': screen = <HomeScreen />; break;
    case 'explore': screen = <ExploreScreen />; break;
    case 'stay': screen = <StayScreen />; break;
    case 'dest': screen = <DestPage />; break;
    case 'place': screen = <AttractionPage />; break;
    case 'auth': screen = <AuthScreen />; break;
    case 'book': screen = <BookScreen />; break;
    case 'confirm': screen = <ConfirmScreen />; break;
    case 'trips': screen = <TripsScreen />; break;
    case 'profile': screen = <ProfileScreen />; break;
    default: screen = <HomeScreen />;
  }

  if (bare) return <>{screen}<Toast /></>;

  return (
    <div className="app">
      <Header />
      <div className="app-body">{screen}</div>
      {!slim && <Footer />}
      <Toast />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Router />
      <BackendStatus />
    </AppProvider>
  );
}
