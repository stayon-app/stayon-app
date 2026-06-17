/**
 * EXPLORE SCREEN - Dynamic, Backend-Driven, AI/ML Powered
 * 
 * This screen displays location-based content dynamically fetched from backend.
 * Supports worldwide locations: cities, streets, states, countries, landmarks.
 * 
 * BACKEND INTEGRATION:
 * - All data comes from API service (src/services/api.ts)
 * - Real-time location detection using GPS/IP
 * - Smart search with location autocomplete
 * - Dynamic content based on availability
 * 
 * AI/ML FEATURES:
 * - Personalized recommendations based on user behavior
 * - Smart content curation using machine learning
 * - Interaction tracking for model training
 * - Similar properties/experiences suggestions
 * 
 * PRODUCTION READY:
 * - Loading states for better UX
 * - Error handling with retry options
 * - Empty states when no data available
 * - Optimistic updates for favorites
 * - Pull-to-refresh functionality
 * - Infinite scroll support
 * 
 * DEVELOPMENT MODE:
 * - Currently using mock data generators as fallback
 * - Remove mock functions when backend is connected
 * - See TODO comments for integration points
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  Alert,
  Image,
  Animated,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { EXPLORE_DESTINATIONS } from '../data/exploreDestinations';
import { getHostListingsAsProperties } from '../data/hostListings';
import { LIGHT_MAP_STYLE } from '../utils/mapStyle';
import { Reveal } from '../components/Reveal';
import { PropertyMapWeb } from '../components/PropertyMapWeb';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { STAYON_GRADIENT } from '../components/GradientButton';
import { fontSizes, fonts, spacing, borderRadius } from '../constants';
import { ModernSearchModal } from '../components/ModernSearchModal';
import { PremiumFilterSheet } from '../components/PremiumFilterSheet';
import { PropertyCardLarge } from '../components/PropertyCardLarge';
import { ExploreSection } from '../components/ExploreSection';
import { ExploreSectionSkeleton } from '../components/common/SkeletonLoader';
import { useHaptics } from '../hooks/useHaptics';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useLocationDetection } from '../hooks/useLocationDetection';

// Conditionally import MapView only for native platforms
let MapView: any;
let Marker: any;
let PROVIDER_GOOGLE: any = null;
if (Platform.OS !== 'web') {
  const MapModule = require('react-native-maps');
  MapView = MapModule.default;
  Marker = MapModule.Marker;
  PROVIDER_GOOGLE = MapModule.PROVIDER_GOOGLE;
}

// TODO: PRODUCTION - Uncomment when backend is ready
// import { useExploreData, useLocationDetection, useFavorites } from '../hooks/useExploreData';
// import { API } from '../services/api';

/**
 * ============================================
 * BACKEND INTEGRATION ARCHITECTURE
 * ============================================
 * 
 * SETUP INSTRUCTIONS:
 * 1. Set environment variable: EXPO_PUBLIC_API_URL=https://your-api.com
 * 2. Uncomment the imports above
 * 3. Replace mock data with hooks:
 *    - useLocationDetection() - Auto-detect user location
 *    - useExploreData(location, tab) - Fetch dynamic sections
 *    - useFavorites(userId) - Manage user favorites
 * 4. Remove all mock generator functions below
 * 
 * API ENDPOINTS REQUIRED:
 * - GET  /api/location/detect - IP/GPS location detection
 * - GET  /api/location/search?q={query} - Location search/autocomplete
 * - POST /api/properties/search - Search properties with filters
 * - POST /api/explore/sections - Get curated property sections (AI/ML powered)
 * - POST /api/experiences/search - Search experiences
 * - GET  /api/explore/experiences?location={location} - Curated experience sections
 * - POST /api/blogs/search - Search blog posts
 * - GET  /api/explore/blogs?location={location} - Curated blog sections
 * - POST /api/ai/recommendations - AI/ML personalized recommendations
 * - POST /api/analytics/track - User interaction tracking for ML
 * - GET  /api/users/{userId}/favorites - Get user favorites
 * - POST /api/users/{userId}/favorites - Toggle favorite
 * 
 * RESPONSE FORMATS:
 * See detailed TypeScript interfaces in src/services/api.ts
 * 
 * ERROR HANDLING:
 * - Network errors: Show retry button
 * - Empty results: Show "No X available in {location}" message
 * - Invalid location: Suggest nearby locations or suggest different location
 * 
 * AI/ML INTEGRATION:
 * - Backend analyzes user behavior (views, clicks, favorites, bookings)
 * - Generates personalized section recommendations
 * - Tracks interactions via API.trackInteraction()
 * - Returns curated content based on ML model predictions
 */

// DEVELOPMENT MODE: Using mock data generators
// Remove these functions when switching to real API

interface ExploreScreenProps {
  navigation: any;
  route?: any;
}

interface Property {
  id: string;
  images?: string[];
  title: string;
  location: string;
  price: number;
  rating: number;
  reviews?: number;
  isGuestFavourite?: boolean;
  isFavorite?: boolean;
  hasFreeCancel?: boolean;
  // Attributes the filter sheet acts on:
  type?: string;          // property-type id: house | apartment | villa | …
  beds?: number;
  bathrooms?: number;
  entire?: boolean;       // entire home vs a room
  amenities?: string[];   // amenity ids: wifi | pool | parking | …
  instantBook?: boolean;
  selfCheckin?: boolean;
  allowsPets?: boolean;
  superhost?: boolean;
}

// Experience card data — distinct from a stay (no bedrooms/guests/nightly price)
interface Experience {
  id: string;
  image: string;
  title: string;
  location: string;
  category: string;          // Adventure / Cultural / Food / Water / Desert / City
  duration: string;          // e.g. "3 hours"
  perPersonPrice: number;    // USD, charged per person
  spotsLeft: number;         // remaining group spots
  rating: number;
  reviews: number;
}

// Blog/article card data — distinct again (no price at all)
interface Blog {
  id: string;
  image: string;
  title: string;
  category: string;          // Travel Guide / Local Insights / Food & Culture / ...
  excerpt: string;           // short summary line
  author: string;
  authorAvatar: string;
  readTime: string;          // e.g. "5 min read"
  date: string;              // e.g. "May 12, 2026"
}

// Placeholder images for properties
// High-resolution for crisp Retina display (≈3× the card size). Served at
// 1600px wide @ q80 — sharp on Apple screens without 4K-thumbnail bloat.
const IMG = '?w=1600&q=80&auto=format&fit=crop';
const PLACEHOLDER_IMAGES = [
  `https://images.unsplash.com/photo-1564013799919-ab600027ffc6${IMG}`,
  `https://images.unsplash.com/photo-1600596542815-ffad4c1539a9${IMG}`,
  `https://images.unsplash.com/photo-1600585154340-be6161a56a0c${IMG}`,
  `https://images.unsplash.com/photo-1600607687939-ce8a6c25118c${IMG}`,
  `https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde${IMG}`,
  `https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3${IMG}`,
  `https://images.unsplash.com/photo-1600210492493-0946911123ea${IMG}`,
  `https://images.unsplash.com/photo-1600573472550-8090b5e0745e${IMG}`,
];

// Mock property data - location-aware
const generateProperties = (count: number, offset: number = 0, locationName: string = 'New York'): Property[] => {
  const titles = [
    'Skyline Loft with Private Terrace',
    'Garden Pool House with Patio',
    'Modern Loft in Downtown District',
    'Beachfront Villa with Ocean View',
    'Cozy Mountain Cabin Retreat',
    'Luxury Penthouse with City Skyline',
    'Charming Cottage in Wine Country',
    'Spacious Family Home near Beach',
    'Designer Apartment in Arts Quarter',
    'Private Estate with Infinity Pool',
  ];

  const getLocations = (city: string) => [
    `${city}, Downtown`,
    `${city}, Marina`,
    `${city}, Old Town`,
    `${city}, Beach Area`,
    `${city}, City Center`,
    `${city}, Suburbs`,
    `${city}, Waterfront`,
    `${city}, Historic District`,
    `${city}, Business District`,
    `${city}, Resort Area`,
  ];

  const locations = getLocations(locationName);

  const TYPE_IDS = ['house', 'apartment', 'villa', 'cabin', 'loft', 'cottage', 'hotel', 'condo'];

  return Array.from({ length: count }, (_, i) => {
    const idx = i + offset;
    const index = idx % titles.length;
    const imageIndex = idx % PLACEHOLDER_IMAGES.length;
    // Deterministic amenity set: common essentials on most, rarer ones rotate —
    // so multi-select filters narrow results without emptying them.
    const amenities = ['wifi', 'kitchen', 'tv'];
    if (idx % 2 === 0) amenities.push('ac', 'heating', 'washer');
    if (idx % 2 === 1) amenities.push('dryer', 'workspace');
    if (idx % 2 === 0) amenities.push('pool');
    if (idx % 3 === 0) amenities.push('parking');
    if (idx % 4 === 0) amenities.push('gym');
    if (idx % 5 === 0) amenities.push('beachfront');
    if (idx % 6 === 0) amenities.push('hottub');
    if (idx % 4 === 1) amenities.push('breakfast');
    return {
      id: `property-${offset + i + 1}`,
      images: [
        PLACEHOLDER_IMAGES[imageIndex],
        PLACEHOLDER_IMAGES[(imageIndex + 1) % PLACEHOLDER_IMAGES.length],
        PLACEHOLDER_IMAGES[(imageIndex + 2) % PLACEHOLDER_IMAGES.length],
        PLACEHOLDER_IMAGES[(imageIndex + 3) % PLACEHOLDER_IMAGES.length],
      ],
      title: titles[index],
      location: locations[index],
      price: 135 + (i * 35) % 400,
      rating: 4.5 + (i % 10) * 0.05,
      reviews: 50 + (i * 15) % 200,
      isGuestFavourite: idx % 3 === 0,
      hasFreeCancel: idx % 2 === 0,
      isFavorite: false,
      type: TYPE_IDS[idx % TYPE_IDS.length],
      beds: 1 + (idx % 5),
      bathrooms: 1 + (idx % 3),
      entire: idx % 4 !== 0,
      amenities,
      instantBook: idx % 2 === 0,
      selfCheckin: idx % 3 === 0,
      allowsPets: idx % 3 === 1,
      superhost: idx % 4 === 0,
    };
  });
};

// Apply the PremiumFilterSheet selection to a list of stays. Options that the
// data can't express (accessibility, host language) are treated as no-ops.
const parseRooms = (v: string): number => (v === '8+' ? 8 : parseInt(v, 10) || 0);

function applyStayFilters(list: Property[], f: any): Property[] {
  if (!f) return list;
  return list.filter((p) => {
    // Price range
    if (typeof f.minPrice === 'number' && p.price < f.minPrice) return false;
    if (typeof f.maxPrice === 'number' && p.price > f.maxPrice) return false;
    // Place type (entire home vs room)
    if (f.placeType === 'Entire home' && p.entire === false) return false;
    if (f.placeType === 'Room' && p.entire === true) return false;
    // Bedrooms / beds / bathrooms (treat as "at least")
    if (f.bedrooms && f.bedrooms !== 'Any' && (p.beds ?? 0) < parseRooms(f.bedrooms)) return false;
    if (f.beds && f.beds !== 'Any' && (p.beds ?? 0) < parseRooms(f.beds)) return false;
    if (f.bathrooms && f.bathrooms !== 'Any' && (p.bathrooms ?? 0) < parseRooms(f.bathrooms)) return false;
    // Property types (any of the selected)
    if (Array.isArray(f.propertyTypes) && f.propertyTypes.length && !f.propertyTypes.includes(p.type)) return false;
    // Amenities (must have all selected)
    if (Array.isArray(f.amenities) && f.amenities.length) {
      const have = new Set(p.amenities ?? []);
      if (!f.amenities.every((a: string) => have.has(a))) return false;
    }
    // Recommended chips
    if (Array.isArray(f.recommended) && f.recommended.length) {
      if (f.recommended.includes('guest_fav') && !p.isGuestFavourite) return false;
      if (f.recommended.includes('free_cancel') && !p.hasFreeCancel) return false;
      if (f.recommended.includes('instant') && !p.instantBook) return false;
      if (f.recommended.includes('superhost') && !p.superhost) return false;
    }
    // Booking options
    if (Array.isArray(f.booking) && f.booking.length) {
      if (f.booking.includes('instant_book') && !p.instantBook) return false;
      if (f.booking.includes('self_checkin') && !p.selfCheckin) return false;
      if (f.booking.includes('allows_pets') && !p.allowsPets) return false;
    }
    return true;
  });
}

// Mock experiences data - location-aware
const generateExperiences = (count: number, offset: number = 0, locationName: string = 'New York'): Experience[] => {
  const titles = [
    'Sunset Sailing Cruise',
    'City Observation Deck Tour',
    'Harbor Yacht Experience',
    'Hot Air Balloon Adventure',
    'Food & Wine Walking Tour',
    'Aquarium & Marine Center',
    'Skydiving Adventure',
    'Historic Downtown Walking Tour',
    'Rooftop Dinner Experience',
    'City Lights Evening Walk',
  ];

  const categories = [
    'Water', 'City', 'Water', 'Adventure', 'Food',
    'Cultural', 'Adventure', 'Cultural', 'Food', 'City',
  ];

  const durations = [
    '2 hours', '1.5 hours', '4 hours', '3 hours', '3 hours',
    '2 hours', '1 hour', '2.5 hours', '3 hours', '2 hours',
  ];

  const getLocations = (city: string) => [
    `${city} Desert`,
    `Downtown ${city}`,
    `${city} Marina`,
    `${city} Desert`,
    `${city} Desert`,
    `${city} Mall`,
    `${city} Waterfront`,
    `Old ${city}`,
    `${city} Creek`,
    `Downtown ${city}`,
  ];

  const locations = getLocations(locationName);

  return Array.from({ length: count }, (_, i) => {
    const index = (i + offset) % titles.length;
    const imageIndex = (i + offset) % PLACEHOLDER_IMAGES.length;
    return {
      id: `experience-${offset + i + 1}`,
      image: PLACEHOLDER_IMAGES[imageIndex],
      title: titles[index],
      location: locations[index],
      category: categories[index],
      duration: durations[index],
      perPersonPrice: 45 + (i * 25) % 250,
      spotsLeft: 2 + (i * 3) % 8,
      rating: Number((4.6 + (i % 8) * 0.05).toFixed(2)),
      reviews: 100 + (i * 25) % 400,
    };
  });
};

// Mock blogs data - location-aware
const generateBlogs = (count: number, offset: number = 0, locationName: string = 'New York'): Blog[] => {
  const titles = [
    `Top 10 Hidden Gems in ${locationName}`,
    `Ultimate Guide to ${locationName} Culture`,
    `Best Street Food in Old ${locationName}`,
    `5 Day ${locationName} Itinerary`,
    `Luxury Shopping Guide ${locationName}`,
    `Family Activities in ${locationName}`,
    `${locationName} on a Budget: Tips & Tricks`,
    `Best Beaches in ${locationName}`,
    `Traditional Local Cuisine`,
    `${locationName} Nightlife Guide 2026`,
  ];

  const categories = [
    'Hidden Gems',
    'Local Insights',
    'Food & Culture',
    'Travel Guide',
    'Local Insights',
    'Travel Guide',
    'Budget',
    'Seasonal',
    'Food & Culture',
    'Local Insights',
  ];

  const excerpts = [
    `Skip the crowds and discover the secret spots locals love in ${locationName}.`,
    `Everything you need to know to truly understand ${locationName}'s rich culture.`,
    `A tasting tour through the most loved street food stalls in the old quarter.`,
    `A perfectly paced five-day plan covering the best of ${locationName}.`,
    `From flagship boutiques to artisan markets — shop ${locationName} like a pro.`,
    `Kid-approved adventures and easy outings the whole family will enjoy.`,
    `See more and spend less with these insider money-saving tips.`,
    `Sun, sand and surf — our pick of the most beautiful beaches around ${locationName}.`,
    `Meet the dishes that define the region and where to find them done right.`,
    `Where to go after dark — bars, live music and late-night eats for 2026.`,
  ];

  const authors = [
    'Maya Collins', 'James Whitfield', 'Sofia Reyes', 'Daniel Okafor', 'Emma Lindqvist',
    'Liam Carter', 'Aisha Rahman', 'Noah Bennett', 'Chloe Martin', 'Ethan Park',
  ];

  const readTimes = ['5 min read', '8 min read', '4 min read', '12 min read', '6 min read',
    '7 min read', '5 min read', '9 min read', '6 min read', '10 min read'];

  const dates = ['May 12, 2026', 'Apr 28, 2026', 'May 03, 2026', 'May 20, 2026', 'Apr 15, 2026',
    'May 08, 2026', 'Apr 22, 2026', 'May 16, 2026', 'Apr 30, 2026', 'May 24, 2026'];

  return Array.from({ length: count }, (_, i) => {
    const index = (i + offset) % titles.length;
    const imageIndex = (i + offset) % PLACEHOLDER_IMAGES.length;
    return {
      id: `blog-${offset + i + 1}`,
      image: PLACEHOLDER_IMAGES[imageIndex],
      title: titles[index],
      category: categories[index],
      excerpt: excerpts[index],
      author: authors[index],
      authorAvatar: `https://i.pravatar.cc/100?img=${(index + offset) % 70 + 1}`,
      readTime: readTimes[index],
      date: dates[index],
    };
  });
};

// ============================================================
// LOCAL CARD COMPONENTS (Explore-only) — each content type gets
// its own visual interface, distinct from the stay PropertyCard.
// ============================================================

const CATEGORY_TINTS: { [key: string]: string } = {
  Adventure: '#F97316',
  Cultural: '#8B5CF6',
  Food: '#EF4444',
  Water: '#0EA5E9',
  Desert: '#D97706',
  City: '#0D9488',
  // Blog categories
  'Travel Guide': '#0D9488',
  'Local Insights': '#8B5CF6',
  'Food & Culture': '#EF4444',
  'Hidden Gems': '#F97316',
  Budget: '#16A34A',
  Seasonal: '#0EA5E9',
};

/**
 * EXPERIENCE CARD — a full-width card built for activities.
 * Cover image with a category tag overlay, then title, duration,
 * spots left, rating and a per-person price + "Book experience" CTA.
 * Deliberately has NO bedrooms/guests/nightly-price framing.
 */
const ExperienceCard: React.FC<{
  experience: Experience;
  colors: any;
  onPress: () => void;
}> = ({ experience, colors, onPress }) => {
  const s = makeCardStyles(colors);
  const { format } = useCurrency();
  const tint = CATEGORY_TINTS[experience.category] || colors.primary;
  return (
    <TouchableOpacity style={s.expCard} activeOpacity={0.9} onPress={onPress}>
      <View style={s.expImageWrap}>
        <ExpoImage
          source={{ uri: experience.image }}
          style={s.expImage}
          contentFit="cover"
          transition={200}
        />
        <View style={[s.categoryTag, { backgroundColor: tint }]}>
          <Text style={s.categoryTagText}>{experience.category}</Text>
        </View>
        <View style={s.durationBadge}>
          <Ionicons name="time-outline" size={13} color="#FFFFFF" />
          <Text style={s.durationBadgeText}>{experience.duration}</Text>
        </View>
      </View>

      <View style={s.expBody}>
        <View style={s.expRow}>
          <Text style={s.expTitle} numberOfLines={1}>{experience.title}</Text>
          <View style={s.ratingRow}>
            <Ionicons name="star" size={13} color={colors.warning} />
            <Text style={s.ratingText}>{experience.rating}</Text>
          </View>
        </View>

        <View style={s.expMetaRow}>
          <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
          <Text style={s.expMetaText} numberOfLines={1}>{experience.location}</Text>
          <View style={s.metaDot} />
          <Ionicons name="people-outline" size={13} color={colors.textSecondary} />
          <Text style={s.expMetaText}>{experience.spotsLeft} spots left</Text>
        </View>

        <View style={s.expFooter}>
          <View style={s.priceWrap}>
            <Text style={s.priceValue}>{format(Number(experience.perPersonPrice) || 0)}</Text>
            <Text style={s.priceUnit}> / person</Text>
          </View>
          <View style={[s.bookBtn, { backgroundColor: tint }]}>
            <Text style={s.bookBtnText}>Book experience</Text>
            <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

/**
 * BLOG / ARTICLE CARD — editorial layout for written content.
 * Large cover, category tag, title, excerpt summary, then an author
 * byline (avatar + name) with read time and date. NO price anywhere.
 */
const BlogCard: React.FC<{
  blog: Blog;
  colors: any;
  onPress: () => void;
}> = ({ blog, colors, onPress }) => {
  const s = makeCardStyles(colors);
  const tint = CATEGORY_TINTS[blog.category] || colors.primary;
  return (
    <TouchableOpacity style={s.blogCard} activeOpacity={0.9} onPress={onPress}>
      <View style={s.blogImageWrap}>
        <ExpoImage
          source={{ uri: blog.image }}
          style={s.blogImage}
          contentFit="cover"
          transition={200}
        />
        <View style={[s.categoryTag, { backgroundColor: tint }]}>
          <Text style={s.categoryTagText}>{blog.category}</Text>
        </View>
      </View>

      <View style={s.blogBody}>
        <Text style={s.blogTitle} numberOfLines={2}>{blog.title}</Text>
        <Text style={s.blogExcerpt} numberOfLines={2}>{blog.excerpt}</Text>

        <View style={s.blogFooter}>
          <ExpoImage
            source={{ uri: blog.authorAvatar }}
            style={s.authorAvatar}
            contentFit="cover"
          />
          <View style={s.authorInfo}>
            <Text style={s.authorName} numberOfLines={1}>{blog.author}</Text>
            <View style={s.blogMetaRow}>
              <Text style={s.blogMetaText}>{blog.date}</Text>
              <View style={s.metaDot} />
              <Ionicons name="book-outline" size={12} color={colors.textSecondary} />
              <Text style={s.blogMetaText}>{blog.readTime}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

/** Section header reused by the Experiences and Blogs lists. */
const SectionHeader: React.FC<{ title: string; colors: any; onSeeAll?: () => void }> = ({ title, colors, onSeeAll }) => {
  const s = makeCardStyles(colors);
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionTitle}>{title}</Text>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={s.seeAll}>See all</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const ExperienceSection: React.FC<{
  title: string;
  experiences: Experience[];
  colors: any;
  onPress: (e: Experience) => void;
  onSeeAll?: () => void;
}> = ({ title, experiences, colors, onPress, onSeeAll }) => {
  const s = makeCardStyles(colors);
  return (
    <View style={s.section}>
      <SectionHeader title={title} colors={colors} onSeeAll={onSeeAll} />
      <View style={s.stack}>
        {experiences.map((exp) => (
          <ExperienceCard key={exp.id} experience={exp} colors={colors} onPress={() => onPress(exp)} />
        ))}
      </View>
    </View>
  );
};

const BlogSection: React.FC<{
  title: string;
  blogs: Blog[];
  colors: any;
  onPress: (b: Blog) => void;
  onSeeAll?: () => void;
  index?: number;
}> = ({ title, blogs, colors, onPress, onSeeAll, index = 0 }) => {
  const s = makeCardStyles(colors);
  return (
    <View style={s.section}>
      <SectionHeader title={title} colors={colors} onSeeAll={onSeeAll} />
      <View style={s.stack}>
        {blogs.map((blog, i) => (
          <Reveal key={blog.id} mode="rise" duration={300} delay={i * 100}>
            <BlogCard blog={blog} colors={colors} onPress={() => onPress(blog)} />
          </Reveal>
        ))}
      </View>
    </View>
  );
};

export const ExploreScreen: React.FC<ExploreScreenProps> = ({ navigation, route }) => {
  const { colors: themeColors } = useTheme();
  const { format } = useCurrency();
  const styles = makeStyles(themeColors);
  const haptics = useHaptics();

  // Scroll-driven collapse for the floating tabs: as you scroll up, the tab
  // icons shrink & fade away, leaving just the names (Stays / Destinations / Blogs).
  const scrollY = useRef(new Animated.Value(0)).current;
  const tabIconStyle = {
    height: scrollY.interpolate({ inputRange: [0, 46], outputRange: [22, 0], extrapolate: 'clamp' }),
    opacity: scrollY.interpolate({ inputRange: [0, 30], outputRange: [1, 0], extrapolate: 'clamp' }),
    marginBottom: scrollY.interpolate({ inputRange: [0, 46], outputRange: [2, 0], extrapolate: 'clamp' }),
    overflow: 'hidden' as const,
  };

  // Live GPS location — drives the whole Explore feed until the user searches/picks.
  const { location: liveLocation } = useLocationDetection();
  const userPickedLocation = useRef(false);
  // State
  const [activeTab, setActiveTab] = useState<'stays' | 'experiences' | 'blogs' | 'destinations'>('stays');
  // Real listings from the backend (published) — make the catalogue backend-driven.
  const [backendStays, setBackendStays] = useState<Property[]>([]);
  useEffect(() => {
    let active = true;
    getHostListingsAsProperties().then((p) => { if (active) setBackendStays(p as any); }).catch(() => {});
    return () => { active = false; };
  }, []);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [filters, setFilters] = useState<any>(null);
  const [currentLocation, setCurrentLocation] = useState('New York');
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [searchFilters, setSearchFilters] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  
  // Backend integration states
  const [loading, setLoading] = useState(true); // For initial load — starts true, flips false after mock fetch
  const [error, setError] = useState<string | null>(null); // For error messages
  const [hasData, setHasData] = useState(true); // Track if location has any content
  
  // TODO: PRODUCTION - Replace useState with custom hooks
  // const { location, setLocation, loading: locationLoading } = useLocationDetection();
  // const { sections, loading, error, refreshing, refresh } = useExploreData(location, activeTab);
  // const { favorites, toggleFavorite, isFavorite } = useFavorites(userId);

  // Available locations
  const availableLocations = ['New York', 'Los Angeles', 'Miami', 'San Francisco', 'Vancouver', 'Toronto', 'London', 'Paris', 'Barcelona', 'Amsterdam', 'Rome', 'Santorini'];

  // Locations we intentionally have no mock content for — drives the empty state.
  // TODO: PRODUCTION - replace with real availability check from API response.
  const UNAVAILABLE_LOCATIONS = ['Santorini'];

  /**
   * Simulated data load against the mock generators.
   * Mirrors the future API flow: shows loading, then resolves to data / empty / error.
   * Returns the timeout id so callers can clean it up.
   */
  const loadData = (location: string) => {
    setLoading(true);
    setError(null);
    return setTimeout(() => {
      // With real data this would be: setHasData(response.sections.length > 0)
      setHasData(!UNAVAILABLE_LOCATIONS.includes(location));
      setLoading(false);
    }, 800);
  };

  // Initial load + reload whenever the location changes
  useEffect(() => {
    const timer = loadData(currentLocation);
    return () => clearTimeout(timer);
  }, [currentLocation]);

  // Sync the Explore feed to the user's live location (city → state → country),
  // so a traveler in another city/country sees that place's stays automatically.
  // Stops syncing once the user manually picks a destination or searches.
  useEffect(() => {
    if (userPickedLocation.current) return;
    const detected = liveLocation.city || liveLocation.region || liveLocation.country;
    if (detected && detected !== currentLocation) {
      setCurrentLocation(detected);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveLocation.city, liveLocation.region, liveLocation.country]);

  // Show the full "City, State, Country" context when we're displaying the
  // detected location — reinforces the "discover this place" feel.
  const locationLabel =
    liveLocation.formattedAddress && liveLocation.formattedAddress.startsWith(currentLocation)
      ? liveLocation.formattedAddress
      : currentLocation;

  // Get dynamic landmarks for current location
  const getLandmarks = (city: string) => {
    const landmarks: { [key: string]: string[] } = {
      'New York': ['Times Square', 'Central Park', 'Brooklyn Bridge'],
      'Los Angeles': ['Hollywood', 'Santa Monica Pier', 'Griffith Observatory'],
      'Miami': ['South Beach', 'Art Deco District', 'Wynwood Walls'],
      'San Francisco': ['Golden Gate Bridge', 'Fisherman\'s Wharf', 'Alcatraz'],
      'London': ['Big Ben', 'Tower Bridge', 'Hyde Park'],
      'Paris': ['Eiffel Tower', 'Louvre', 'Arc de Triomphe'],
      'Barcelona': ['Sagrada Familia', 'Park Guell', 'La Rambla'],
      'Rome': ['Colosseum', 'Trevi Fountain', 'Vatican'],
      'Amsterdam': ['Dam Square', 'Vondelpark', 'Jordaan'],
      'Tokyo': ['Shibuya Crossing', 'Senso-ji', 'Tokyo Tower'],
      'Dubai': ['Burj Khalifa', 'Palm Jumeirah', 'Dubai Marina'],
      'Singapore': ['Marina Bay', 'Gardens by the Bay', 'Sentosa'],
      'Sydney': ['Opera House', 'Bondi Beach', 'Darling Harbour'],
      'Mumbai': ['Gateway of India', 'Marine Drive', 'Colaba'],
      'Delhi': ['India Gate', 'Connaught Place', 'Hauz Khas'],
      'Bengaluru': ['MG Road', 'Cubbon Park', 'Indiranagar'],
      'Bangalore': ['MG Road', 'Cubbon Park', 'Indiranagar'],
      'Hyderabad': ['Charminar', 'HITEC City', 'Hussain Sagar'],
      'Chennai': ['Marina Beach', 'T. Nagar', 'Mylapore'],
      'Goa': ['Baga Beach', 'Old Goa', 'Anjuna'],
    };
    return landmarks[city] || [`${city} City Centre`, `Downtown ${city}`, `${city} Waterfront`];
  };

  const landmarks = getLandmarks(currentLocation);

  // Property data organized by sections - location-aware. When the user has
  // applied filters, every section is narrowed to stays that match.
  const ff = (list: Property[]) => applyStayFilters(list, filters);
  // Backend listings lead the main section so real published stays surface first.
  const nearLandmarkProperties = ff([...backendStays, ...generateProperties(8, 0, currentLocation)]);
  const freeCancelProperties = ff(generateProperties(8, 8, currentLocation).filter(p => p.hasFreeCancel));
  const similarDatesProperties = ff(generateProperties(8, 16, currentLocation));
  const nearCityProperties = ff(generateProperties(8, 24, currentLocation));
  const popularProperties = ff(generateProperties(8, 32, currentLocation));
  const guestFavouritesProperties = ff(generateProperties(8, 40, currentLocation).filter(p => p.isGuestFavourite));

  const filtersActive = !!filters;
  const filteredTotal =
    nearLandmarkProperties.length + freeCancelProperties.length + similarDatesProperties.length +
    nearCityProperties.length + popularProperties.length + guestFavouritesProperties.length;

  // Experiences data organized by sections - location-aware
  const adventureExperiences = generateExperiences(8, 0, currentLocation);
  const culturalExperiences = generateExperiences(8, 8, currentLocation);
  const foodExperiences = generateExperiences(8, 16, currentLocation);
  const waterExperiences = generateExperiences(8, 24, currentLocation);
  const desertExperiences = generateExperiences(8, 32, currentLocation);
  const cityExperiences = generateExperiences(8, 40, currentLocation);

  // Blogs data organized by sections - location-aware
  const travelGuideBlogs = generateBlogs(8, 0, currentLocation);
  const localInsightsBlogs = generateBlogs(8, 8, currentLocation);
  const foodCultureBlogs = generateBlogs(8, 16, currentLocation);
  const hiddenGemsBlogs = generateBlogs(8, 24, currentLocation);
  const budgetTravelBlogs = generateBlogs(8, 32, currentLocation);
  const seasonalBlogs = generateBlogs(8, 40, currentLocation);

  // Handle favorite toggle
  const handleFavoriteToggle = (propertyId: string) => {
    setFavorites(prev =>
      prev.includes(propertyId)
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  // Handle property press
  const handlePropertyPress = (property: Property) => {
    haptics.light();
    navigation.navigate('PropertyDetails', { property });
  };

  // Handle experience press — route to the activity detail screen
  const handleExperiencePress = (experience: Experience) => {
    haptics.light();
    navigation.navigate('ActivityDetails', { activityId: experience.id });
  };

  // Handle blog press — route to the blog post reader
  const handleBlogPress = (blog: Blog) => {
    haptics.light();
    navigation.navigate('BlogPost', { postId: blog.id });
  };

  // Handle refresh — re-runs the (mock) load for the current location
  const handleRefresh = () => {
    haptics.light();
    setRefreshing(true);
    setError(null);
    setTimeout(() => {
      setHasData(!UNAVAILABLE_LOCATIONS.includes(currentLocation));
      setRefreshing(false);
    }, 1000);
  };

  // Retry after an error — clears the error and re-runs the load with skeletons
  const handleRetry = () => {
    haptics.light();
    loadData(currentLocation);
  };

  // Handle search — open the map centered on the searched destination.
  // ModernSearchModal calls (destination, dates, guests, coords?).
  const handleSearch = (
    destination: string,
    dates?: string,
    guests?: number,
    coords?: { lat: number; lng: number; delta?: number },
    refine?: { category?: string; categoryLabel?: string; quickFilters?: string[] },
  ) => {
    setShowSearchModal(false);
    const query = destination || currentLocation;
    const [ci, co] = (dates || '').split(' - ').map((s) => s.trim());
    navigation.navigate('MapExplore', {
      searchQuery: query,
      searchLat: coords?.lat,
      searchLng: coords?.lng,
      searchDelta: coords?.delta,
      searchGuests: guests,
      searchPets: (refine as any)?.pets,
      searchCheckIn: ci || undefined,
      searchCheckOut: co || undefined,
      searchCategory: refine?.category,
      searchCategoryLabel: refine?.categoryLabel,
      searchQuickFilters: refine?.quickFilters,
    });
  };

  // Handle filter apply
  const handleFilterApply = (newFilters: any) => {
    setFilters(newFilters);
    setShowFilterModal(false);
  };

  // Handle map button — open the full interactive map for the current location
  const handleMapPress = () => {
    navigation.navigate('MapExplore', { searchQuery: currentLocation });
  };

  // Handle location change — the loadData useEffect re-runs on currentLocation change.
  // Marks a manual override so live-location syncing no longer fights the user's choice.
  const handleLocationChange = (location: string) => {
    haptics.selection();
    userPickedLocation.current = true;
    setCurrentLocation(location);
    setShowLocationPicker(false);
  };

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        {/* Search Bar */}
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => setShowSearchModal(true)}
        >
          <Ionicons name="search" size={20} color={themeColors.textSecondary} />
          <View style={styles.searchBarContent}>
            <Text style={styles.searchBarText} numberOfLines={1}>
              {currentLocation || 'Search destinations'}
            </Text>
            <Text style={styles.searchBarSubtext}>Where | When | Guests</Text>
          </View>
        </TouchableOpacity>

        {/* Filter Button */}
        <TouchableOpacity
          onPress={() => { haptics.light(); setShowFilterModal(true); }}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel="Open filters"
        >
          <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.iconButton}>
            <Ionicons name="options-outline" size={20} color="#FFFFFF" />
            {filters && <View style={styles.filterActiveDot} />}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Category Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => setActiveTab('stays')}
        >
          <Animated.View style={tabIconStyle}>
            <Ionicons name="home-outline" size={20} color={activeTab === 'stays' ? themeColors.primary : themeColors.textSecondary} />
          </Animated.View>
          <Text style={[styles.tabText, activeTab === 'stays' && styles.tabTextActive]}>
            Stays
          </Text>
          {activeTab === 'stays' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tab}
          onPress={() => setActiveTab('destinations')}
        >
          <Animated.View style={tabIconStyle}>
            <Ionicons name="earth-outline" size={20} color={activeTab === 'destinations' ? themeColors.primary : themeColors.textSecondary} />
          </Animated.View>
          <Text style={[styles.tabText, activeTab === 'destinations' && styles.tabTextActive]}>
            Destinations
          </Text>
          {activeTab === 'destinations' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tab}
          onPress={() => setActiveTab('blogs')}
        >
          <Animated.View style={tabIconStyle}>
            <Ionicons name="newspaper-outline" size={20} color={activeTab === 'blogs' ? themeColors.primary : themeColors.textSecondary} />
          </Animated.View>
          <Text style={[styles.tabText, activeTab === 'blogs' && styles.tabTextActive]}>
            Blogs
          </Text>
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>NEW</Text>
          </View>
          {activeTab === 'blogs' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
      </View>

      {/* Content */}
      {viewMode === 'list' ? (
      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={themeColors.primary}
            colors={[themeColors.primary]}
          />
        }
      >
        {/* Content Header */}
        <View style={styles.contentHeader}>
          <Text style={styles.contentTitle}>
            {activeTab === 'stays' && 'Explore Stays'}
            {activeTab === 'experiences' && 'Explore Experiences'}
            {activeTab === 'blogs' && 'Explore Blogs'}
            {activeTab === 'destinations' && 'Explore Destinations'}
          </Text>
          {activeTab !== 'destinations' && (
            <View style={styles.contentLocationRow}>
              <Ionicons name="location-sharp" size={15} color={themeColors.primary} />
              <Text style={styles.contentLocation}>{locationLabel}</Text>
            </View>
          )}
        </View>

        {/* Loading State — skeleton placeholders mirroring the section layout */}
        {loading && (
          <View style={styles.skeletonContainer}>
            <ExploreSectionSkeleton />
            <ExploreSectionSkeleton />
          </View>
        )}

        {/* Error State */}
        {!loading && error && (
          <View style={styles.emptyContainer}>
            <Ionicons name="cloud-offline-outline" size={56} color={themeColors.textTertiary} style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>Couldn't load stays</Text>
            <Text style={styles.emptySubtext}>{error}</Text>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={handleRetry}
            >
              <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.retryButton}>
                <Text style={styles.retryButtonText}>Try again</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Empty State - No Data Available (destinations are always curated) */}
        {!loading && !error && !hasData && activeTab !== 'destinations' && (
          <View style={styles.emptyContainer}>
            <Ionicons name="bed-outline" size={56} color={themeColors.textTertiary} style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>
              No {activeTab} in {currentLocation} yet
            </Text>
            <Text style={styles.emptySubtext}>
              {activeTab === 'stays' && 
                `We don't have any properties listed in ${currentLocation} yet. Try searching in nearby areas or different locations.`
              }
              {activeTab === 'experiences' && 
                `No experiences found in ${currentLocation}. Check back later or explore other destinations.`
              }
              {activeTab === 'blogs' &&
                `No travel guides available for ${currentLocation} at the moment. Explore content from other locations.`
              }
            </Text>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                haptics.light();
                setShowSearchModal(true);
              }}
            >
              <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.changeLocationButton}>
                <Ionicons name="location" size={18} color="#FFFFFF" />
                <Text style={styles.changeLocationButtonText}>Change location</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Sections - Only show when data is available */}
        {!loading && !error && hasData && activeTab === 'stays' && (
          <>
            {filtersActive && (
              <View style={styles.filterResultBar}>
                <Text style={styles.filterResultText}>
                  {filteredTotal} stay{filteredTotal !== 1 ? 's' : ''} match your filters
                </Text>
                <TouchableOpacity onPress={() => { haptics.light(); setFilters(null); }} accessibilityRole="button" accessibilityLabel="Clear filters">
                  <Text style={styles.filterClearText}>Clear</Text>
                </TouchableOpacity>
              </View>
            )}

            {filtersActive && filteredTotal === 0 ? (
              <View style={styles.noMatch}>
                <Ionicons name="options-outline" size={40} color={themeColors.textTertiary} />
                <Text style={styles.noMatchTitle}>No stays match your filters</Text>
                <Text style={styles.noMatchSub}>Try widening your price range or removing a few filters.</Text>
                <TouchableOpacity style={styles.noMatchBtn} onPress={() => { haptics.light(); setFilters(null); }}>
                  <Text style={styles.noMatchBtnText}>Clear all filters</Text>
                </TouchableOpacity>
              </View>
            ) : (
            <>
            <ExploreSection
              title={`Stay near ${landmarks[0]}`}
              properties={nearLandmarkProperties}
              onPropertyPress={handlePropertyPress}
              onFavoriteToggle={handleFavoriteToggle}
              onSeeAll={() => navigation.navigate('MapExplore', { searchQuery: landmarks[0] })}
            />

            <ExploreSection
              title={`${currentLocation} homes with free cancellation`}
              properties={freeCancelProperties}
              onPropertyPress={handlePropertyPress}
              onFavoriteToggle={handleFavoriteToggle}
              onSeeAll={() => navigation.navigate('MapExplore', { searchQuery: currentLocation })}
            />

            <ExploreSection
              title="Available for similar dates"
              properties={similarDatesProperties}
              onPropertyPress={handlePropertyPress}
              onFavoriteToggle={handleFavoriteToggle}
              onSeeAll={() => navigation.navigate('MapExplore', { searchQuery: currentLocation })}
            />

            <ExploreSection
              title={`Stay near ${landmarks[1]}`}
              properties={nearCityProperties}
              onPropertyPress={handlePropertyPress}
              onFavoriteToggle={handleFavoriteToggle}
              onSeeAll={() => navigation.navigate('MapExplore', { searchQuery: landmarks[1] })}
            />

            <ExploreSection
              title={`Popular homes in ${currentLocation}`}
              properties={popularProperties}
              onPropertyPress={handlePropertyPress}
              onFavoriteToggle={handleFavoriteToggle}
              onSeeAll={() => navigation.navigate('MapExplore', { searchQuery: currentLocation })}
            />

            <ExploreSection
              title="Guest favourites"
              properties={guestFavouritesProperties}
              onPropertyPress={handlePropertyPress}
              onFavoriteToggle={handleFavoriteToggle}
              onSeeAll={() => navigation.navigate('MapExplore', { searchQuery: currentLocation })}
            />
            </>
            )}
          </>
        )}

        {!loading && !error && hasData && activeTab === 'experiences' && (
          <>
            <ExperienceSection
              title={`Adventure Activities in ${currentLocation}`}
              experiences={adventureExperiences}
              colors={themeColors}
              onPress={handleExperiencePress}
              onSeeAll={() => navigation.navigate('MapExplore', { searchQuery: currentLocation })}
            />

            <ExperienceSection
              title="Cultural Experiences"
              experiences={culturalExperiences}
              colors={themeColors}
              onPress={handleExperiencePress}
              onSeeAll={() => navigation.navigate('MapExplore', { searchQuery: currentLocation })}
            />

            <ExperienceSection
              title="Food & Dining Experiences"
              experiences={foodExperiences}
              colors={themeColors}
              onPress={handleExperiencePress}
              onSeeAll={() => navigation.navigate('MapExplore', { searchQuery: currentLocation })}
            />

            <ExperienceSection
              title="Water Sports & Beach Activities"
              experiences={waterExperiences}
              colors={themeColors}
              onPress={handleExperiencePress}
              onSeeAll={() => navigation.navigate('MapExplore', { searchQuery: currentLocation })}
            />

            <ExperienceSection
              title="Desert Safari Adventures"
              experiences={desertExperiences}
              colors={themeColors}
              onPress={handleExperiencePress}
              onSeeAll={() => navigation.navigate('MapExplore', { searchQuery: currentLocation })}
            />

            <ExperienceSection
              title={`City Tours in ${currentLocation}`}
              experiences={cityExperiences}
              colors={themeColors}
              onPress={handleExperiencePress}
              onSeeAll={() => navigation.navigate('MapExplore', { searchQuery: currentLocation })}
            />
          </>
        )}

        {!loading && !error && hasData && activeTab === 'blogs' && (
          <>
            <BlogSection
              title="Travel Guides & Itineraries"
              blogs={travelGuideBlogs}
              colors={themeColors}
              onPress={handleBlogPress}
              onSeeAll={() => navigation.navigate('MapExplore', { searchQuery: currentLocation })}
            />

            <BlogSection
              title="Local Insights & Tips"
              blogs={localInsightsBlogs}
              colors={themeColors}
              onPress={handleBlogPress}
              onSeeAll={() => navigation.navigate('MapExplore', { searchQuery: currentLocation })}
            />

            <BlogSection
              title="Food & Culture Stories"
              blogs={foodCultureBlogs}
              colors={themeColors}
              onPress={handleBlogPress}
              onSeeAll={() => navigation.navigate('MapExplore', { searchQuery: currentLocation })}
            />

            <BlogSection
              title={`Hidden Gems in ${currentLocation}`}
              blogs={hiddenGemsBlogs}
              colors={themeColors}
              onPress={handleBlogPress}
              onSeeAll={() => navigation.navigate('MapExplore', { searchQuery: currentLocation })}
            />

            <BlogSection
              title="Budget Travel Tips"
              blogs={budgetTravelBlogs}
              colors={themeColors}
              onPress={handleBlogPress}
              onSeeAll={() => navigation.navigate('MapExplore', { searchQuery: currentLocation })}
            />

            <BlogSection
              title="Seasonal Recommendations"
              blogs={seasonalBlogs}
              colors={themeColors}
              onPress={handleBlogPress}
              onSeeAll={() => navigation.navigate('MapExplore', { searchQuery: currentLocation })}
            />
          </>
        )}

        {/* Destinations — curated city cards (always available) */}
        {!loading && !error && activeTab === 'destinations' && (
          <View style={styles.destGrid}>
            {EXPLORE_DESTINATIONS.map((d, idx) => (
              <Reveal key={d.id} mode="rise" duration={300} delay={idx * 100} style={styles.destCard}>
                <TouchableOpacity
                  style={{ flex: 1 }}
                  activeOpacity={0.9}
                  onPress={() => { haptics.light(); navigation.navigate('DestinationDetails', { destinationId: d.id, name: d.city, country: d.country, image: d.image }); }}
                >
                  <ExpoImage source={{ uri: d.image }} style={styles.destImg} contentFit="cover" />
                  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.82)']} style={styles.destOverlay}>
                    <Text style={styles.destCity} numberOfLines={1}>{d.city}</Text>
                    <Text style={styles.destCountry} numberOfLines={1}>{d.country}</Text>
                    <Text style={styles.destWhy} numberOfLines={1}>{d.why}</Text>
                    <View style={styles.destMetaRow}>
                      <View style={styles.destMeta}><Ionicons name="calendar-outline" size={11} color="#fff" /><Text style={styles.destMetaText}>{d.bestSeason}</Text></View>
                      <View style={styles.destMeta}><Ionicons name="bed-outline" size={11} color="#fff" /><Text style={styles.destMetaText}>{d.stays} stays</Text></View>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </Reveal>
            ))}
          </View>
        )}
      </Animated.ScrollView>
      ) : (
        /* Map View */
        Platform.OS === 'web' ? (
          (() => {
            const all = [
              ...nearLandmarkProperties, ...freeCancelProperties, ...similarDatesProperties,
              ...nearCityProperties, ...popularProperties, ...guestFavouritesProperties,
            ];
            const pins = all
              .map((p: any) => ({
                id: String(p.id), lat: Number(p.latitude) || 0, lng: Number(p.longitude) || 0,
                price: Number(p.price) || 0, priceLabel: format(Number(p.price) || 0), title: String(p.title || ''),
              }))
              .filter((p) => p.lat && p.lng);
            return (
              <View style={styles.mapContainer}>
                <PropertyMapWeb
                  pins={pins}
                  isDark={themeColors.background === '#000000' || undefined as any}
                  onPinPress={(id) => { const m = all.find((p: any) => String(p.id) === id); if (m) setSelectedProperty(m as any); }}
                />
                {selectedProperty && (
                  <View style={styles.propertyPreview}>
                    <TouchableOpacity style={styles.propertyPreviewCard} activeOpacity={0.9} onPress={() => handlePropertyPress(selectedProperty)}>
                      <Image source={{ uri: (typeof selectedProperty.images?.[0] === 'string' ? selectedProperty.images[0] : (selectedProperty.images?.[0] as any)?.uri) || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=300&h=300&fit=crop' }} style={styles.propertyPreviewImage} />
                      <View style={styles.propertyPreviewInfo}>
                        <Text style={styles.propertyPreviewTitle} numberOfLines={1}>{selectedProperty.title}</Text>
                        <Text style={styles.propertyPreviewLocation} numberOfLines={1}>{selectedProperty.location}</Text>
                        <Text style={styles.propertyPreviewTitle}>{format(Number(selectedProperty.price) || 0)}<Text style={styles.propertyPreviewLocation}> /night</Text></Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })()
        ) : (
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              provider={PROVIDER_GOOGLE}
              customMapStyle={LIGHT_MAP_STYLE}
              initialRegion={{
                latitude: 25.2048,
                longitude: 55.2708,
                latitudeDelta: 0.3,
                longitudeDelta: 0.3,
              }}
            >
              {/* Show all properties on map */}
              {[
                ...nearLandmarkProperties,
                ...freeCancelProperties,
                ...similarDatesProperties,
                ...nearCityProperties,
                ...popularProperties,
                ...guestFavouritesProperties,
              ].map((property: Property, index: number) => (
                <Marker
                  key={`${property.id}-${index}`}
                  coordinate={{
                    latitude: (property as any).latitude || 25.2048,
                    longitude: (property as any).longitude || 55.2708,
                  }}
                  onPress={() => setSelectedProperty(property)}
                >
                  <View style={styles.markerContainer}>
                    <Text style={styles.markerPrice}>{format(Number(property.price) || 0)}</Text>
                  </View>
                </Marker>
              ))}
            </MapView>

            {/* Property Preview Card */}
            {selectedProperty && (
              <View style={styles.propertyPreview}>
                <TouchableOpacity
                  style={styles.propertyPreviewCard}
                  onPress={() => handlePropertyPress(selectedProperty)}
                >
                  <Image
                    source={{ uri: (typeof selectedProperty.images?.[0] === 'string' ? selectedProperty.images[0] : (selectedProperty.images?.[0] as any)?.uri) || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=300&h=300&fit=crop' }}
                    style={styles.propertyPreviewImage}
                  />
                  <View style={styles.propertyPreviewInfo}>
                    <Text style={styles.propertyPreviewTitle} numberOfLines={1}>
                      {selectedProperty.title}
                    </Text>
                    <Text style={styles.propertyPreviewLocation} numberOfLines={1}>
                      {selectedProperty.location}
                    </Text>
                    <View style={styles.propertyPreviewFooter}>
                      <View style={styles.propertyPreviewRating}>
                        <Ionicons name="star" size={14} color={themeColors.warning} />
                        <Text style={styles.propertyPreviewRatingText}>{selectedProperty.rating}</Text>
                      </View>
                      <Text style={styles.propertyPreviewPrice}>{format(Number(selectedProperty.price) || 0)}/night</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.propertyPreviewClose}
                    onPress={() => setSelectedProperty(null)}
                    accessibilityRole="button"
                    accessibilityLabel="Close property preview"
                  >
                    <Ionicons name="close" size={20} color={themeColors.textSecondary} />
                  </TouchableOpacity>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )
      )}

      {/* Modals */}
      <ModernSearchModal
        visible={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onSearch={handleSearch}
      />

      <PremiumFilterSheet
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApply={handleFilterApply}
      />
    </View>
  );
};

function makeStyles(colors: any) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing['4xl'],
    paddingBottom: spacing.sm,
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.08)',
      },
    }),
  },
  searchBarContent: {
    flex: 1,
  },
  searchBarText: {
    fontSize: 14,
    ...fonts.semiBold,
    color: colors.textPrimary,
  },
  searchBarSubtext: {
    fontSize: 12,
    ...fonts.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: 6,
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
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
  mapButtonText: {
    fontSize: 14,
    ...fonts.semiBold,
    color: '#FFFFFF',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
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
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
  filterActiveDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#FB7185',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  filterResultBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.base,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primarySubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterResultText: { fontSize: 14, ...fonts.semiBold, color: colors.textPrimary },
  filterClearText: { fontSize: 14, ...fonts.bold, color: colors.primary },
  noMatch: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  noMatchTitle: { fontSize: 18, ...fonts.bold, color: colors.textPrimary, marginTop: spacing.sm },
  noMatchSub: { fontSize: 14, ...fonts.regular, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  noMatchBtn: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
  },
  noMatchBtnText: { fontSize: 15, ...fonts.semiBold, color: '#fff' },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.background,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    position: 'relative',
  },
  tabIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  destGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.md },
  destCard: { width: '47%', height: 200, borderRadius: 18, overflow: 'hidden', backgroundColor: colors.backgroundSecondary, marginBottom: spacing.xs },
  destImg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  destOverlay: { flex: 1, justifyContent: 'flex-end', padding: spacing.md },
  destCity: { color: '#fff', fontSize: 17, ...fonts.bold },
  destCountry: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 1, ...fonts.medium },
  destWhy: { color: 'rgba(255,255,255,0.95)', fontSize: 12, marginTop: 4, ...fonts.regular },
  destMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  destMeta: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  destMetaText: { color: '#fff', fontSize: 11, ...fonts.semiBold },
  tabText: {
    fontSize: 14,
    ...fonts.medium,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.textPrimary,
    ...fonts.semiBold,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '25%',
    right: '25%',
    height: 2,
    backgroundColor: colors.primary,
    borderRadius: 1,
  },
  newBadge: {
    position: 'absolute',
    top: 2,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
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
  newBadgeText: {
    fontSize: 9,
    ...fonts.bold,
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: spacing['4xl'],
  },
  contentHeader: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.base,
  },
  contentTitle: {
    fontSize: 24,
    ...fonts.bold,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  contentLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  contentLocation: {
    fontSize: 14,
    ...fonts.medium,
    color: colors.textSecondary,
  },
  skeletonContainer: {
    paddingTop: spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    paddingHorizontal: spacing['2xl'],
  },
  loadingText: {
    fontSize: 16,
    ...fonts.medium,
    color: colors.textSecondary,
    marginTop: spacing.base,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: spacing['2xl'],
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: spacing.base,
  },
  emptyTitle: {
    fontSize: 20,
    ...fonts.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    ...fonts.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  retryButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  retryButtonText: {
    fontSize: 16,
    ...fonts.semiBold,
    color: '#FFFFFF',
  },
  changeLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  changeLocationButtonText: {
    fontSize: 16,
    ...fonts.semiBold,
    color: '#FFFFFF',
  },
  comingSoon: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: spacing['2xl'],
  },
  comingSoonEmoji: {
    fontSize: 64,
    marginBottom: spacing.base,
  },
  comingSoonText: {
    fontSize: 20,
    ...fonts.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  comingSoonSubtext: {
    fontSize: 14,
    ...fonts.regular,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  locationBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  locationPinBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight ? `${colors.primary}1A` : 'rgba(0,0,0,0.05)',
  },
  locationButtonText: {
    flex: 1,
    fontSize: 16,
    ...fonts.bold,
    color: colors.textPrimary,
  },
  locationChangeWrap: {
    marginLeft: 'auto',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  locationChangeText: {
    fontSize: 12,
    ...fonts.semiBold,
    color: colors.primary,
  },
  locationDropdown: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingVertical: spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.08)',
      },
    }),
  },
  locationList: {
    paddingHorizontal: spacing.base,
    gap: spacing.sm,
  },
  locationChip: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  locationChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  locationChipText: {
    fontSize: 14,
    ...fonts.medium,
    color: colors.textPrimary,
  },
  locationChipTextActive: {
    color: '#FFFFFF',
  },
  // Map View Styles
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.backgroundSecondary,
  },
  mapPlaceholderText: {
    fontSize: fontSizes.lg,
    ...fonts.semiBold,
    color: colors.textPrimary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  mapPlaceholderSubtext: {
    fontSize: fontSizes.base,
    ...fonts.regular,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  markerContainer: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  markerPrice: {
    fontSize: fontSizes.sm,
    ...fonts.semiBold,
    color: colors.textPrimary,
  },
  propertyPreview: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.base,
    right: spacing.base,
  },
  propertyPreviewCard: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  propertyPreviewImage: {
    width: 100,
    height: 100,
  },
  propertyPreviewInfo: {
    flex: 1,
    padding: spacing.md,
  },
  propertyPreviewTitle: {
    fontSize: fontSizes.base,
    ...fonts.semiBold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  propertyPreviewLocation: {
    fontSize: fontSizes.sm,
    ...fonts.regular,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  propertyPreviewFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  propertyPreviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  propertyPreviewRatingText: {
    fontSize: fontSizes.sm,
    ...fonts.semiBold,
    color: colors.textPrimary,
    marginLeft: spacing.xs,
  },
  propertyPreviewPrice: {
    fontSize: fontSizes.base,
    ...fonts.bold,
    color: colors.textPrimary,
  },
  propertyPreviewClose: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  });
}

// Styles for the Explore-only Experience & Blog cards (light/dark safe via tokens)
function makeCardStyles(colors: any) {
  const cardShadow = Platform.select({
    ios: {
      shadowColor: colors.shadow || '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
    },
    android: { elevation: 3 },
    web: { boxShadow: '0 4px 14px rgba(0,0,0,0.10)' } as any,
  });

  return StyleSheet.create({
    section: {
      paddingTop: spacing.lg,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.base,
      marginBottom: spacing.sm,
    },
    sectionTitle: {
      flex: 1,
      fontSize: fontSizes.xl,
      ...fonts.bold,
      color: colors.textPrimary,
      letterSpacing: -0.3,
    },
    seeAll: {
      fontSize: fontSizes.sm,
      ...fonts.semiBold,
      color: colors.primary,
    },
    stack: {
      paddingHorizontal: spacing.base,
      gap: spacing.base,
    },
    // Shared
    categoryTag: {
      position: 'absolute',
      top: spacing.sm,
      left: spacing.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: borderRadius.full,
    },
    categoryTagText: {
      fontSize: fontSizes.xs,
      ...fonts.bold,
      color: '#FFFFFF',
      letterSpacing: 0.3,
    },
    ratingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    ratingText: {
      fontSize: fontSizes.sm,
      ...fonts.semiBold,
      color: colors.textPrimary,
    },
    metaDot: {
      width: 3,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: colors.textTertiary,
      marginHorizontal: spacing.xs,
    },
    // ---- Experience card ----
    expCard: {
      backgroundColor: colors.surface || colors.background,
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
      ...cardShadow,
    },
    expImageWrap: {
      width: '100%',
      height: 180,
      backgroundColor: colors.backgroundSecondary,
    },
    expImage: {
      width: '100%',
      height: '100%',
    },
    durationBadge: {
      position: 'absolute',
      bottom: spacing.sm,
      right: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: borderRadius.full,
      backgroundColor: 'rgba(0,0,0,0.6)',
    },
    durationBadgeText: {
      fontSize: fontSizes.xs,
      ...fonts.semiBold,
      color: '#FFFFFF',
    },
    expBody: {
      padding: spacing.base,
      gap: spacing.sm,
    },
    expRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    expTitle: {
      flex: 1,
      fontSize: fontSizes.md,
      ...fonts.bold,
      color: colors.textPrimary,
    },
    expMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    expMetaText: {
      fontSize: fontSizes.sm,
      ...fonts.regular,
      color: colors.textSecondary,
      flexShrink: 1,
    },
    expFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.xs,
    },
    priceWrap: {
      flexDirection: 'row',
      alignItems: 'baseline',
    },
    priceValue: {
      fontSize: fontSizes.lg,
      ...fonts.bold,
      color: colors.textPrimary,
    },
    priceUnit: {
      fontSize: fontSizes.sm,
      ...fonts.regular,
      color: colors.textSecondary,
    },
    bookBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: spacing.base,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.full,
    },
    bookBtnText: {
      fontSize: fontSizes.sm,
      ...fonts.semiBold,
      color: '#FFFFFF',
    },
    // ---- Blog card ----
    blogCard: {
      backgroundColor: colors.surface || colors.background,
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
      ...cardShadow,
    },
    blogImageWrap: {
      width: '100%',
      height: 200,
      backgroundColor: colors.backgroundSecondary,
    },
    blogImage: {
      width: '100%',
      height: '100%',
    },
    blogBody: {
      padding: spacing.base,
      gap: spacing.xs,
    },
    blogTitle: {
      fontSize: fontSizes.lg,
      ...fonts.bold,
      color: colors.textPrimary,
      letterSpacing: -0.2,
    },
    blogExcerpt: {
      fontSize: fontSizes.sm,
      ...fonts.regular,
      color: colors.textSecondary,
      lineHeight: 20,
      marginBottom: spacing.xs,
    },
    blogFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.xs,
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    authorAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.backgroundSecondary,
    },
    authorInfo: {
      flex: 1,
    },
    authorName: {
      fontSize: fontSizes.sm,
      ...fonts.semiBold,
      color: colors.textPrimary,
    },
    blogMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 2,
    },
    blogMetaText: {
      fontSize: fontSizes.xs,
      ...fonts.regular,
      color: colors.textSecondary,
    },
  });
}
