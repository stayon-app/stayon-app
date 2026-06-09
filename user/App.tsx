    import React, { useState, useRef, useEffect, Component } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView, Animated, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SplashScreen } from './src/screens/SplashScreen';
import { OnboardingScreen, ONBOARDING_KEY } from './src/screens/OnboardingScreen';
import { MainNavigator } from './src/navigation/MainNavigator';
import { AuthProvider, CurrencyProvider } from './src/contexts';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { ModeProvider, useMode } from './src/contexts/ModeContext';
import { hideBootLoader } from './src/bootLoader';
// Host experience (nested — one app, switchable modes). Auth is shared (single
// login), so we only need the host's Theme + Currency providers here.
import { ThemeProvider as HostThemeProvider } from './src/host/contexts/ThemeContext';
import { CurrencyProvider as HostCurrencyProvider } from './src/host/contexts';
import { MainNavigator as HostNavigator } from './src/host/navigation/MainNavigator';

// Suppress known web-only development warnings that are not errors
if (typeof console !== 'undefined') {
  const _warn = console.warn.bind(console);
  console.warn = (...args: any[]) => {
    const msg = String(args[0] ?? '');
    if (
      msg.includes('useNativeDriver') ||
      msg.includes('textShadow') ||
      msg.includes('shadow*') ||
      msg.includes('pointerEvents') ||
      msg.includes('boxShadow') ||
      msg.includes('RCTAnimation')
    ) return;
    _warn(...args);
  };
}

// ─── Proper React Error Boundary ────────────────────────────────────────────
// try/catch in render() doesn't catch React render errors. This class does.
interface ErrorBoundaryState { error: Error | null }
class ErrorBoundary extends Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: any) {
    console.error('[ErrorBoundary]', error.message, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <View style={errStyles.container}>
          <Text style={errStyles.title}>Something crashed</Text>
          <ScrollView style={errStyles.scroll}>
            <Text style={errStyles.msg}>{this.state.error.message}</Text>
            <Text style={errStyles.stack}>{this.state.error.stack}</Text>
          </ScrollView>
          <TouchableOpacity
            style={errStyles.btn}
            onPress={() => this.setState({ error: null })}
          >
            <Text style={errStyles.btnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const errStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0F0D', justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 20, color: '#FB7185', fontWeight: '800', marginBottom: 16 },
  scroll: { maxHeight: 300, width: '100%', marginBottom: 16 },
  msg: { color: '#F1F5F9', fontSize: 14, marginBottom: 8 },
  stack: { color: '#475569', fontSize: 11, lineHeight: 16 },
  btn: { backgroundColor: '#0D9488', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
// ────────────────────────────────────────────────────────────────────────────

type AppState = 'splash' | 'onboarding' | 'main';

export default function App() {
  const [appState, setAppState] = useState<AppState>('splash');
  // Soft fade-in for the main app so it eases in after the splash crossfade.
  const appFade = useRef(new Animated.Value(0)).current;

  // React has mounted and painted the splash — remove the web boot spinner.
  useEffect(() => {
    hideBootLoader();
  }, []);

  useEffect(() => {
    if (appState === 'main') {
      Animated.timing(appFade, {
        toValue: 1,
        duration: 600,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    }
  }, [appState, appFade]);

  const handleSplashFinish = async () => {
    try {
      const onboarded = await AsyncStorage.getItem(ONBOARDING_KEY);
      setAppState(onboarded ? 'main' : 'onboarding');
    } catch {
      setAppState('main');
    }
  };

  if (appState === 'splash') {
    return (
      <GestureHandlerRootView style={styles.container}>
        <SafeAreaProvider>
          <ErrorBoundary>
            <SplashScreen onFinish={handleSplashFinish} />
          </ErrorBoundary>
          <StatusBar style="light" />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  if (appState === 'onboarding') {
    return (
      <GestureHandlerRootView style={styles.container}>
        <SafeAreaProvider>
          <ErrorBoundary>
            <OnboardingScreen onFinish={() => setAppState('main')} />
          </ErrorBoundary>
          <StatusBar style="light" />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <ModeProvider>
            <AuthProvider>
              <Animated.View style={{ flex: 1, opacity: appFade }}>
                <ModeRoot />
              </Animated.View>
              <StatusBar style="auto" />
            </AuthProvider>
          </ModeProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// Picks the guest or host experience based on the current mode. Each keeps its
// own providers; only one tree is mounted at a time.
function ModeRoot() {
  const { mode } = useMode();
  if (mode === 'host') {
    return (
      <ErrorBoundary>
        <HostThemeProvider>
          <HostCurrencyProvider>
            <HostNavigator />
          </HostCurrencyProvider>
        </HostThemeProvider>
      </ErrorBoundary>
    );
  }
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <CurrencyProvider>
          <MainNavigator />
        </CurrencyProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0F0D',
  },
});
