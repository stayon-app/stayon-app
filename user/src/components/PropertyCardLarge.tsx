import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Platform,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { fontSizes, fonts, spacing, borderRadius } from '../constants';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useHaptics } from '../hooks/useHaptics';
import * as animUtils from '../utils/animations';
import { useFavorite } from '../data/favorites';

const CARD_WIDTH = 280;
const IMAGE_HEIGHT = 280;

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

interface PropertyCardLargeProps {
  property: {
    id: string;
    images?: string[];
    title: string;
    location: string;
    price: number;
    rating: number;
    reviews?: number;
    isGuestFavourite?: boolean;
    isFavorite?: boolean;
  };
  onPress: () => void;
  onFavoriteToggle?: (id: string) => void;
}

export const PropertyCardLarge: React.FC<PropertyCardLargeProps> = ({
  property,
  onPress,
  onFavoriteToggle,
}) => {
  const { colors } = useTheme();
  const { format } = useCurrency();
  const { light } = useHaptics();
  const styles = makeStyles(colors);
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

  const imageCount = property.images?.length || 3;

  // Entrance animation for badges
  useEffect(() => {
    if (property.isGuestFavourite) {
      Animated.parallel([
        animUtils.fadeIn(badgeOpacity, 400, 1),
        animUtils.scaleIn(badgeScale, 400, 1),
      ]).start();
    }
  }, [property.isGuestFavourite]);

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

  const handleFavoritePress = (e: any) => {
    e.stopPropagation();
    
    // Enhanced heart animation
    animUtils.heartAnimation(heartScale).start();

    toggleFavorite(); // persists to the Saved wishlist + syncs every card
    onFavoriteToggle?.(property.id);
  };

  const handleSharePress = async (e: any) => {
    e.stopPropagation();
    try {
      await Share.share({
        message: `Check out ${property.title} in ${property.location} - ${format(Number(property?.price) || 0)}/night`,
        url: `https://stayon.app/property/${property.id}`,
      });
    } catch (error) {
      console.log('Error sharing:', error);
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ scale: scaleAnim }] },
      ]}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {/* Image Carousel */}
        <View style={styles.imageContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const index = Math.round(
                e.nativeEvent.contentOffset.x / CARD_WIDTH
              );
              setCurrentImageIndex(index);
            }}
            scrollEventThrottle={16}
          >
            {property.images && property.images.length > 0 ? (
              property.images.map((imageUri, index) => (
                <Image
                  key={index}
                  source={{ uri: typeof imageUri === 'string' ? imageUri : (imageUri as any)?.uri }}
                  style={styles.image}
                  contentFit="cover"
                  transition={200}
                />
              ))
            ) : (
              Array.from({ length: imageCount }).map((_, index) => (
                <View
                  key={index}
                  style={styles.imagePlaceholder}
                >
                  <Ionicons name="image" size={48} color={colors.textTertiary} />
                </View>
              ))
            )}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {/* Share Button */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleSharePress}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`Share ${property.title}`}
            >
              <Ionicons
                name="share-outline"
                size={20}
                color="#222222"
              />
            </TouchableOpacity>

            {/* Heart Button */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleFavoritePress}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={isFavorite ? 'Remove from favourites' : 'Add to favourites'}
            >
              <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                <Ionicons
                  name={isFavorite ? 'heart' : 'heart-outline'}
                  size={22}
                  color={isFavorite ? '#EF4444' : '#222222'}
                />
              </Animated.View>
            </TouchableOpacity>
          </View>

          {/* Guest Favourite Badge */}
          {property.isGuestFavourite && (
            <Animated.View 
              style={[
                styles.guestFavouriteBadge,
                {
                  opacity: badgeOpacity,
                  transform: [{ scale: badgeScale }],
                },
              ]}
            >
              <Text style={styles.guestFavouriteText}>Guest favourite</Text>
            </Animated.View>
          )}

          {/* Social proof micro-label (only when no guest-favourite badge, to avoid clutter) */}
          {socialLabel && !property.isGuestFavourite && (
            <View style={styles.socialBadge}>
              <Text style={styles.socialBadgeText}>{socialLabel}</Text>
            </View>
          )}

          {/* Pagination Dots */}
          {imageCount > 1 && (
            <View style={styles.paginationDots}>
              {Array.from({ length: imageCount }).map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    index === currentImageIndex && styles.dotActive,
                  ]}
                />
              ))}
            </View>
          )}

          {/* Price Pill */}
          <View style={styles.pricePill}>
            <Text style={styles.priceText}>
              {format(Number(property?.price) || 0)}
              <Text style={styles.priceUnit}> /night</Text>
              <Text style={styles.priceTaxes}> + taxes</Text>
            </Text>
          </View>
        </View>

        {/* Property Info */}
        <View style={styles.infoContainer}>
          <View style={styles.titleRow}>
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
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
            <Text style={styles.location} numberOfLines={1}>
              {typeof property?.location === 'string' ? property.location : ''}
            </Text>
          </View>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={13} color={colors.gold} />
            <Text style={styles.rating}>{(Number(property?.rating) || 0).toFixed(2)}</Text>
            {property?.reviews ? (
              <Text style={styles.reviews}>({Number(property.reviews) || 0})</Text>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

function makeStyles(colors: any) {
  return StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    marginRight: spacing.base,
    backgroundColor: colors.background,
  },
  imageContainer: {
    width: CARD_WIDTH,
    height: IMAGE_HEIGHT,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.backgroundSecondary,
    position: 'relative',
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
  image: {
    width: CARD_WIDTH,
    height: IMAGE_HEIGHT,
  },
  imagePlaceholder: {
    width: CARD_WIDTH,
    height: IMAGE_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
  },
  actionButtons: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
  heartButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
  guestFavouriteBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
  guestFavouriteText: {
    fontSize: 12,
    ...fonts.semiBold,
    color: '#222222',
  },
  paginationDots: {
    position: 'absolute',
    bottom: spacing.sm,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
  },
  pricePill: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
  priceText: {
    fontSize: 16,
    ...fonts.semiBold,
    color: '#222222',
  },
  priceUnit: {
    fontSize: 14,
    ...fonts.regular,
    color: '#717171',
  },
  priceTaxes: {
    fontSize: 11,
    ...fonts.regular,
    color: '#717171',
  },
  infoContainer: {
    paddingTop: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  title: {
    flexShrink: 1,
    fontSize: 16,
    ...fonts.bold,
    color: colors.textPrimary,
  },
  verifiedIcon: {
    marginTop: 1,
  },
  socialBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
  socialBadgeText: {
    fontSize: 12,
    ...fonts.semiBold,
    color: '#222222',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationEmoji: {
    fontSize: 12,
    marginRight: 2,
  },
  location: {
    fontSize: 14,
    ...fonts.regular,
    color: colors.textSecondary,
    flex: 1,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingEmoji: {
    fontSize: 12,
    marginRight: 4,
  },
  rating: {
    fontSize: 14,
    ...fonts.medium,
    color: colors.textPrimary,
  },
  reviews: {
    fontSize: 14,
    ...fonts.regular,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  });
}
