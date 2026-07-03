import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, TouchableOpacity, ScrollView, NativeSyntheticEvent, NativeScrollEvent, Image, Animated, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { fonts, fontSizes, spacing, borderRadius, letterSpacing } from '../constants';
import { STAYON_GRADIENT } from '../components/GradientButton';
import { useHaptics } from '../hooks/useHaptics';

export const ONBOARDING_KEY = '@stayon_host_onboarded';

interface OnboardingScreenProps {
  onFinish: () => void;
}

const bg = (id: string) => `https://images.unsplash.com/${id}?w=1200&q=80&auto=format&fit=crop`;
const SLIDES = [
  { icon: 'business', title: 'Start earning with StayOn', body: 'List your place, set your price, and welcome guests — all from one calm dashboard.', image: bg('photo-1502672260266-1c1ef2d93688') },
  { icon: 'calendar', title: 'You control everything', body: 'Manage availability, pricing, and bookings. Accept or decline requests in a tap.', image: bg('photo-1505691938895-1758d7feb511') },
  { icon: 'stats-chart', title: 'See your outcomes', body: 'Track earnings, payouts and occupancy — with an AI assistant that explains your numbers.', image: bg('photo-1493809842364-78817add7ffb') },
];

export function OnboardingScreen({ onFinish }: OnboardingScreenProps) {
  const { width } = useWindowDimensions();
  const { light } = useHaptics();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  const bgFade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    bgFade.setValue(0);
    Animated.timing(bgFade, { toValue: 1, duration: 450, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [index]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  const next = () => {
    light();
    if (index < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({ x: (index + 1) * width, animated: true });
    } else {
      onFinish();
    }
  };

  return (
    <View style={styles.root}>
      {/* Crossfading background image + dark overlay */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0A0F0D' }]} />
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: bgFade }]}>
        <Image source={{ uri: SLIDES[index].image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      </Animated.View>
      <LinearGradient
        colors={['rgba(10,15,13,0.55)', 'rgba(10,15,13,0.8)', 'rgba(10,15,13,0.97)']}
        style={StyleSheet.absoluteFill}
      />

    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.topRow}>
        <Text style={styles.brand}>StayOn <Text style={styles.brandPill}>HOST</Text></Text>
        <TouchableOpacity onPress={() => { light(); onFinish(); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.skip}>Skip</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        style={{ flex: 1 }}
      >
        {SLIDES.map((s, i) => (
          <View key={i} style={[styles.slide, { width }]}>
            <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.iconWrap}>
              <Ionicons name={s.icon as any} size={48} color="#fff" />
            </LinearGradient>
            <Text style={styles.title}>{s.title}</Text>
            <Text style={styles.body}>{s.body}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>

      <TouchableOpacity activeOpacity={0.9} onPress={next} style={styles.ctaWrap}>
        <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cta}>
          <Text style={styles.ctaText}>{index === SLIDES.length - 1 ? 'Get started' : 'Next'}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0F0D' },
  container: { flex: 1, backgroundColor: 'transparent' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  brand: { color: '#fff', fontSize: fontSizes.lg, ...fonts.bold },
  brandPill: { color: '#14B8A6', fontSize: fontSizes.xs, letterSpacing: 2, ...fonts.bold },
  skip: { color: 'rgba(255,255,255,0.7)', fontSize: fontSizes.sm, ...fonts.semiBold },
  slide: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing['2xl'] },
  iconWrap: { width: 110, height: 110, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: spacing['2xl'] },
  title: { color: '#fff', fontSize: fontSizes['2xl'], letterSpacing: letterSpacing.tight, textAlign: 'center', marginBottom: spacing.md, ...fonts.bold },
  body: { color: 'rgba(255,255,255,0.78)', fontSize: fontSizes.base, lineHeight: 22, textAlign: 'center', ...fonts.regular },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: spacing.xl },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.25)' },
  dotActive: { width: 22, backgroundColor: '#14B8A6' },
  ctaWrap: { marginHorizontal: spacing.lg, marginBottom: spacing.lg, borderRadius: borderRadius.lg, overflow: 'hidden' },
  cta: { paddingVertical: spacing.base, alignItems: 'center', borderRadius: borderRadius.lg },
  ctaText: { color: '#fff', fontSize: fontSizes.md, ...fonts.bold },
});

export default OnboardingScreen;
