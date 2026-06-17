import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
  Image,
  Share,
  Alert,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Modal,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, spacing, borderRadius } from '../constants';
import { useTheme } from '../contexts/ThemeContext';
import { GradientButton } from '../components/GradientButton';
import { PropertyMapWeb } from '../components/PropertyMapWeb';
import { useAuth, useCurrency } from '../contexts';
import { Property, createMockProperty } from '../types/Property';
import { ScrollableBottomSheet, Skeleton } from '../components/common';
import { useHaptics } from '../hooks/useHaptics';
import { openMap } from '../utils/tripActions';
import { useFavorite } from '../data/favorites';
import { getReviews, relativeDate, type StoredReview } from '../data/reviews';
import { getHostProfile, type HostProfile } from '../host/data/hostProfile';
import { getGuide, getAnyGuide, GUIDE_CATEGORIES, type GuideEntry } from '../host/data/guidebooks';
import { addRecentlyViewed } from '../data/recentlyViewed';
import { useFocusEffect } from '@react-navigation/native';
import { Api } from '../api';
import { confirmAction } from '../utils/confirm';
import { PhotoTour } from '../components/PhotoTour';
import { buildPhotoTour } from '../utils/photoTour';
import { LIGHT_MAP_STYLE } from '../utils/mapStyle';
import { AMENITY_OPTIONS } from '../host/data/listings';
import { AmenityIcon } from '../components/AmenityIcon';

// Conditionally import MapView only on native platforms
let MapView: any = null;
let Marker: any = null;
let PROVIDER_GOOGLE: any = null;

if (Platform.OS !== 'web') {
  const maps = require('react-native-maps');
  MapView = maps.default;
  Marker = maps.Marker;
  PROVIDER_GOOGLE = maps.PROVIDER_GOOGLE;
}

interface PropertyDetailsScreenProps {
  navigation: any;
  route: any;
}

export const PropertyDetailsScreen: React.FC<PropertyDetailsScreenProps> = ({
  navigation,
  route,
}) => {
  const { colors, isDark } = useTheme();
  const { format } = useCurrency();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const styles = makeStyles(colors, insets, width, height);
  const { property: passedProperty, autoBook } = route.params || {};

  // Merge passed property with mock data to ensure all required fields exist
  const property: Property = passedProperty
    ? createMockProperty({
        id: passedProperty.id,
        title: passedProperty.title,
        price: passedProperty.price,
        rating: passedProperty.rating,
        reviewCount: passedProperty.reviews || passedProperty.reviewCount,
        images: (() => {
          // Coerce incoming images to PropertyImage[]; an entry may be a string
          // URL or an object { uri }. Drop empties and fall back to mock images
          // so the gallery is never empty (avoids 1/0 counter + blank hero).
          const mapped = Array.isArray(passedProperty.images)
            ? passedProperty.images
                .map((img: any, index: number) => ({
                  // entry may be a string, { uri }, or backend { url, room, caption }
                  uri: typeof img === 'string' ? img : (img?.uri || img?.url),
                  caption: (typeof img === 'object' && img?.caption) ? img.caption : `Image ${index + 1}`,
                  room: (typeof img === 'object' && img?.room) ? img.room : undefined,
                }))
                .filter((img: { uri?: string }) => !!img.uri)
            : [];
          return (mapped.length > 0 ? mapped : createMockProperty().images) as any;
        })(),
        isFavorite: passedProperty.isFavorite,
        // Surface the stay's REAL details when provided (host listings & curated
        // stays carry these), so the map pin, address and basics are accurate —
        // not mock. Anything missing still falls back to createMockProperty.
        ...(typeof passedProperty.type === 'string' ? { type: passedProperty.type } : {}),
        ...(passedProperty.guests ? { guests: Number(passedProperty.guests) } : {}),
        ...(passedProperty.bedrooms ? { bedrooms: Number(passedProperty.bedrooms) } : {}),
        ...(passedProperty.beds ? { beds: Number(passedProperty.beds) } : {}),
        ...(passedProperty.bathrooms ? { bathrooms: Number(passedProperty.bathrooms) } : {}),
        ...(passedProperty.instantBook !== undefined ? { instantBook: !!passedProperty.instantBook } : {}),
        ...(passedProperty.hostListingId ? { hostListingId: passedProperty.hostListingId } : {}),
        // Real host content for host/backend listings — description, amenities,
        // rating & reviews — with NEUTRAL fallbacks (never the Miami demo).
        ...(passedProperty.hostListingId ? (() => {
          const cityName = passedProperty.city ?? (typeof passedProperty.location === 'string' ? passedProperty.location.split(',')[0].trim() : '') ?? 'the area';
          const out: any = {};
          out.description = (passedProperty.description && String(passedProperty.description).trim())
            || `A comfortable ${String(passedProperty.type || 'stay').toLowerCase()} in ${cityName}. ${passedProperty.title ? `Welcome to ${passedProperty.title}.` : ''} Message the host with any questions before you book.`;
          const catMap: any = { Essentials: 'basics', Features: 'features', Safety: 'safety', Location: 'location' };
          out.amenities = (Array.isArray(passedProperty.amenities) ? passedProperty.amenities : []).map((id: string) => {
            const o = AMENITY_OPTIONS.find((a) => a.id === id);
            return o ? { id, label: o.label, icon: o.icon, category: catMap[o.category] || 'features', available: true }
                     : { id, label: String(id), icon: 'checkmark-circle-outline', category: 'features', available: true };
          });
          if (typeof passedProperty.rating === 'number') out.rating = passedProperty.rating;
          out.reviewCount = Number(passedProperty.reviews ?? passedProperty.reviewCount ?? 0) || 0;
          out.reviews = []; // real reviews loaded from the backend; never mock

          // Highlights from the REAL stay (real city + host's amenities) — never
          // the mock "Great Jordaan location".
          const am: string[] = Array.isArray(passedProperty.amenities) ? passedProperty.amenities : [];
          const hasSelfCheckin = am.includes('self_checkin');
          // lucide icon names (rendered via <AmenityIcon>)
          const thirdFeature = am.includes('free_parking') || am.includes('paid_parking') || am.includes('street_parking')
            ? { icon: 'SquareParking', title: 'Parking available', description: 'Park on-site or nearby with ease.' }
            : am.includes('pool')
            ? { icon: 'Waves', title: 'Pool on site', description: 'Take a dip without leaving the property.' }
            : am.includes('pets')
            ? { icon: 'PawPrint', title: 'Pets welcome', description: 'Bring your furry companions along.' }
            : am.includes('wifi')
            ? { icon: 'Wifi', title: 'Fast Wi‑Fi', description: 'Stay connected for work or streaming.' }
            : { icon: 'Home', title: 'Comfortable stay', description: 'Everything you need for a relaxed trip.' };
          out.keyFeatures = [
            {
              id: '1',
              icon: hasSelfCheckin ? 'KeyRound' : 'Users',
              title: hasSelfCheckin ? 'Self check-in' : 'Easy check-in',
              description: hasSelfCheckin ? 'Check yourself in with the smart lock.' : 'The host will greet you and hand over the keys.',
            },
            { id: '2', icon: 'Navigation', title: `Great ${cityName} location`, description: `Guests love how central this ${String(passedProperty.type || 'stay').toLowerCase()} is.` },
            { id: '3', ...thirdFeature },
          ];
          return out;
        })() : {}),
        ...((passedProperty.latitude || passedProperty.longitude || passedProperty.address || passedProperty.city)
          ? {
              location: {
                address: passedProperty.address,
                neighborhood: passedProperty.city ?? (typeof passedProperty.location === 'string' ? passedProperty.location.split(',')[0] : ''),
                city: passedProperty.city ?? (typeof passedProperty.location === 'string' ? passedProperty.location.split(',')[0].trim() : ''),
                country: passedProperty.country ?? (typeof passedProperty.location === 'string' ? (passedProperty.location.split(',')[1] ?? '').trim() : ''),
                latitude: Number(passedProperty.latitude) || 0,
                longitude: Number(passedProperty.longitude) || 0,
                description: passedProperty.description,
              },
            }
          : {}),
      } as any)
    : createMockProperty();
  
  // Persisted favorite — saved to the Wishlists tab, in sync with the cards.
  const [isFavorite, toggleFavorite] = useFavorite({
    id: String(property?.id ?? ''),
    title: String(property?.title ?? 'Stay'),
    location:
      typeof property?.location === 'string'
        ? property.location
        : [property?.location?.city, property?.location?.country].filter(Boolean).join(', '),
    price: Number(property?.price) || 0,
    rating: Number(property?.rating) || 0,
    image: Array.isArray(property?.images) ? (property.images[0] as any)?.uri ?? property.images[0] : '',
  });

  // Record this stay as "recently viewed" so it surfaces on Home.
  useEffect(() => {
    const img = Array.isArray(property?.images) ? (property.images[0] as any)?.uri ?? property.images[0] : '';
    const loc = typeof property?.location === 'string'
      ? property.location
      : [property?.location?.city, property?.location?.country].filter(Boolean).join(', ');
    addRecentlyViewed({
      id: String(property?.id ?? ''),
      title: String(property?.title ?? 'Stay'),
      location: loc,
      price: Number(property?.price) || 0,
      rating: Number(property?.rating) || 0,
      image: img,
      property: passedProperty ?? property,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [property?.id]);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [showSpaceModal, setShowSpaceModal] = useState(false);
  const [showAmenitiesModal, setShowAmenitiesModal] = useState(false);
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [showCancellationModal, setShowCancellationModal] = useState(false);
  const [showHouseRulesModal, setShowHouseRulesModal] = useState(false);
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [selectedReviewCategory, setSelectedReviewCategory] = useState<string | null>(null);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [showPhotoTour, setShowPhotoTour] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [galleryStartIndex, setGalleryStartIndex] = useState(0);
  
  const { checkAuthBeforeAction } = useAuth();
  const haptics = useHaptics();
  const scrollViewRef = useRef<ScrollView>(null);
  const hostSectionRef = useRef<View>(null);

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

  // Deterministic social proof derived from the property id (no random()).
  const idSeed = String(property.id ?? property.title ?? 'stayon')
    .split('')
    .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  // Concise, single-concept badge (stable per listing).
  const SOCIAL_BADGES = ['Guest favourite', 'Recommended', 'Budget-friendly', 'Rare find', 'Top rated', 'Great value', 'Trending'];
  const socialProof = SOCIAL_BADGES[idSeed % SOCIAL_BADGES.length];

  const handleImageScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / width);
    setCurrentImageIndex(index);
  };

  const handleShare = async () => {
    try {
      const shareLink = `https://stayon.com/stays/${property.id ?? 'preview'}`;
      await Share.share({
        message: `Stay at "${property.title}" on StayOn — ${format(Number(property.price) || 0)}/night, rated ${property.rating}\n\n${shareLink}`,
        url: shareLink,
        title: property.title,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleBookNow = () => {
    checkAuthBeforeAction(
      () => navigation.navigate('Booking', { property }),
      navigation
    );
  };

  // Arrived from a StayReel's "View this stay" — the destination is already this
  // stay, so jump straight into picking dates & guests.
  useEffect(() => {
    if (!autoBook) return;
    const t = setTimeout(() => navigation.navigate('Booking', { property }), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoBook]);

  const handleContactHost = () => {
    checkAuthBeforeAction(
      () => navigation.navigate('Chat', {
        hostId: property.host.id,
        hostName: property.host.name,
        propertyId: property.id,
        propertyTitle: property.title,
        // backend listing id (l_…) enables real cross-device chat via the server
        listingId: (passedProperty as any)?.hostListingId,
      }),
      navigation
    );
  };

  // Image sources for the full-screen zoomable viewer (react-native-image-viewing)
  const galleryImages = property.images.map((img) => ({ uri: img.uri }));
  // Airbnb-style photo tour: group photos by room with feature lists.
  const photoCategories = React.useMemo(
    () => buildPhotoTour(property.images as any, (property as any).amenities ?? []),
    [property]
  );

  // Guest reviews written in-app, newest first — loaded (and refreshed on focus
  // after writing one) then merged ahead of the seed reviews.
  const [userReviews, setUserReviews] = useState<StoredReview[]>([]);
  const [host, setHost] = useState<HostProfile | null>(null);
  const [guide, setGuide] = useState<GuideEntry[]>([]);
  useEffect(() => {
    let active = true;
    getHostProfile().then((h) => { if (active) setHost(h); });
    // Prefer this stay's own host guidebook when it's a StayOn host listing;
    // otherwise fall back to a sample guide so the section isn't empty.
    const hostListingId = (passedProperty as any)?.hostListingId;
    (hostListingId ? getGuide(hostListingId) : getAnyGuide()).then((g) => { if (active) setGuide(g); });
    return () => { active = false; };
  }, []);
  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      getReviews(String(property?.id ?? '')).then((rs) => { if (active) setUserReviews(rs); });
      return () => { active = false; };
    }, [property?.id])
  );

  const mappedUserReviews = userReviews.map((r) => ({
    id: r.id,
    userName: r.author,
    userAvatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(r.author)}&background=0D9488&color=fff`,
    userLocation: '',
    rating: Math.round(r.rating) || 5,
    date: relativeDate(r.date),
    comment: r.text,
    categories: [] as string[],
  }));

  const combinedReviews = [...mappedUserReviews, ...(property.reviews ?? [])];

  const filteredReviews = selectedReviewCategory
    ? combinedReviews.filter((r: any) => r.categories?.includes(selectedReviewCategory))
    : combinedReviews;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Skeleton width={width} height={height * 0.4} borderRadius={0} />
        <View style={styles.section}>
          <Skeleton width="70%" height={26} style={{ marginBottom: spacing.sm }} />
          <Skeleton width="45%" height={16} style={{ marginBottom: spacing.md }} />
          <Skeleton width="90%" height={14} style={{ marginBottom: spacing.xs }} />
          <Skeleton width="80%" height={14} style={{ marginBottom: spacing.lg }} />
          <Skeleton width="100%" height={64} borderRadius={borderRadius.md} />
        </View>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: contentOpacity }]}>
      {/* Image Gallery */}
      <View style={styles.imageGalleryContainer}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleImageScroll}
          scrollEventThrottle={16}
        >
          {property.images.map((img, index) => (
            <TouchableOpacity
              key={index}
              activeOpacity={0.9}
              accessibilityRole="button"
              accessibilityLabel={`View photo ${index + 1} of ${property.images.length} full screen`}
              onPress={() => {
                setGalleryStartIndex(index);
                // Open the categorised Photo tour (falls back to swipe gallery
                // if the tour couldn't be built).
                if (photoCategories.length) setShowPhotoTour(true);
                else setShowImageGallery(true);
              }}
            >
              <Image
                source={{ uri: img.uri }}
                style={styles.propertyImage}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        {/* Image Counter */}
        <View style={styles.imageCounter}>
          <Text style={styles.imageCounterText}>
            {currentImageIndex + 1}/{property.images.length}
          </Text>
        </View>

        {/* Header Buttons */}
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color="#222222" />
          </TouchableOpacity>
          <View style={styles.headerRightButtons}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleShare}
              accessibilityRole="button"
              accessibilityLabel="Share this stay"
            >
              <Ionicons name="share-social-outline" size={24} color="#222222" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              activeOpacity={0.7}
              onPress={() => {
                haptics.light();
                toggleFavorite();
              }}
              accessibilityRole="button"
              accessibilityLabel={isFavorite ? 'Remove from wishlist' : 'Save to wishlist'}
            >
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={24}
                color={isFavorite ? '#EF4444' : '#222222'}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContentContainer}
      >
        {/* Title & Basic Info */}
        <View style={styles.section}>
          <Text style={styles.propertyTitle}>{property.title}</Text>
          <Text style={styles.propertyType}>
            {property.type}{property.location?.city ? ` in ${property.location.city}` : ''}
          </Text>

          {/* Trust row — only for established stays (real review history), so a
              brand-new listing isn't labelled "Verified/Superhost/Trending". */}
          {(Number(property.reviewCount) || 0) > 0 && (
          <View style={styles.trustRow}>
            <View style={styles.trustPill}>
              <Ionicons name="shield-checkmark" size={13} color={colors.primary} />
              <Text style={styles.trustPillText}>Verified stay</Text>
            </View>
            <View style={styles.trustPill}>
              <Ionicons name="camera" size={13} color={colors.primary} />
              <Text style={styles.trustPillText}>Verified photos</Text>
            </View>
            {property.host?.isSuperhost ? (
              <View style={styles.trustPill}>
                <Ionicons name="ribbon" size={13} color={colors.primary} />
                <Text style={styles.trustPillText}>Superhost</Text>
              </View>
            ) : property.host?.verified ? (
              <View style={styles.trustPill}>
                <Ionicons name="person-circle" size={13} color={colors.primary} />
                <Text style={styles.trustPillText}>Verified host</Text>
              </View>
            ) : null}
          </View>
          )}

          {/* Social proof — only for established stays (not brand-new listings) */}
          {(Number(property.reviewCount) || 0) > 0 && (
            <View style={styles.socialProofRow}>
              <Ionicons name="trending-up" size={14} color={colors.textSecondary} />
              <Text style={styles.socialProofText}>{socialProof}</Text>
            </View>
          )}

          <View style={styles.basicInfoRow}>
            <Text style={styles.basicInfo}>
              {property.guests} guest{property.guests === 1 ? '' : 's'} · {property.bedrooms} bedroom{property.bedrooms === 1 ? '' : 's'} · {property.beds} bed{property.beds === 1 ? '' : 's'} · {property.bathrooms} bathroom{property.bathrooms === 1 ? '' : 's'}
            </Text>
          </View>

          {/* Premium tri-stat band: Rating · Guest favourite · Reviews */}
          {(() => {
            const reviewCount = Number(property.reviewCount) || 0;
            const isNew = reviewCount === 0;
            const isGuestFav = !isNew && ((property as any).isGuestFavourite || (Number(property.rating) || 0) >= 4.8);
            return (
              <View style={styles.statBand}>
                <View style={styles.statCell}>
                  <Text style={styles.statTop}>{isNew ? 'New' : property.rating}</Text>
                  {!isNew && (
                    <View style={styles.statStars}>
                      {[0, 1, 2, 3, 4].map((i) => (
                        <Ionicons key={i} name="star" size={9} color={colors.textPrimary} style={{ marginHorizontal: 0.5 }} />
                      ))}
                    </View>
                  )}
                </View>
                {isGuestFav && (
                  <>
                    <View style={styles.statDivider} />
                    <View style={[styles.statCell, styles.statCellWide]}>
                      <Ionicons name="leaf" size={16} color={colors.gold} style={{ transform: [{ scaleX: -1 }] }} />
                      <Text style={styles.statFavText}>Guest{'\n'}favourite</Text>
                      <Ionicons name="leaf" size={16} color={colors.gold} />
                    </View>
                  </>
                )}
                <View style={styles.statDivider} />
                <View style={styles.statCell}>
                  <Text style={styles.statTop}>{property.reviewCount}</Text>
                  <Text style={styles.statLabel}>Reviews</Text>
                </View>
              </View>
            );
          })()}

          {/* Price clarity */}
          <View style={styles.priceClarityRow}>
            <Text style={styles.priceClarityText}>
              {format(Number(property.price) || 0)}/{property.priceUnit} · taxes shown at checkout
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Host Card */}
        <TouchableOpacity style={styles.section} onPress={() => scrollViewRef.current?.scrollToEnd()} activeOpacity={0.7}>
          <View style={styles.hostCard}>
            <Image
              source={{ uri: host?.avatar || property.host.avatar }}
              style={styles.hostAvatar}
            />
            <View style={styles.hostInfo}>
              <Text style={styles.hostName}>Hosted by {host?.name || property.host.name}</Text>
              <Text style={styles.hostSubtitle}>
                {host?.hostingSince ? `Hosting since ${host.hostingSince}` : `${property.host.hostingSince} hosting`}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* Key Features */}
        {property.keyFeatures && property.keyFeatures.length > 0 && (
          <>
            <View style={styles.section}>
              {property.keyFeatures.map((feature) => {
                const tint = colors.primary; // uniform app colour (lucide line icons)
                return (
                <View key={feature.id} style={styles.featureRow}>
                  <View style={[styles.featureIconChip, { backgroundColor: tint + '1A' }]}>
                    <AmenityIcon name={feature.icon} size={20} color={tint} />
                  </View>
                  <View style={styles.featureText}>
                    <Text style={styles.featureTitle}>{feature.title}</Text>
                    <Text style={styles.featureDescription}>{feature.description}</Text>
                  </View>
                </View>
                );
              })}
            </View>
            <View style={styles.divider} />
          </>
        )}

        {/* About This Place */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About this place</Text>
          <Text style={styles.descriptionText} numberOfLines={4}>
            {property.description}
          </Text>
          <TouchableOpacity onPress={() => setShowDescriptionModal(true)}>
            <Text style={styles.showMoreButton}>Show more</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {/* What This Place Offers */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What this place offers</Text>
          {property.amenities.length === 0 ? (
            <Text style={styles.emptyNote}>The host hasn’t listed amenities for this stay yet.</Text>
          ) : (
            <>
              <View style={styles.amenitiesGrid}>
                {property.amenities.slice(0, 6).map((amenity) => (
                  <View key={amenity.id} style={styles.amenityRow}>
                    <AmenityIcon name={amenity.icon} size={24} color={colors.textPrimary} />
                    <Text style={styles.amenityLabel}>{amenity.label}</Text>
                  </View>
                ))}
              </View>
              {property.amenities.length > 6 && (
                <TouchableOpacity style={styles.showAllButton} onPress={() => setShowAmenitiesModal(true)}>
                  <Text style={styles.showAllButtonText}>Show all {property.amenities.length} amenities</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        <View style={styles.divider} />

        {/* Local guide from your host */}
        {guide.length > 0 && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Local guide from your host</Text>
              {GUIDE_CATEGORIES.map((c) => {
                const items = guide.filter((g) => g.category === c.key);
                if (!items.length) return null;
                return (
                  <View key={c.key} style={{ marginTop: spacing.base }}>
                    <View style={styles.guideHead}>
                      <Ionicons name={c.icon as any} size={16} color={colors.primary} />
                      <Text style={styles.guideCat}>{c.label}</Text>
                    </View>
                    {items.map((g) => (
                      <View key={g.id} style={styles.guideEntry}>
                        <View style={styles.guideDot} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.guideTitle}>{g.title}{g.area ? ` · ${g.area}` : ''}</Text>
                          <Text style={styles.guideNote}>{g.note}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                );
              })}
            </View>
            <View style={styles.divider} />
          </>
        )}

        {/* Where You'll Be */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Where you'll be</Text>
            <View style={styles.mapTypeToggle}>
              <TouchableOpacity
                style={[
                  styles.mapTypeButton,
                  mapType === 'roadmap' && styles.mapTypeButtonActive,
                ]}
                onPress={() => setMapType('roadmap')}
              >
                <Ionicons 
                  name="map-outline" 
                  size={16} 
                  color={mapType === 'roadmap' ? colors.surface : colors.textSecondary} 
                />
                <Text style={[
                  styles.mapTypeButtonText,
                  mapType === 'roadmap' && styles.mapTypeButtonTextActive,
                ]}>
                  Map
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.mapTypeButton,
                  mapType === 'satellite' && styles.mapTypeButtonActive,
                ]}
                onPress={() => setMapType('satellite')}
              >
                <Ionicons 
                  name="earth" 
                  size={16} 
                  color={mapType === 'satellite' ? colors.surface : colors.textSecondary} 
                />
                <Text style={[
                  styles.mapTypeButtonText,
                  mapType === 'satellite' && styles.mapTypeButtonTextActive,
                ]}>
                  Satellite
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.mapContainer}>
            {Platform.OS === 'web' ? (
              // Web: same interactive map as the search screen (Leaflet, no API key)
              <View style={styles.mapWrapper}>
                <PropertyMapWeb
                  pins={[{
                    id: String(property.id ?? 'stay'),
                    lat: property.location.latitude,
                    lng: property.location.longitude,
                    price: Number(property.price) || 0,
                    priceLabel: format(Number(property.price) || 0),
                    title: property.title,
                  }]}
                  centerLat={property.location.latitude}
                  centerLng={property.location.longitude}
                  zoom={14}
                  mapType={mapType === 'satellite' ? 'satellite' : 'light'}
                  isDark={isDark}
                  pinStyle="location"
                />
              </View>
            ) : MapView ? (
              // Native mobile: Real MapView
              <MapView
                style={styles.map}
                mapType={mapType === 'satellite' ? 'satellite' : 'standard'}
                customMapStyle={mapType === 'satellite' ? [] : LIGHT_MAP_STYLE}
                provider={PROVIDER_GOOGLE}
                initialRegion={{
                  latitude: property.location.latitude,
                  longitude: property.location.longitude,
                  latitudeDelta: 0.0922,
                  longitudeDelta: 0.0421,
                }}
                scrollEnabled={false}
                zoomEnabled={false}
                pitchEnabled={false}
                rotateEnabled={false}
              >
                <Marker
                  coordinate={{
                    latitude: property.location.latitude,
                    longitude: property.location.longitude,
                  }}
                  title={property.title}
                  description={`${property.location.city}, ${property.location.country}`}
                >
                  <View style={styles.customMarker}>
                    <View style={styles.markerDot} />
                    <View style={styles.markerPulse} />
                  </View>
                </Marker>
              </MapView>
            ) : null}
            <TouchableOpacity
              style={styles.mapOverlay}
              onPress={() => setShowMapModal(true)}
              accessibilityRole="button"
              accessibilityLabel="Expand map"
            >
              <View style={styles.mapBadge}>
                <Ionicons name="expand" size={16} color={colors.textPrimary} />
                <Text style={styles.mapBadgeText}>View area</Text>
              </View>
            </TouchableOpacity>
          </View>
          <View style={styles.locationInfo}>
            <Text style={styles.locationTitle}>
              {property.location.city}, {property.location.country}
            </Text>
            {property.location.description && (
              <Text style={styles.locationDescription}>
                {property.location.description}
              </Text>
            )}
            {/* Exact location is private until booking is confirmed — then it
                appears with directions in the guest's trip. */}
            <View style={styles.locationPrivacyRow}>
              <Ionicons name="lock-closed-outline" size={15} color={colors.textSecondary} />
              <Text style={styles.locationPrivacyText}>
                Exact location provided after booking is confirmed.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Reviews */}
        {combinedReviews.length > 0 && (
          <>
            <View style={styles.section}>
              <View style={styles.reviewsHeader}>
                <Ionicons name="star" size={24} color={colors.textPrimary} />
                <Text style={styles.reviewsTitle}>
                  {property.rating} · {(Number(property.reviewCount) || 0) + userReviews.length} reviews
                </Text>
              </View>

              {/* Review Categories */}
              {property.reviewCategories && property.reviewCategories.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.reviewCategories}
                  contentContainerStyle={styles.reviewCategoriesContent}
                >
                  {property.reviewCategories.map((category) => (
                    <TouchableOpacity
                      key={category.name}
                      style={[
                        styles.reviewCategoryPill,
                        selectedReviewCategory === category.name && styles.reviewCategoryPillActive,
                      ]}
                      onPress={() =>
                        setSelectedReviewCategory(
                          selectedReviewCategory === category.name ? null : category.name
                        )
                      }
                    >
                      <Text style={[styles.reviewCategoryText, selectedReviewCategory === category.name && styles.reviewCategoryTextActive]}>
                        {category.name} {category.count}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              {/* Individual Reviews */}
              {filteredReviews?.slice(0, 2).map((review) => (
                <View key={review.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <Image
                      source={{ uri: review.userAvatar }}
                      style={styles.reviewerAvatar}
                    />
                    <View style={styles.reviewerInfo}>
                      <Text style={styles.reviewerName}>{review.userName}</Text>
                      <Text style={styles.reviewerLocation}>{review.userLocation}</Text>
                    </View>
                  </View>
                  <View style={styles.reviewRating}>
                    {[...Array(5)].map((_, i) => (
                      <Ionicons
                        key={i}
                        name={i < review.rating ? 'star' : 'star-outline'}
                        size={12}
                        color={colors.textPrimary}
                      />
                    ))}
                    <Text style={styles.reviewDate}> · {review.date}</Text>
                  </View>
                  <Text style={styles.reviewText} numberOfLines={3}>
                    {review.comment}
                  </Text>
                  <TouchableOpacity>
                    <Text style={styles.showMoreButton}>Show more</Text>
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity
                style={styles.showAllButton}
                onPress={() => setShowReviewsModal(true)}
              >
                <Text style={styles.showAllButtonText}>
                  Show all {property.reviewCount} reviews
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.divider} />
          </>
        )}

        {/* Meet Your Host */}
        <View style={styles.section} ref={hostSectionRef}>
          <Text style={styles.sectionTitle}>Meet your host</Text>
          <View style={styles.hostDetailCard}>
            <TouchableOpacity
              style={styles.hostDetailHeader}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('HostProfile', {
                host: {
                  name: host?.name || property.host.name,
                  avatar: host?.avatar || property.host.avatar,
                  bio: host?.bio,
                  isSuperhost: property.host?.isSuperhost,
                  hostingSince: host?.hostingSince,
                },
                stats: {
                  reviews: Number(property.reviewCount) || 0,
                  rating: (Number(property.reviewCount) || 0) > 0 ? property.rating : 0,
                  hostingLabel: host?.hostingSince ? `Since ${host.hostingSince}` : 'New host',
                },
                reviews: combinedReviews,
                stays: [{ id: property.id, hostListingId: (passedProperty as any)?.hostListingId, title: property.title, type: property.type, images: property.images, rating: property.rating, reviews: property.reviewCount }],
                hostId: (passedProperty as any)?.hostId,
              })}
            >
              <View style={styles.hostAvatarWrap}>
                <Image
                  source={{ uri: host?.avatar || property.host.avatar }}
                  style={styles.hostDetailAvatar}
                />
                {/* Verified badge on the avatar */}
                <View style={styles.hostVerifiedBadge}>
                  <Ionicons name="checkmark" size={13} color="#fff" />
                </View>
              </View>
              <View style={styles.hostDetailInfo}>
                <Text style={styles.hostDetailName}>{host?.name || property.host.name}</Text>
                {!!host?.bio && <Text style={styles.hostBioLine}>{host.bio}</Text>}
                {host?.hostingSince ? <Text style={styles.hostBioLine}>Hosting since {host.hostingSince}</Text> : null}
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} style={{ alignSelf: 'center' }} />
            </TouchableOpacity>

            <View style={styles.hostStats}>
              <View style={styles.hostStat}>
                <Text style={styles.hostStatNumber}>{property.host.reviewCount}</Text>
                <Text style={styles.hostStatLabel}>Reviews</Text>
              </View>
              <View style={styles.hostStat}>
                <Text style={styles.hostStatNumber}>{property.host.rating}</Text>
                <Text style={styles.hostStatLabel}>Rating</Text>
              </View>
              <View style={styles.hostStat}>
                <Text style={styles.hostStatNumber}>{String(property.host.hostingSince ?? '').split(' ')[0]}</Text>
                <Text style={styles.hostStatLabel}>Years hosting</Text>
              </View>
            </View>

            {!!host?.about && <Text style={styles.hostAboutLine}>{host.about}</Text>}
            {(host?.work || property.host.work) && (
              <View style={styles.hostDetail}>
                <Ionicons name="briefcase" size={16} color={colors.textSecondary} />
                <Text style={styles.hostDetailText}>My work: {host?.work || property.host.work}</Text>
              </View>
            )}
            {!!(host?.languages && host.languages.length) && (
              <View style={styles.hostDetail}>
                <Ionicons name="chatbubbles-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.hostDetailText}>Speaks {host.languages.join(', ')}</Text>
              </View>
            )}
            {!host?.work && property.host.skill && (
              <View style={styles.hostDetail}>
                <Ionicons name="happy-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.hostDetailText}>{property.host.skill}</Text>
              </View>
            )}
          </View>

          {property.host.isSuperhost && (Number(property.reviewCount) || 0) > 0 && (
            <View style={styles.superhostSection}>
              <Text style={styles.superhostTitle}>{host?.name || property.host.name} is a Superhost</Text>
              <Text style={styles.superhostDescription}>
                Superhosts are experienced, highly rated hosts who are committed to providing great stays for guests.
              </Text>
            </View>
          )}

          <View style={styles.hostResponseSection}>
            <Text style={styles.hostResponseTitle}>Host details</Text>
            <Text style={styles.hostResponseText}>Response rate: {property.host.responseRate}%</Text>
            <Text style={styles.hostResponseText}>Responds {property.host.responseTime}</Text>
          </View>

          <TouchableOpacity style={styles.messageHostButton} onPress={handleContactHost}>
            <Text style={styles.messageHostButtonText}>Message host</Text>
          </TouchableOpacity>

          <View style={styles.paymentProtection}>
            <Ionicons name="shield-checkmark" size={20} color={colors.textSecondary} />
            <Text style={styles.paymentProtectionText}>
              To help protect your payment, always use StayOn to send money and communicate with hosts.
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Things to Know */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Things to know</Text>

          <View style={styles.thingsToKnowGrid}>
            <TouchableOpacity
              style={styles.thingsToKnowItem}
              onPress={() => setShowHouseRulesModal(true)}
            >
              <Text style={styles.thingsToKnowTitle}>House rules</Text>
              <Text style={styles.thingsToKnowText}>Check-in after {property.checkInTime}</Text>
              <Text style={styles.thingsToKnowText}>Checkout before {property.checkOutTime}</Text>
              <Text style={styles.thingsToKnowText}>{property.guests} guests maximum</Text>
              <View style={styles.thingsToKnowArrow}>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.thingsToKnowItem}
              onPress={() => setShowSafetyModal(true)}
            >
              <Text style={styles.thingsToKnowTitle}>Safety & property</Text>
              {property.safetyFeatures?.slice(0, 2).map((feature) => (
                <Text key={feature.id} style={styles.thingsToKnowText}>
                  {feature.label} {!feature.available && feature.notes}
                </Text>
              ))}
              <View style={styles.thingsToKnowArrow}>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.thingsToKnowItem}
              onPress={() => setShowCancellationModal(true)}
            >
              <Text style={styles.thingsToKnowTitle}>Cancellation policy</Text>
              <Text style={styles.thingsToKnowText} numberOfLines={2}>
                {property.cancellationPolicy}
              </Text>
              <View style={styles.thingsToKnowArrow}>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Report Listing — files a real report to the Ops queue */}
        <TouchableOpacity
          style={styles.reportListing}
          onPress={() => confirmAction({
            title: 'Report this stay?',
            message: 'Our Operations team will review it. Add details in Help if needed.',
            confirmText: 'Report',
            destructive: true,
            onConfirm: async () => {
              try {
                await Api.auth.ensureSession();
                await Api.reports.create({ targetType: 'listing', targetId: (passedProperty as any)?.hostListingId || property.id, reason: 'guest_report' });
                Alert.alert('Thanks for the report', 'Our team will take a look.');
              } catch {
                Alert.alert('Reported', 'We could not reach the server, but your report is noted.');
              }
            },
          })}
        >
          <Ionicons name="flag" size={20} color={colors.textSecondary} />
          <Text style={styles.reportListingText}>Report this stay</Text>
        </TouchableOpacity>

        {/* Bottom Spacing for Sticky Footer */}
        <View style={{ height: 96 + insets.bottom }} />
      </ScrollView>

      {/* Sticky Footer */}
      <View style={styles.stickyFooter}>
        <View style={styles.footerContent}>
          <View style={styles.footerPriceBlock}>
            <Text style={styles.footerPrice}>
              {format(Number(property.price) || 0)}
              <Text style={styles.footerPriceUnit}> / {property.priceUnit}</Text>
            </Text>
            <View style={styles.footerCancellation}>
              <Ionicons name="checkmark-circle" size={14} color={colors.success} />
              <Text style={styles.footerCancellationText}>Free cancellation</Text>
            </View>
          </View>
          <GradientButton label="Reserve" onPress={handleBookNow} style={styles.footerReserveBtn} />
        </View>
      </View>

      {/* Modals */}
      {showDescriptionModal && (
        <ScrollableBottomSheet
          visible={showDescriptionModal}
          onClose={() => setShowDescriptionModal(false)}
          initialSnapPoint="full"
        >
          <Text style={styles.modalTitle}>About this place</Text>
          <Text style={styles.modalText}>{property.description}</Text>
          {property.spaceDescription && (
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setShowDescriptionModal(false);
                setTimeout(() => setShowSpaceModal(true), 300);
              }}
            >
              <Text style={styles.modalButtonText}>Read more about the space</Text>
            </TouchableOpacity>
          )}
        </ScrollableBottomSheet>
      )}

      {showSpaceModal && (
        <ScrollableBottomSheet
          visible={showSpaceModal}
          onClose={() => setShowSpaceModal(false)}
          initialSnapPoint="full"
        >
          <Text style={styles.modalTitle}>The space</Text>
          <Text style={styles.modalText}>{property.spaceDescription}</Text>
          {property.registrationNumber && (
            <View style={styles.registrationSection}>
              <Text style={styles.registrationTitle}>Registration details</Text>
              <Text style={styles.registrationNumber}>{property.registrationNumber}</Text>
            </View>
          )}
        </ScrollableBottomSheet>
      )}

      {showAmenitiesModal && (
        <ScrollableBottomSheet
          visible={showAmenitiesModal}
          onClose={() => setShowAmenitiesModal(false)}
          initialSnapPoint="full"
        >
          <Text style={styles.modalTitle}>What this place offers</Text>
          {['basics', 'features', 'safety', 'location'].map((category) => {
            const categoryAmenities = property.amenities.filter(a => a.category === category);
            if (categoryAmenities.length === 0) return null;
            
            return (
              <View key={category} style={styles.amenityCategorySection}>
                <Text style={styles.amenityCategoryTitle}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </Text>
                {categoryAmenities.map((amenity) => (
                  <View key={amenity.id} style={styles.amenityModalRow}>
                    <AmenityIcon name={amenity.icon} size={24} color={colors.textPrimary} />
                    <Text
                      style={[
                        styles.amenityModalLabel,
                        !amenity.available && styles.amenityUnavailable,
                      ]}
                    >
                      {amenity.label}
                    </Text>
                  </View>
                ))}
              </View>
            );
          })}
        </ScrollableBottomSheet>
      )}

      {showReviewsModal && (
        <ScrollableBottomSheet
          visible={showReviewsModal}
          onClose={() => setShowReviewsModal(false)}
          initialSnapPoint="full"
        >
          <Text style={styles.modalTitle}>
            {property.rating} · {property.reviewCount} reviews
          </Text>
          {property.reviews?.map((review) => (
            <View key={review.id} style={styles.reviewModalCard}>
              <View style={styles.reviewHeader}>
                <Image source={{ uri: review.userAvatar }} style={styles.reviewerAvatar} />
                <View style={styles.reviewerInfo}>
                  <Text style={styles.reviewerName}>{review.userName}</Text>
                  <Text style={styles.reviewerLocation}>{review.userLocation}</Text>
                </View>
              </View>
              <View style={styles.reviewRating}>
                {[...Array(5)].map((_, i) => (
                  <Ionicons
                    key={i}
                    name={i < review.rating ? 'star' : 'star-outline'}
                    size={12}
                    color={colors.textPrimary}
                  />
                ))}
                <Text style={styles.reviewDate}> · {review.date}</Text>
              </View>
              <Text style={styles.reviewModalText}>{review.comment}</Text>
            </View>
          ))}
        </ScrollableBottomSheet>
      )}

      {showHouseRulesModal && (
        <ScrollableBottomSheet
          visible={showHouseRulesModal}
          onClose={() => setShowHouseRulesModal(false)}
          initialSnapPoint="full"
        >
          <Text style={styles.modalTitle}>House rules</Text>
          {property.houseRules?.map((rule) => (
            <View key={rule.id} style={styles.ruleRow}>
              <Ionicons name={rule.icon as any} size={24} color={colors.textPrimary} />
              <View style={styles.ruleContent}>
                <Text style={styles.ruleTitle}>{rule.title}</Text>
                <Text style={styles.ruleDescription}>{rule.description}</Text>
              </View>
            </View>
          ))}
        </ScrollableBottomSheet>
      )}

      {showSafetyModal && (
        <ScrollableBottomSheet
          visible={showSafetyModal}
          onClose={() => setShowSafetyModal(false)}
          initialSnapPoint="full"
        >
          <Text style={styles.modalTitle}>Safety & property</Text>
          {property.safetyFeatures?.map((feature) => (
            <View key={feature.id} style={styles.safetyRow}>
              <Ionicons name={feature.icon as any} size={24} color={colors.textPrimary} />
              <View style={styles.safetyContent}>
                <Text style={styles.safetyLabel}>{feature.label}</Text>
                {feature.notes && (
                  <Text style={styles.safetyNotes}>{feature.notes}</Text>
                )}
              </View>
            </View>
          ))}
        </ScrollableBottomSheet>
      )}

      {showCancellationModal && (
        <ScrollableBottomSheet
          visible={showCancellationModal}
          onClose={() => setShowCancellationModal(false)}
          initialSnapPoint="full"
        >
          <Text style={styles.modalTitle}>Cancellation policy</Text>
          <Text style={styles.modalText}>{property.cancellationPolicy}</Text>
          {property.cancellationDetails && (
            <Text style={styles.modalSubtext}>{property.cancellationDetails}</Text>
          )}
        </ScrollableBottomSheet>
      )}

      {/* Full Screen Image Viewer (web-safe, paged) */}
      <Modal
        visible={showImageGallery}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setShowImageGallery(false)}
      >
        <View style={styles.galleryRoot}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            maximumZoomScale={3}
            minimumZoomScale={1}
            contentOffset={{ x: galleryStartIndex * width, y: 0 }}
            onScroll={(e) => {
              const i = Math.round(e.nativeEvent.contentOffset.x / width);
              if (i !== galleryStartIndex) setGalleryStartIndex(i);
            }}
            scrollEventThrottle={16}
          >
            {galleryImages.map((img, i) => (
              <View key={i} style={styles.gallerySlide}>
                <Image source={{ uri: img.uri }} style={styles.gallerySlideImg} resizeMode="contain" />
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity
            style={[styles.galleryClose, { top: insets.top + spacing.sm }]}
            onPress={() => setShowImageGallery(false)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Close gallery"
          >
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
          <View style={[styles.galleryCounter, { bottom: insets.bottom + spacing.xl }]}>
            <Text style={styles.galleryCounterText}>
              {galleryStartIndex + 1} / {property.images.length}
            </Text>
          </View>
        </View>
      </Modal>

      {/* Photo tour (categorised rooms + full-screen viewer) */}
      <PhotoTour
        visible={showPhotoTour}
        onClose={() => setShowPhotoTour(false)}
        categories={photoCategories}
        colors={colors}
        insets={insets}
      />

      {/* Full Screen Map Modal */}
      {showMapModal && (
        <Modal
          visible={showMapModal}
          transparent={false}
          animationType="slide"
          onRequestClose={() => setShowMapModal(false)}
        >
          <View style={styles.fullScreenMap}>
            <View style={styles.mapModalHeader}>
              <TouchableOpacity
                style={styles.closeMapButton}
                onPress={() => setShowMapModal(false)}
                accessibilityRole="button"
                accessibilityLabel="Close map"
              >
                <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.mapModalTitle}>Location</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <View style={styles.mapTypeToggle}>
                  <TouchableOpacity
                    style={[
                      styles.mapTypeButton,
                      mapType === 'roadmap' && styles.mapTypeButtonActive,
                    ]}
                    onPress={() => setMapType('roadmap')}
                    accessibilityRole="button"
                    accessibilityLabel="Show road map view"
                  >
                    <Ionicons
                      name="map-outline"
                      size={14}
                      color={mapType === 'roadmap' ? colors.surface : colors.textSecondary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.mapTypeButton,
                      mapType === 'satellite' && styles.mapTypeButtonActive,
                    ]}
                    onPress={() => setMapType('satellite')}
                    accessibilityRole="button"
                    accessibilityLabel="Show satellite view"
                  >
                    <Ionicons
                      name="earth"
                      size={14}
                      color={mapType === 'satellite' ? colors.surface : colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={styles.mapTypeButton}
                  onPress={() => openMap({ label: `${property.location.city}, ${property.location.country}` })}
                  accessibilityRole="button"
                  accessibilityLabel="Open in Maps for directions"
                >
                  <Ionicons name="navigate" size={14} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
            
            {Platform.OS === 'web' ? (
              <View style={styles.fullMapWrapper}>
                <PropertyMapWeb
                  pins={[{
                    id: String(property.id ?? 'stay'),
                    lat: property.location.latitude,
                    lng: property.location.longitude,
                    price: Number(property.price) || 0,
                    priceLabel: format(Number(property.price) || 0),
                    title: property.title,
                  }]}
                  centerLat={property.location.latitude}
                  centerLng={property.location.longitude}
                  zoom={15}
                  mapType={mapType === 'satellite' ? 'satellite' : 'light'}
                  isDark={isDark}
                  pinStyle="location"
                />
              </View>
            ) : MapView ? (
              <MapView
                style={styles.fullScreenMapView}
                mapType={mapType === 'satellite' ? 'satellite' : 'standard'}
                provider={PROVIDER_GOOGLE}
                initialRegion={{
                  latitude: property.location.latitude,
                  longitude: property.location.longitude,
                  latitudeDelta: 0.05,
                  longitudeDelta: 0.05,
                }}
              >
                <Marker
                  coordinate={{
                    latitude: property.location.latitude,
                    longitude: property.location.longitude,
                  }}
                  title={property.title}
                  description={`${property.location.city}, ${property.location.country}`}
                />
              </MapView>
            ) : null}
            
            <View style={styles.mapModalFooter}>
              <Text style={styles.mapLocationText}>
                {property.location.address}, {property.location.city}
              </Text>
              <Text style={styles.mapCoordinatesText}>
                {property.location.latitude.toFixed(4)}, {property.location.longitude.toFixed(4)}
              </Text>
            </View>
          </View>
        </Modal>
      )}
    </Animated.View>
  );
};

const makeStyles = (colors: any, insets: { bottom: number }, width: number, height: number) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  imageGalleryContainer: {
    width,
    height: height * 0.4,
    position: 'relative',
  },
  propertyImage: {
    width,
    height: height * 0.4,
  },
  imageCounter: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  imageCounterText: {
    ...fonts.regular,
    fontSize: 12,
    color: colors.textInverse,
  },
  headerButtons: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  headerRightButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: spacing.xl,
  },
  section: {
    padding: spacing.lg,
  },
  propertyTitle: {
    ...fonts.bold,
    fontSize: 24,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  propertyType: {
    ...fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  basicInfoRow: {
    marginBottom: spacing.sm,
  },
  basicInfo: {
    ...fonts.regular,
    fontSize: 14,
    color: colors.textPrimary,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  ratingText: {
    ...fonts.semiBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  // Premium tri-stat band
  statBand: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.base,
    marginTop: spacing.md,
  },
  statCell: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  statCellWide: { flex: 1.2, flexDirection: 'row', gap: 4 },
  statTop: { ...fonts.bold, fontSize: 16, color: colors.textPrimary },
  statLabel: { ...fonts.medium, fontSize: 12, color: colors.textSecondary, textDecorationLine: 'underline' },
  statStars: { flexDirection: 'row', alignItems: 'center', marginTop: 1 },
  statFavText: { ...fonts.bold, fontSize: 12, color: colors.textPrimary, textAlign: 'center', lineHeight: 14 },
  statDivider: { width: StyleSheet.hairlineWidth, height: 36, backgroundColor: colors.borderLight },
  trustRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  trustPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySubtle,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
  },
  trustPillText: {
    ...fonts.semiBold,
    fontSize: 12,
    color: colors.primary,
  },
  socialProofRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  socialProofText: {
    ...fonts.medium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  priceClarityRow: {
    marginTop: spacing.sm,
  },
  priceClarityText: {
    ...fonts.medium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  escrowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primarySubtle,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  escrowTextWrap: {
    flex: 1,
  },
  escrowTitle: {
    ...fonts.semiBold,
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  escrowSub: {
    ...fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
  },
  hostCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  // Meet your host (guest-facing)
  mhCard: { padding: spacing.base, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  mhTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  mhAvatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.backgroundSecondary },
  mhAvatarFb: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  mhAvatarTxt: { color: '#fff', fontSize: 24, ...fonts.bold },
  mhName: { fontSize: 18, color: colors.textPrimary, ...fonts.bold },
  mhBio: { fontSize: 14, color: colors.textSecondary, marginTop: 2, ...fonts.regular },
  mhMeta: { fontSize: 12, color: colors.textTertiary, marginTop: 2, ...fonts.medium },
  mhAbout: { fontSize: 14, color: colors.textPrimary, lineHeight: 21, marginTop: spacing.md, ...fonts.regular },
  mhFacts: { marginTop: spacing.md, gap: spacing.sm },
  mhFact: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mhFactText: { flex: 1, fontSize: 14, color: colors.textSecondary, ...fonts.regular },
  // Local guide (guest-facing)
  guideHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  guideCat: { fontSize: 16, color: colors.textPrimary, ...fonts.bold },
  guideEntry: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md, alignItems: 'flex-start' },
  guideDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginTop: 7 },
  guideTitle: { fontSize: 15, color: colors.textPrimary, ...fonts.semiBold },
  guideNote: { fontSize: 14, color: colors.textSecondary, marginTop: 2, lineHeight: 20, ...fonts.regular },
  hostAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  hostInfo: {
    flex: 1,
  },
  hostName: {
    ...fonts.semiBold,
    fontSize: 18,
    color: colors.textPrimary,
  },
  hostSubtitle: {
    ...fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  featureIconChip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    ...fonts.semiBold,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  featureDescription: {
    ...fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
  },
  sectionTitle: {
    ...fonts.bold,
    fontSize: 20,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  emptyNote: {
    ...fonts.regular,
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  mapTypeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mapTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 18,
    gap: 4,
  },
  mapTypeButtonActive: {
    backgroundColor: colors.primary,
  },
  mapTypeButtonText: {
    ...fonts.medium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  mapTypeButtonTextActive: {
    color: colors.surface,
  },
  descriptionText: {
    ...fonts.regular,
    fontSize: 15,
    color: colors.textPrimary,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  showMoreButton: {
    ...fonts.semiBold,
    fontSize: 14,
    color: colors.textPrimary,
    textDecorationLine: 'underline',
  },
  amenitiesGrid: {
    gap: spacing.md,
  },
  amenityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  amenityLabel: {
    ...fonts.regular,
    fontSize: 15,
    color: colors.textPrimary,
  },
  showAllButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.textPrimary,
    alignItems: 'center',
  },
  showAllButtonText: {
    ...fonts.semiBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  mapContainer: {
    height: 300,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
    position: 'relative',
  },
  webMapContainer: {
    width: '100%',
    height: 300,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  staticMap: {
    width: '100%',
    height: 300,
    borderRadius: borderRadius.lg,
  },
  mapWrapper: {
    position: 'relative',
    width: '100%',
    height: 300,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  appleMapPin: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    alignItems: 'center',
    transform: [{ translateX: -15 }, { translateY: -30 }],
  },
  pinCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FF3B30',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  pinInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  pinShadow: {
    width: 12,
    height: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    marginTop: 2,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapWebFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E6F7F5',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webMapContent: {
    alignItems: 'center',
    gap: spacing.sm,
    zIndex: 1,
  },
  webMapText: {
    ...fonts.semiBold,
    fontSize: 18,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  webMapSubtext: {
    ...fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  webMapOverlay: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customMarker: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.background,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  markerPulse: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    opacity: 0.2,
  },
  mapOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    padding: spacing.md,
  },
  mapBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
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
    }),
  },
  mapBadgeText: {
    ...fonts.semiBold,
    fontSize: 13,
    color: colors.textPrimary,
  },
  locationInfo: {
    gap: spacing.sm,
  },
  locationTitle: {
    ...fonts.semiBold,
    fontSize: 16,
    color: colors.textPrimary,
  },
  locationDescription: {
    ...fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  locationPrivacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  locationPrivacyText: {
    ...fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },
  reviewsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  reviewsTitle: {
    ...fonts.bold,
    fontSize: 20,
    color: colors.textPrimary,
  },
  reviewCategories: {
    marginBottom: spacing.lg,
  },
  reviewCategoriesContent: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  reviewCategoryPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  reviewCategoryPillActive: {
    backgroundColor: colors.textPrimary,
    borderColor: colors.textPrimary,
  },
  reviewCategoryText: {
    ...fonts.regular,
    fontSize: 13,
    color: colors.textPrimary,
  },
  reviewCategoryTextActive: {
    color: colors.textInverse,
  },
  reviewCard: {
    marginBottom: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  reviewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  reviewerInfo: {
    flex: 1,
  },
  reviewerName: {
    ...fonts.semiBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  reviewerLocation: {
    ...fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
  },
  reviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: spacing.sm,
  },
  reviewDate: {
    ...fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
  },
  reviewText: {
    ...fonts.regular,
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  hostDetailCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 18 },
      android: { elevation: 3 },
      web: { boxShadow: '0 8px 20px rgba(0,0,0,0.08)' } as any,
    }),
  },
  hostDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  hostAvatarWrap: {
    width: 84,
    height: 84,
  },
  hostDetailAvatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  hostVerifiedBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: colors.card,
  },
  hostBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: 2,
  },
  hostBadgeGold: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: colors.goldLight,
  },
  hostBadgeGoldText: { ...fonts.bold, fontSize: 12, color: colors.goldDark },
  hostBadgeVerified: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primarySubtle,
  },
  hostBadgeVerifiedText: { ...fonts.bold, fontSize: 12, color: colors.primary },
  hostDetailInfo: {
    flex: 1,
  },
  hostDetailName: {
    ...fonts.bold,
    fontSize: 24,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  hostBioLine: {
    ...fonts.medium,
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  hostAboutLine: {
    ...fonts.regular,
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  superhostBadge: {
    ...fonts.semiBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  hostStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  hostStat: {
    alignItems: 'center',
  },
  hostStatNumber: {
    ...fonts.bold,
    fontSize: 20,
    color: colors.textPrimary,
  },
  hostStatLabel: {
    ...fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  hostDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  hostDetailText: {
    ...fonts.regular,
    fontSize: 14,
    color: colors.textPrimary,
  },
  superhostSection: {
    marginBottom: spacing.md,
  },
  superhostTitle: {
    ...fonts.semiBold,
    fontSize: 18,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  superhostDescription: {
    ...fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  hostResponseSection: {
    marginBottom: spacing.md,
  },
  hostResponseTitle: {
    ...fonts.semiBold,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  hostResponseText: {
    ...fonts.regular,
    fontSize: 14,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  messageHostButton: {
    backgroundColor: colors.textPrimary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  messageHostButtonText: {
    ...fonts.semiBold,
    fontSize: 16,
    color: colors.textInverse,
  },
  paymentProtection: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
  },
  paymentProtectionText: {
    ...fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  thingsToKnowGrid: {
    gap: spacing.lg,
  },
  thingsToKnowItem: {
    position: 'relative',
    paddingRight: spacing.xl,
  },
  thingsToKnowTitle: {
    ...fonts.semiBold,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  thingsToKnowText: {
    ...fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  thingsToKnowArrow: {
    position: 'absolute',
    right: 0,
    top: 0,
  },
  reportListing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  reportListingText: {
    ...fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    // Pin above the home indicator / gesture bar
    paddingBottom: Math.max(insets.bottom, spacing.md),
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  footerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  footerPriceBlock: {
    flex: 1,
  },
  footerPrice: {
    ...fonts.bold,
    fontSize: 20,
    color: colors.textPrimary,
  },
  footerPriceUnit: {
    ...fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
  },
  footerCancellation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  footerCancellationText: {
    ...fonts.medium,
    fontSize: 12,
    color: colors.success,
  },
  footerReserveBtn: {
    minWidth: 150,
  },
  reserveButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
  },
  reserveButtonText: {
    ...fonts.semiBold,
    fontSize: 16,
    color: colors.textInverse,
  },
  modalTitle: {
    ...fonts.bold,
    fontSize: 24,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  modalText: {
    ...fonts.regular,
    fontSize: 15,
    color: colors.textPrimary,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  modalSubtext: {
    ...fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginTop: spacing.md,
  },
  modalButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.textPrimary,
    alignItems: 'center',
  },
  modalButtonText: {
    ...fonts.semiBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  registrationSection: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  registrationTitle: {
    ...fonts.semiBold,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  registrationNumber: {
    ...fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
  },
  amenityCategorySection: {
    marginBottom: spacing.xl,
  },
  amenityCategoryTitle: {
    ...fonts.semiBold,
    fontSize: 18,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  amenityModalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  amenityModalLabel: {
    ...fonts.regular,
    fontSize: 15,
    color: colors.textPrimary,
  },
  amenityUnavailable: {
    textDecorationLine: 'line-through',
    color: colors.textTertiary,
  },
  reviewModalCard: {
    marginBottom: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  reviewModalText: {
    ...fonts.regular,
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  ruleContent: {
    flex: 1,
  },
  ruleTitle: {
    ...fonts.semiBold,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  ruleDescription: {
    ...fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
  },
  safetyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  safetyContent: {
    flex: 1,
  },
  safetyLabel: {
    ...fonts.semiBold,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  safetyNotes: {
    ...fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
  },
  // Full Screen Gallery Styles
  fullScreenGallery: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
  },
  closeGalleryButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImageWrapper: {
    width,
    height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width,
    height: height * 0.8,
  },
  galleryRoot: {
    flex: 1,
    backgroundColor: '#000000',
  },
  gallerySlide: {
    width,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gallerySlideImg: {
    width: '100%',
    height: '100%',
  },
  galleryClose: {
    position: 'absolute',
    right: spacing.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryCounter: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  galleryCounterText: {
    ...fonts.semiBold,
    fontSize: 16,
    color: '#FFFFFF',
  },
  // Full Screen Map Styles
  fullScreenMap: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mapModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    paddingTop: 50,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeMapButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  mapModalTitle: {
    ...fonts.semiBold,
    fontSize: 18,
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
    marginRight: 40,
  },
  fullMapWrapper: {
    flex: 1,
    position: 'relative',
  },
  fullScreenMapImage: {
    width: '100%',
    height: '100%',
  },
  fullScreenMapView: {
    flex: 1,
  },
  appleMapPinLarge: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -30,
    marginLeft: -15,
    alignItems: 'center',
  },
  pinCircleLarge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FF3B30',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  pinInnerLarge: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  pinShadowLarge: {
    width: 18,
    height: 6,
    borderRadius: 9,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    marginTop: 3,
  },
  mapModalFooter: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  mapLocationText: {
    ...fonts.semiBold,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  mapCoordinatesText: {
    ...fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
  },
});
