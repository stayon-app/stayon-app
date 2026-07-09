import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  useWindowDimensions,
  Platform,
  Modal,
  Switch,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { fonts, spacing, borderRadius, fontSizes } from '../constants';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useHaptics } from '../hooks/useHaptics';
import { PropertyMapWeb } from '../components/PropertyMapWeb';
import { STAYON_GRADIENT } from '../components/GradientButton';
import { resolveDestination, suggestDestinations, DESTINATIONS } from '../data/destinations';
import { searchPlaces, getPlaceDetails } from '../services/places';
import { Api } from '../api';
import { LIGHT_MAP_STYLE } from '../utils/mapStyle';
import { AMENITY_OPTIONS } from '../host/data/listings';

// Valid amenity ids — only these are sent to the backend amenity filter so a
// stray id can never over-exclude every result.
const AMENITY_IDS = new Set(AMENITY_OPTIONS.map((a) => a.id));

// Map a backend (published) listing → the map/list property shape.
const beToMapProperty = (l: any): any => ({
  id: `be_${l.id}`,
  hostListingId: l.id,
  title: l.title || 'StayOn home',
  location: [l.city, l.country].filter(Boolean).join(', ') || 'StayOn',
  price: Math.round(l.priceUSD || 0),
  rating: l.ratingAvg || 4.8,
  reviews: l.ratingCount || 0,
  lat: l.lat || 0,
  lng: l.lng || 0,
  image: (() => { const f = (l.images || [])[0]; return (typeof f === 'string' ? f : f?.url || f?.uri) || 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&h=400&fit=crop'; })(),
  images: l.images || [], // rich [{url,room,caption}] → Photo tour keeps tags in detail
  beds: l.beds || 1,
  guests: l.guests || 2,
  bedrooms: l.bedrooms || 1,
  bathrooms: l.bathrooms || 1,
  type: l.type || 'Entire home',
  // real fields so the detail page shows the right city/host/amenities (not mock)
  city: l.city, country: l.country, address: l.address,
  amenities: l.amenities || [], vibes: l.vibes || [], hostName: l.hostName,
  instantBook: !!l.instantBook,
});
import { PremiumFilterSheet, FilterState } from '../components/PremiumFilterSheet';
import { StayListCard } from '../components/StayListCard';

type MapType = 'light' | 'street' | 'satellite';
const MAP_TYPES: { key: MapType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'light', label: 'Light', icon: 'map-outline' },
  { key: 'street', label: 'Street', icon: 'navigate-outline' },
  { key: 'satellite', label: 'Satellite', icon: 'earth-outline' },
];

// Extra interior shots to build a swipeable gallery per stay
const INTERIOR_IMAGES = [
  'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=700&h=500&fit=crop',
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=700&h=500&fit=crop',
  'https://images.unsplash.com/photo-1556912173-3bb406ef7e77?w=700&h=500&fit=crop',
];
const buildImages = (main: string) => [main, ...INTERIOR_IMAGES];

// Conditional import — Apple Maps on iOS, Google Maps on Android
let MapView: any = null;
let Marker: any = null;
let PROVIDER_GOOGLE: any = null;
let Callout: any = null;
if (Platform.OS !== 'web') {
  const maps = require('react-native-maps');
  MapView = maps.default;
  Marker = maps.Marker;
  PROVIDER_GOOGLE = maps.PROVIDER_GOOGLE;
  Callout = maps.Callout;
}

// USA / Canada / UK / Europe properties — all USD
const MAP_PROPERTIES = [
  {
    id: '1',
    title: 'Manhattan Luxury Loft',
    location: 'New York, NY',
    price: 285,
    rating: 4.97,
    reviews: 312,
    lat: 40.758,
    lng: -73.985,
    image: 'https://images.unsplash.com/photo-1555636222-cae831e670b3?w=600&h=400&fit=crop',
    beds: 2, guests: 4,
    type: 'Entire loft',
  },
  {
    id: '2',
    title: 'Hollywood Hills Villa',
    location: 'Los Angeles, CA',
    price: 420,
    rating: 4.95,
    reviews: 187,
    lat: 34.118,
    lng: -118.300,
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&h=400&fit=crop',
    beds: 4, guests: 8,
    type: 'Entire villa',
  },
  {
    id: '3',
    title: 'South Beach Modern Studio',
    location: 'Miami, FL',
    price: 175,
    rating: 4.88,
    reviews: 243,
    lat: 25.782,
    lng: -80.130,
    image: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=600&h=400&fit=crop',
    beds: 1, guests: 2,
    type: 'Entire studio',
  },
  {
    id: '4',
    title: 'Napa Valley Wine Estate',
    location: 'Napa, CA',
    price: 650,
    rating: 4.99,
    reviews: 98,
    lat: 38.297,
    lng: -122.286,
    image: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=600&h=400&fit=crop',
    beds: 5, guests: 10,
    type: 'Entire estate',
  },
  {
    id: '5',
    title: 'Vancouver Waterfront Condo',
    location: 'Vancouver, BC, Canada',
    price: 210,
    rating: 4.92,
    reviews: 156,
    lat: 49.282,
    lng: -123.120,
    image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&h=400&fit=crop',
    beds: 2, guests: 4,
    type: 'Entire condo',
  },
  {
    id: '6',
    title: 'Toronto Distillery Loft',
    location: 'Toronto, ON, Canada',
    price: 165,
    rating: 4.85,
    reviews: 201,
    lat: 43.650,
    lng: -79.358,
    image: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=600&h=400&fit=crop',
    beds: 1, guests: 2,
    type: 'Entire loft',
  },
  {
    id: '7',
    title: 'Chelsea Victorian Townhouse',
    location: 'London, UK',
    price: 380,
    rating: 4.93,
    reviews: 129,
    lat: 51.486,
    lng: -0.172,
    image: 'https://images.unsplash.com/photo-1577495508326-19a1b3cf65b7?w=600&h=400&fit=crop',
    beds: 3, guests: 6,
    type: 'Entire townhouse',
  },
  {
    id: '8',
    title: 'Cotswolds Country Cottage',
    location: 'Bourton-on-the-Water, UK',
    price: 195,
    rating: 4.97,
    reviews: 88,
    lat: 51.884,
    lng: -1.758,
    image: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=600&h=400&fit=crop',
    beds: 2, guests: 4,
    type: 'Entire cottage',
  },
  {
    id: '9',
    title: 'Le Marais Parisian Flat',
    location: 'Paris, France',
    price: 290,
    rating: 4.96,
    reviews: 274,
    lat: 48.857,
    lng: 2.352,
    image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&h=400&fit=crop',
    beds: 2, guests: 3,
    type: 'Entire apartment',
  },
  {
    id: '10',
    title: 'Gothic Quarter Apartment',
    location: 'Barcelona, Spain',
    price: 155,
    rating: 4.89,
    reviews: 318,
    lat: 41.385,
    lng: 2.173,
    image: 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=600&h=400&fit=crop',
    beds: 2, guests: 4,
    type: 'Entire apartment',
  },
  {
    id: '11',
    title: 'Amsterdam Canal House',
    location: 'Amsterdam, Netherlands',
    price: 225,
    rating: 4.94,
    reviews: 167,
    lat: 52.367,
    lng: 4.904,
    image: 'https://images.unsplash.com/photo-1512470876302-972faa2aa9a4?w=600&h=400&fit=crop',
    beds: 3, guests: 6,
    type: 'Entire house',
  },
  {
    id: '12',
    title: 'Trastevere Terrace',
    location: 'Rome, Italy',
    price: 180,
    rating: 4.91,
    reviews: 203,
    lat: 41.889,
    lng: 12.469,
    image: 'https://images.unsplash.com/photo-1555992336-03a23c7b20ee?w=600&h=400&fit=crop',
    beds: 2, guests: 4,
    type: 'Entire apartment',
  },
  {
    id: '13',
    title: 'Santorini Cliffside Villa',
    location: 'Oia, Greece',
    price: 520,
    rating: 4.99,
    reviews: 142,
    lat: 36.461,
    lng: 25.374,
    image: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=600&h=400&fit=crop',
    beds: 2, guests: 4,
    type: 'Entire villa',
  },
  {
    id: '14',
    title: 'Malibu Beachfront Home',
    location: 'Malibu, CA',
    price: 875,
    rating: 4.98,
    reviews: 67,
    lat: 34.025,
    lng: -118.780,
    image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&h=400&fit=crop',
    beds: 4, guests: 8,
    type: 'Entire home',
  },
  {
    id: '15',
    title: 'Brooklyn Brownstone',
    location: 'Brooklyn, NY',
    price: 195,
    rating: 4.86,
    reviews: 289,
    lat: 40.679,
    lng: -73.944,
    image: 'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=600&h=400&fit=crop',
    beds: 3, guests: 6,
    type: 'Entire house',
  },
];

type MapProperty = typeof MAP_PROPERTIES[0];

// Derive a category for a stay from its title/location/type, so the search
// modal's "Browse by Category" chips can actually filter results. Keeps the
// MAP_PROPERTIES data lean while matching the modal's category vocabulary.
const categoryOf = (p: MapProperty): string => {
  const s = `${p.title} ${p.location} ${p.type}`.toLowerCase();
  if (/beach|malibu|miami/.test(s)) return 'beach';
  if (/santorini|oia|island/.test(s)) return 'island';
  if (/lake|tahoe/.test(s)) return 'lake';
  if (/napa|cotswold|cottage|valley|vineyard|country/.test(s)) return 'nature';
  if (/paris|rome|marais|trastevere/.test(s)) return 'romantic';
  if (/villa|estate/.test(s) || p.price >= 500) return 'luxury';
  return 'city';
};

// Deterministic instant-book flag (no per-row data needed for the demo dataset).
const isInstantBook = (p: MapProperty): boolean => Number(p.id) % 3 !== 0;

// Apply the modal's category + quick-filter refinements to a stay list.
const applyRefine = (
  list: MapProperty[],
  category?: string,
  quickFilters: string[] = [],
): MapProperty[] => {
  let out = list;
  if (category) out = out.filter((p) => categoryOf(p) === category);
  if (quickFilters.includes('topRated')) out = out.filter((p) => p.rating >= 4.9);
  if (quickFilters.includes('luxury')) out = out.filter((p) => p.price >= 400 || /villa|estate|home/i.test(p.title));
  if (quickFilters.includes('instantBook')) out = out.filter((p) => isInstantBook(p));
  if (quickFilters.includes('bestValue')) out = [...out].sort((a, b) => a.price - b.price);
  return out;
};

const FILTER_OPTIONS = {
  types: ['Any', 'Entire home', 'Private room', 'Hotel'],
  prices: ['Any', 'Under $150', '$150–$300', '$300–$500', '$500+'],
  beds: ['Any', '1', '2', '3', '4+'],
};

export const MapExploreScreen: React.FC<{ navigation?: any; route?: any }> = ({ navigation, route }) => {
  const { colors: themeColors, isDark } = useTheme();
  const { format } = useCurrency();
  const { height } = useWindowDimensions();
  const { light, medium } = useHaptics();
  const mapRef = useRef<any>(null);

  const [selectedProperty, setSelectedProperty] = useState<MapProperty | null>(null);
  const [showSearchHere, setShowSearchHere] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState('Any');
  const [filterPrice, setFilterPrice] = useState('Any');
  const filtersRef = useRef<FilterState | null>(null);          // active sheet filters
  const lastSearchRef = useRef<{ query: string; coords?: any; refine?: any }>({ query: '' });
  const [filterBeds, setFilterBeds] = useState('Any');
  const [instantBook, setInstantBook] = useState(false);
  const [visibleProperties, setVisibleProperties] = useState(MAP_PROPERTIES);
  const [searchLabel, setSearchLabel] = useState<string>('');
  // True when the searched destination has no live inventory yet ("coming soon").
  const [comingSoon, setComingSoon] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [mapRegion, setMapRegion] = useState(route?.params?.region ?? {
    latitude: 39.5,
    longitude: -98.35,
    latitudeDelta: 30,
    longitudeDelta: 30,
  });
  const [mapType, setMapType] = useState<MapType>('light');
  const [mapTypeOpen, setMapTypeOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const initialRegion = mapRegion;

  // Request location permission, fetch current position, center the map there.
  // Web's expo-location support is limited — everything is guarded so it never crashes.
  const handleLocateMe = useCallback(async () => {
    light();

    // WEB: use the browser's native geolocation API (expo-location is unreliable on web).
    if (Platform.OS === 'web') {
      const geo = (globalThis as any).navigator?.geolocation;
      if (!geo) {
        Alert.alert('Location unavailable', 'Your browser does not support location access.');
        return;
      }
      geo.getCurrentPosition(
        (pos: any) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(coords);
          setMapRegion({ latitude: coords.lat, longitude: coords.lng, latitudeDelta: 0.05, longitudeDelta: 0.05 });
        },
        () => Alert.alert("Couldn't get your location", 'Allow location access for this site in your browser, then try again.'),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
      return;
    }

    try {
      // Native: OS permission dialog + position.
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location access needed',
          'Enable location permission to center the map on where you are.'
        );
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setUserLocation(coords);
      const region = {
        latitude: coords.lat,
        longitude: coords.lng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
      setMapRegion(region);
      // Native: animate to the user + drop the "you are here" marker.
      mapRef.current?.animateToRegion(region, 600);
    } catch (err) {
      // unavailable (web without geolocation, timeout, or hard denial) — fail gracefully
      Alert.alert(
        "Couldn't get your location",
        'Please check that location is enabled and try again.'
      );
    }
  }, [light]);

  const selectMapType = useCallback((t: MapType) => {
    light();
    setMapType(t);
  }, [light]);

  // Filter stays to a destination by matching the city/location text
  const centerMap = useCallback((lat: number, lng: number, delta: number) => {
    const region = {
      latitude: lat,
      longitude: lng,
      latitudeDelta: delta,
      longitudeDelta: delta,
    };
    setMapRegion(region);
    mapRef.current?.animateToRegion(region, 700);
  }, []);

  // Only stays that genuinely belong to the searched destination — never
  // unrelated cities/states. Country-level matching is intentionally the only
  // broad case (e.g. "France" → Paris); cities/states match by their own
  // name / aliases / region so one city can't pull in another.
  const matchStays = useCallback((dest: ReturnType<typeof resolveDestination>) => {
    if (!dest) return [] as MapProperty[];
    return MAP_PROPERTIES.filter((p) => {
      const loc = p.location.toLowerCase();
      if (loc.includes(dest.short)) return true;
      if (dest.aliases?.some((a) => loc.includes(a))) return true;
      if (dest.region && loc.includes(dest.region.toLowerCase())) return true;
      if (dest.type === 'country' && loc.includes(dest.country.toLowerCase())) return true;
      return false;
    });
  }, []);

  const runSearch = useCallback(
    (
      query: string,
      coords?: { lat: number; lng: number; delta?: number },
      refine?: { category?: string; categoryLabel?: string; quickFilters?: string[] },
    ) => {
      lastSearchRef.current = { query, coords, refine }; // so filters can re-run it
      const dest = resolveDestination(query);

      // Center the map: explicit coords (worldwide Places) → local destination
      // → otherwise geocode the free text via Places as a best effort.
      if (coords) {
        centerMap(coords.lat, coords.lng, coords.delta ?? 0.18);
      } else if (dest) {
        centerMap(dest.lat, dest.lng, dest.delta);
      } else {
        (async () => {
          const preds = await searchPlaces(query);
          if (preds[0]) {
            const d = await getPlaceDetails(preds[0].placeId);
            if (d) centerMap(d.lat, d.lng, d.delta);
          }
        })();
      }

      const label = dest?.name ?? query.trim();
      setSearchLabel(refine?.categoryLabel ? `${refine.categoryLabel}${label ? ` · ${label}` : ''}` : label);

      // Base set: stays for this destination (or everything when browsing with
      // no destination), then narrow by the category + quick filters.
      const base = query.trim() ? matchStays(dest) : MAP_PROPERTIES;
      let refined = applyRefine(base, refine?.category, refine?.quickFilters ?? []);
      // Apply the sheet's price + bedroom narrowing to the mock set too.
      const pfm = filtersRef.current;
      if (pfm) {
        refined = refined.filter((p) => p.price >= pfm.minPrice && p.price <= pfm.maxPrice);
        if (pfm.bedrooms !== 'Any') {
          const n = pfm.bedrooms === '8+' ? 8 : parseInt(pfm.bedrooms, 10);
          refined = pfm.bedrooms === '8+' ? refined.filter((p) => p.beds >= n) : refined.filter((p) => p.beds === n);
        }
      }
      if (refined.length > 0) {
        setVisibleProperties(refined);
        setComingSoon(false);
      } else {
        setVisibleProperties([]);
        setComingSoon(true);
      }

      // Also pull REAL published listings from the backend for this location and
      // merge them in (filtered by guests + date availability when provided).
      (async () => {
        try {
          const sp: Record<string, string | number> = {};
          if (query.trim()) sp.q = query.trim();
          const g = route?.params?.searchGuests;
          if (g) sp.guests = Number(g);
          const pets = route?.params?.searchPets;
          if (pets) sp.pets = Number(pets);
          const ci = route?.params?.searchCheckIn, co = route?.params?.searchCheckOut;
          if (ci && co) { sp.checkIn = ci; sp.checkOut = co; }
          // Filter-sheet selections → backend query params (cleanly-mapping ones).
          const pf = filtersRef.current;
          if (pf) {
            if (pf.minPrice > 10) sp.minPrice = pf.minPrice;
            if (pf.maxPrice < 1000) sp.maxPrice = pf.maxPrice;
            const amen = (pf.amenities || []).filter((a) => AMENITY_IDS.has(a));
            if (pf.booking?.includes('self_checkin')) amen.push('self_checkin');
            if (amen.length) sp.amenities = amen.join(',');
            if (pf.languages?.length) sp.languages = pf.languages.join(',');
            if (pf.booking?.includes('instant_book')) sp.instant = 'true';
            if (pf.booking?.includes('allows_pets')) sp.pets = 1;
          }
          const r = await Api.search(sp);
          const be = (r.results || []).map(beToMapProperty);
          if (query.trim()) {
            // Location search → the backend is the source of truth (same as the
            // website): show ONLY real available stays, or "coming soon" if none.
            // No mock padding, so results reflect true availability.
            setVisibleProperties(be as any);
            setComingSoon(be.length === 0);
          } else if (be.length) {
            // Passive browse (no destination) → real listings first, mock filler
            // after so the map is never empty.
            setVisibleProperties((prev: any[]) => {
              const seen = new Set(be.map((p: any) => p.id));
              return [...be, ...(prev || []).filter((p: any) => !seen.has(p.id))] as any;
            });
            setComingSoon(false);
          }
        } catch {
          // backend offline — the mock set shown synchronously above remains,
          // so search still works without a connection.
        }
      })();
    },
    [centerMap, matchStays]
  );

  // Apply incoming search query + refinements from another screen
  useEffect(() => {
    const q = route?.params?.searchQuery;
    const lat = route?.params?.searchLat;
    const lng = route?.params?.searchLng;
    const delta = route?.params?.searchDelta;
    const refine = {
      category: route?.params?.searchCategory,
      categoryLabel: route?.params?.searchCategoryLabel,
      quickFilters: route?.params?.searchQuickFilters as string[] | undefined,
    };
    const hasRefine = !!(refine.category || (refine.quickFilters && refine.quickFilters.length));
    if (q || hasRefine) {
      if (q) setSearchText(q);
      const coords =
        typeof lat === 'number' && typeof lng === 'number' ? { lat, lng, delta } : undefined;
      runSearch(q ?? '', coords, refine);
    }
  }, [
    route?.params?.searchQuery,
    route?.params?.searchLat,
    route?.params?.searchLng,
    route?.params?.searchGuests,
    route?.params?.searchCheckIn,
    route?.params?.searchCheckOut,
    route?.params?.searchCategory,
    route?.params?.searchQuickFilters,
  ]);

  const handleMarkerPress = useCallback((property: MapProperty) => {
    light();
    setSelectedProperty(property);
    setShowSearchHere(false);
    mapRef.current?.animateToRegion({
      latitude: property.lat - 0.02,
      longitude: property.lng,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    }, 400);
  }, []);

  // Tap a list card → point to that stay's location on the map
  const handleLocate = useCallback((property: MapProperty) => {
    setSelectedProperty(property);
    if (Platform.OS !== 'web' && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: property.lat - 0.04,
        longitude: property.lng,
        latitudeDelta: 0.06,
        longitudeDelta: 0.06,
      }, 500);
    }
    // On web, PropertyMapWeb receives focusId and pans via postMessage
  }, []);

  const handleMapDrag = useCallback(() => {
    setShowSearchHere(true);
    if (selectedProperty) setSelectedProperty(null);
  }, [selectedProperty]);

  const handleSearchArea = () => {
    light();
    setShowSearchHere(false);
  };

  const handleViewProperty = (property: MapProperty) => {
    medium();
    const p = property as any;
    navigation?.navigate('PropertyDetails', {
      property: {
        id: property.id,
        title: property.title,
        location: property.location,
        price: property.price,
        rating: property.rating,
        reviews: property.reviews,
        images: p.images?.length ? p.images : [property.image],
        latitude: property.lat,
        longitude: property.lng,
        isGuestFavorite: property.rating >= 4.9,
        // real fields (backend listings) → accurate detail page, not mock
        type: p.type,
        hostListingId: p.hostListingId,
        city: p.city,
        country: p.country,
        address: p.address,
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
        beds: property.beds,
        guests: property.guests,
        amenities: p.amenities,
        vibes: p.vibes,
        instantBook: p.instantBook,
      },
    });
  };

  const applyFilters = () => {
    medium();
    // Stay within the searched destination if there is one.
    let filtered = MAP_PROPERTIES;
    if (searchLabel) {
      const matched = matchStays(resolveDestination(searchLabel));
      if (matched.length === 0) {
        setVisibleProperties([]);
        setComingSoon(true);
        setShowFilters(false);
        return;
      }
      filtered = matched;
    }
    if (filterType !== 'Any') filtered = filtered.filter(p => p.type === filterType);
    if (filterPrice === 'Under $150') filtered = filtered.filter(p => p.price < 150);
    else if (filterPrice === '$150–$300') filtered = filtered.filter(p => p.price >= 150 && p.price <= 300);
    else if (filterPrice === '$300–$500') filtered = filtered.filter(p => p.price > 300 && p.price <= 500);
    else if (filterPrice === '$500+') filtered = filtered.filter(p => p.price > 500);
    if (filterBeds !== 'Any') {
      const beds = filterBeds === '4+' ? 4 : parseInt(filterBeds);
      filtered = filterBeds === '4+' ? filtered.filter(p => p.beds >= beds) : filtered.filter(p => p.beds === beds);
    }
    setVisibleProperties(filtered);
    setComingSoon(false);
    setShowFilters(false);
  };

  const resetFilters = () => {
    setFilterType('Any');
    setFilterPrice('Any');
    setFilterBeds('Any');
    setInstantBook(false);
    // Restore the searched destination's results (or all when not searching).
    if (searchLabel) {
      const matched = matchStays(resolveDestination(searchLabel));
      setVisibleProperties(matched);
      setComingSoon(matched.length === 0);
    } else {
      setVisibleProperties(MAP_PROPERTIES);
      setComingSoon(false);
    }
  };

  // Apply the premium filter sheet result to the map pins
  const applyPremiumFilters = (pf: FilterState) => {
    medium();
    // Remember the filters and RE-RUN the search so the backend re-queries with
    // price / amenities / languages / instant / pets applied. Mock stays still
    // get the client-side price + bedroom narrowing below (via filtersRef).
    filtersRef.current = pf;
    const last = lastSearchRef.current;
    runSearch(last.query || '', last.coords, last.refine);
  };

  const styles = makeStyles(themeColors, isDark, height);

  const renderFilterModal = () => (
    <Modal visible={showFilters} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={styles.modalBackdrop}>
        <View style={[styles.filterSheet, { backgroundColor: themeColors.surface }]}>
          <View style={[styles.filterHandle, { backgroundColor: themeColors.borderLight }]} />
          <View style={styles.filterHeader}>
            <TouchableOpacity onPress={() => setShowFilters(false)} accessibilityRole="button" accessibilityLabel="Close filters">
              <Ionicons name="close" size={22} color={themeColors.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.filterTitle, { color: themeColors.textPrimary }]}>Filters</Text>
            <TouchableOpacity onPress={resetFilters}>
              <Text style={[styles.filterReset, { color: themeColors.primary }]}>Reset</Text>
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, { color: themeColors.textPrimary }]}>Type of place</Text>
              <View style={styles.filterChips}>
                {FILTER_OPTIONS.types.map((t) => (
                  <TouchableOpacity key={t} style={[styles.chip, filterType === t && styles.chipActive, { borderColor: filterType === t ? themeColors.primary : themeColors.borderLight }]} onPress={() => { light(); setFilterType(t); }}>
                    <Text style={[styles.chipText, filterType === t && styles.chipTextActive, { color: filterType === t ? themeColors.primary : themeColors.textSecondary }]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, { color: themeColors.textPrimary }]}>Price range (per night)</Text>
              <View style={styles.filterChips}>
                {FILTER_OPTIONS.prices.map((p) => (
                  <TouchableOpacity key={p} style={[styles.chip, filterPrice === p && styles.chipActive, { borderColor: filterPrice === p ? themeColors.primary : themeColors.borderLight }]} onPress={() => { light(); setFilterPrice(p); }}>
                    <Text style={[styles.chipText, filterPrice === p && styles.chipTextActive, { color: filterPrice === p ? themeColors.primary : themeColors.textSecondary }]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, { color: themeColors.textPrimary }]}>Bedrooms</Text>
              <View style={styles.filterChips}>
                {FILTER_OPTIONS.beds.map((b) => (
                  <TouchableOpacity key={b} style={[styles.chip, filterBeds === b && styles.chipActive, { borderColor: filterBeds === b ? themeColors.primary : themeColors.borderLight }]} onPress={() => { light(); setFilterBeds(b); }}>
                    <Text style={[styles.chipText, filterBeds === b && styles.chipTextActive, { color: filterBeds === b ? themeColors.primary : themeColors.textSecondary }]}>{b}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={[styles.filterSection, styles.filterRow]}>
              <View>
                <Text style={[styles.filterLabel, { color: themeColors.textPrimary }]}>Instant Book</Text>
                <Text style={[styles.filterSub, { color: themeColors.textSecondary }]}>Book without waiting for host approval</Text>
              </View>
              <Switch value={instantBook} onValueChange={setInstantBook} trackColor={{ false: themeColors.borderLight, true: themeColors.primary }} thumbColor="#fff" />
            </View>
          </ScrollView>
          <TouchableOpacity style={[styles.applyBtn, { backgroundColor: themeColors.primary }]} onPress={applyFilters}>
            <Text style={styles.applyBtnText}>Show {visibleProperties.length} stays</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const suggestions = suggestDestinations(searchText, 8);
  const renderSearchModal = () => (
    <Modal visible={showSearch} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={styles.modalBackdrop}>
        <View style={[styles.filterSheet, { backgroundColor: themeColors.surface }]}>
          <View style={[styles.filterHandle, { backgroundColor: themeColors.borderLight }]} />
          <View style={styles.filterHeader}>
            <TouchableOpacity onPress={() => setShowSearch(false)} accessibilityRole="button" accessibilityLabel="Close search">
              <Ionicons name="close" size={22} color={themeColors.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.filterTitle, { color: themeColors.textPrimary }]}>Search destination</Text>
            <View style={{ width: 22 }} />
          </View>

          <View style={[styles.searchInputWrap, { backgroundColor: themeColors.backgroundSecondary }]}>
            <Ionicons name="search" size={18} color={themeColors.textTertiary} />
            <TextInput
              style={[styles.searchInput, { color: themeColors.textPrimary }]}
              placeholder="Where to? Try Miami, London, Paris..."
              placeholderTextColor={themeColors.textTertiary}
              value={searchText}
              onChangeText={setSearchText}
              autoFocus
              returnKeyType="search"
              onSubmitEditing={() => { runSearch(searchText); setShowSearch(false); }}
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')} accessibilityRole="button" accessibilityLabel="Clear search text">
                <Ionicons name="close-circle" size={18} color={themeColors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={{ maxHeight: 360 }}>
            <Text style={[styles.suggLabel, { color: themeColors.textSecondary }]}>
              {searchText ? 'Matching destinations' : 'Popular destinations'}
            </Text>
            {suggestions.map((d) => (
              <TouchableOpacity
                key={d.id}
                style={[styles.suggRow, { borderBottomColor: themeColors.borderLight }]}
                onPress={() => { medium(); setSearchText(d.name); runSearch(d.name); setShowSearch(false); }}
              >
                <View style={[styles.suggIcon, { backgroundColor: themeColors.primarySubtle }]}>
                  <Ionicons name="location-outline" size={18} color={themeColors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.suggName, { color: themeColors.textPrimary }]}>{d.name}</Text>
                  <Text style={[styles.suggCountry, { color: themeColors.textSecondary }]}>{d.country}</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color={themeColors.textTertiary} />
              </TouchableOpacity>
            ))}
            {suggestions.length === 0 && (
              <Text style={[styles.suggCountry, { color: themeColors.textSecondary, padding: 16, textAlign: 'center' }]}>
                No destinations found. Try a major city.
              </Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // Collapsed map-type control: a single button showing the current type that
  // expands to a vertical menu, stacked above the locate button (top-right).
  const renderMapControls = (topOffset: number) => {
    const current = MAP_TYPES.find((m) => m.key === mapType) ?? MAP_TYPES[0];
    return (
      <View style={[styles.mapControls, { top: topOffset }]} pointerEvents="box-none">
        {/* Map-type collapsed button + dropdown */}
        <View style={styles.mapTypeWrap}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setMapTypeOpen((o) => !o)}
            style={[styles.mapTypeBtn, { backgroundColor: themeColors.surface }]}
            accessibilityRole="button"
            accessibilityLabel={`Map type: ${current.label}. Tap to change`}
          >
            <Ionicons name={current.icon} size={16} color={themeColors.primary} />
            <Text style={[styles.mapTypeBtnText, { color: themeColors.textPrimary }]}>{current.label}</Text>
            <Ionicons name={mapTypeOpen ? 'chevron-up' : 'chevron-down'} size={14} color={themeColors.textSecondary} />
          </TouchableOpacity>

          {mapTypeOpen && (
            <View style={[styles.mapTypeMenu, { backgroundColor: themeColors.surface, borderColor: themeColors.borderLight }]}>
              {MAP_TYPES.map((mt) => {
                const active = mapType === mt.key;
                return (
                  <TouchableOpacity
                    key={mt.key}
                    activeOpacity={0.85}
                    onPress={() => { selectMapType(mt.key); setMapTypeOpen(false); }}
                    style={styles.mapTypeOption}
                    accessibilityRole="button"
                    accessibilityLabel={`${mt.label} map`}
                  >
                    <Ionicons name={mt.icon} size={16} color={active ? themeColors.primary : themeColors.textSecondary} />
                    <Text style={[styles.mapTypeOptionText, { color: active ? themeColors.primary : themeColors.textPrimary }]}>{mt.label}</Text>
                    {active && <Ionicons name="checkmark" size={15} color={themeColors.primary} style={{ marginLeft: 'auto' }} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Locate button */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleLocateMe}
          style={[styles.locateBtn, { backgroundColor: themeColors.surface }]}
          accessibilityRole="button"
          accessibilityLabel="Center map on my location"
        >
          <Ionicons name="locate" size={20} color={themeColors.primary} />
        </TouchableOpacity>
      </View>
    );
  };

  // Scrollable stays list over the bottom of the map (Airbnb-style)
  const renderResultsPanel = () => (
    <View style={styles.resultsPanel}>
      <View style={styles.resultsGrabber} />
      <Text style={[styles.resultsHeader, { color: themeColors.textPrimary }]}>
        {visibleProperties.length} stay{visibleProperties.length !== 1 ? 's' : ''}{searchLabel ? ` in ${searchLabel}` : ''}
      </Text>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.resultsList}>
        {visibleProperties.length === 0 ? (
          <View style={styles.resultsEmpty}>
            <Ionicons
              name={comingSoon ? 'rocket-outline' : 'search-outline'}
              size={40}
              color={themeColors.textTertiary}
            />
            <Text style={[styles.resultsEmptyText, { color: themeColors.textSecondary }]}>
              {comingSoon
                ? `We're coming soon to ${searchLabel}! No stays here just yet — check back shortly.`
                : 'No stays match your filters. Try widening your search.'}
            </Text>
          </View>
        ) : (
          visibleProperties.map((p) => (
            <View key={p.id}>
              <StayListCard
                stay={{
                  id: p.id,
                  images: buildImages(p.image),
                  type: p.type,
                  title: p.title,
                  location: p.location,
                  rating: p.rating,
                  reviews: p.reviews,
                  price: p.price,
                }}
                selected={selectedProperty?.id === p.id}
                onLocate={() => handleLocate(p)}
                onView={() => handleViewProperty(p)}
              />
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );

  // Web: real interactive Leaflet map with price pins
  if (Platform.OS === 'web' || !MapView) {
    const webPins = visibleProperties.map((p) => ({
      id: p.id, lat: p.lat, lng: p.lng, price: p.price, title: p.title,
      priceLabel: format(p.price), // show in the user's currency (₹ / $)
    }));
    return (
      <View style={styles.container}>
        <PropertyMapWeb
          pins={webPins}
          centerLat={initialRegion.latitude}
          centerLng={initialRegion.longitude}
          zoom={4}
          isDark={isDark}
          mapType={mapType}
          userLocation={userLocation}
          focusId={selectedProperty?.id ?? null}
          onPinPress={(id) => {
            const p = visibleProperties.find((x) => x.id === id);
            if (p) handleMarkerPress(p);
          }}
        />

        {/* Top overlay */}
        <SafeAreaView edges={['top']} style={styles.topOverlay} pointerEvents="box-none">
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.topBtn} onPress={() => navigation?.goBack()} accessibilityRole="button" accessibilityLabel="Go back">
              <Ionicons name="arrow-back" size={20} color={themeColors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.searchPill, { backgroundColor: themeColors.surface }]} onPress={() => { light(); setShowSearch(true); }}>
              <Ionicons name="search" size={16} color={themeColors.textSecondary} />
              <Text style={[styles.searchPillText, { color: searchLabel ? themeColors.textPrimary : themeColors.textSecondary }]} numberOfLines={1}>
                {searchLabel ? `Stays in ${searchLabel}` : 'Search destination'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterBtn, { backgroundColor: themeColors.surface }]}
              onPress={() => { light(); setShowFilters(true); }}
            >
              <Ionicons name="options-outline" size={20} color={themeColors.textPrimary} />
              <Text style={[styles.filterBtnText, { color: themeColors.textPrimary }]}>Filter</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {/* Map type segmented control + locate button */}
        {renderMapControls(96)}

        {renderSearchModal()}

        {/* Scrollable stays list over the map */}
        {renderResultsPanel()}

        <PremiumFilterSheet visible={showFilters} onClose={() => setShowFilters(false)} onApply={applyPremiumFilters} resultCount={MAP_PROPERTIES.length} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Full-screen map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        // Google Maps on every platform for a consistent look.
        provider={PROVIDER_GOOGLE}
        initialRegion={initialRegion}
        onRegionChangeComplete={handleMapDrag}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        mapType={mapType === 'satellite' ? 'satellite' : 'standard'}
        customMapStyle={mapType === 'light' ? LIGHT_MAP_STYLE : []}
      >
        {visibleProperties.map((property) => (
          <Marker
            key={property.id}
            coordinate={{ latitude: property.lat, longitude: property.lng }}
            onPress={() => handleMarkerPress(property)}
          >
            <View style={[
              styles.priceBubble,
              selectedProperty?.id === property.id && styles.priceBubbleSelected,
            ]}>
              <Text style={[
                styles.priceBubbleText,
                selectedProperty?.id === property.id && styles.priceBubbleTextSelected,
              ]}>
                {format(Number(property.price) || 0)}
              </Text>
            </View>
          </Marker>
        ))}

        {/* "You are here" marker after a successful locate */}
        {userLocation && (
          <Marker
            coordinate={{ latitude: userLocation.lat, longitude: userLocation.lng }}
            anchor={{ x: 0.5, y: 0.5 }}
            title="You are here"
          >
            <View style={styles.userDotOuter}>
              <View style={styles.userDotInner} />
            </View>
          </Marker>
        )}
      </MapView>

      {/* Top overlay — header */}
      <SafeAreaView edges={['top']} style={styles.topOverlay}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.topBtn} onPress={() => navigation?.goBack()} accessibilityRole="button" accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={20} color={themeColors.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.searchPill, { backgroundColor: themeColors.surface }]} onPress={() => { light(); setShowSearch(true); }}>
            <Ionicons name="search" size={16} color={themeColors.textSecondary} />
            <Text style={[styles.searchPillText, { color: searchLabel ? themeColors.textPrimary : themeColors.textSecondary }]} numberOfLines={1}>
              {searchLabel ? `Stays in ${searchLabel}` : 'Search destination'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterBtn, { backgroundColor: themeColors.surface }]}
            onPress={() => { light(); setShowFilters(true); }}
          >
            <Ionicons name="options-outline" size={20} color={themeColors.textPrimary} />
            <Text style={[styles.filterBtnText, { color: themeColors.textPrimary }]}>Filter</Text>
          </TouchableOpacity>
        </View>

        {/* View toggle */}
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggle, { backgroundColor: themeColors.surface }]}
            onPress={() => navigation?.goBack()}
          >
            <Ionicons name="list" size={15} color={themeColors.textSecondary} />
            <Text style={[styles.toggleText, { color: themeColors.textSecondary }]}>List</Text>
          </TouchableOpacity>
          <View style={[styles.toggle, styles.toggleActive]}>
            <Ionicons name="map" size={15} color="#fff" />
            <Text style={[styles.toggleText, { color: '#fff' }]}>Map</Text>
          </View>
        </View>
      </SafeAreaView>

      {/* Map type segmented control + locate button */}
      {renderMapControls(150)}

      {/* Search this area button */}
      {showSearchHere && (
        <View style={styles.searchAreaWrap}>
          <TouchableOpacity style={[styles.searchAreaBtn, { backgroundColor: themeColors.primary }]} onPress={handleSearchArea}>
            <Ionicons name="search" size={14} color="#fff" />
            <Text style={styles.searchAreaText}>Search this area</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Scrollable stays list over the map */}
      {renderResultsPanel()}

      <PremiumFilterSheet visible={showFilters} onClose={() => setShowFilters(false)} onApply={applyPremiumFilters} resultCount={MAP_PROPERTIES.length} />
      {renderSearchModal()}
    </View>
  );
};

function makeStyles(themeColors: any, isDark: boolean, height: number) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: themeColors.background },
    map: { flex: 1 },
    // Top overlay
    topOverlay: { position: 'absolute', top: 0, left: 0, right: 0 },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingBottom: 8,
      gap: 8,
    },
    topBtn: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.95)',
      justifyContent: 'center', alignItems: 'center',
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15, shadowRadius: 6, elevation: 4,
    },
    searchPill: {
      flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingHorizontal: 14, paddingVertical: 10, borderRadius: 24,
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12, shadowRadius: 6, elevation: 4,
    },
    searchPillText: { fontSize: 14, fontWeight: '500' },
    filterBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      paddingHorizontal: 12, paddingVertical: 10, borderRadius: 22,
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12, shadowRadius: 6, elevation: 4,
    },
    filterBtnText: { fontSize: 13, fontWeight: '600' },
    toggleRow: {
      flexDirection: 'row', alignSelf: 'center',
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderRadius: 24, padding: 3, gap: 2,
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12, shadowRadius: 6, elevation: 4,
    },
    toggle: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    },
    toggleActive: { backgroundColor: themeColors.primary },
    toggleText: { fontSize: 13, fontWeight: '600' },
    // Map type segmented control + locate
    mapControls: {
      position: 'absolute', right: 12, left: 12,
      flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'flex-end', gap: 8,
      zIndex: 50,
    },
    mapTypeWrap: { position: 'relative' },
    mapTypeBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: 14, height: 44, borderRadius: 22,
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.14, shadowRadius: 6, elevation: 4,
    },
    mapTypeBtnText: { fontSize: 13, fontWeight: '700' },
    mapTypeMenu: {
      position: 'absolute', top: 50, right: 0, minWidth: 168,
      borderRadius: 14, paddingVertical: 4, borderWidth: 1,
      shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18, shadowRadius: 10, elevation: 8,
    },
    mapTypeOption: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingHorizontal: 14, paddingVertical: 11,
    },
    mapTypeOptionText: { fontSize: 13, fontWeight: '600' },
    locateBtn: {
      width: 44, height: 44, borderRadius: 22,
      justifyContent: 'center', alignItems: 'center',
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.14, shadowRadius: 6, elevation: 4,
    },
    // Directions (selected stay)
    directionsBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      marginTop: -6, marginBottom: 16,
      paddingVertical: 11, borderRadius: 12, borderWidth: 1.5,
    },
    directionsText: { fontSize: 14, fontWeight: '700' },
    // Search area
    searchAreaWrap: { position: 'absolute', top: 140, alignSelf: 'center' },
    searchAreaBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: 18, paddingVertical: 10, borderRadius: 24,
      shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.25, shadowRadius: 8, elevation: 6,
    },
    searchAreaText: { color: '#fff', fontSize: 13, fontWeight: '700' },
    // Count badge
    countBadge: {
      position: 'absolute', bottom: 220, alignSelf: 'center',
      paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16,
    },
    countText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    // Price markers
    priceBubble: {
      backgroundColor: '#fff', borderRadius: 20,
      paddingHorizontal: 10, paddingVertical: 5,
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2, shadowRadius: 4, elevation: 4,
      borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.08)',
    },
    priceBubbleSelected: {
      backgroundColor: '#0F172A', borderColor: '#0F172A',
      shadowOpacity: 0.35, shadowRadius: 8, elevation: 8,
    },
    priceBubbleText: { color: '#0F172A', fontSize: 13, fontWeight: '800' },
    priceBubbleTextSelected: { color: '#fff' },
    // "You are here" current-location marker
    userDotOuter: {
      width: 24, height: 24, borderRadius: 12,
      backgroundColor: 'rgba(37,99,235,0.25)',
      justifyContent: 'center', alignItems: 'center',
    },
    userDotInner: {
      width: 14, height: 14, borderRadius: 7,
      backgroundColor: '#2563EB', borderWidth: 3, borderColor: '#fff',
    },
    // Preview card
    // Results panel (stays list over the map)
    resultsPanel: {
      position: 'absolute', bottom: 0, left: 0, right: 0,
      height: height * 0.46,
      backgroundColor: themeColors.background,
      borderTopLeftRadius: 22, borderTopRightRadius: 22,
      paddingTop: 8,
      shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.12, shadowRadius: 16, elevation: 16,
    },
    resultsGrabber: {
      width: 40, height: 4, borderRadius: 2,
      backgroundColor: themeColors.borderLight, alignSelf: 'center', marginBottom: 8,
    },
    resultsHeader: { fontSize: 16, fontWeight: '800', paddingHorizontal: 16, marginBottom: 10 },
    resultsList: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
    resultsEmpty: { alignItems: 'center', paddingVertical: 40, gap: 12 },
    resultsEmptyText: { fontSize: 14, textAlign: 'center', paddingHorizontal: 24, lineHeight: 20 },
    listCard: {
      flexDirection: 'row', borderRadius: 16, borderWidth: 1, padding: 10, gap: 12,
    },
    listImg: { width: 96, height: 96, borderRadius: 12 },
    listInfo: { flex: 1, justifyContent: 'center' },
    listType: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
    listTitle: { fontSize: 15, fontWeight: '700', marginTop: 2 },
    listLoc: { fontSize: 12, marginTop: 1 },
    listMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    listRating: { fontSize: 12, fontWeight: '500' },
    listPrice: { fontSize: 14, marginTop: 4 },
    previewCard: {
      position: 'absolute', bottom: 32, left: 16, right: 16,
      borderRadius: 20, overflow: 'hidden',
      shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.18, shadowRadius: 20, elevation: 12,
    },
    previewCardInner: { flexDirection: 'row', padding: 12, gap: 12 },
    previewImage: { width: 90, height: 90, borderRadius: 12 },
    previewInfo: { flex: 1, justifyContent: 'space-between' },
    previewTitle: { fontSize: 15, fontWeight: '700' },
    previewLocation: { fontSize: 12, marginTop: 2 },
    previewMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    previewRating: { fontSize: 12 },
    previewPriceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
    previewPrice: { fontSize: 16 },
    viewBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    viewBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
    closePreview: {
      position: 'absolute', top: 8, right: 8,
      width: 28, height: 28, borderRadius: 14,
      backgroundColor: 'rgba(0,0,0,0.06)',
      justifyContent: 'center', alignItems: 'center',
    },
    // Filter modal
    modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    filterSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 32, maxHeight: height * 0.85 },
    filterHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
    filterHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
    filterTitle: { fontSize: 17, fontWeight: '700' },
    filterReset: { fontSize: 14, fontWeight: '600' },
    filterSection: { paddingHorizontal: 20, marginBottom: 24 },
    filterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    filterLabel: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
    filterSub: { fontSize: 12, marginTop: 2 },
    filterChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 22, borderWidth: 1.5 },
    chipActive: { backgroundColor: 'rgba(13,148,136,0.08)' },
    chipText: { fontSize: 13, fontWeight: '500' },
    chipTextActive: { fontWeight: '700' },
    applyBtn: { marginHorizontal: 20, marginTop: 8, paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
    applyBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
    // Destination search modal
    searchInputWrap: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      marginHorizontal: 20, marginBottom: 16,
      paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12,
    },
    searchInput: { flex: 1, fontSize: 15 },
    suggLabel: { fontSize: 13, fontWeight: '600', paddingHorizontal: 20, marginBottom: 8 },
    suggRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1,
    },
    suggIcon: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
    suggName: { fontSize: 15, fontWeight: '600' },
    suggCountry: { fontSize: 13, marginTop: 1 },
    // Web fallback
    webTitle: { fontSize: 22, fontWeight: '800', marginTop: 16 },
    webSub: { fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
    backBtnWeb: { marginTop: 24, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  });
}
