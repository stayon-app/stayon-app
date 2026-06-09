import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  ScrollView,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { useHaptics } from '../hooks/useHaptics';

const ONBOARDING_KEY = '@stayon_onboarded';

const SLIDES = [
  {
    id: '1',
    icon: 'earth',
    title: 'Explore the World',
    subtitle: 'Discover stunning stays in 190+ countries. Use Globe Explorer to find properties on an interactive satellite map.',
    gradient: ['#0D9488', '#14B8A6'] as [string, string],
    img: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=600&fit=crop',
  },
  {
    id: '2',
    icon: 'sparkles',
    title: 'Match Your Vibe',
    subtitle: 'Romantic escape? Adventure seeker? Family fun? Tell us your vibe and we\'ll find the perfect stay for you.',
    gradient: ['#7C3AED', '#A78BFA'] as [string, string],
    img: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&h=600&fit=crop',
  },
  {
    id: '3',
    icon: 'wallet',
    title: 'Earn StayCoins',
    subtitle: 'Every booking earns you StayCoins. Reach Gold and Platinum tiers for exclusive perks, upgrades, and free nights.',
    gradient: ['#F59E0B', '#FCD34D'] as [string, string],
    img: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&h=600&fit=crop',
  },
];

interface Props {
  onFinish: () => void;
}

export function OnboardingScreen({ onFinish }: Props) {
  const { colors } = useTheme();
  const { medium, light } = useHaptics();
  const { width, height } = useWindowDimensions();
  const styles = makeStyles(width, height);
  const scrollRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    light();
    if (currentIndex < SLIDES.length - 1) {
      const next = currentIndex + 1;
      scrollRef.current?.scrollTo({ x: next * width, animated: true });
      setCurrentIndex(next);
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    medium();
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    onFinish();
  };

  const handleScroll = (e: any) => {
    const offsetX = e?.nativeEvent?.contentOffset?.x ?? 0;
    const raw = width > 0 ? Math.round(offsetX / width) : 0;
    const idx = Math.min(Math.max(raw, 0), SLIDES.length - 1);
    setCurrentIndex(idx);
  };

  const slide = SLIDES[currentIndex] || SLIDES[0];

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
      >
        {SLIDES.map((s) => (
          <View key={s.id} style={styles.slide}>
            <Image source={{ uri: s.img }} style={styles.slideImg} resizeMode="cover" />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.85)']}
              style={styles.slideGradient}
            />
          </View>
        ))}
      </ScrollView>

      {/* Skip button */}
      <TouchableOpacity style={styles.skipBtn} onPress={handleFinish}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Content overlay */}
      <View style={styles.content}>
        <LinearGradient
          colors={slide.gradient}
          style={styles.emojiWrap}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name={slide.icon as any} size={32} color="#fff" />
        </LinearGradient>

        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.subtitle}>{slide.subtitle}</Text>

        {/* Dots */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === currentIndex
                  ? [styles.dotActive, { backgroundColor: slide.gradient[0] }]
                  : { backgroundColor: 'rgba(255,255,255,0.35)' },
              ]}
            />
          ))}
        </View>

        {/* CTA */}
        <TouchableOpacity onPress={handleNext} activeOpacity={0.85}>
          <LinearGradient
            colors={slide.gradient}
            style={styles.nextBtn}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.nextText}>
              {currentIndex < SLIDES.length - 1 ? 'Next' : 'Get Started'}
            </Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export { ONBOARDING_KEY };

function makeStyles(width: number, height: number) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  slide: { width, height },
  slideImg: { width, height, position: 'absolute' },
  slideGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.65,
  },
  skipBtn: {
    position: 'absolute',
    top: 56,
    right: 24,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  skipText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  content: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 28,
    paddingBottom: 50,
    alignItems: 'flex-start',
  },
  emojiWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emoji: { fontSize: 30 },
  title: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 38,
    marginBottom: 12,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 28,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 28,
  },
  dot: {
    height: 4,
    width: 8,
    borderRadius: 2,
  },
  dotActive: {
    width: 24,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 16,
  },
  nextText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
  });
}
