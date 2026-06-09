import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { STAYON_GRADIENT } from '../components/GradientButton';
import { fontSizes, fonts, spacing, borderRadius } from '../constants';
import { useTheme } from '../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Skeleton } from '../components/common';
import { useHaptics } from '../hooks/useHaptics';

const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

interface Place {
  id: string;
  name: string;
  type: string;
  location: string;
  city: string;
  country: string;
  images: string[];
  rating: number;
  visitorCount: string;
  about: string;
  knownFor: string[];
  bestTimeToVisit: {
    season: string;
    months: string;
    timeOfDay: string;
    tips: string;
  };
  howToPlan: {
    duration: string;
    entryFee: string;
    openingHours: string;
    directions: string;
    parking: string;
    publicTransport: string;
  };
}

// Mock place data
const mockPlace: Place = {
  id: '1',
  name: 'Empire State Building',
  type: 'Skyscraper / Observation Deck',
  location: 'Midtown Manhattan',
  city: 'New York',
  country: 'United States',
  images: [
    'https://images.unsplash.com/photo-1555109307-f7d9da25c244?w=800',
    'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800',
    'https://images.unsplash.com/photo-1485871981521-5b1fd3805eee?w=800',
    'https://images.unsplash.com/photo-1522083165195-3424ed129620?w=800',
  ],
  rating: 4.7,
  visitorCount: '4M+ annually',
  about: 'Standing at 443 meters (1,454 feet), the Empire State Building is one of the world\'s most iconic skyscrapers and a symbol of New York City. Completed in 1931 in just 410 days, this Art Deco masterpiece offers breathtaking 360-degree views from its 86th and 102nd floor observatories, overlooking Manhattan, Central Park, and beyond. The building features a celebrated light show, immersive exhibits, and world-class dining nearby.',
  knownFor: [
    'Iconic Art Deco skyscraper at 1,454 feet',
    '86th & 102nd floor observation decks',
    'Spectacular sunset and night skyline views',
    'Famous nightly tower light shows',
    'Featured in countless films',
    'New Year\'s Eve celebrations nearby',
  ],
  bestTimeToVisit: {
    season: 'April to June, September to November',
    months: 'Apr, May, Jun, Sep, Oct, Nov',
    timeOfDay: 'Sunset (5-7 PM) for best views',
    tips: 'Book tickets online in advance to skip lines. Visit during sunset to experience both daylight and nighttime city views. Weekdays are less crowded than weekends.',
  },
  howToPlan: {
    duration: '2-3 hours',
    entryFee: 'From $44 for the 86th floor, $79 for the 102nd floor',
    openingHours: '9:00 AM - 11:00 PM daily (Last entry 10:15 PM)',
    directions: 'Located at 350 Fifth Avenue, Midtown Manhattan. Easily accessible from all parts of NYC.',
    parking: 'Paid parking garages nearby on 33rd & 34th Street',
    publicTransport: 'Subway B/D/F/M/N/Q/R/W to 34th St–Herald Square',
  },
};

export const PlaceDetailsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const { width } = useWindowDimensions();
  const styles = makeStyles(colors, width);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isSaved, setIsSaved] = useState(false);

  // Brief on-mount skeleton so the hero/content eases in instead of popping.
  const [isLoading, setIsLoading] = useState(true);
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }).start();
    }
  }, [isLoading, contentOpacity]);

  // In real app, fetch place by ID from route.params
  const place = mockPlace;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Skeleton width={width} height={350} borderRadius={0} />
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.base }}>
          <Skeleton width={140} height={28} borderRadius={borderRadius.full} style={{ marginBottom: spacing.md }} />
          <Skeleton width="75%" height={32} style={{ marginBottom: spacing.sm }} />
          <Skeleton width="50%" height={16} style={{ marginBottom: spacing.lg }} />
          <Skeleton width="100%" height={16} style={{ marginBottom: spacing.xs }} />
          <Skeleton width="90%" height={16} />
        </View>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: contentOpacity }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity
          style={styles.headerButton}
          hitSlop={HIT_SLOP}
          activeOpacity={0.7}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            hitSlop={HIT_SLOP}
            activeOpacity={0.7}
            onPress={() => {
              haptics.light();
              setIsSaved(!isSaved);
            }}
            accessibilityRole="button"
            accessibilityLabel={isSaved ? 'Remove from saved places' : 'Save this place'}
          >
            <Ionicons
              name={isSaved ? 'bookmark' : 'bookmark-outline'}
              size={24}
              color={isSaved ? colors.primary : colors.textPrimary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            hitSlop={HIT_SLOP}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Share this place"
          >
            <Ionicons name="share-outline" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Image Gallery */}
        <View style={styles.imageGallery}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
              setCurrentImageIndex(newIndex);
            }}
            scrollEventThrottle={16}
          >
            {place.images.map((image, index) => (
              <Image
                key={index}
                source={{ uri: image }}
                style={styles.placeImage}
                resizeMode="cover"
              />
            ))}
          </ScrollView>
          
          <View style={styles.imageCounter}>
            <Text style={styles.imageCounterText}>
              {currentImageIndex + 1}/{place.images.length}
            </Text>
          </View>
        </View>

        <View style={styles.mainContent}>
          {/* Type Badge */}
          <View style={styles.typeBadge}>
            <Ionicons name="business" size={14} color="#222222" />
            <Text style={styles.typeText}>{place.type}</Text>
          </View>

          {/* Title and Rating */}
          <Text style={styles.title}>{place.name}</Text>
          
          <View style={styles.metaRow}>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={18} color={colors.warning} />
              <Text style={styles.rating}>{place.rating}</Text>
            </View>
            <Text style={styles.dividerDot}>•</Text>
            <Text style={styles.visitors}>{place.visitorCount} visitors</Text>
          </View>

          {/* Location */}
          <View style={styles.locationRow}>
            <Ionicons name="location" size={18} color={colors.textSecondary} />
            <Text style={styles.locationText}>{place.location}, {place.city}</Text>
          </View>

          <View style={styles.divider} />

          {/* About */}
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.aboutText}>{place.about}</Text>

          <View style={styles.divider} />

          {/* Known For */}
          <Text style={styles.sectionTitle}>What It's Known For</Text>
          <View style={styles.knownForList}>
            {place.knownFor.map((item, index) => (
              <View key={index} style={styles.knownForItem}>
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                <Text style={styles.knownForText}>{item}</Text>
              </View>
            ))}
          </View>

          <View style={styles.divider} />

          {/* Best Time to Visit */}
          <Text style={styles.sectionTitle}>Best Time to Visit</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoCardRow}>
              <View style={styles.infoCardIcon}>
                <Ionicons name="calendar" size={20} color={colors.primary} />
              </View>
              <View style={styles.infoCardContent}>
                <Text style={styles.infoCardLabel}>Season</Text>
                <Text style={styles.infoCardValue}>{place.bestTimeToVisit.season}</Text>
              </View>
            </View>

            <View style={styles.infoCardRow}>
              <View style={styles.infoCardIcon}>
                <Ionicons name="time" size={20} color={colors.primary} />
              </View>
              <View style={styles.infoCardContent}>
                <Text style={styles.infoCardLabel}>Best Time of Day</Text>
                <Text style={styles.infoCardValue}>{place.bestTimeToVisit.timeOfDay}</Text>
              </View>
            </View>

            <View style={styles.tipBox}>
              <Ionicons name="bulb" size={18} color={colors.warning} />
              <Text style={styles.tipText}>{place.bestTimeToVisit.tips}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* How to Plan Your Visit */}
          <Text style={styles.sectionTitle}>How to Plan Your Visit</Text>

          <View style={styles.planningGrid}>
            <View style={styles.planningItem}>
              <Ionicons name="time-outline" size={24} color={colors.primary} />
              <Text style={styles.planningLabel}>Duration</Text>
              <Text style={styles.planningValue}>{place.howToPlan.duration}</Text>
            </View>

            <View style={styles.planningItem}>
              <Ionicons name="cash-outline" size={24} color={colors.primary} />
              <Text style={styles.planningLabel}>Entry Fee</Text>
              <Text style={styles.planningValue} numberOfLines={2}>{place.howToPlan.entryFee.split('for')[0]}</Text>
            </View>

            <View style={styles.planningItem}>
              <Ionicons name="time-outline" size={24} color={colors.primary} />
              <Text style={styles.planningLabel}>Opening Hours</Text>
              <Text style={styles.planningValue} numberOfLines={2}>{place.howToPlan.openingHours.split('(')[0]}</Text>
            </View>
          </View>

          <View style={styles.directionCard}>
            <Ionicons name="navigate" size={20} color={colors.primary} />
            <View style={styles.directionContent}>
              <Text style={styles.directionLabel}>Getting There</Text>
              <Text style={styles.directionText}>{place.howToPlan.publicTransport}</Text>
              <Text style={styles.directionText}>{place.howToPlan.parking}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Nearby Properties */}
          <View style={styles.nearbySection}>
            <View style={styles.nearbySectionHeader}>
              <Text style={styles.sectionTitle}>Nearby Properties</Text>
              <TouchableOpacity>
                <Text style={styles.seeAllText}>See all</Text>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.nearbyScroll}>
              {[1, 2, 3].map((_, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={styles.propertyCard}
                  onPress={() => navigation.navigate('PropertyDetails', { propertyId: index })}
                >
                  <Image 
                    source={{ uri: `https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400` }} 
                    style={styles.propertyImage}
                  />
                  <View style={styles.propertyInfo}>
                    <Text style={styles.propertyTitle} numberOfLines={1}>
                      Luxury Apartment Downtown
                    </Text>
                    <Text style={styles.propertyLocation} numberOfLines={1}>
                      0.5 km away
                    </Text>
                    <View style={styles.propertyFooter}>
                      <Text style={styles.propertyPrice}>$125/night</Text>
                      <View style={styles.propertyRating}>
                        <Ionicons name="star" size={12} color={colors.warning} />
                        <Text style={styles.propertyRatingText}>4.9</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Nearby Activities */}
          <View style={styles.nearbySection}>
            <View style={styles.nearbySectionHeader}>
              <Text style={styles.sectionTitle}>Things to Do Nearby</Text>
              <TouchableOpacity>
                <Text style={styles.seeAllText}>See all</Text>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.nearbyScroll}>
              {[1, 2, 3].map((_, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={styles.activityCard}
                  onPress={() => navigation.navigate('ActivityDetails', { activityId: index })}
                >
                  <Image 
                    source={{ uri: `https://images.unsplash.com/photo-1583416750470-965b2707b355?w=400` }} 
                    style={styles.activityImage}
                  />
                  <View style={styles.activityInfo}>
                    <View style={styles.activityCategory}>
                      <Text style={styles.activityCategoryText}>Adventure</Text>
                    </View>
                    <Text style={styles.activityTitle} numberOfLines={2}>
                      NYC Skyline Night Tour
                    </Text>
                    <Text style={styles.activityPrice}>From $45</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={[styles.actionBar, { paddingBottom: insets.bottom + spacing.sm }]}>
        <TouchableOpacity
          style={styles.directionsButton}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Get directions"
        >
          <Ionicons name="navigate" size={20} color={colors.primary} />
          <Text style={styles.directionsButtonText}>Get Directions</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.saveButtonWrap}
          onPress={() => {
            haptics.light();
            setIsSaved(!isSaved);
          }}
          accessibilityRole="button"
          accessibilityLabel="Save to trip"
        >
          <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveButton}>
            <Ionicons name="bookmark-outline" size={20} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>Save to Trip</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const makeStyles = (colors: any, width: number) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 100,
  },
  imageGallery: {
    position: 'relative',
  },
  placeImage: {
    width: width,
    height: 350,
  },
  imageCounter: {
    position: 'absolute',
    bottom: spacing.base,
    right: spacing.base,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  imageCounterText: {
    fontSize: fontSizes.sm,
    ...fonts.semiBold,
    color: '#FFFFFF',
  },
  mainContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4 },
      android: { elevation: 3 },
      web: { boxShadow: '0 2px 6px rgba(0,0,0,0.18)' } as any,
    }),
  },
  typeText: {
    fontSize: fontSizes.xs,
    ...fonts.semiBold,
    color: '#222222',
  },
  title: {
    fontSize: fontSizes['3xl'],
    ...fonts.bold,
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    lineHeight: 36,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: fontSizes.md,
    ...fonts.semiBold,
    color: colors.textPrimary,
    marginLeft: spacing.xs,
  },
  dividerDot: {
    fontSize: fontSizes.md,
    color: colors.textTertiary,
    marginHorizontal: spacing.sm,
  },
  visitors: {
    fontSize: fontSizes.md,
    ...fonts.regular,
    color: colors.textSecondary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  locationText: {
    fontSize: fontSizes.base,
    ...fonts.regular,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSizes.xl,
    ...fonts.bold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  aboutText: {
    fontSize: fontSizes.base,
    ...fonts.regular,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  knownForList: {
    gap: spacing.md,
  },
  knownForItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  knownForText: {
    flex: 1,
    fontSize: fontSizes.base,
    ...fonts.regular,
    color: colors.textPrimary,
    marginLeft: spacing.md,
    lineHeight: 22,
  },
  infoCard: {
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.base,
    borderRadius: borderRadius.lg,
    gap: spacing.md,
  },
  infoCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  infoCardContent: {
    flex: 1,
  },
  infoCardLabel: {
    fontSize: fontSizes.sm,
    ...fonts.regular,
    color: colors.textTertiary,
    marginBottom: 2,
  },
  infoCardValue: {
    fontSize: fontSizes.base,
    ...fonts.semiBold,
    color: colors.textPrimary,
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF3CD',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  tipText: {
    flex: 1,
    fontSize: fontSizes.sm,
    ...fonts.regular,
    color: '#856404',
    marginLeft: spacing.sm,
    lineHeight: 20,
  },
  planningGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.base,
  },
  planningItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.xs,
  },
  planningLabel: {
    fontSize: fontSizes.xs,
    ...fonts.regular,
    color: colors.textTertiary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  planningValue: {
    fontSize: fontSizes.sm,
    ...fonts.semiBold,
    color: colors.textPrimary,
    marginTop: spacing.xs,
    textAlign: 'center',
    paddingHorizontal: spacing.xs,
  },
  directionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.base,
    borderRadius: borderRadius.lg,
  },
  directionContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  directionLabel: {
    fontSize: fontSizes.md,
    ...fonts.semiBold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  directionText: {
    fontSize: fontSizes.sm,
    ...fonts.regular,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  nearbySection: {
    marginTop: spacing.lg,
  },
  nearbySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  seeAllText: {
    fontSize: fontSizes.base,
    ...fonts.semiBold,
    color: colors.primary,
  },
  nearbyScroll: {
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  propertyCard: {
    width: 200,
    marginRight: spacing.base,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.divider,
  },
  propertyImage: {
    width: '100%',
    height: 120,
  },
  propertyInfo: {
    padding: spacing.md,
  },
  propertyTitle: {
    fontSize: fontSizes.base,
    ...fonts.semiBold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  propertyLocation: {
    fontSize: fontSizes.sm,
    ...fonts.regular,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  propertyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  propertyPrice: {
    fontSize: fontSizes.base,
    ...fonts.semiBold,
    color: colors.textPrimary,
  },
  propertyRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  propertyRatingText: {
    fontSize: fontSizes.sm,
    ...fonts.semiBold,
    color: colors.textPrimary,
    marginLeft: spacing.xs,
  },
  activityCard: {
    width: 240,
    marginRight: spacing.base,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.divider,
  },
  activityImage: {
    width: '100%',
    height: 140,
  },
  activityInfo: {
    padding: spacing.md,
  },
  activityCategory: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  activityCategoryText: {
    fontSize: fontSizes.xs,
    ...fonts.semiBold,
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  activityTitle: {
    fontSize: fontSizes.base,
    ...fonts.semiBold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  activityPrice: {
    fontSize: fontSizes.base,
    ...fonts.semiBold,
    color: colors.primary,
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  directionsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.base,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.primary,
    gap: spacing.sm,
  },
  directionsButtonText: {
    fontSize: fontSizes.base,
    ...fonts.semiBold,
    color: colors.primary,
  },
  saveButtonWrap: {
    flex: 1,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.base,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  saveButtonText: {
    fontSize: fontSizes.base,
    ...fonts.semiBold,
    color: '#FFFFFF',
  },
});
