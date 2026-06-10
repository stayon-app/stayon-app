import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  Animated,
  Platform,
  StatusBar,
  Image,
} from 'react-native';
import { fonts, spacing, borderRadius } from '../constants';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { STAYON_GRADIENT } from '../components/GradientButton';
import { ModernSearchModal } from '../components/ModernSearchModal';
import { SearchModal, SearchFilters } from '../components/SearchModal';
import { PremiumFilterSheet } from '../components/PremiumFilterSheet';
import { PropertyCard, Property } from '../components/PropertyCard';
import { StayOnLogo } from '../components/StayOnLogo';
import { PremiumHero } from '../components/PremiumHero';
import { PremiumCategoryPill } from '../components/PremiumCategoryPill';
import { PremiumSectionHeader } from '../components/PremiumSectionHeader';
import { Reveal } from '../components/Reveal';
import { SeeAllCard } from '../components/SeeAllCard';
import { PropertyMapView } from '../components/PropertyMapView';
import { Skeleton, PropertyCardSkeleton } from '../components/common/SkeletonLoader';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useAuth } from '../contexts';
import { useHaptics } from '../hooks/useHaptics';
import { useLocationDetection } from '../hooks/useLocationDetection';
import { BOT_STAYS, botStayToProperty, type BotStay } from '../data/stays';
import { sortByDistance } from '../utils/distance';
import { getPendingBooking, clearPendingBooking, type PendingBooking } from '../data/pendingBooking';
import { getRecentlyViewed, type RecentStay } from '../data/recentlyViewed';
import { buildThingsToDo } from '../data/thingsToDo';
import { getFeedReels, type Reel } from '../data/reels';
import { isFeatureEnabled } from '../services/featureFlags';
import { getHostListingsAsProperties } from '../data/hostListings';
import { applyStayFilters, isFilterActive } from '../utils/stayFilters';
import { useFocusEffect } from '@react-navigation/native';

// Maps a Home category pill (by display name) to the stays that belong in it.
const categoryMatchers: Record<string, (s: BotStay) => boolean> = {
  All: () => true,
  Beach: (s) => s.vibes.includes('beach') || s.amenities.includes('beachfront'),
  Mountain: (s) => s.vibes.includes('mountain') || s.vibes.includes('ski'),
  City: (s) => s.vibes.includes('city'),
  Cabin: (s) => ['Cabin', 'Chalet'].includes(s.type) || s.vibes.includes('nature'),
  Luxury: (s) => s.vibes.includes('luxury'),
  Pool: (s) => s.amenities.includes('pool'),
  Country: (s) => s.vibes.includes('nature') || ['Farmhouse', 'Bungalow'].includes(s.type),
};

interface HomeScreenProps {
  navigation: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { colors: themeColors, isDark } = useTheme();
  const { format } = useCurrency();
  const { checkAuthBeforeAction } = useAuth();
  const { width, height } = useWindowDimensions();
  const styles = makeStyles(themeColors, width, height);
  const { light, medium } = useHaptics();
  const { location, loading: locationLoading, permissionDenied, refreshLocation } = useLocationDetection();
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilters, setSearchFilters] = useState<SearchFilters | null>(null);
  const [stayFilters, setStayFilters] = useState<any>(null); // PremiumFilterSheet selection
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [isLoading, setIsLoading] = useState(true);
  // Resume-booking nudge — set when a checkout was reached but not completed.
  const [pendingBooking, setPendingBooking] = useState<PendingBooking | null>(null);
  const [recentlyViewed, setRecentlyViewed] = useState<RecentStay[]>([]);
  const [feedReels, setFeedReels] = useState<Reel[]>([]);

  // Reload resume-booking + recently-viewed + the StayReels feed on focus, so
  // newly posted reels appear when you return from posting one.
  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      getPendingBooking().then((b) => { if (active) setPendingBooking(b); });
      getRecentlyViewed().then((r) => { if (active) setRecentlyViewed(r); });
      getFeedReels().then((r) => { if (active) setFeedReels(r); });
      return () => { active = false; };
    }, [])
  );

  const dismissPendingBooking = () => {
    light();
    clearPendingBooking();
    setPendingBooking(null);
  };

  const resumePendingBooking = () => {
    if (!pendingBooking) return;
    light();
    navigation.navigate('Booking', {
      property: pendingBooking.property,
      checkInDate: pendingBooking.checkInDate,
      checkOutDate: pendingBooking.checkOutDate,
      guests: pendingBooking.guests,
    });
  };

  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 700);
    return () => clearTimeout(timer);
  }, []);

  // Categories with images - Vertical Pills like Airbnb
  const categories = [
    { id: 'all', name: 'All', image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=200&h=200&fit=crop' },
    { id: 'beach', name: 'Beach', image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200&h=200&fit=crop' },
    { id: 'mountain', name: 'Mountain', image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&h=200&fit=crop' },
    { id: 'city', name: 'City', image: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=200&h=200&fit=crop' },
    { id: 'cabin', name: 'Cabin', image: 'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=200&h=200&fit=crop' },
    { id: 'luxury', name: 'Luxury', image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=200&h=200&fit=crop' },
    { id: 'pool', name: 'Pool', image: 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=200&h=200&fit=crop' },
    { id: 'countryside', name: 'Country', image: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=200&h=200&fit=crop' },
  ];

  // Properties — USA / Canada / UK / Europe, all USD
  const nearbyProperties: Property[] = [
    {
      id: '1',
      title: 'Manhattan Luxury Loft',
      location: 'New York, NY',
      price: 285,
      rating: 4.95,
      reviews: 312,
      images: [
        'https://images.unsplash.com/photo-1555636222-cae831e670b3?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&h=600&fit=crop',
      ],
      isFavorite: false,
      isGuestFavorite: true,
      latitude: 40.758,
      longitude: -73.985,
      address: 'Midtown Manhattan, New York, NY',
      isBooked: false,
      category: 'city',
    },
    {
      id: '2',
      title: 'Malibu Beachfront Villa',
      location: 'Malibu, CA',
      price: 495,
      rating: 4.97,
      reviews: 87,
      images: [
        'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&h=600&fit=crop',
      ],
      isFavorite: true,
      badge: 'NEW',
      latitude: 34.025,
      longitude: -118.780,
      address: 'Pacific Coast Highway, Malibu, CA',
      isBooked: false,
      category: 'beach',
    },
    {
      id: '3',
      title: 'Cotswolds Country Cottage',
      location: 'Bourton-on-the-Water, UK',
      price: 195,
      rating: 4.92,
      reviews: 203,
      images: [
        'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800&h=600&fit=crop',
      ],
      isFavorite: false,
      isGuestFavorite: true,
      latitude: 51.884,
      longitude: -1.758,
      address: 'Bourton-on-the-Water, Cotswolds, UK',
      isBooked: false,
      category: 'countryside',
    },
  ];

  // "Nearby You": real stays sorted by distance from the user's live location,
  // narrowed by the selected category pill AND any applied filters.
  const nearbyStays = useMemo(() => {
    const matches = categoryMatchers[selectedCategory] ?? (() => true);
    const pool = BOT_STAYS.filter(matches);
    const ranked = sortByDistance(
      pool,
      { latitude: location.latitude, longitude: location.longitude },
      (s) => ({ latitude: s.latitude, longitude: s.longitude }),
    );
    const mapped = ranked.map((s) => ({
      ...botStayToProperty(s),
      distanceLabel: s.distanceLabel,
    }));
    return applyStayFilters(mapped, stayFilters).slice(0, 6) as Property[];
  }, [selectedCategory, location.latitude, location.longitude, stayFilters]);

  // Real published host listings, surfaced at the front of the feed so a host's
  // own place appears to guests (with its real "Meet your host" + guidebook).
  const [hostProps, setHostProps] = useState<any[]>([]);
  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      getHostListingsAsProperties().then((p) => { if (active) setHostProps(p); });
      return () => { active = false; };
    }, [])
  );

  const filteredProperties = useMemo(
    () => [...hostProps, ...nearbyStays] as Property[],
    [hostProps, nearbyStays]
  );

  const featuredProperties: Property[] = [
    {
      id: '4',
      title: 'Hollywood Hills Villa',
      location: 'Los Angeles, CA',
      price: 420,
      rating: 4.98,
      reviews: 187,
      images: [
        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&h=600&fit=crop',
      ],
      badge: 'FEATURED',
      isGuestFavorite: true,
      latitude: 34.118,
      longitude: -118.300,
      address: 'Hollywood Hills, Los Angeles, CA',
      isBooked: false,
      category: 'luxury',
    },
    {
      id: '5',
      title: 'Amsterdam Canal House',
      location: 'Amsterdam, Netherlands',
      price: 225,
      rating: 4.96,
      reviews: 167,
      images: [
        'https://images.unsplash.com/photo-1512470876302-972faa2aa9a4?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1577495508326-19a1b3cf65b7?w=800&h=600&fit=crop',
      ],
      isGuestFavorite: true,
      latitude: 52.367,
      longitude: 4.904,
      address: 'Prinsengracht, Amsterdam, Netherlands',
      isBooked: false,
      category: 'city',
    },
  ];

  const experiences = [
    {
      id: 'exp1',
      title: 'Cooking Class with Local Chef',
      location: 'New York, NY',
      duration: '3 hours',
      price: 45,
      rating: 4.89,
      reviews: 234,
      image: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&h=600&fit=crop',
      category: 'Food & Drink',
    },
    {
      id: 'exp2',
      title: 'Sunset Yacht Cruise',
      location: 'Santorini, Greece',
      duration: '2 hours',
      price: 120,
      rating: 4.95,
      reviews: 189,
      image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&h=600&fit=crop',
      category: 'Adventure',
    },
    {
      id: 'exp3',
      title: 'Hot Air Balloon Ride',
      location: 'Cappadocia, Turkey',
      duration: '1 hour',
      price: 180,
      rating: 4.98,
      reviews: 456,
      image: 'https://images.unsplash.com/photo-1519904981063-b0cf448d479e?w=800&h=600&fit=crop',
      category: 'Adventure',
    },
    {
      id: 'exp4',
      title: 'Wine Tasting Tour',
      location: 'Tuscany, Italy',
      duration: '4 hours',
      price: 85,
      rating: 4.91,
      reviews: 312,
      image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&h=600&fit=crop',
      category: 'Food & Drink',
    },
  ];

  const popularDestinations = [
    {
      id: 'dest1',
      city: 'Los Angeles',
      country: 'USA',
      image: 'https://images.unsplash.com/photo-1444723121867-7a241cacace9?w=800&h=600&fit=crop',
      properties: '2,400+',
      description: 'Sunshine & city glamour',
    },
    {
      id: 'dest2',
      city: 'Miami',
      country: 'USA',
      image: 'https://images.unsplash.com/photo-1535498730771-e735b998cd64?w=800&h=600&fit=crop',
      properties: '3,200+',
      description: 'Beaches & art deco',
    },
    {
      id: 'dest3',
      city: 'London',
      country: 'UK',
      image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&h=600&fit=crop',
      properties: '1,800+',
      description: 'Timeless & elegant',
    },
    {
      id: 'dest4',
      city: 'Paris',
      country: 'France',
      image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&h=600&fit=crop',
      properties: '2,100+',
      description: 'The city of lights',
    },
    {
      id: 'dest5',
      city: 'Santorini',
      country: 'Greece',
      image: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=800&h=600&fit=crop',
      properties: '1,200+',
      description: 'Stunning sunsets & beaches',
    },
    {
      id: 'dest6',
      city: 'New York',
      country: 'USA',
      image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&h=600&fit=crop',
      properties: '5,600+',
      description: 'The city that never sleeps',
    },
    {
      id: 'dest7',
      city: 'San Francisco',
      country: 'USA',
      image: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800&h=600&fit=crop',
      properties: '890+',
      description: 'Bay views & cable cars',
    },
    {
      id: 'dest8',
      city: 'Barcelona',
      country: 'Spain',
      image: 'https://images.unsplash.com/photo-1562883676-8c7feb83f09b?w=800&h=600&fit=crop',
      properties: '2,800+',
      description: 'Art, culture & beaches',
    },
    {
      id: 'dest9',
      city: 'Rome',
      country: 'Italy',
      image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&h=600&fit=crop',
      properties: '1,500+',
      description: 'Ancient history & charm',
    },
    {
      id: 'dest10',
      city: 'Vancouver',
      country: 'Canada',
      image: 'https://images.unsplash.com/photo-1559511260-66a654ae982a?w=800&h=600&fit=crop',
      properties: '2,300+',
      description: 'Mountains meet the sea',
    },
    {
      id: 'dest11',
      city: 'Chicago',
      country: 'USA',
      image: 'https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=800&h=600&fit=crop',
      properties: '1,900+',
      description: 'Architecture & lakefront',
    },
    {
      id: 'dest12',
      city: 'Amsterdam',
      country: 'Netherlands',
      image: 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=800&h=600&fit=crop',
      properties: '1,600+',
      description: 'Canals & culture',
    },
  ];

  // Things to Do — dynamic to the user's live location. Purely informational
  // inspiration (no host, no price, no booking). Rich detail lives in data.
  const thingsToDo = useMemo(
    () => buildThingsToDo(location.city || 'your area', location.country || '')
      .map((t) => ({ ...t, time: t.bestTime })),
    [location.city, location.country]
  );

  const attractions = [
    {
      id: 'attr1',
      title: 'Statue of Liberty',
      location: 'New York, NY',
      visitors: '4.5M+',
      image: 'https://images.unsplash.com/photo-1605130284535-11dd9eedc58a?w=800&h=600&fit=crop',
      type: 'Monument',
    },
    {
      id: 'attr2',
      title: 'Eiffel Tower',
      location: 'Paris, France',
      visitors: '7M+',
      image: 'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=800&h=600&fit=crop',
      type: 'Landmark',
    },
    {
      id: 'attr3',
      title: 'Colosseum',
      location: 'Rome, Italy',
      visitors: '7.6M+',
      image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&h=600&fit=crop',
      type: 'Historical',
    },
    {
      id: 'attr4',
      title: 'Golden Gate Bridge',
      location: 'San Francisco, CA',
      visitors: '10M+',
      image: 'https://images.unsplash.com/photo-1521747116042-5a810fda9664?w=800&h=600&fit=crop',
      type: 'Landmark',
    },
    {
      id: 'attr5',
      title: 'Machu Picchu',
      location: 'Cusco, Peru',
      visitors: '1.5M+',
      image: 'https://images.unsplash.com/photo-1587595431973-160d0d94add1?w=800&h=600&fit=crop',
      type: 'Archaeological',
    },
    {
      id: 'attr6',
      title: 'Great Wall of China',
      location: 'Beijing, China',
      visitors: '10M+',
      image: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=800&h=600&fit=crop',
      type: 'Historical',
    },
    {
      id: 'attr7',
      title: 'Statue of Liberty',
      location: 'New York, USA',
      visitors: '4.5M+',
      image: 'https://images.unsplash.com/photo-1508433957232-3107f5fd5995?w=800&h=600&fit=crop',
      type: 'Monument',
    },
    {
      id: 'attr8',
      title: 'Sagrada Familia',
      location: 'Barcelona, Spain',
      visitors: '4.7M+',
      image: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=800&h=600&fit=crop',
      type: 'Cathedral',
    },
    {
      id: 'attr9',
      title: 'Sydney Opera House',
      location: 'Sydney, Australia',
      visitors: '10M+',
      image: 'https://images.unsplash.com/photo-1523059623039-a9ed027e7fad?w=800&h=600&fit=crop',
      type: 'Performing Arts',
    },
    {
      id: 'attr10',
      title: 'Petra',
      location: 'Ma\'an, Jordan',
      visitors: '1.1M+',
      image: 'https://images.unsplash.com/photo-1578909196726-c6a89df7fe6e?w=800&h=600&fit=crop',
      type: 'Archaeological',
    },
    {
      id: 'attr11',
      title: 'Angkor Wat',
      location: 'Siem Reap, Cambodia',
      visitors: '2.6M+',
      image: 'https://images.unsplash.com/photo-1459951004360-04388b1e9b4c?w=800&h=600&fit=crop',
      type: 'Temple Complex',
    },
    {
      id: 'attr12',
      title: 'Christ the Redeemer',
      location: 'Rio de Janeiro, Brazil',
      visitors: '2M+',
      image: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800&h=600&fit=crop',
      type: 'Monument',
    },
  ];

  const travelStories = [
    {
      id: 'story1',
      title: '10 Hidden Gems on the California Coast',
      category: 'TRAVEL TIPS',
      excerpt: 'Discover breathtaking locations off the beaten path...',
      author: 'Sarah Chen',
      date: '2 days ago',
      image: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&h=600&fit=crop',
    },
    {
      id: 'story2',
      title: 'A Week in California: Complete Guide',
      category: 'DESTINATION',
      excerpt: 'Everything you need to know for a perfect coastal escape...',
      author: 'Michael Torres',
      date: '5 days ago',
      image: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=800&h=600&fit=crop',
    },
    {
      id: 'story3',
      title: 'European Food Tour: Best Cities to Visit',
      category: 'FOOD & CULTURE',
      excerpt: 'From Italian pasta to Spanish tapas, explore the flavors...',
      author: 'Emma Wilson',
      date: '1 week ago',
      image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop',
    },
    {
      id: 'story4',
      title: 'Budget Travel: Exploring Europe Under $50/Day',
      category: 'BUDGET TIPS',
      excerpt: 'Practical tips for traveling through Europe without breaking...',
      author: 'Alex Kumar',
      date: '2 weeks ago',
      image: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&h=600&fit=crop',
    },
  ];

  const handleSearchApply = (filters: SearchFilters) => {
    setSearchFilters(filters);
    // Navigate to Explore with filters
    navigation?.navigate('Main', { 
      screen: 'ExploreTab',
      params: { filters }
    });
  };

  const handleSimpleSearch = (
    destination: string,
    dates: string,
    guests: number,
    coords?: { lat: number; lng: number; delta?: number },
    refine?: { category?: string; categoryLabel?: string; quickFilters?: string[] },
  ) => {
    setSearchQuery(destination);
    // Open the map centered on the searched destination with matching stays
    navigation?.navigate('MapExplore', {
      searchQuery: destination,
      dates,
      guests,
      searchLat: coords?.lat,
      searchLng: coords?.lng,
      searchDelta: coords?.delta,
      searchCategory: refine?.category,
      searchCategoryLabel: refine?.categoryLabel,
      searchQuickFilters: refine?.quickFilters,
    });
  };

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [0, 1],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={themeColors.background} />
      
      {/* Modern Search Modal - New Visual Design */}
      <ModernSearchModal
        visible={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onSearch={handleSimpleSearch}
      />

      {/* Filters Modal - Premium Airbnb-style filters */}
      <PremiumFilterSheet
        visible={showFiltersModal}
        onClose={() => setShowFiltersModal(false)}
        onApply={(filters) => { setStayFilters(isFilterActive(filters) ? filters : null); setShowFiltersModal(false); }}
      />

      {/* Fixed Header - appears on scroll */}
      <Animated.View style={[styles.fixedHeader, { opacity: headerOpacity, backgroundColor: themeColors.surface }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={[styles.headerSearchBar, { backgroundColor: themeColors.backgroundSecondary }]}
              activeOpacity={0.9}
              onPress={() => setShowSearchModal(true)}
            >
              <Ionicons name="search" size={18} color={themeColors.textSecondary} />
              <Text style={[styles.headerSearchText, { color: themeColors.textSecondary }]}>Search destinations</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.globeButton}
              activeOpacity={0.9}
              onPress={() => { light(); navigation.navigate('Messages'); }}
              accessibilityRole="button"
              accessibilityLabel="Open messages"
            >
              <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.headerIconGradient}>
                <Ionicons name="chatbubble-outline" size={18} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.globeButton}
              activeOpacity={0.9}
              onPress={() => { light(); navigation.navigate('NotificationCenter'); }}
              accessibilityRole="button"
              accessibilityLabel="View notifications"
            >
              <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.headerIconGradient}>
                <Ionicons name="notifications-outline" size={18} color="#fff" />
              </LinearGradient>
              <View style={styles.notifDot} />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {/* Premium Hero Section with Parallax */}
        <PremiumHero
          scrollY={scrollY}
          onSearchPress={() => setShowSearchModal(true)}
        />

        {/* Resume booking — "Complete your reservation" nudge */}
        {pendingBooking && (
          <Reveal mode="rise" delay={20}>
            <TouchableOpacity
              style={styles.resumeCard}
              activeOpacity={0.9}
              onPress={resumePendingBooking}
              accessibilityRole="button"
              accessibilityLabel={`Complete your ${pendingBooking.location || 'stay'} reservation`}
            >
              {!!pendingBooking.image && (
                <Image source={{ uri: pendingBooking.image }} style={styles.resumeImage} resizeMode="cover" />
              )}
              <View style={styles.resumeInfo}>
                <Text style={styles.resumeEyebrow}>Finish your booking</Text>
                <Text style={styles.resumeTitle} numberOfLines={1}>
                  Complete your {pendingBooking.location || pendingBooking.title || 'stay'} reservation
                </Text>
                <Text style={styles.resumeMeta} numberOfLines={1}>
                  {[
                    pendingBooking.checkInLabel && pendingBooking.checkOutLabel
                      ? `${pendingBooking.checkInLabel} – ${pendingBooking.checkOutLabel}`
                      : null,
                    pendingBooking.guests ? `${pendingBooking.guests} ${pendingBooking.guests === 1 ? 'guest' : 'guests'}` : null,
                  ].filter(Boolean).join(' · ')}
                </Text>
              </View>
              <View style={styles.resumeChevron}>
                <Ionicons name="chevron-forward" size={18} color={themeColors.primary} />
              </View>
              <TouchableOpacity
                style={styles.resumeDismiss}
                onPress={dismissPendingBooking}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Dismiss"
              >
                <Ionicons name="close" size={15} color={themeColors.textTertiary} />
              </TouchableOpacity>
            </TouchableOpacity>
          </Reveal>
        )}


        {/* Recently Viewed — stays the guest recently opened */}
        {recentlyViewed.length > 0 && (
          <Reveal delay={220} mode="rise" style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recently viewed</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recentScroll}
            >
              {recentlyViewed.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={styles.recentCard}
                  activeOpacity={0.9}
                  onPress={() => { light(); navigation.navigate('PropertyDetails', { property: s.property }); }}
                >
                  <Image source={{ uri: s.image }} style={styles.recentImage} resizeMode="cover" />
                  <Text style={styles.recentTitle} numberOfLines={1}>{s.title}</Text>
                  <View style={styles.recentMetaRow}>
                    <Text style={styles.recentLocation} numberOfLines={1}>{s.location}</Text>
                    {s.rating > 0 && (
                      <View style={styles.recentRating}>
                        <Ionicons name="star" size={11} color={themeColors.textPrimary} />
                        <Text style={styles.recentRatingText}>{s.rating.toFixed(2)}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Reveal>
        )}

            {/* Nearby Section */}
        <Reveal delay={300} mode="rise" style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Nearby You</Text>
              <TouchableOpacity
                onPress={() => { light(); refreshLocation(); }}
                activeOpacity={0.7}
                style={styles.locationSubtitleRow}
              >
                <Ionicons name="location-sharp" size={13} color={themeColors.primary} />
                <Text style={styles.sectionSubtitle} numberOfLines={1}>
                  {locationLoading
                    ? 'Finding your location…'
                    : permissionDenied
                    ? 'Tap to enable location'
                    : location.formattedAddress}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          {isLoading || locationLoading ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
            >
              <PropertyCardSkeleton />
              <PropertyCardSkeleton />
            </ScrollView>
          ) : filteredProperties.length === 0 ? (
            <View style={styles.nearbyEmpty}>
              <Ionicons name="map-outline" size={28} color={themeColors.textSecondary} />
              <Text style={styles.nearbyEmptyText}>No {selectedCategory.toLowerCase()} stays near you yet.</Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToInterval={width * 0.85 + spacing.base}
              snapToAlignment="start"
              contentContainerStyle={styles.horizontalScroll}
            >
              {filteredProperties.map((property, idx) => (
                <Reveal key={property.id} mode="rise" delay={120 + idx * 90} style={styles.horizontalCard}>
                  <PropertyCard
                    property={property}
                    onPress={() => navigation.navigate('PropertyDetails', { property })}
                    onFavoritePress={() => console.log('Favorite:', property.id)}
                  />
                </Reveal>
              ))}
              {/* See all → full nearby list */}
              <SeeAllCard
                image="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&h=800&fit=crop"
                label="See all nearby stays"
                width={width * 0.6}
                radius={borderRadius.lg}
                onPress={() => { light(); navigation.navigate('NearbyStays'); }}
              />
            </ScrollView>
          )}
        </Reveal>

        {/* StayReels — gated by the Ops "reels" feature flag */}
        {isFeatureEnabled('reels') && (
        <Reveal delay={380} mode="rise" style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.sectionTitle}>StayReels</Text>
            </View>
            <TouchableOpacity style={styles.reelPostBtn} onPress={() => { light(); checkAuthBeforeAction(() => navigation.navigate('ReelSubmit'), navigation); }} activeOpacity={0.85}>
              <Ionicons name="add" size={15} color={themeColors.primary} />
              <Text style={[styles.reelPostText, { color: themeColors.primary }]}>Post a reel</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: spacing.lg }}>
            {(() => {
              // Dynamic feed — every published reel from users & hosts (+ your own
              // posts). Each maps to a real stay; tapping opens the swipeable player.
              const reelItems = feedReels.map((r, i) => {
                const property = { ...botStayToProperty(BOT_STAYS[i % BOT_STAYS.length]), name: r.title, images: [r.thumbnail] };
                return { reel: { id: r.id, title: r.title, views: r.views, img: r.thumbnail, caption: r.caption, videoUri: r.videoUri, location: r.location || property.location, pending: r.status === 'pending' }, property };
              });
              return reelItems.map((item, i) => (
                <TouchableOpacity key={item.reel.id} style={styles.reelCard} activeOpacity={0.9}
                  onPress={() => { light(); navigation.navigate('ReelViewer', { reels: reelItems, index: i }); }}>
                  <Image source={{ uri: item.reel.img }} style={styles.reelImg} resizeMode="cover" />
                  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={styles.reelOverlay}>
                    <View style={styles.playBtn}>
                      <Ionicons name="play" size={18} color="#fff" />
                    </View>
                    {item.reel.pending && (
                      <View style={styles.reelPendingTag}><Ionicons name="hourglass-outline" size={10} color="#fff" /><Text style={styles.reelPendingText}>In review</Text></View>
                    )}
                    <Text style={styles.reelTitle} numberOfLines={1}>{item.reel.title}</Text>
                    <Text style={styles.reelViews}>{item.reel.views} views</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ));
            })()}
            <SeeAllCard
              image="https://images.unsplash.com/photo-1582719508461-905c673771fd?w=300&h=500&fit=crop"
              width={130}
              height={200}
              radius={16}
              onPress={() => light()}
            />
          </ScrollView>
        </Reveal>
        )}

        {/* Curated Collections */}
        <Reveal delay={460} mode="rise" style={styles.section}>
          <View style={styles.curatedHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Curated Collections</Text>
              <Text style={[styles.sectionSubtitle, { marginBottom: 0 }]}>Handpicked by our travel experts</Text>
            </View>
            <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.curatedHeaderBadge}>
              <Ionicons name="sparkles" size={16} color="#fff" />
            </LinearGradient>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.curatedScroll}
          >
            {[
              { id: 'c1', title: "World's Most\nEpic Pools", count: 24, tag: 'Editor’s pick', img: 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=500&h=680&fit=crop' },
              { id: 'c2', title: 'Hidden Gems\nUnder $100', count: 47, tag: 'Budget', img: 'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=500&h=680&fit=crop' },
              { id: 'c3', title: 'Eco-Certified\nStays', count: 18, tag: 'Sustainable', img: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=500&h=680&fit=crop' },
            ].map((col) => (
              <TouchableOpacity key={col.id} style={styles.curatedCard} onPress={() => light()} activeOpacity={0.92}>
                <Image source={{ uri: col.img }} style={styles.curatedImg} resizeMode="cover" />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.88)']}
                  style={styles.curatedShade}
                />
                <View style={styles.curatedTopRow}>
                  <View style={styles.curatedTag}>
                    <Text style={styles.curatedTagText}>{col.tag}</Text>
                  </View>
                </View>
                <View style={styles.curatedBottom}>
                  <Text style={styles.curatedTitle}>{col.title}</Text>
                  <View style={styles.curatedMetaRow}>
                    <View style={styles.curatedCountPill}>
                      <Text style={styles.curatedCountText}>{col.count} stays</Text>
                    </View>
                    <Text style={styles.curatedUpdated}>Updated today</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Reveal>

        {/* Guest Favorites Section */}
        <Reveal delay={540} mode="rise" style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Guest Favorites</Text>
              <Text style={styles.sectionSubtitle}>Loved by travelers</Text>
            </View>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScroll}
          >
            {nearbyProperties.slice(0, 2).map((property) => (
              <View key={property.id} style={styles.horizontalCard}>
                <PropertyCard
                  property={property}
                  onPress={() => navigation.navigate('PropertyDetails', { property })}
                  onFavoritePress={() => console.log('Favorite:', property.id)}
                />
              </View>
            ))}
            <SeeAllCard
              image="https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&h=800&fit=crop"
              width={width * 0.6}
              radius={borderRadius.lg}
              onPress={() => navigation.navigate('Main', { screen: 'ExploreTab' })}
            />
          </ScrollView>
        </Reveal>

        {/* Popular Destinations Section */}
        <Reveal delay={620} mode="rise" style={styles.section}>
          <PremiumSectionHeader
            icon="trending-up"
            title="Popular Destinations"
            subtitle="Trending cities to explore"
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScroll}
          >
            {popularDestinations.map((dest) => (
              <TouchableOpacity
                key={dest.id}
                style={styles.destinationCard}
                activeOpacity={0.9}
                onPress={() => { light(); navigation.navigate('DestinationDetails', { destinationId: dest.id }); }}
              >
                <Image source={{ uri: dest.image }} style={styles.destinationImage} resizeMode="cover" />
                <View style={styles.destinationOverlay}>
                  <Text style={styles.destinationCity}>{dest.city}</Text>
                  <Text style={styles.destinationCountry}>{dest.country}</Text>
                  <Text style={styles.destinationProperties}>{dest.properties} properties</Text>
                </View>
                <View style={styles.destinationBadge}>
                  <Text style={styles.destinationBadgeText}>{dest.description}</Text>
                </View>
              </TouchableOpacity>
            ))}
            <SeeAllCard
              image="https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=500&h=600&fit=crop"
              width={width * 0.65}
              height={240}
              radius={borderRadius.xl}
              style={{ marginRight: spacing.base }}
              onPress={() => navigation.navigate('Main', { screen: 'ExploreTab' })}
            />
          </ScrollView>
        </Reveal>

        {/* Things to Do Section */}
        <Reveal delay={700} mode="rise" style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Things to Do</Text>
              <Text style={styles.sectionSubtitle}>Around {location.city || 'you'} & beyond</Text>
            </View>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScroll}
          >
            {thingsToDo.map((activity) => (
              <TouchableOpacity
                key={activity.id}
                style={styles.activityCard}
                activeOpacity={0.9}
                onPress={() => { light(); navigation.navigate('ActivityDetails', { activityId: activity.id, activity }); }}
              >
                <Image source={{ uri: activity.image }} style={styles.activityImage} resizeMode="cover" />
                <View style={styles.activityInfo}>
                  <View style={styles.activityBadge}>
                    <Text style={styles.activityBadgeText}>{activity.category}</Text>
                  </View>
                  <Text style={styles.activityTitle} numberOfLines={2}>{activity.title}</Text>
                  <Text style={styles.activityLocation} numberOfLines={1}>
                    {activity.location}
                  </Text>
                  <View style={styles.activityMetaRow}>
                    <Ionicons name="time-outline" size={13} color={themeColors.textSecondary} />
                    <Text style={styles.activityTime}>{activity.time}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
            <SeeAllCard
              image="https://images.unsplash.com/photo-1530866957042-7e9a37a8f0a5?w=500&h=600&fit=crop"
              width={width * 0.75}
              radius={borderRadius.xl}
              style={{ marginRight: spacing.base }}
              onPress={() => { light(); }}
            />
          </ScrollView>
        </Reveal>

        {/* Travel Blog Section */}
        <Reveal delay={780} mode="rise" style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Travel Stories</Text>
              <Text style={styles.sectionSubtitle}>Inspiration from our community</Text>
            </View>
            <TouchableOpacity>
              <Text style={styles.seeAllButton}>Read more</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScroll}
          >
            {travelStories.map((story) => (
              <TouchableOpacity
                key={story.id}
                style={styles.blogCard}
                activeOpacity={0.9}
                onPress={() => { light(); navigation.navigate('BlogPost', { postId: story.id }); }}
              >
                <Image
                  source={{ uri: story.image }}
                  style={styles.blogImage}
                  resizeMode="cover"
                />
                <View style={styles.blogContent}>
                  <Text style={styles.blogCategory}>{story.category}</Text>
                  <Text style={styles.blogTitle}>{story.title}</Text>
                  <Text style={styles.blogExcerpt}>{story.excerpt}</Text>
                  <View style={styles.blogMeta}>
                    <Text style={styles.blogAuthor}>By {story.author}</Text>
                    <Text style={styles.blogDate}>{story.date}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Reveal>

        {/* End of List View */}

        {/* Bottom Padding */}
        <View style={{ height: 100 }} />
      </Animated.ScrollView>
    </View>
  );
};

function makeStyles(colors: any, width: number, height: number) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'ios' ? height * 0.06 : spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  headerContent: {
    paddingHorizontal: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerSearchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  headerSearchText: {
    fontSize: 14,
    ...fonts.medium,
    color: colors.textSecondary,
  },
  headerFilterGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerFilterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.md,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? height * 0.06 : spacing.lg,
    paddingBottom: spacing.base,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  profileCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryUltraLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  greeting: {
    fontSize: 13,
    ...fonts.regular,
    color: colors.textSecondary,
  },
  brandName: {
    fontSize: 16,
    ...fonts.bold,
    color: colors.textPrimary,
    letterSpacing: 1.5,
  },
  notificationButton: {
    position: 'relative',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF385C',
  },
  searchSection: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
    gap: spacing.sm,
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  searchPlaceholder: {
    fontSize: 15,
    ...fonts.medium,
    color: colors.textSecondary,
    flex: 1,
  },
  filtersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    gap: spacing.xs,
    minWidth: 100,
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  filtersButtonText: {
    fontSize: 15,
    ...fonts.semiBold,
    color: '#FFFFFF',
  },
  filtersBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFD700',
    marginLeft: spacing.xs,
  },
  activeFiltersSection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  activeFiltersScroll: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryUltraLight,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  activeFilterText: {
    fontSize: 13,
    ...fonts.medium,
    color: colors.primary,
  },
  premiumCategoriesSection: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    backgroundColor: colors.background,
  },
  resumeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.base,
    padding: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.primary + '33',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
      android: { elevation: 3 },
      web: { boxShadow: '0 4px 14px rgba(0,0,0,0.08)' } as any,
    }),
  },
  resumeImage: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundSecondary,
  },
  recentScroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.base,
  },
  recentCard: {
    width: 150,
  },
  recentImage: {
    width: 150,
    height: 150,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.backgroundSecondary,
    marginBottom: spacing.sm,
  },
  recentTitle: {
    fontSize: 14,
    color: colors.textPrimary,
    ...fonts.semiBold,
  },
  recentMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    gap: 6,
  },
  recentLocation: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    ...fonts.regular,
  },
  recentRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  recentRatingText: {
    fontSize: 12,
    color: colors.textPrimary,
    ...fonts.semiBold,
  },
  resumeInfo: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  resumeEyebrow: {
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.primary,
    ...fonts.bold,
  },
  resumeTitle: {
    fontSize: 14,
    color: colors.textPrimary,
    marginTop: 1,
    ...fonts.semiBold,
  },
  resumeMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    ...fonts.regular,
  },
  resumeChevron: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySubtle,
  },
  resumeDismiss: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundSecondary,
  },
  categoriesSection: {
    paddingVertical: spacing.base,
  },
  categoriesScroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  categoryChip: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
    minWidth: 100,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  categoryChipActive: {
    backgroundColor: colors.background,
    borderColor: colors.primary,
    borderWidth: 2.5,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  categoryImage: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  categoryText: {
    fontSize: 13,
    ...fonts.semiBold,
    color: colors.textPrimary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  categoryTextActive: {
    color: colors.primary,
  },
  promoBanner: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.base,
    height: 160,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  promoImage: {
    width: '100%',
    height: '100%',
  },
  promoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(13, 148, 136, 0.85)',
    padding: spacing.base,
    justifyContent: 'center',
  },
  promoTitle: {
    fontSize: 24,
    ...fonts.bold,
    color: colors.textInverse,
    marginBottom: spacing.xs,
  },
  promoSubtitle: {
    fontSize: 14,
    ...fonts.regular,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: spacing.base,
  },
  promoButton: {
    backgroundColor: colors.textInverse,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  promoButtonText: {
    fontSize: 15,
    ...fonts.bold,
    color: colors.primary,
  },
  viewSwitcher: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.base,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    padding: 4,
  },
  viewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  viewButtonActive: {
    backgroundColor: colors.primary,
  },
  viewButtonText: {
    fontSize: 14,
    ...fonts.semiBold,
    color: colors.textPrimary,
  },
  viewButtonTextActive: {
    color: colors.textInverse,
  },
  section: {
    marginTop: spacing['2xl'],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.base,
  },
  sectionTitle: {
    fontSize: 22,
    ...fonts.bold,
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 3,
  },
  sectionSubtitle: {
    fontSize: 14,
    lineHeight: 19,
    ...fonts.regular,
    color: colors.textSecondary,
  },
  locationSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  nearbyEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: spacing.xl,
    marginHorizontal: spacing.lg,
  },
  nearbyEmptyText: {
    fontSize: 14,
    ...fonts.regular,
    color: colors.textSecondary,
  },
  seeAllButton: {
    fontSize: 14,
    ...fonts.semiBold,
    color: colors.primary,
  },
  propertiesContainer: {
    paddingHorizontal: spacing.lg,
  },
  horizontalScroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.base,
  },
  horizontalCard: {
    width: width * 0.85,
  },
  experienceCard: {
    width: width * 0.7,
    marginRight: spacing.base,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  experienceImage: {
    width: '100%',
    height: 180,
    backgroundColor: colors.backgroundSecondary,
  },
  experienceBadge: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  experienceBadgeText: {
    fontSize: 10,
    ...fonts.bold,
    color: colors.textInverse,
    letterSpacing: 0.5,
  },
  experienceInfo: {
    padding: spacing.md,
  },
  experienceTitle: {
    fontSize: 16,
    ...fonts.semiBold,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  experienceLocation: {
    fontSize: 13,
    ...fonts.regular,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  experienceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  experienceRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  experienceRatingText: {
    fontSize: 13,
    ...fonts.semiBold,
    color: colors.textPrimary,
  },
  experiencePrice: {
    fontSize: 14,
    ...fonts.semiBold,
    color: colors.primary,
  },
  attractionCard: {
    width: width * 0.8,
    height: 280,
    marginRight: spacing.base,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    backgroundColor: colors.background,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      },
    }),
  },
  attractionImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.backgroundSecondary,
  },
  attractionOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    paddingBottom: spacing.base,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  attractionType: {
    fontSize: 11,
    ...fonts.bold,
    color: colors.textInverse,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  attractionTitle: {
    fontSize: 20,
    ...fonts.bold,
    color: colors.textInverse,
    marginBottom: 4,
  },
  attractionLocation: {
    fontSize: 14,
    ...fonts.medium,
    color: colors.textInverse,
    marginBottom: 8,
  },
  attractionVisitors: {
    fontSize: 12,
    ...fonts.regular,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  blogContainer: {
    paddingHorizontal: spacing.lg,
  },
  blogCard: {
    width: width * 0.82,
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    marginRight: spacing.base,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      },
    }),
  },
  blogImage: {
    width: '100%',
    height: 220,
    backgroundColor: colors.backgroundSecondary,
  },
  blogContent: {
    padding: spacing.md,
  },
  blogCategory: {
    fontSize: 11,
    ...fonts.bold,
    color: colors.primary,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  blogTitle: {
    fontSize: 18,
    ...fonts.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    lineHeight: 24,
  },
  blogExcerpt: {
    fontSize: 14,
    ...fonts.regular,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  blogMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  blogAuthor: {
    fontSize: 13,
    ...fonts.medium,
    color: colors.textPrimary,
  },
  blogDate: {
    fontSize: 12,
    ...fonts.regular,
    color: colors.textSecondary,
  },
  // Destination styles
  destinationCard: {
    width: width * 0.65,
    height: 240,
    marginRight: spacing.base,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  destinationImage: {
    width: '100%',
    height: '100%',
  },
  destinationOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.base,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  destinationCity: {
    fontSize: 24,
    ...fonts.bold,
    color: colors.textInverse,
    marginBottom: 2,
  },
  destinationCountry: {
    fontSize: 14,
    ...fonts.medium,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
  },
  destinationProperties: {
    fontSize: 12,
    ...fonts.regular,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  destinationBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  destinationBadgeText: {
    fontSize: 10,
    ...fonts.semiBold,
    color: '#222222',
  },
  // Activity (Things to Do) styles
  activityCard: {
    width: width * 0.75,
    marginRight: spacing.base,
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  activityImage: {
    width: '100%',
    height: 160,
    backgroundColor: colors.backgroundSecondary,
  },
  activityInfo: {
    padding: spacing.md,
  },
  activityBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryUltraLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  activityBadgeText: {
    fontSize: 10,
    ...fonts.bold,
    color: colors.primary,
    letterSpacing: 0.5,
  },
  activityTitle: {
    fontSize: 16,
    ...fonts.semiBold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  activityLocation: {
    fontSize: 13,
    ...fonts.regular,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  activityDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  activityDate: {
    fontSize: 12,
    ...fonts.medium,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  activityMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.sm,
  },
  activityTime: {
    fontSize: 12,
    ...fonts.regular,
    color: colors.textSecondary,
  },
  activityPrice: {
    fontSize: 18,
    ...fonts.bold,
    color: colors.primary,
    textAlign: 'right',
  },
  activityAvailable: {
    fontSize: 11,
    ...fonts.regular,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: 2,
  },
  notifDot: {
    position: 'absolute',
    top: 7,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FB7185',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  // Map container for map view mode
  mapContainer: {
    height: 400,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  // Globe button
  globeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  headerIconGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Vibe section
  vibeSection: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  vibeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 10,
  },
  vibeTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  vibeScroll: {
    gap: 8,
    paddingHorizontal: 2,
  },
  vibePill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  vibeImageCard: {
    width: 130,
    height: 90,
    borderRadius: 14,
    overflow: 'hidden',
  },
  vibeImage: {
    width: 130,
    height: 90,
    position: 'absolute',
  },
  vibeImageOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 8,
  },
  vibeImageLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  vibeEmoji: { fontSize: 15 },
  vibePillLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  // Tonight's Deals
  dealCard: {
    width: 180,
    borderRadius: 16,
    overflow: 'hidden',
  },
  dealImg: {
    width: 180,
    height: 130,
  },
  dealOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 130,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    padding: 8,
  },
  dealBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
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
  dealBadgeText: {
    color: '#222222',
    fontSize: 11,
    fontWeight: '800',
  },
  dealInfo: {
    padding: 10,
  },
  dealTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 3,
  },
  dealOriginal: {
    fontSize: 12,
    textDecorationLine: 'line-through',
  },
  dealFinal: {
    fontSize: 14,
    fontWeight: '800',
  },
  // StayReels
  reelPostBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.primaryUltraLight },
  reelPostText: { fontSize: 13, ...fonts.bold },
  reelStayBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 8, paddingVertical: 7, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.95)' },
  reelStayText: { fontSize: 12, color: '#111', fontWeight: '800' },
  reelPendingTag: { position: 'absolute', top: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999 },
  reelPendingText: { fontSize: 9, color: '#fff', fontWeight: '700' },
  reelCard: {
    width: 130,
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
  },
  reelImg: {
    width: 130,
    height: 200,
  },
  reelOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    padding: 10,
  },
  playBtn: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -18,
    marginTop: -18,
  },
  reelTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  reelViews: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
  },
  // Curated Collections — editorial cards
  curatedHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingRight: 4,
  },
  curatedHeaderBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  curatedScroll: {
    paddingRight: 8,
    gap: 14,
  },
  curatedCard: {
    width: 210,
    height: 280,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: colors.backgroundSecondary,
    ...Platform.select({
      ios: { shadowColor: '#6366F1', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.22, shadowRadius: 16 },
      android: { elevation: 6 },
      web: { boxShadow: '0 8px 22px rgba(99,102,241,0.22)' } as any,
    }),
  },
  curatedImg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  curatedShade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  curatedTopRow: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
  },
  curatedTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4 },
      android: { elevation: 3 },
      web: { boxShadow: '0 2px 6px rgba(0,0,0,0.18)' } as any,
    }),
  },
  curatedTagText: {
    color: '#222222',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  curatedBottom: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
  },
  curatedTitle: {
    color: '#fff',
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 25,
    marginBottom: 10,
  },
  curatedMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  curatedCountPill: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  curatedCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  curatedUpdated: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    fontWeight: '600',
  },
  });
}

