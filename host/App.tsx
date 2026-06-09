 import React, { useState, useRef, useEffect, Component } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView, Animated, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SplashScreen } from './src/screens/SplashScreen';
import { OnboardingScreen, ONBOARDING_KEY } from './src/screens/OnboardingScreen';
import { HostLoginScreen } from './src/screens/HostLoginScreen';
import { MainNavigator } from './src/navigation/MainNavigator';
import { AuthProvider, CurrencyProvider } from './src/contexts';
import { useAuth } from './src/contexts/AuthContext';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { hideBootLoader } from './src/bootLoader';

// Suppress known web-only dev warnings (not errors)
if (typeof console !== 'undefined') {
  const _warn = console.warn.bind(console);
  console.warn = (...args: any[]) => {
    const msg = String(args[0] ?? '');
    if (msg.includes('useNativeDriver') || msg.includes('textShadow') || msg.includes('shadow*') ||
        msg.includes('pointerEvents') || msg.includes('boxShadow') || msg.includes('RCTAnimation')) return;
    _warn(...args);
  };
}

interface ErrorBoundaryState { error: Error | null }
class ErrorBoundary extends Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: any) { console.error('[ErrorBoundary]', error.message, info?.componentStack); }
  render() {
    if (this.state.error) {
      return (
        <View style={errStyles.container}>
          <Text style={errStyles.title}>Something crashed</Text>
          <ScrollView style={errStyles.scroll}>
            <Text style={errStyles.msg}>{this.state.error.message}</Text>
            <Text style={errStyles.stack}>{this.state.error.stack}</Text>
          </ScrollView>
          <TouchableOpacity style={errStyles.btn} onPress={() => this.setState({ error: null })}>
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

type AppState = 'splash' | 'onboarding' | 'main';

export default function App() {
  const [appState, setAppState] = useState<AppState>('splash');
  const appFade = useRef(new Animated.Value(0)).current;

  useEffect(() => { hideBootLoader(); }, []);

  useEffect(() => {
    if (appState === 'main') {
      Animated.timing(appFade, { toValue: 1, duration: 600, useNativeDriver: Platform.OS !== 'web' }).start();
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

  const finishOnboarding = async () => {
    try { await AsyncStorage.setItem(ONBOARDING_KEY, '1'); } catch {}
    setAppState('main');
  };

  if (appState === 'splash') {
    return (
      <GestureHandlerRootView style={styles.container}>
        <SafeAreaProvider>
          <ErrorBoundary><SplashScreen onFinish={handleSplashFinish} /></ErrorBoundary>
          <StatusBar style="light" />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  if (appState === 'onboarding') {
    return (
      <GestureHandlerRootView style={styles.container}>
        <SafeAreaProvider>
          <ErrorBoundary><OnboardingScreen onFinish={finishOnboarding} /></ErrorBoundary>
          <StatusBar style="light" />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <ThemeProvider>
            <CurrencyProvider>
              <AuthProvider>
                <Animated.View style={{ flex: 1, opacity: appFade }}>
                  <ErrorBoundary><RootGate /></ErrorBoundary>
                </Animated.View>
                <StatusBar style="auto" />
              </AuthProvider>
            </CurrencyProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// Inside the providers: show the phone login until the host is authenticated.
function RootGate() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <View style={styles.container} />;
  return isAuthenticated ? <MainNavigator /> : <HostLoginScreen />;
}

const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: '#0A0F0D' } });
