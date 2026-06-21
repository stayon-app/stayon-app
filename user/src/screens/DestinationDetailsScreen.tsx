import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Platform,
  Animated,
} from 'react-native';
import { fontSizes, fonts, spacing, borderRadius } from '../constants';
import { useTheme } from '../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Skeleton } from '../components/common';
import { useHaptics } from '../hooks/useHaptics';
import { WikiImage } from '../components/WikiImage';
import { attractionsFor } from '../data/attractions';

const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

type TabType = 'properties' | 'activities' | 'places' | 'tips';

interface Destination {
  id: string;
  name: string;
  country: string;
  description: string;
  heroImage: string;
  propertyCount: number;
  activityCount: number;
  placeCount: number;
  bestTimeToVisit: string;
  averageTemp: string;
  currency: string;
  language: string;
}

// Mock destination data
const mockDestination: Destination = {
  id: 'new-york',
  name: 'New York',
  country: 'United States',
  description: 'The city that never sleeps. Experience world-class dining, iconic skylines, Broadway shows, Central Park, and the energy of the most famous city in the world.',
  heroImage: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800',
  propertyCount: 2847,
  activityCount: 156,
  placeCount: 42,
  bestTimeToVisit: 'April to June, September to November',
  averageTemp: '0°C (Winter) / 28°C (Summer)',
  currency: 'USD',
  language: 'English',
};

export const DestinationDetailsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const styles = makeStyles(colors);

  const [activeTab, setActiveTab] = useState<TabType>('places');
  const [isSaved, setIsSaved] = useState(false);

  // Real destination from the card the user tapped (falls back to the mock).
  const place: string = route.params?.city || mockDestination.name;
  const placeCountry: string = route.params?.country || mockDestination.country;
  const heroFallback: string = route.params?.image || mockDestination.heroImage;
  const places = attractionsFor(place);
  const [intro, setIntro] = useState(mockDestination.description);

  useEffect(() => {
    let alive = true;
    fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(place)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d && d.extract) setIntro(d.extract); })
      .catch(() => { /* keep default */ });
    return () => { alive = false; };
  }, [place]);

  const searchStays = () => { haptics.light(); navigation.navigate('Main', { screen: 'ExploreTab' }); };

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

  // In real app, fetch destination by ID from route.params
  const destination = mockDestination;

  const tabs = [
    { id: 'properties' as TabType, label: 'Properties', count: destination.propertyCount },
    { id: 'activities' as TabType, label: 'Things to Do', count: destination.activityCount },
    { id: 'places' as TabType, label: 'Must Visit', count: destination.placeCount },
    { id: 'tips' as TabType, label: 'Travel Tips', count: null },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'properties':
        return (
          <View style={styles.tabContent}>
            {[1, 2, 3, 4, 5].map((_, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.propertyCard}
                onPress={() => navigation.navigate('PropertyDetails', { propertyId: index })}
              >
                <Image 
                  source={{ uri: `https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400` }} 
                  style={styles.cardImage}
                />
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>Luxury Pool Villa with Garden</Text>
                  <Text style={styles.cardLocation}>{destination.name}, {destination.country}</Text>
                  <View style={styles.cardFooter}>
                    <View style={styles.cardRating}>
                      <Ionicons name="star" size={14} color={colors.warning} />
                      <Text style={styles.cardRatingText}>4.95</Text>
                      <Text style={styles.cardReviews}>(128)</Text>
                    </View>
                    <Text style={styles.cardPrice}>$125/night</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        );
      
      case 'activities':
        return (
          <View style={styles.tabContent}>
            {[1, 2, 3, 4].map((_, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.activityCard}
                onPress={() => navigation.navigate('ActivityDetails', { activityId: index })}
              >
                <Image 
                  source={{ uri: `https://images.unsplash.com/photo-1583416750470-965b2707b355?w=400` }} 
                  style={styles.activityImage}
                />
                <View style={styles.activityContent}>
                  <View style={styles.activityBadge}>
                    <Text style={styles.activityBadgeText}>Adventure</Text>
                  </View>
                  <Text style={styles.activityTitle}>Desert Safari Adventure</Text>
                  <Text style={styles.activityDetails}>6 hours • Daily at 3:00 PM</Text>
                  <View style={styles.activityFooter}>
                    <View style={styles.activityRating}>
                      <Ionicons name="star" size={14} color={colors.warning} />
                      <Text style={styles.activityRatingText}>4.8 (342)</Text>
                    </View>
                    <Text style={styles.activityPrice}>From $95</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        );
      
      case 'places':
        return (
          <View style={styles.tabContent}>
            {places.length === 0 && (
              <Text style={styles.destinationDescription}>Explore the top sights and neighbourhoods of {place}.</Text>
            )}
            {places.map((p) => (
              <View key={p.name} style={styles.placeCard}>
                <WikiImage title={p.name} fallback={heroFallback} style={styles.placeImage} />
                <View style={styles.placeOverlay}>
                  <View style={styles.placeType}>
                    <Text style={styles.placeTypeText}>Must visit</Text>
                  </View>
                  <Text style={styles.placeTitle}>{p.name}</Text>
                  <View style={styles.placeStats}>
                    <Ionicons name="location" size={15} color="#FFFFFF" />
                    <Text style={styles.placeVisitors}>{p.blurb}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        );
      
      case 'tips':
        return (
          <View style={styles.tabContent}>
            <View style={styles.tipSection}>
              <Text style={styles.tipTitle}>Best Time to Visit</Text>
              <View style={styles.tipCard}>
                <Ionicons name="calendar" size={24} color={colors.primary} />
                <View style={styles.tipCardContent}>
                  <Text style={styles.tipCardText}>{destination.bestTimeToVisit}</Text>
                  <Text style={styles.tipCardSubtext}>Pleasant weather for outdoor activities</Text>
                </View>
              </View>
            </View>

            <View style={styles.tipSection}>
              <Text style={styles.tipTitle}>Weather & Climate</Text>
              <View style={styles.tipCard}>
                <Ionicons name="thermometer" size={24} color={colors.warning} />
                <View style={styles.tipCardContent}>
                  <Text style={styles.tipCardText}>{destination.averageTemp}</Text>
                  <Text style={styles.tipCardSubtext}>Pack accordingly for your visit</Text>
                </View>
              </View>
            </View>

            <View style={styles.tipSection}>
              <Text style={styles.tipTitle}>Currency & Language</Text>
              <View style={styles.tipCard}>
                <Ionicons name="cash" size={24} color={colors.success} />
                <View style={styles.tipCardContent}>
                  <Text style={styles.tipCardText}>{destination.currency}</Text>
                  <Text style={styles.tipCardSubtext}>Currency used in {destination.name}</Text>
                </View>
              </View>
              <View style={[styles.tipCard, { marginTop: spacing.md }]}>
                <Ionicons name="language" size={24} color={colors.info} />
                <View style={styles.tipCardContent}>
                  <Text style={styles.tipCardText}>{destination.language}</Text>
                  <Text style={styles.tipCardSubtext}>Languages spoken</Text>
                </View>
              </View>
            </View>

            <View style={styles.tipSection}>
              <Text style={styles.tipTitle}>Travel Blog Posts</Text>
              {[1, 2, 3].map((_, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={styles.blogCard}
                  onPress={() => navigation.navigate('BlogPost', { postId: index })}
                >
                  <Image 
                    source={{ uri: `https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=400` }} 
                    style={styles.blogImage}
                  />
                  <View style={styles.blogContent}>
                    <View style={styles.blogCategory}>
                      <Text style={styles.blogCategoryText}>Travel Tips</Text>
                    </View>
                    <Text style={styles.blogTitle} numberOfLines={2}>
                      10 Hidden Gems in {destination.name}
                    </Text>
                    <Text style={styles.blogMeta}>By Sarah Chen • 8 min read</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Skeleton width="100%" height={300} borderRadius={0} />
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.base }}>
          <Skeleton width="60%" height={34} style={{ marginBottom: spacing.sm }} />
          <Skeleton width="40%" height={18} style={{ marginBottom: spacing.lg }} />
          <Skeleton width="100%" height={16} style={{ marginBottom: spacing.xs }} />
          <Skeleton width="90%" height={16} style={{ marginBottom: spacing.xl }} />
          <Skeleton width="100%" height={80} borderRadius={borderRadius.lg} />
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
            accessibilityLabel={isSaved ? 'Remove from saved destinations' : 'Save this destination'}
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
            accessibilityLabel="Share this destination"
          >
            <Ionicons name="share-outline" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView} 
        contentContainerStyle={styles.content}
        stickyHeaderIndices={[2]}
      >
        {/* Hero Image */}
        <View style={styles.heroContainer}>
          <Image 
            source={{ uri: destination.heroImage }} 
            style={styles.heroImage}
            resizeMode="cover"
          />
          <View style={styles.heroOverlay} />
        </View>

        {/* Destination Info */}
        <View style={styles.destinationInfo}>
          <Text style={styles.destinationName}>{destination.name}</Text>
          <Text style={styles.destinationCountry}>{destination.country}</Text>
          <Text style={styles.destinationDescription}>{destination.description}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{destination.propertyCount}+</Text>
              <Text style={styles.statLabel}>Properties</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{destination.activityCount}+</Text>
              <Text style={styles.statLabel}>Activities</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{destination.placeCount}+</Text>
              <Text style={styles.statLabel}>Places</Text>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tab, activeTab === tab.id && styles.activeTab]}
                onPress={() => setActiveTab(tab.id)}
              >
                <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>
                  {tab.label}
                </Text>
                {tab.count !== null && (
                  <View style={[styles.tabBadge, activeTab === tab.id && styles.activeTabBadge]}>
                    <Text style={[styles.tabBadgeText, activeTab === tab.id && styles.activeTabBadgeText]}>
                      {tab.count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Tab Content */}
        {renderContent()}
      </ScrollView>
    </Animated.View>
  );
};

const makeStyles = (colors: any) => StyleSheet.create({
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
    paddingBottom: spacing['4xl'],
  },
  heroContainer: {
    position: 'relative',
    height: 300,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  destinationInfo: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
  },
  destinationName: {
    fontSize: fontSizes['4xl'],
    ...fonts.bold,
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: spacing.xs,
    lineHeight: 40,
  },
  destinationCountry: {
    fontSize: fontSizes.lg,
    ...fonts.regular,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  destinationDescription: {
    fontSize: fontSizes.base,
    ...fonts.regular,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.lg,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: fontSizes['2xl'],
    ...fonts.bold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: fontSizes.sm,
    ...fonts.regular,
    color: colors.textTertiary,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.divider,
  },
  tabsContainer: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  tabs: {
    paddingHorizontal: spacing.lg,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    marginRight: spacing.sm,
    gap: spacing.sm,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: fontSizes.base,
    ...fonts.semiBold,
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.primary,
  },
  tabBadge: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    minWidth: 24,
    alignItems: 'center',
  },
  activeTabBadge: {
    backgroundColor: `${colors.primary}15`,
  },
  tabBadgeText: {
    fontSize: fontSizes.xs,
    ...fonts.semiBold,
    color: colors.textTertiary,
  },
  activeTabBadgeText: {
    color: colors.primary,
  },
  tabContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
  },
  // Properties Tab
  propertyCard: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.base,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  cardImage: {
    width: 120,
    height: 120,
  },
  cardContent: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: fontSizes.base,
    ...fonts.semiBold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  cardLocation: {
    fontSize: fontSizes.sm,
    ...fonts.regular,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardRatingText: {
    fontSize: fontSizes.sm,
    ...fonts.semiBold,
    color: colors.textPrimary,
    marginLeft: spacing.xs,
  },
  cardReviews: {
    fontSize: fontSizes.sm,
    ...fonts.regular,
    color: colors.textTertiary,
    marginLeft: spacing.xs,
  },
  cardPrice: {
    fontSize: fontSizes.base,
    ...fonts.bold,
    color: colors.textPrimary,
  },
  // Activities Tab
  activityCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.base,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  activityImage: {
    width: '100%',
    height: 180,
  },
  activityContent: {
    padding: spacing.md,
  },
  activityBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4 },
      android: { elevation: 3 },
      web: { boxShadow: '0 2px 6px rgba(0,0,0,0.18)' } as any,
    }),
  },
  activityBadgeText: {
    fontSize: fontSizes.xs,
    ...fonts.semiBold,
    color: '#222222',
    textTransform: 'uppercase',
  },
  activityTitle: {
    fontSize: fontSizes.lg,
    ...fonts.semiBold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  activityDetails: {
    fontSize: fontSizes.sm,
    ...fonts.regular,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  activityFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activityRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityRatingText: {
    fontSize: fontSizes.sm,
    ...fonts.semiBold,
    color: colors.textPrimary,
    marginLeft: spacing.xs,
  },
  activityPrice: {
    fontSize: fontSizes.lg,
    ...fonts.bold,
    color: colors.primary,
  },
  // Places Tab
  placeCard: {
    height: 200,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.base,
    position: 'relative',
  },
  placeImage: {
    width: '100%',
    height: '100%',
  },
  placeOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
    padding: spacing.base,
  },
  placeType: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  placeTypeText: {
    fontSize: fontSizes.xs,
    ...fonts.semiBold,
    color: '#222222',
    textTransform: 'uppercase',
  },
  placeTitle: {
    fontSize: fontSizes.xl,
    ...fonts.bold,
    color: '#FFFFFF',
    marginBottom: spacing.xs,
  },
  placeStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  placeRating: {
    fontSize: fontSizes.sm,
    ...fonts.semiBold,
    color: '#FFFFFF',
    marginLeft: spacing.xs,
  },
  placeVisitors: {
    fontSize: fontSizes.sm,
    ...fonts.regular,
    color: '#FFFFFF',
    marginLeft: spacing.xs,
  },
  // Tips Tab
  tipSection: {
    marginBottom: spacing.xl,
  },
  tipTitle: {
    fontSize: fontSizes.lg,
    ...fonts.bold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.base,
    borderRadius: borderRadius.lg,
  },
  tipCardContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  tipCardText: {
    fontSize: fontSizes.base,
    ...fonts.semiBold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  tipCardSubtext: {
    fontSize: fontSizes.sm,
    ...fonts.regular,
    color: colors.textSecondary,
  },
  blogCard: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  blogImage: {
    width: 100,
    height: 100,
  },
  blogContent: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  blogCategory: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginBottom: spacing.xs,
  },
  blogCategoryText: {
    fontSize: fontSizes.xs,
    ...fonts.semiBold,
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  blogTitle: {
    fontSize: fontSizes.base,
    ...fonts.semiBold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    lineHeight: 20,
  },
  blogMeta: {
    fontSize: fontSizes.xs,
    ...fonts.regular,
    color: colors.textTertiary,
  },
});
