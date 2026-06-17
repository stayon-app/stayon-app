import React from 'react';
import { AppProvider, useApp } from './store';
import { Header, Footer, Toast } from './ui';
import { HomeScreen, ExploreScreen } from './screens-home';
import { StayScreen } from './screens-stay';
import { AuthScreen, BookScreen, ConfirmScreen } from './screens-flow';
import { TripsScreen, ProfileScreen } from './screens-misc';

function Router() {
  const { route } = useApp();
  // Auth, booking and confirmation are full-screen flows without the marketing chrome.
  const bare = route.name === 'auth';
  const slim = route.name === 'book' || route.name === 'confirm';

  let screen: React.ReactNode;
  switch (route.name) {
    case 'home': screen = <HomeScreen />; break;
    case 'explore': screen = <ExploreScreen />; break;
    case 'stay': screen = <StayScreen />; break;
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
    </AppProvider>
  );
}
