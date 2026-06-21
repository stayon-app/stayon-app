import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { spacing } from '../constants';
import { STAYON_GRADIENT } from './GradientButton';

interface PremiumHeroProps {
  scrollY: Animated.Value;
  onSearchPress: () => void;
}

const heroImg = (id: string) => `https://images.unsplash.com/${id}?w=1200&h=900&fit=crop&q=80`;
const SLIDES = [
  { img: 'photo-1613490493576-7fde63acd811', word: 'private villa' },
  { img: 'photo-1571896349842-33c89424de2d', word: 'poolside retreat' },
  { img: 'photo-1520250497591-112f2f40a3f4', word: 'beachfront escape' },
  { img: 'photo-1566073771259-6a8506099945', word: 'city loft' },
  { img: 'photo-1540541338287-41700207dee6', word: 'mountain cabin' },
];
const native = Platform.OS !== 'web';

export const PremiumHero: React.FC<PremiumHeroProps> = ({ scrollY, onSearchPress }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const riseAnim = useRef(new Animated.Value(24)).current;
  const wordAnim = useRef(new Animated.Value(1)).current;
  // one opacity per slide for the crossfade
  const opacities = useRef(SLIDES.map((_, n) => new Animated.Value(n === 0 ? 1 : 0))).current;
  const [index, setIndex] = useState(0);

  // entrance
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: native }),
      Animated.spring(riseAnim, { toValue: 0, friction: 9, tension: 50, useNativeDriver: native }),
    ]).start();
  }, []);

  // auto-advance the slideshow
  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), 4500);
    return () => clearInterval(t);
  }, []);

  // crossfade backgrounds + pop the rotating word whenever the slide changes
  useEffect(() => {
    Animated.parallel(
      opacities.map((v, n) => Animated.timing(v, { toValue: n === index ? 1 : 0, duration: 900, useNativeDriver: native })),
    ).start();
    wordAnim.setValue(0);
    Animated.timing(wordAnim, { toValue: 1, duration: 520, useNativeDriver: native }).start();
  }, [index]);

  const translateY = scrollY.interpolate({ inputRange: [0, 300], outputRange: [0, -40], extrapolate: 'clamp' });
  const heroOpacity = scrollY.interpolate({ inputRange: [0, 220], outputRange: [1, 0], extrapolate: 'clamp' });
  const wordTranslate = wordAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }], opacity: heroOpacity }]}>
      {/* crossfading background slideshow */}
      {SLIDES.map((s, n) => (
        <Animated.Image
          key={s.img}
          source={{ uri: heroImg(s.img) }}
          style={[StyleSheet.absoluteFill, { opacity: opacities[n] }]}
          resizeMode="cover"
        />
      ))}
      <LinearGradient
        colors={['rgba(8,12,16,0.30)', 'rgba(8,12,16,0.48)', 'rgba(8,12,16,0.84)']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: riseAnim }] }]}>
        <View style={styles.eyebrowPill}>
          <Ionicons name="sparkles" size={11} color="#5eead4" />
          <Text style={styles.eyebrow}>STAY BEYOND ORDINARY</Text>
        </View>

        <Text style={styles.title}>Find your perfect</Text>
        <Animated.Text style={[styles.titleAccent, { opacity: wordAnim, transform: [{ translateY: wordTranslate }] }]}>
          {SLIDES[index].word}.
        </Animated.Text>

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

        {/* slide dots */}
        <View style={styles.dots}>
          {SLIDES.map((_, n) => (
            <TouchableOpacity key={n} onPress={() => setIndex(n)} hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}>
              <View style={[styles.dot, n === index && styles.dotOn]} />
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { height: 420, width: '100%', overflow: 'hidden', backgroundColor: '#04141a' },
  content: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end', paddingHorizontal: 22, paddingBottom: 24 },
  eyebrowPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.25)', borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, marginBottom: 12,
  },
  eyebrow: { color: '#FFFFFF', fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  title: { color: '#FFFFFF', fontSize: 34, fontWeight: '800', letterSpacing: -1, lineHeight: 38 },
  titleAccent: { color: '#5eead4', fontSize: 34, fontWeight: '800', letterSpacing: -1, lineHeight: 40, marginBottom: 18 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 18,
    paddingLeft: 18, paddingRight: 8, paddingVertical: 8, minHeight: 64,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 20 },
      android: { elevation: 10 },
      web: { boxShadow: '0 8px 24px rgba(0,0,0,0.25)' } as any,
    }),
  },
  searchTextWrap: { flex: 1, marginLeft: 12 },
  searchTitle: { color: '#0F172A', fontSize: 16, fontWeight: '700' },
  searchSub: { color: '#64748B', fontSize: 12, marginTop: 2, fontWeight: '500' },
  searchBtn: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', gap: 6, marginTop: 16, alignItems: 'center' },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.45)' },
  dotOn: { width: 20, backgroundColor: '#FFFFFF' },
});
