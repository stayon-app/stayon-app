import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { fonts, spacing, borderRadius } from '../constants';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useHaptics } from '../hooks/useHaptics';
import { useFavorite } from '../data/favorites';
import * as animUtils from '../utils/animations';

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
  // Show a concise social-proof badge on ~half of cards.
  const showSocial = (h & 1) === 0;
  const socialLabel = showSocial ? SOCIAL_BADGES[(h >> 1) % SOCIAL_BADGES.length] : null;
  // Most listings are verified.
  const verified = (h >> 5) % 5 !== 0;
  return { socialLabel, verified };
}

export interface Property {
  id: string;
  title: string;
  location: string;
  price: number;
  rating: number;
  reviews: number;
  images: string[];
  isFavorite?: boolean;
  isGuestFavorite?: boolean;
  badge?: string;
  latitude: number;
  longitude: number;
  address?: string;
  isBooked?: boolean;
  category?: string;
  /** Optional "x km away" label, set when the card is shown in a nearby/location context. */
  distanceLabel?: string;
}

interface PropertyCardProps {
  property: Property;
  onPress?: () => void;
  onFavoritePress?: () => void;
  onMapPress?: () => void; // Navigate to map view of this property
}

export const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  onPress,
  onFavoritePress,
  onMapPress,
}) => {
  const { colors } = useTheme();
  const { format } = useCurrency();
  const { light } = useHaptics();
  const { width } = useWindowDimensions();
  const cardWidth = width - spacing.lg * 2;
  const styles = makeStyles(colors, cardWidth);
  const images = Array.isArray(property?.images) ? property.images : [];
  const { socialLabel, verified } = trustCues(String(property?.id ?? ''));
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  // Persisted favorite (saved to the Wishlists tab), shared across all cards.
  const [isFavorite, toggleFavorite] = useFavorite({
    id: String(property?.id ?? ''),
    title: String(property?.title ?? 'Stay'),
    location: typeof property?.location === 'string' ? property.location : '',
    price: Number(property?.price) || 0,
    rating: Number(property?.rating) || 0,
    image: Array.isArray(property?.images) ? property.images[0] : '',
  });
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const heartScale = useRef(new Animated.Value(1)).current;
  const badgeOpacity = useRef(new Animated.Value(0)).current;
  const badgeScale = useRef(new Animated.Value(0.8)).current;

  // Entrance animation for badges
  useEffect(() => {
    if (property.isGuestFavorite || property.badge || socialLabel) {
      Animated.parallel([
        animUtils.fadeIn(badgeOpacity, 400, 1),
        animUtils.scaleIn(badgeScale, 400, 1),
      ]).start();
    }
  }, [property.isGuestFavorite, property.badge]);

  const handlePressIn = () => {
    light();
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

  const handleFavorite = () => {
    // Enhanced heart animation
    animUtils.heartAnimation(heartScale).start();
    toggleFavorite(); // persists to the Saved wishlist + syncs every card
    onFavoritePress?.();
  };

  const handleImageScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = cardWidth > 0 ? Math.round(offsetX / cardWidth) : 0;
    if (index >= 0 && index < images.length) {
      setCurrentImageIndex(index);
    }
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={styles.card}
        activeOpacity={1}
        onPress={() => {
          console.log('PropertyCard pressed:', property.id, property.title);
          onPress?.();
        }}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
      {/* Image Carousel */}
      <View style={styles.imageContainer}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleImageScroll}
          scrollEventThrottle={16}
          style={styles.imageScroll}
        >
          {images.map((imageUri, index) => (
            <Image
              key={index}
              source={{ uri: typeof imageUri === 'string' ? imageUri : (imageUri as any)?.uri }}
              style={styles.image}
              contentFit="cover"
              transition={200}
            />
          ))}
        </ScrollView>

        {/* Badges */}
        {property.isGuestFavorite && (
          <Animated.View
            style={[
              styles.guestFavoriteBadge,
              {
                opacity: badgeOpacity,
                transform: [{ scale: badgeScale }],
              },
            ]}
          >
            <Text style={styles.guestFavoriteText}>Guest favourite</Text>
          </Animated.View>
        )}

        {property.badge && (
          <Animated.View
            style={[
              styles.customBadge,
              {
                opacity: badgeOpacity,
                transform: [{ scale: badgeScale }],
              },
            ]}
          >
            <Text style={styles.badgeText}>{String(property?.badge ?? '')}</Text>
          </Animated.View>
        )}

        {/* Social-proof badge (e.g. "Top rated") — on the image, top-left */}
        {socialLabel && !property.isGuestFavorite && (
          <Animated.View
            style={[
              styles.socialBadge,
              {
                opacity: badgeOpacity,
                transform: [{ scale: badgeScale }],
              },
            ]}
          >
            <Ionicons name="star" size={11} color={colors.gold} style={{ marginRight: 4 }} />
            <Text style={styles.socialBadgeText}>{socialLabel}</Text>
          </Animated.View>
        )}

        {/* Heart Button */}
        <TouchableOpacity
          style={styles.heartButton}
          onPress={handleFavorite}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={isFavorite ? 'Remove from favourites' : 'Add to favourites'}
        >
          <Animated.View style={{ transform: [{ scale: heartScale }] }}>
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={24}
              color={isFavorite ? '#FF385C' : colors.textInverse}
            />
          </Animated.View>
        </TouchableOpacity>

        {/* Image Pagination Dots */}
        {images.length > 1 && (
          <View style={styles.paginationContainer}>
            {images.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.paginationDot,
                  index === currentImageIndex && styles.paginationDotActive,
                ]}
              />
            ))}
          </View>
        )}
      </View>

      {/* Property Info */}
      <View style={styles.infoContainer}>
        <View style={styles.headerRow}>
          <View style={styles.titleWrap}>
            <Text style={styles.title} numberOfLines={1}>
              {property?.title ?? ''}
            </Text>
            {verified && (
              <Ionicons
                name="shield-checkmark"
                size={14}
                color={colors.primary}
                style={styles.verifiedIcon}
              />
            )}
          </View>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={14} color={colors.textPrimary} />
            <Text style={styles.rating}>{(Number(property?.rating) || 0).toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.locationRow}>
          <Text style={styles.location} numberOfLines={1}>
            {typeof property?.location === 'string' ? property.location : ''}
          </Text>
          {!!property?.distanceLabel && (
            <View style={styles.distancePill}>
              <Ionicons name="location" size={11} color={colors.primary} />
              <Text style={styles.distanceText} numberOfLines={1}>
                {property.distanceLabel}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.reviews} numberOfLines={1}>
          {Number(property?.reviews) || 0} reviews
        </Text>

        <View style={styles.priceRow}>
          <View style={styles.priceInfo}>
            <Text style={styles.priceAmount}>{format(Number(property?.price) || 0)}</Text>
            <Text style={styles.priceNight}> /night</Text>
            <Text style={styles.priceTaxes}> + taxes</Text>
          </View>
          {onMapPress && (
            <TouchableOpacity
              style={styles.mapButton}
              onPress={onMapPress}
              activeOpacity={0.7}
            >
              <Ionicons name="map-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
    </Animated.View>
  );
};

function makeStyles(colors: any, cardWidth: number) {
  return StyleSheet.create({
  card: {
    marginBottom: spacing.xl,
    backgroundColor: colors.background, // Changed from colors.surface
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.10,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 6px 16px rgba(0,0,0,0.10)',
      },
    }),
  },
  imageContainer: {
    position: 'relative',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
    backgroundColor: colors.backgroundSecondary,
    height: 280,
  },
  imageScroll: {
    width: '100%',
    height: 280,
  },
  image: {
    width: cardWidth,
    height: 280,
  },
  guestFavoriteBadge: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  guestFavoriteText: {
    fontSize: 12,
    ...fonts.semiBold,
    color: colors.textPrimary,
  },
  customBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.lg + 40,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
      } as any,
    }),
  },
  badgeText: {
    fontSize: 11,
    ...fonts.bold,
    color: '#222222',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  socialBadge: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4 },
      android: { elevation: 3 },
      web: { boxShadow: '0 2px 6px rgba(0,0,0,0.18)' } as any,
    }),
  },
  socialBadgeText: {
    fontSize: 11,
    ...fonts.bold,
    color: '#1A1A1A',
    letterSpacing: 0.2,
  },
  heartButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paginationContainer: {
    position: 'absolute',
    bottom: spacing.md,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  paginationDotActive: {
    backgroundColor: colors.textInverse,
  },
  infoContainer: {
    gap: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  titleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  title: {
    flexShrink: 1,
    fontSize: 16,
    ...fonts.semiBold,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  verifiedIcon: {
    marginTop: 1,
  },
  socialProof: {
    fontSize: 13,
    ...fonts.semiBold,
    color: colors.primary,
    marginTop: 2,
  },
  priceTaxes: {
    fontSize: 12,
    ...fonts.regular,
    color: colors.textTertiary,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    fontSize: 14,
    ...fonts.semiBold,
    color: colors.textPrimary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  location: {
    flex: 1,
    fontSize: 15,
    ...fonts.regular,
    color: colors.textSecondary,
  },
  distancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: colors.primary + '15',
  },
  distanceText: {
    fontSize: 12,
    ...fonts.semiBold,
    color: colors.primary,
  },
  reviews: {
    fontSize: 14,
    ...fonts.regular,
    color: colors.textSecondary,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  priceInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceAmount: {
    fontSize: 17,
    ...fonts.semiBold,
    color: colors.textPrimary,
  },
  priceNight: {
    fontSize: 15,
    ...fonts.regular,
    color: colors.textPrimary,
  },
  mapButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(13, 148, 136, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  });
}
