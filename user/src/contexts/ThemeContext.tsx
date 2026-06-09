import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = '@stayon_theme';

export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  // Brand
  primary: string;
  primaryLight: string;
  primaryDark: string;
  primaryUltraLight: string;
  primarySubtle: string;
  secondary: string;
  secondaryLight: string;
  secondaryDark: string;
  gold: string;
  goldLight: string;
  goldDark: string;
  // Backgrounds
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  surface: string;
  card: string;
  // Text
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  // UI
  border: string;
  borderLight: string;
  divider: string;
  // Status
  success: string;
  warning: string;
  error: string;
  info: string;
  // Overlay / scrim scale (over imagery)
  overlay: string;
  overlayLight: string;
  overlayMedium: string;
  overlayStrong: string;
  shadow: string;
  cardShadow: string;
  // Gradients
  gradientStart: string;
  gradientEnd: string;
  gradientAccent: string;
  // Glass
  glassBackground: string;
  glassBorder: string;
  glassBackdrop: string;
  // Resort
  ocean: string;
  sand: string;
  sunset: string;
  palm: string;
  sky: string;
  // Tab bar
  tabBarBackground: string;
  tabBarBorder: string;
  tabBarActive: string;
  tabBarInactive: string;
}

const lightColors: ThemeColors = {
  primary: '#0D9488',
  primaryLight: '#14B8A6',
  primaryDark: '#0F766E',
  primaryUltraLight: '#CCFBF1',
  primarySubtle: '#F0FDFA',
  secondary: '#FB7185',
  secondaryLight: '#FDA4AF',
  secondaryDark: '#F43F5E',
  gold: '#F59E0B',
  goldLight: '#FEF3C7',
  goldDark: '#D97706',
  background: '#FFFFFF',
  backgroundSecondary: '#F8FAFB',
  backgroundTertiary: '#F0FDFA',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textTertiary: '#94A3B8',
  textInverse: '#FFFFFF',
  border: '#D1FAE5',
  borderLight: '#E5E7EB',
  divider: '#D1FAE5',
  success: '#14B8A6',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#06B6D4',
  overlay: 'rgba(0, 40, 60, 0.45)',
  overlayLight: 'rgba(0, 0, 0, 0.25)',
  overlayMedium: 'rgba(0, 0, 0, 0.45)',
  overlayStrong: 'rgba(0, 0, 0, 0.7)',
  shadow: 'rgba(20, 184, 166, 0.25)',
  cardShadow: 'rgba(20, 184, 166, 0.15)',
  gradientStart: '#14B8A6',
  gradientEnd: '#FB7185',
  gradientAccent: '#F59E0B',
  glassBackground: 'rgba(255, 255, 255, 0.98)',
  glassBorder: 'rgba(255, 255, 255, 0.6)',
  glassBackdrop: 'rgba(240, 253, 250, 0.95)',
  ocean: '#06B6D4',
  sand: '#FEF3C7',
  sunset: '#F97316',
  palm: '#10B981',
  sky: '#7DD3FC',
  tabBarBackground: '#FFFFFF',
  tabBarBorder: '#F1F5F9',
  tabBarActive: '#0D9488',
  tabBarInactive: '#94A3B8',
};

const darkColors: ThemeColors = {
  primary: '#14B8A6',
  primaryLight: '#2DD4BF',
  primaryDark: '#0D9488',
  primaryUltraLight: '#134E4A',
  primarySubtle: '#0F2E2B',
  secondary: '#FB7185',
  secondaryLight: '#FDA4AF',
  secondaryDark: '#F43F5E',
  gold: '#FBBF24',
  goldLight: '#2D2006',
  goldDark: '#F59E0B',
  background: '#0A0F0D',
  backgroundSecondary: '#111815',
  backgroundTertiary: '#141A17',
  surface: '#141A17',
  card: '#1A2420',
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  textTertiary: '#475569',
  textInverse: '#0F172A',
  border: '#1F3330',
  borderLight: '#1E2B28',
  divider: '#1F3330',
  success: '#2DD4BF',
  warning: '#FBBF24',
  error: '#F87171',
  info: '#22D3EE',
  overlay: 'rgba(0, 0, 0, 0.65)',
  overlayLight: 'rgba(0, 0, 0, 0.35)',
  overlayMedium: 'rgba(0, 0, 0, 0.55)',
  overlayStrong: 'rgba(0, 0, 0, 0.78)',
  shadow: 'rgba(0, 0, 0, 0.4)',
  cardShadow: 'rgba(0, 0, 0, 0.3)',
  gradientStart: '#0D9488',
  gradientEnd: '#F43F5E',
  gradientAccent: '#FBBF24',
  glassBackground: 'rgba(20, 26, 23, 0.95)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  glassBackdrop: 'rgba(10, 15, 13, 0.9)',
  ocean: '#22D3EE',
  sand: '#2D2006',
  sunset: '#EA580C',
  palm: '#059669',
  sky: '#0EA5E9',
  tabBarBackground: '#111815',
  tabBarBorder: '#1F2E29',
  tabBarActive: '#14B8A6',
  tabBarInactive: '#475569',
};

interface ThemeContextValue {
  mode: ThemeMode;
  colors: ThemeColors;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'light',
  colors: lightColors,
  isDark: false,
  toggleTheme: () => {},
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('light');

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((saved) => {
      if (saved === 'dark' || saved === 'light') setMode(saved);
    });
  }, []);

  const setTheme = async (newMode: ThemeMode) => {
    setMode(newMode);
    await AsyncStorage.setItem(THEME_KEY, newMode);
  };

  const toggleTheme = () => setTheme(mode === 'light' ? 'dark' : 'light');

  return (
    <ThemeContext.Provider
      value={{
        mode,
        colors: mode === 'dark' ? darkColors : lightColors,
        isDark: mode === 'dark',
        toggleTheme,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export { lightColors, darkColors };
