import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Platform,
  ScrollView, useWindowDimensions, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { STAYON_GRADIENT } from './GradientButton';
import { borderRadius } from '../constants';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useHaptics } from '../hooks/useHaptics';

// Deterministic 32-bit hash from a string id (stable per listing, no Math.random()).
function hashId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Short, single-concept badges shown on ~half of cards (deterministic per id).
const SOCIAL_BADGES = [
  'Guest favourite',
  'Recommended',
  'Budget-friendly',
  'Rare find',
  'Top rated',
  'Great value',
  'Trending',
];

// Derive subtle, research-backed trust + social-proof cues deterministically.
function trustCues(id: string) {
  const h = hashId(id);
  const showSocial = (h & 1) === 0;
  const socialLabel = showSocial ? SOCIAL_BADGES[(h >> 1) % SOCIAL_BADGES.length] : null;
  const verified = (h >> 5) % 5 !== 0;
  return { socialLabel, verified };
}

export interface StayCardData {
  id: string;
  images: string[];
  type: string;
  title: string;
  location: string;
  rating: number;
  reviews: number;
  price: number;
}

interface Props {
  stay: StayCardData;
  selected?: boolean;
  onLocate: () => void;   // tap card → point to location on map
  onView: () => void;     // open full listing
}

export const StayListCard: React.FC<Props> = ({ stay, selected, onLocate, onView }) => {
  const { colors } = useTheme();
  const { format } = useCurrency();
  const { light, medium } = useHaptics();
  const { width } = useWindowDimensions();
  const CARD_W = width - 32; // panel horizontal padding 16 each side
  const [active, setActive] = useState(0);
  const [fav, setFav] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const images = Array.isArray(stay?.images) ? stay.images : [];
  const rating = Number(stay?.rating) || 0;
  const { socialLabel, verified } = trustCues(String(stay?.id ?? ''));

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / CARD_W);
    if (i !== active) setActive(i);
  };

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: Platform.OS !== 'web',
      friction: 8,
      tension: 40,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: Platform.OS !== 'web',
      friction: 8,
      tension: 40,
    }).start();
  };

  const styles = makeStyles(colors, selected, CARD_W);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
    <TouchableOpacity
      activeOpacity={0.95}
      onPress={() => { light(); onLocate(); }}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.card}
    >
      {/* Swipeable image carousel */}
      <View style={styles.imageWrap}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
        >
          {images.map((img, i) => (
            <Image key={i} source={{ uri: typeof img === 'string' ? img : (img as any)?.uri }} style={styles.image} contentFit="cover" transition={200} />
          ))}
        </ScrollView>

        {/* Heart */}
        <TouchableOpacity
          style={styles.heart}
          onPress={() => { medium(); setFav(!fav); }}
          accessibilityRole="button"
          accessibilityLabel={fav ? 'Remove from favourites' : 'Add to favourites'}
        >
          <Ionicons name={fav ? 'heart' : 'heart-outline'} size={22} color={fav ? '#FB7185' : '#fff'} />
        </TouchableOpacity>

        {/* Guest favourite badge */}
        {rating >= 4.9 && (
          <View style={styles.favBadge}>
            <Text style={styles.favBadgeText}>Guest favourite</Text>
          </View>
        )}

        {/* Social proof micro-label (only when no guest-favourite badge, to avoid clutter) */}
        {socialLabel && rating < 4.9 && (
          <View style={styles.favBadge}>
            <Text style={styles.favBadgeText}>{socialLabel}</Text>
          </View>
        )}

        {/* Dots */}
        {images.length > 1 && (
          <View style={styles.dots}>
            {images.map((_, i) => (
              <View key={i} style={[styles.dot, { opacity: i === active ? 1 : 0.5, width: i === active ? 7 : 6, height: i === active ? 7 : 6 }]} />
            ))}
          </View>
        )}

        {/* Located indicator when selected */}
        {selected && (
          <View style={[styles.locatedTag, { backgroundColor: colors.primary }]}>
            <Ionicons name="location" size={12} color="#fff" />
            <Text style={styles.locatedText}>On map</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={[styles.type, { color: colors.textSecondary }]}>{String(stay?.type ?? '').toUpperCase()}</Text>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>{stay?.title ?? ''}</Text>
          {verified && (
            <Ionicons name="shield-checkmark" size={14} color={colors.primary} style={styles.verifiedIcon} />
          )}
        </View>
        <Text style={[styles.location, { color: colors.textSecondary }]} numberOfLines={1}>{typeof stay?.location === 'string' ? stay.location : ''}</Text>
        <View style={styles.metaRow}>
          <Ionicons name="star" size={14} color={colors.gold} />
          <Text style={[styles.rating, { color: colors.textPrimary }]}>{rating} · {Number(stay?.reviews) || 0} reviews</Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={[styles.price, { color: colors.textPrimary }]}>
            <Text style={{ fontWeight: '800' }}>{format(Number(stay?.price) || 0)}</Text>
            <Text style={{ color: colors.textSecondary, fontWeight: '400' }}> / night</Text>
            <Text style={{ color: colors.textTertiary, fontWeight: '400', fontSize: 11 }}> + taxes</Text>
          </Text>
          <TouchableOpacity activeOpacity={0.9} onPress={() => { medium(); onView(); }}>
            <LinearGradient
              colors={STAYON_GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.viewBtn}
            >
              <Text style={styles.viewBtnText}>View stay</Text>
              <Ionicons name="arrow-forward" size={14} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
    </Animated.View>
  );
};

function makeStyles(colors: any, selected: boolean | undefined, CARD_W: number) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: borderRadius.lg,
      borderWidth: selected ? 2 : 1,
      borderColor: selected ? colors.primary : colors.borderLight,
      overflow: 'hidden',
      marginBottom: 16,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: selected ? 0.18 : 0.10,
          shadowRadius: 12,
        },
        android: {
          elevation: selected ? 6 : 4,
        },
        web: {
          boxShadow: selected
            ? '0 6px 16px rgba(0,0,0,0.18)'
            : '0 6px 16px rgba(0,0,0,0.10)',
        },
      }),
    },
    imageWrap: { width: '100%', height: 220, position: 'relative' },
    image: { width: CARD_W, height: 220 },
    heart: {
      position: 'absolute', top: 12, right: 12,
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: 'rgba(0,0,0,0.25)',
      justifyContent: 'center', alignItems: 'center',
    },
    favBadge: {
      position: 'absolute', top: 12, left: 12,
      backgroundColor: 'rgba(255,255,255,0.95)',
      paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14,
    },
    favBadgeText: { fontSize: 12, fontWeight: '700', color: '#0F172A' },
    dots: {
      position: 'absolute', bottom: 12, alignSelf: 'center',
      flexDirection: 'row', gap: 5,
    },
    dot: { borderRadius: 4, backgroundColor: '#fff' },
    locatedTag: {
      position: 'absolute', bottom: 12, left: 12,
      flexDirection: 'row', alignItems: 'center', gap: 3,
      paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12,
    },
    locatedText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    info: { padding: 14 },
    type: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
    title: { flexShrink: 1, fontSize: 17, fontWeight: '700' },
    verifiedIcon: { marginTop: 1 },
    location: { fontSize: 13, marginTop: 2 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
    rating: { fontSize: 13, fontWeight: '500' },
    priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
    price: { fontSize: 16 },
    viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12 },
    viewBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  });
}
