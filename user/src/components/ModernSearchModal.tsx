import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Animated,
  Platform,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import dayjs from 'dayjs';
import { fonts, spacing, borderRadius, fontSizes } from '../constants';
import { useTheme } from '../contexts/ThemeContext';
import { ScrollableBottomSheet } from './common/BottomSheet';
import { suggestDestinations } from '../data/destinations';
import { BOT_STAYS } from '../data/stays';
import { searchPlaces, getPlaceDetails, newSessionToken, PlaceSuggestion } from '../services/places';
import { ProgressiveImage } from './common/ProgressiveImage';
import { STAYON_GRADIENT } from './GradientButton';

export interface SearchCoords { lat: number; lng: number; delta?: number }

/** Category + quick-filter refinements carried from the modal into the results screen. */
export interface SearchRefine {
  category?: string;       // vibe/category id, e.g. 'beach' (omitted for 'all')
  categoryLabel?: string;  // human label, e.g. 'Beaches'
  quickFilters?: string[]; // semantic keys: topRated | instantBook | bestValue | luxury
}

interface ModernSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onSearch: (destination: string, dates: string, guests: number, coords?: SearchCoords, refine?: SearchRefine) => void;
}

// Quick-filter chip id → semantic key the results screen understands.
const QUICK_FILTER_KEYS: Record<string, string> = {
  '1': 'topRated',
  '2': 'instantBook',
  '3': 'bestValue',
  '4': 'luxury',
};

export const ModernSearchModal: React.FC<ModernSearchModalProps> = ({
  visible,
  onClose,
  onSearch,
}) => {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const insets = useSafeAreaInsets();
  const [destination, setDestination] = useState('');
  const [destPicked, setDestPicked] = useState(false);       // a place was chosen (hide autocomplete)
  const [selectedCoords, setSelectedCoords] = useState<any>(undefined);
  const [searchHint, setSearchHint] = useState('');          // "add dates" etc.
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [adults, setAdults] = useState(0);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [pets, setPets] = useState(0);
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [searchFocused, setSearchFocused] = useState(false);
  // Live worldwide place predictions (Google Places) + loading flag.
  const [apiResults, setApiResults] = useState<PlaceSuggestion[]>([]);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const sessionToken = useRef(newSessionToken());
  const [showGuests, setShowGuests] = useState(false);
  const [showDates, setShowDates] = useState(false);
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  // Recent searches — seeded with sensible US/UK/EU examples, capped at 5
  const [recentSearches, setRecentSearches] = useState<string[]>(['New York', 'London', 'Paris']);

  const pushRecent = (term: string) => {
    const t = term.trim();
    if (!t) return;
    setRecentSearches((prev) => [t, ...prev.filter((r) => r.toLowerCase() !== t.toLowerCase())].slice(0, 5));
  };

  const removeRecent = (term: string) => {
    setRecentSearches((prev) => prev.filter((r) => r !== term));
  };

  // Guest summary text
  const guestSummary = (() => {
    const parts: string[] = [];
    if (adults > 0) parts.push(`${adults} adult${adults !== 1 ? 's' : ''}`);
    if (children > 0) parts.push(`${children} child${children !== 1 ? 'ren' : ''}`);
    if (infants > 0) parts.push(`${infants} infant${infants !== 1 ? 's' : ''}`);
    if (pets > 0) parts.push(`${pets} pet${pets !== 1 ? 's' : ''}`);
    return parts.length ? parts.join(' · ') : 'Add guests';
  })();

  // Calendar range marking (markingType="period"):
  //  • start date only  → a single filled pill so it's instantly dark
  //  • start + end       → every day from start to end is filled, rounded ends
  const markedDates = (() => {
    const marks: any = {};
    if (checkIn && !checkOut) {
      marks[checkIn] = { startingDay: true, endingDay: true, color: colors.primary, textColor: '#fff' };
      return marks;
    }
    if (checkIn && checkOut) {
      let cur = dayjs(checkIn);
      const end = dayjs(checkOut);
      while (cur.isBefore(end) || cur.isSame(end, 'day')) {
        const key = cur.format('YYYY-MM-DD');
        marks[key] = {
          color: colors.primary,
          textColor: '#fff',
          startingDay: key === checkIn,
          endingDay: key === checkOut,
        };
        cur = cur.add(1, 'day');
      }
      return marks;
    }
    return marks;
  })();

  const handleDayPress = (day: { dateString: string }) => {
    const d = day.dateString;
    if (!rangeStart || (checkIn && checkOut)) {
      setRangeStart(d); setCheckIn(d); setCheckOut('');
    } else {
      if (dayjs(d).isAfter(dayjs(rangeStart))) { setCheckIn(rangeStart); setCheckOut(d); }
      else { setCheckIn(d); setCheckOut(rangeStart); }
      setRangeStart(null);
    }
  };

  const searchButtonScale = useRef(new Animated.Value(1)).current;
  const searchBorderColor = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(searchBorderColor, {
      toValue: searchFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [searchFocused]);

  // Debounced live autocomplete against Google Places (everywhere on Earth).
  // Falls back silently to the local index if the API is unreachable.
  useEffect(() => {
    const q = destination.trim();
    if (q.length < 2) {
      setApiResults([]);
      setLoadingPlaces(false);
      return;
    }
    const controller = new AbortController();
    setLoadingPlaces(true);
    const handle = setTimeout(async () => {
      const results = await searchPlaces(q, {
        signal: controller.signal,
        sessionToken: sessionToken.current,
      });
      setApiResults(results);
      setLoadingPlaces(false);
    }, 250);
    return () => {
      clearTimeout(handle);
      controller.abort();
    };
  }, [destination]);

  // Local quick-matches (our inventory cities + curated areas) shown first.
  const localMatches = destination.trim().length > 0 ? suggestDestinations(destination, 6) : [];
  // Drop API rows already represented by a local match (same name/short).
  const localKeys = new Set(
    localMatches.flatMap((d) => [d.short, d.name.toLowerCase()])
  );
  const apiMatches = apiResults.filter(
    (p) => !localKeys.has(p.title.toLowerCase()) && !localKeys.has(p.full.toLowerCase())
  );

  const selectApiPlace = async (p: PlaceSuggestion) => {
    const label = p.subtitle ? `${p.title}, ${p.subtitle}` : p.title;
    setDestination(label);
    setDestPicked(true);
    setSearchHint('');
    pushRecent(p.title);
    const detail = await getPlaceDetails(p.placeId, { sessionToken: sessionToken.current });
    sessionToken.current = newSessionToken(); // end the billing session
    setSelectedCoords(detail ? { lat: detail.lat, lng: detail.lng, delta: detail.delta } : undefined);
    setShowDates(true); // next: ask for dates
  };

  const popularDestinations = [
    {
      id: '1',
      name: 'New York',
      country: 'United States',
      subtitle: 'The city that never sleeps',
      image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&h=600&fit=crop',
      properties: 2400,
      avgPrice: 285,
      gradient: ['#0F172A', '#334155'],
    },
    {
      id: '2',
      name: 'Los Angeles',
      country: 'United States',
      subtitle: 'Sunshine & beaches',
      image: 'https://images.unsplash.com/photo-1444723121867-7a241cacace9?w=800&h=600&fit=crop',
      properties: 1850,
      avgPrice: 320,
      gradient: ['#0D9488', '#14B8A6'],
    },
    {
      id: '3',
      name: 'London',
      country: 'United Kingdom',
      subtitle: 'Timeless & elegant',
      image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&h=600&fit=crop',
      properties: 1640,
      avgPrice: 310,
      gradient: ['#1E3A8A', '#3B82F6'],
    },
    {
      id: '4',
      name: 'Paris',
      country: 'France',
      subtitle: 'City of lights',
      image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&h=600&fit=crop',
      properties: 1320,
      avgPrice: 290,
      gradient: ['#7C3AED', '#A78BFA'],
    },
  ];

  // Category chips with LIVE counts derived from the real stay inventory (by vibe),
  // so the numbers update as inventory changes instead of being hardcoded.
  const trendingCategories = React.useMemo(() => {
    const byVibe = (vibe: string) => BOT_STAYS.filter((s) => s.vibes.includes(vibe)).length;
    const defs: { id: string; icon: string; name: string; vibe?: string }[] = [
      { id: 'all', icon: 'apps-outline', name: 'All' },
      { id: 'beach', icon: 'umbrella-outline', name: 'Beaches', vibe: 'beach' },
      { id: 'mountain', icon: 'triangle-outline', name: 'Mountains', vibe: 'mountain' },
      { id: 'city', icon: 'business-outline', name: 'Cities', vibe: 'city' },
      { id: 'luxury', icon: 'diamond-outline', name: 'Luxury', vibe: 'luxury' },
      { id: 'romantic', icon: 'heart-outline', name: 'Romantic', vibe: 'romantic' },
      { id: 'nature', icon: 'leaf-outline', name: 'Nature', vibe: 'nature' },
      { id: 'lake', icon: 'water-outline', name: 'Lakes', vibe: 'lake' },
    ];
    return defs
      .map((d) => ({ ...d, count: d.vibe ? byVibe(d.vibe) : BOT_STAYS.length }))
      .filter((d) => d.id === 'all' || d.count > 0);
  }, []);

  const quickFilters = [
    { id: '1', icon: 'heart', label: 'Top Rated' },
    { id: '2', icon: 'flash', label: 'Instant Book' },
    { id: '3', icon: 'pricetag', label: 'Best Value' },
    { id: '4', icon: 'star', label: 'Luxury' },
  ];

  const handleSearchPress = () => {
    Animated.sequence([
      Animated.spring(searchButtonScale, { toValue: 0.96, useNativeDriver: true, friction: 6, tension: 100 }),
      Animated.spring(searchButtonScale, { toValue: 1, useNativeDriver: true, friction: 6, tension: 100 }),
    ]).start();

    const totalGuests = adults + children;
    const dates = checkIn && checkOut ? `${checkIn} - ${checkOut}` : '';
    const q = destination.trim();
    const refine = buildRefine();

    // Guided flow: require a destination, then dates, then guests.
    if (!q) { setSearchHint('Choose where you want to go'); return; }
    if (!(checkIn && checkOut)) { setShowDates(true); setSearchHint('Add your check‑in and check‑out dates'); return; }
    if (totalGuests < 1) { setShowGuests(true); setSearchHint('Add how many guests'); return; }
    setSearchHint('');

    // Coordinates: from the picked place, else the best local match.
    const coords = selectedCoords || (localMatches[0] && (localMatches[0] as any).lat != null
      ? { lat: (localMatches[0] as any).lat, lng: (localMatches[0] as any).lng, delta: (localMatches[0] as any).delta }
      : undefined);
    pushRecent(q);
    onSearch(q, dates, totalGuests, coords, { ...refine, pets } as any);
    onClose();
  };

  // Bundle the selected category + active quick filters for the results screen.
  const buildRefine = (): SearchRefine => {
    const cat = trendingCategories.find((c) => c.id === activeCategory);
    return {
      category: activeCategory !== 'all' ? activeCategory : undefined,
      categoryLabel: activeCategory !== 'all' ? cat?.name : undefined,
      quickFilters: activeFilters.map((id) => QUICK_FILTER_KEYS[id]).filter(Boolean),
    };
  };

  const toggleFilter = (filterId: string) => {
    if (activeFilters.includes(filterId)) {
      setActiveFilters(activeFilters.filter(id => id !== filterId));
    } else {
      setActiveFilters([...activeFilters, filterId]);
    }
  };

  const animatedBorderColor = searchBorderColor.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.primary],
  });

  const renderDestinationCard = ({ item, index }: { item: typeof popularDestinations[0], index: number }) => (
    <TouchableOpacity
      style={styles.destinationCard}
      activeOpacity={0.9}
      onPress={() => { setDestination(item.name); setDestPicked(true); setSelectedCoords(undefined); setSearchHint(''); setShowDates(true); }}
    >
      <ProgressiveImage
        source={{ uri: item.image }}
        style={styles.destinationImage}
        blurRadius={0}
        fadeDuration={300}
        resizeMode="cover"
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.7)']}
        style={styles.destinationOverlay}
      >
        <View style={styles.destinationInfo}>
          <Text style={styles.destinationName}>{item.name}</Text>
          <Text style={styles.destinationCountry}>{item.country}</Text>
          <View style={styles.destinationStats}>
            <View style={styles.statItem}>
              <Ionicons name="home-outline" size={14} color="rgba(255,255,255,0.9)" />
              <Text style={styles.statText}>{item.properties}+ stays</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="cash-outline" size={14} color="rgba(255,255,255,0.9)" />
              <Text style={styles.statText}>${item.avgPrice}/night</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
      {/* Trending Badge */}
      {index < 2 && (
        <View style={styles.trendingBadge}>
          <View style={styles.trendingGradient}>
            <Ionicons name="flame" size={14} color="#222222" />
            <Text style={styles.trendingText}>Trending</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderCategoryChip = ({ item }: { item: typeof trendingCategories[0] }) => (
    <TouchableOpacity
      style={[
        styles.categoryChip,
        activeCategory === item.id && styles.categoryChipActive,
      ]}
      onPress={() => setActiveCategory(item.id)}
      activeOpacity={0.7}
    >
      {activeCategory === item.id && (
        <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
      )}
      <Ionicons
        name={item.icon as any}
        size={22}
        color={activeCategory === item.id ? '#FFFFFF' : colors.textSecondary}
        style={{ marginBottom: 4 }}
      />
      <Text
        style={[
          styles.categoryName,
          activeCategory === item.id && styles.categoryNameActive,
        ]}
      >
        {item.name}
      </Text>
      {item.count && (
        <View style={[
          styles.categoryCount,
          activeCategory === item.id && styles.categoryCountActive,
        ]}>
          <Text
            style={[
              styles.categoryCountText,
              activeCategory === item.id && styles.categoryCountTextActive,
            ]}
          >
            {item.count > 1000 ? `${(item.count / 1000).toFixed(1)}k` : item.count}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollableBottomSheet
      visible={visible}
      onClose={onClose}
      initialSnapPoint="full"
      snapPoints={['full']}
      enableBackdropDismiss={true}
      enableDragHandle={true}
    >
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Discover Your Next Stay</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close-circle" size={32} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {/* Search Bar */}
          <Animated.View style={[styles.searchContainer, { borderColor: animatedBorderColor }]}>
            <Ionicons name="search" size={24} color={colors.primary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Where do you want to go?"
              placeholderTextColor={colors.textSecondary}
              value={destination}
              onChangeText={(t) => { setDestination(t); setDestPicked(false); setSelectedCoords(undefined); setSearchHint(''); }}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              autoCapitalize="none"
            />
            {destination.length > 0 && (
              <TouchableOpacity onPress={() => setDestination('')}>
                <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          </Animated.View>

          {/* Autocomplete results — shows while typing */}
          {destination.trim().length > 0 && !destPicked && (
            <View style={styles.autocomplete}>
              {/* Local quick-matches (inventory cities + curated areas) */}
              {localMatches.map((d) => (
                <TouchableOpacity
                  key={d.id}
                  style={styles.autoRow}
                  activeOpacity={0.7}
                  onPress={() => {
                    setDestination(d.name);
                    setDestPicked(true);
                    setSelectedCoords((d as any).lat != null ? { lat: (d as any).lat, lng: (d as any).lng, delta: (d as any).delta } : undefined);
                    setSearchHint('');
                    pushRecent(d.name);
                    setShowDates(true); // next: ask for dates
                  }}
                >
                  <View style={styles.autoIcon}>
                    <Ionicons
                      name={d.type === 'country' ? 'earth-outline' : d.type === 'state' ? 'map-outline' : 'location-outline'}
                      size={20}
                      color={colors.primary}
                    />
                  </View>
                  <View style={styles.autoText}>
                    <Text style={styles.autoName}>{d.name}</Text>
                    <Text style={styles.autoLandmark} numberOfLines={1}>{d.landmark}</Text>
                  </View>
                  {d.hasStays ? (
                    <Ionicons name="arrow-forward" size={16} color={colors.textTertiary} />
                  ) : (
                    <View style={styles.comingSoonPill}>
                      <Text style={styles.comingSoonText}>Coming soon</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}

              {/* Live worldwide places (Google) */}
              {apiMatches.map((p) => (
                <TouchableOpacity
                  key={p.placeId}
                  style={styles.autoRow}
                  activeOpacity={0.7}
                  onPress={() => selectApiPlace(p)}
                >
                  <View style={styles.autoIcon}>
                    <Ionicons name="location-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.autoText}>
                    <Text style={styles.autoName}>{p.title}</Text>
                    {!!p.subtitle && (
                      <Text style={styles.autoLandmark} numberOfLines={1}>{p.subtitle}</Text>
                    )}
                  </View>
                  <View style={styles.comingSoonPill}>
                    <Text style={styles.comingSoonText}>Coming soon</Text>
                  </View>
                </TouchableOpacity>
              ))}

              {/* Loading + empty states */}
              {loadingPlaces && (
                <View style={styles.autoLoadingRow}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.autoLoadingText}>Searching worldwide…</Text>
                </View>
              )}
              {!loadingPlaces && localMatches.length === 0 && apiMatches.length === 0 && (
                <Text style={styles.autoEmpty}>
                  No match for “{destination}” yet. Check your spelling or try a nearby city.
                </Text>
              )}
            </View>
          )}

          {/* Recent searches — shown only when the input is empty */}
          {destination.trim().length === 0 && recentSearches.length > 0 && (
            <View style={styles.recentSection}>
              <Text style={styles.recentHeading}>Recent searches</Text>
              <View style={styles.recentCard}>
                {recentSearches.map((term, i) => (
                  <View
                    key={term}
                    style={[
                      styles.recentRow,
                      i < recentSearches.length - 1 && styles.recentRowDivider,
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.recentMain}
                      activeOpacity={0.7}
                      onPress={() => { setDestination(term); setDestPicked(true); setSearchHint(''); setShowDates(true); }}
                    >
                      <View style={styles.recentIcon}>
                        <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
                      </View>
                      <Text style={styles.recentText}>{term}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.recentRemove}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      onPress={() => removeRecent(term)}
                    >
                      <Ionicons name="close" size={18} color={colors.textTertiary} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* WHEN / WHO — always visible (dates + guests) */}
          <View style={styles.quickSelectionContainer}>
            {/* WHEN */}
            <TouchableOpacity style={styles.quickSelectionCard} activeOpacity={0.8} onPress={() => setShowDates(!showDates)}>
              <View style={styles.quickIconClean}>
                <Ionicons name="calendar-outline" size={22} color={colors.primary} />
              </View>
              <View style={styles.quickSelectionText}>
                <Text style={styles.quickSelectionLabel}>When</Text>
                <Text style={styles.quickSelectionValue}>
                  {checkIn && checkOut ? `${checkIn} – ${checkOut}` : 'Add dates'}
                </Text>
              </View>
              <Ionicons name={showDates ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textTertiary} />
            </TouchableOpacity>

            {showDates && (
              <View style={styles.expandPanel}>
                <Calendar
                  minDate={dayjs().format('YYYY-MM-DD')}
                  markingType="period"
                  markedDates={markedDates}
                  onDayPress={handleDayPress}
                  theme={{
                    todayTextColor: colors.primary,
                    arrowColor: colors.primary,
                    textMonthFontWeight: '800',
                    dayTextColor: colors.textPrimary,
                    monthTextColor: colors.textPrimary,
                    calendarBackground: 'transparent',
                  }}
                />
              </View>
            )}

            {/* WHO */}
            <TouchableOpacity style={styles.quickSelectionCard} activeOpacity={0.8} onPress={() => setShowGuests(!showGuests)}>
              <View style={styles.quickIconClean}>
                <Ionicons name="people-outline" size={22} color={colors.primary} />
              </View>
              <View style={styles.quickSelectionText}>
                <Text style={styles.quickSelectionLabel}>Who</Text>
                <Text style={styles.quickSelectionValue}>{guestSummary}</Text>
              </View>
              <Ionicons name={showGuests ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textTertiary} />
            </TouchableOpacity>

            {showGuests && (
              <View style={styles.expandPanel}>
                {[
                  { label: 'Adults', sub: 'Ages 13 or above', val: adults, set: setAdults, min: 0, max: 20 },
                  { label: 'Children', sub: 'Ages 2 – 12', val: children, set: setChildren, min: 0, max: 20 },
                  { label: 'Infants', sub: 'Under 2', val: infants, set: setInfants, min: 0, max: 10 },
                  { label: 'Pets', sub: 'Service animals welcome', val: pets, set: setPets, min: 0, max: 10 },
                ].map((g, i, arr) => (
                  <View key={g.label} style={[styles.guestRow, i < arr.length - 1 && { borderBottomColor: colors.borderLight, borderBottomWidth: 1 }]}>
                    <View>
                      <Text style={styles.guestLabel}>{g.label}</Text>
                      <Text style={styles.guestSub}>{g.sub}</Text>
                    </View>
                    <View style={styles.guestStepper}>
                      <TouchableOpacity
                        style={[styles.guestBtn, { borderColor: g.val <= g.min ? colors.borderLight : colors.primary }]}
                        onPress={() => g.set(Math.max(g.min, g.val - 1))}
                        disabled={g.val <= g.min}
                      >
                        <Ionicons name="remove" size={18} color={g.val <= g.min ? colors.textTertiary : colors.primary} />
                      </TouchableOpacity>
                      <Text style={styles.guestCount}>{g.val}</Text>
                      <TouchableOpacity
                        style={[styles.guestBtn, { borderColor: g.val >= g.max ? colors.borderLight : colors.primary }]}
                        onPress={() => g.set(Math.min(g.max, g.val + 1))}
                        disabled={g.val >= g.max}
                      >
                        <Ionicons name="add" size={18} color={g.val >= g.max ? colors.textTertiary : colors.primary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Popular Destinations — after Who, hidden while searching */}
          {destination.trim().length === 0 && (
            <View>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Popular Destinations</Text>
              </View>
              <FlatList
                data={popularDestinations}
                renderItem={renderDestinationCard}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.destinationsContent}
              />
            </View>
          )}

          {/* Bottom Spacing */}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Search Button */}
        <View style={[styles.footer, { paddingBottom: spacing.base + Math.max(insets.bottom, 12) }]}>
          {!!searchHint && (
            <View style={styles.searchHintRow}>
              <Ionicons name="information-circle-outline" size={15} color={colors.warning} />
              <Text style={styles.searchHintText}>{searchHint}</Text>
            </View>
          )}
          <Animated.View style={[styles.searchButton, { transform: [{ scale: searchButtonScale }] }]}>
            <TouchableOpacity onPress={handleSearchPress} activeOpacity={0.9}>
              <LinearGradient
                colors={[colors.primary, '#6366F1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.searchButtonGradient}
              >
                <Ionicons name="search" size={22} color="#FFF" />
                <Text style={styles.searchButtonText}>Search {destination ? destination : 'destinations'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </ScrollableBottomSheet>
  );
};

function makeStyles(colors: any) {
  return StyleSheet.create({
  content: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.base,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerTitle: {
    fontSize: fontSizes['2xl'],
    ...fonts.bold,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  closeButton: {
    padding: spacing.xs,
  },
  scrollContent: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.base,
    minHeight: 60,
    borderRadius: borderRadius.xl,
    gap: spacing.sm + 2,
    borderWidth: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 14,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.12)',
      },
    }),
  },
  searchInput: {
    flex: 1,
    fontSize: fontSizes.lg,
    ...fonts.medium,
    color: colors.textPrimary,
  },
  filtersContainer: {
    marginBottom: spacing.md,
  },
  filtersContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.primary,
    gap: spacing.xs,
    overflow: 'hidden',
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: 14,
    ...fonts.medium,
    color: colors.primary,
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSizes.xl,
    ...fonts.semiBold,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  // Recent searches
  recentSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.base,
  },
  recentHeading: {
    fontSize: fontSizes.lg,
    ...fonts.semiBold,
    color: colors.textPrimary,
    letterSpacing: -0.3,
    marginBottom: spacing.sm,
  },
  recentCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.base,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
    }),
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm + 2,
  },
  recentRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  recentMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  recentIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentText: {
    fontSize: fontSizes.md,
    ...fonts.medium,
    color: colors.textPrimary,
  },
  recentRemove: {
    padding: spacing.xs,
  },
  seeAllText: {
    fontSize: 14,
    ...fonts.medium,
    color: colors.primary,
  },
  categoriesContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.base,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.card,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: { elevation: 1 },
      web: { boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
    }),
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryEmoji: {
    fontSize: 18,
  },
  categoryName: {
    fontSize: 14,
    ...fonts.medium,
    color: colors.textPrimary,
  },
  categoryNameActive: {
    color: '#FFFFFF',
  },
  categoryCount: {
    marginLeft: spacing.xs,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primarySubtle,
  },
  categoryCountActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  categoryCountText: {
    fontSize: 10,
    ...fonts.semiBold,
    color: colors.textSecondary,
  },
  categoryCountTextActive: {
    color: '#FFFFFF',
  },
  destinationsContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.base,
    paddingBottom: spacing.lg,
  },
  destinationCard: {
    width: 260,
    height: 320,
    borderRadius: borderRadius.xl + 4,
    overflow: 'hidden',
    backgroundColor: colors.card,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 8px 16px rgba(0, 0, 0, 0.15)',
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
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.lg,
  },
  destinationInfo: {
    gap: spacing.xs,
  },
  destinationName: {
    fontSize: 24,
    ...fonts.bold,
    color: '#FFF',
    letterSpacing: -0.5,
  },
  destinationCountry: {
    fontSize: 14,
    ...fonts.medium,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  destinationStats: {
    flexDirection: 'row',
    gap: spacing.base,
    marginTop: spacing.xs,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    ...fonts.medium,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  trendingBadge: {
    position: 'absolute',
    top: spacing.base,
    right: spacing.base,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
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
  trendingGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs - 2,
    gap: 4,
  },
  trendingText: {
    fontSize: 11,
    ...fonts.bold,
    color: '#222222',
  },
  quickSelectionContainer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginTop: spacing.base,
  },
  expandPanel: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  guestRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14,
  },
  guestLabel: { fontSize: 16, ...fonts.semiBold, color: colors.textPrimary },
  guestSub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  guestStepper: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  guestBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  guestCount: { fontSize: 16, ...fonts.semiBold, color: colors.textPrimary, minWidth: 22, textAlign: 'center' },
  quickSelectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.base,
    borderRadius: borderRadius.xl,
    gap: spacing.base,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
      },
    }),
  },
  quickSelectionIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  quickIconGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickIconClean: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Autocomplete
  autocomplete: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
    }),
  },
  autoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  autoIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  autoText: { flex: 1 },
  autoName: { fontSize: 16, ...fonts.semiBold, color: colors.textPrimary },
  autoLandmark: { fontSize: 13, ...fonts.regular, color: colors.textSecondary, marginTop: 2 },
  autoEmpty: { fontSize: 14, color: colors.textSecondary, padding: spacing.base, textAlign: 'center' },
  autoLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.base,
  },
  autoLoadingText: { fontSize: 13, ...fonts.medium, color: colors.textSecondary },
  comingSoonPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primarySubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  comingSoonText: {
    fontSize: 11,
    ...fonts.semiBold,
    color: colors.primary,
  },
  quickSelectionText: {
    flex: 1,
    gap: 4,
  },
  quickSelectionLabel: {
    fontSize: 12,
    ...fonts.medium,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quickSelectionValue: {
    fontSize: 16,
    ...fonts.semiBold,
    color: colors.textPrimary,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  searchHintRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  searchHintText: { flex: 1, fontSize: fontSizes.sm, color: colors.warning, ...fonts.medium },
  searchButton: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: `0 4px 12px ${colors.primary}50`,
      },
    }),
  },
  searchButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.base + 2,
    gap: spacing.sm,
  },
  searchButtonText: {
    fontSize: 16,
    ...fonts.semiBold,
    color: '#FFF',
    letterSpacing: 0.3,
  },
  });
}
