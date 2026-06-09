import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ImageBackground,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { fonts, spacing } from '../constants';
import { STAYON_GRADIENT } from './GradientButton';

interface PremiumHeroProps {
  scrollY: Animated.Value;
  onSearchPress: () => void;
}

const STATS = [
  { value: '10K+', label: 'Stays' },
  { value: '150+', label: 'Countries' },
  { value: '4.9', label: 'Rating' },
];

export const PremiumHero: React.FC<PremiumHeroProps> = ({ scrollY, onSearchPress }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const riseAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.spring(riseAnim, {
        toValue: 0,
        friction: 9,
        tension: 50,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  }, []);

  const translateY = scrollY.interpolate({
    inputRange: [0, 300],
    outputRange: [0, -40],
    extrapolate: 'clamp',
  });

  const heroOpacity = scrollY.interpolate({
    inputRange: [0, 220],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }], opacity: heroOpacity }]}>
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&h=900&fit=crop&q=80' }}
        style={styles.bg}
        resizeMode="cover"
      >
        {/* Legibility gradient — darker at bottom where text sits */}
        <LinearGradient
          colors={['rgba(8,12,16,0.28)', 'rgba(8,12,16,0.45)', 'rgba(8,12,16,0.82)']}
          locations={[0, 0.45, 1]}
          style={styles.gradient}
        >
          <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: riseAnim }] }]}>
            {/* Eyebrow */}
            <Text style={styles.eyebrow}>STAYON</Text>

            {/* Title — two clean lines */}
            <Text style={styles.title}>Find your perfect</Text>
            <Text style={styles.titleAccent}>stay, beyond ordinary</Text>
            <Text style={styles.subtitle}>Unique homes, experiences & adventures</Text>

            {/* Search bar — large, unmistakable, full-width */}
            <TouchableOpacity
              style={styles.searchBar}
              onPress={onSearchPress}
              activeOpacity={0.92}
              accessibilityRole="search"
              accessibilityLabel="Search destinations"
            >
              <Ionicons name="search" size={20} color="#0F172A" />
              <View style={styles.searchTextWrap}>
                <Text style={styles.searchTitle}>Where to?</Text>
                <Text style={styles.searchSub}>Anywhere · Any week · Add guests</Text>
              </View>
              <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.searchBtn}>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>

          </Animated.View>
        </LinearGradient>
      </ImageBackground>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 400,
    width: '100%',
  },
  bg: { flex: 1, width: '100%' },
  gradient: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 22,
    paddingBottom: 26,
  },
  content: { width: '100%' },
  eyebrow: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 3,
    marginBottom: 10,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
    lineHeight: 36,
  },
  titleAccent: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
    lineHeight: 36,
    marginBottom: 8,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 20,
  },
  // Search bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingLeft: 18,
    paddingRight: 8,
    paddingVertical: 8,
    minHeight: 64,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 20 },
      android: { elevation: 10 },
      web: { boxShadow: '0 8px 24px rgba(0,0,0,0.25)' } as any,
    }),
  },
  searchTextWrap: { flex: 1, marginLeft: 12 },
  searchTitle: { color: '#0F172A', fontSize: 16, fontWeight: '700' },
  searchSub: { color: '#64748B', fontSize: 12, marginTop: 2, fontWeight: '500' },
  searchBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Stats
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 14,
    marginTop: 18,
    ...Platform.select({ web: { backdropFilter: 'blur(10px)' } as any, default: {} }),
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  statNumber: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  statLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 3,
  },
  statDivider: {
    width: 1,
    height: 34,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
});
