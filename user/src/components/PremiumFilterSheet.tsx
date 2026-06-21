import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Modal, useWindowDimensions, Image, PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useHaptics } from '../hooks/useHaptics';
import { STAYON_GRADIENT } from './GradientButton';
import { spacing, fontSizes } from '../constants';

export interface FilterState {
  recommended: string[];
  placeType: string;
  minPrice: number;
  maxPrice: number;
  bedrooms: string;
  beds: string;
  bathrooms: string;
  propertyTypes: string[];
  amenities: string[];
  booking: string[];
  accessibility: string[];
  languages: string[];
}

const DEFAULT_FILTERS: FilterState = {
  recommended: [],
  placeType: 'Any type',
  minPrice: 10,
  maxPrice: 1000,
  bedrooms: 'Any',
  beds: 'Any',
  bathrooms: 'Any',
  propertyTypes: [],
  amenities: [],
  booking: [],
  accessibility: [],
  languages: [],
};

// Mock price distribution for the histogram (Airbnb-style)
const PRICE_HISTOGRAM = [
  3, 5, 8, 12, 18, 26, 34, 42, 48, 52, 55, 50, 44, 38, 30, 24,
  19, 15, 12, 10, 8, 7, 6, 5, 4, 4, 3, 3, 2, 2, 2, 1,
];

// Draggable price-slider config
const PRICE_MIN = 10;
const PRICE_MAX = 1000;
const PRICE_GAP = 50;   // minimum distance the two thumbs keep apart
const PRICE_SNAP = 10;  // snap step
const THUMB_SIZE = 28;

const RECOMMENDED = [
  { id: 'guest_fav', label: 'Guest favourite', icon: 'rosette-outline' },
  { id: 'instant', label: 'Instant Book', icon: 'flash-outline' },
  { id: 'superhost', label: 'Superhost', icon: 'ribbon-outline' },
  { id: 'free_cancel', label: 'Free cancellation', icon: 'shield-checkmark-outline' },
];

const PLACE_TYPES = ['Any type', 'Room', 'Entire home'];

const ROOM_OPTIONS = ['Any', '1', '2', '3', '4', '5', '6', '7', '8+'];

const PROPERTY_TYPES = [
  { id: 'house', label: 'House', image: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=200&h=200&fit=crop' },
  { id: 'apartment', label: 'Apartment', image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=200&h=200&fit=crop' },
  { id: 'villa', label: 'Villa', image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=200&h=200&fit=crop' },
  { id: 'cabin', label: 'Cabin', image: 'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=200&h=200&fit=crop' },
  { id: 'loft', label: 'Loft', image: 'https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?w=200&h=200&fit=crop' },
  { id: 'cottage', label: 'Cottage', image: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=200&h=200&fit=crop' },
  { id: 'hotel', label: 'Hotel', image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=200&h=200&fit=crop' },
  { id: 'condo', label: 'Condo', image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=200&h=200&fit=crop' },
];

const AMENITIES_ESSENTIAL = [
  { id: 'wifi', label: 'Wifi', icon: 'wifi-outline' },
  { id: 'kitchen', label: 'Kitchen', icon: 'restaurant-outline' },
  { id: 'washer', label: 'Washer', icon: 'shirt-outline' },
  { id: 'dryer', label: 'Dryer', icon: 'sync-outline' },
  { id: 'ac', label: 'Air conditioning', icon: 'snow-outline' },
  { id: 'heating', label: 'Heating', icon: 'thermometer-outline' },
  { id: 'workspace', label: 'Dedicated workspace', icon: 'laptop-outline' },
  { id: 'tv', label: 'TV', icon: 'tv-outline' },
];

const AMENITIES_MORE = [
  { id: 'pool', label: 'Pool', icon: 'water-outline' },
  { id: 'hottub', label: 'Hot tub', icon: 'thermometer-outline' },
  { id: 'parking', label: 'Free parking', icon: 'car-outline' },
  { id: 'evcharger', label: 'EV charger', icon: 'flash-outline' },
  { id: 'crib', label: 'Crib', icon: 'bed-outline' },
  { id: 'gym', label: 'Gym', icon: 'barbell-outline' },
  { id: 'bbq', label: 'BBQ grill', icon: 'flame-outline' },
  { id: 'breakfast', label: 'Breakfast', icon: 'cafe-outline' },
  { id: 'fireplace', label: 'Indoor fireplace', icon: 'bonfire-outline' },
  { id: 'smoking', label: 'Smoking allowed', icon: 'cloud-outline' },
  { id: 'beachfront', label: 'Beachfront', icon: 'sunny-outline' },
  { id: 'waterfront', label: 'Waterfront', icon: 'boat-outline' },
];

const BOOKING_OPTIONS = [
  { id: 'instant_book', label: 'Instant Book', sub: 'Book without waiting for host approval', icon: 'flash-outline' },
  { id: 'self_checkin', label: 'Self check-in', sub: 'Easy access to the property', icon: 'key-outline' },
  { id: 'allows_pets', label: 'Allows pets', sub: 'Bringing a service animal?', icon: 'paw-outline' },
];

const ACCESSIBILITY = [
  { id: 'step_free_entry', label: 'Step-free guest entrance', icon: 'walk-outline' },
  { id: 'wide_entrance', label: 'Wide entrance', icon: 'resize-outline' },
  { id: 'step_free_bedroom', label: 'Step-free bedroom access', icon: 'bed-outline' },
  { id: 'accessible_parking', label: 'Accessible parking spot', icon: 'car-outline' },
  { id: 'step_free_bathroom', label: 'Step-free bathroom', icon: 'water-outline' },
  { id: 'shower_grab', label: 'Shower grab bar', icon: 'hand-left-outline' },
];

const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Chinese', 'Japanese', 'Arabic', 'Hindi'];

interface Props {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterState) => void;
  resultCount?: number;
}

export const PremiumFilterSheet: React.FC<Props> = ({ visible, onClose, onApply, resultCount = 1284 }) => {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const { light, medium } = useHaptics();
  const [f, setF] = useState<FilterState>(DEFAULT_FILTERS);
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [amenitiesOpen, setAmenitiesOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [accessibilityOpen, setAccessibilityOpen] = useState(false);
  const [languagesOpen, setLanguagesOpen] = useState(false);

  // Width of the draggable slider track, measured via onLayout. Mirrored into
  // a ref so the (once-created) PanResponder closures read the latest width.
  const [trackW, setTrackW] = useState(0);
  const trackWRef = useRef(0);
  trackWRef.current = trackW;
  // Live prices kept in a ref so PanResponder closures always read the latest
  // values without needing to recreate the responder on every render.
  const priceRef = useRef({ min: f.minPrice, max: f.maxPrice });
  priceRef.current = { min: f.minPrice, max: f.maxPrice };
  // Which thumb is being dragged + the price it started from.
  const dragStart = useRef<{ thumb: 'min' | 'max'; start: number } | null>(null);

  const styles = makeStyles(colors, width);

  // --- price <-> pixel helpers -------------------------------------------
  const priceToX = useCallback(
    (price: number) =>
      ((price - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * trackW,
    [trackW],
  );
  const snap = (price: number) => {
    const snapped = Math.round(price / PRICE_SNAP) * PRICE_SNAP;
    return Math.min(PRICE_MAX, Math.max(PRICE_MIN, snapped));
  };

  // Build a PanResponder for a given thumb. dx is converted from pixels to a
  // price delta and applied to the price captured when the drag started. We
  // clamp so the two thumbs always stay at least PRICE_GAP apart.
  const makeThumbResponder = (thumb: 'min' | 'max') =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        light();
        dragStart.current = {
          thumb,
          start: thumb === 'min' ? priceRef.current.min : priceRef.current.max,
        };
      },
      onPanResponderMove: (_e, g) => {
        const tw = trackWRef.current;
        if (!dragStart.current || tw <= 0) return;
        const priceDelta = (g.dx / tw) * (PRICE_MAX - PRICE_MIN);
        const next = snap(dragStart.current.start + priceDelta);
        if (thumb === 'min') {
          const clamped = Math.min(next, priceRef.current.max - PRICE_GAP);
          setF((p) => ({ ...p, minPrice: Math.max(PRICE_MIN, clamped) }));
        } else {
          const clamped = Math.max(next, priceRef.current.min + PRICE_GAP);
          setF((p) => ({ ...p, maxPrice: Math.min(PRICE_MAX, clamped) }));
        }
      },
      onPanResponderRelease: () => {
        dragStart.current = null;
      },
      onPanResponderTerminate: () => {
        dragStart.current = null;
      },
    });

  // Created once — the responders read live state through priceRef/trackW.
  const minResponder = useRef(makeThumbResponder('min')).current;
  const maxResponder = useRef(makeThumbResponder('max')).current;

  const toggleArr = (key: keyof FilterState, value: string) => {
    light();
    setF((prev) => {
      const arr = prev[key] as string[];
      return {
        ...prev,
        [key]: arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value],
      };
    });
  };

  const reset = () => {
    medium();
    setF(DEFAULT_FILTERS);
    setShowAllAmenities(false);
    setAmenitiesOpen(false);
  };

  const apply = () => {
    medium();
    onApply(f);
    onClose();
  };

  // estimate result count from active filters — recomputes whenever any
  // filter (placeType / price / rooms / amenities / etc.) changes so the
  // apply button count stays live.
  const estCount = useMemo(() => {
    let factor = 1;
    // Each selected chip/option narrows results
    const selections =
      f.recommended.length + f.propertyTypes.length + f.amenities.length +
      f.booking.length + f.accessibility.length + f.languages.length;
    factor *= Math.pow(0.82, selections);
    // Type of place
    if (f.placeType !== 'Any type') factor *= 0.7;
    // Rooms & beds
    if (f.bedrooms !== 'Any') factor *= 0.85;
    if (f.beds !== 'Any') factor *= 0.88;
    if (f.bathrooms !== 'Any') factor *= 0.9;
    // Price range — narrower window = fewer stays, scaled by how much of the
    // full $10–$1000 band is selected
    const fullSpan = 1000 - 10;
    const selSpan = Math.max(0, f.maxPrice - f.minPrice);
    if (f.minPrice > 10 || f.maxPrice < 1000) {
      factor *= Math.max(0.15, selSpan / fullSpan);
    }
    return Math.max(8, Math.round(resultCount * factor));
  }, [f, resultCount]);

  const amenitiesToShow = showAllAmenities
    ? [...AMENITIES_ESSENTIAL, ...AMENITIES_MORE]
    : AMENITIES_ESSENTIAL;

  // Histogram with selected range highlighted
  const maxBar = Math.max(...PRICE_HISTOGRAM);
  const priceStep = (1000 - 10) / PRICE_HISTOGRAM.length;

  const Chip = ({ active, label, onPress, icon }: any) => (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {active && (
        <LinearGradient
          colors={STAYON_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      {icon && <Ionicons name={icon} size={16} color={active ? '#fff' : colors.textPrimary} style={{ marginRight: 6 }} />}
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  // Stepper-based rooms (Any = 0, then 1..8+)
  const roomToNum = (v: string) => (v === 'Any' ? 0 : v === '8+' ? 8 : parseInt(v));
  const numToRoom = (n: number) => (n <= 0 ? 'Any' : n >= 8 ? '8+' : String(n));

  const RoomRow = ({ label, value, onSelect }: { label: string; value: string; onSelect: (v: string) => void }) => {
    const n = roomToNum(value);
    return (
      <View style={styles.roomStepperRow}>
        <Text style={[styles.roomLabel, { color: colors.textPrimary }]}>{label}</Text>
        <View style={styles.stepper}>
          <TouchableOpacity
            style={[styles.stepBtn, { borderColor: n <= 0 ? colors.borderLight : colors.primary }]}
            onPress={() => { light(); onSelect(numToRoom(n - 1)); }}
            disabled={n <= 0}
          >
            <Ionicons name="remove" size={20} color={n <= 0 ? colors.textTertiary : colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.stepValue, { color: colors.textPrimary }]}>{value}</Text>
          <TouchableOpacity
            style={[styles.stepBtn, { borderColor: n >= 8 ? colors.borderLight : colors.primary }]}
            onPress={() => { light(); onSelect(numToRoom(n + 1)); }}
            disabled={n >= 8}
          >
            <Ionicons name="add" size={20} color={n >= 8 ? colors.textTertiary : colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.sheet} edges={['bottom']}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Filters</Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {/* Recommended for you */}
            <Section title="Recommended for you" colors={colors}>
              <View style={styles.wrap}>
                {RECOMMENDED.map((r) => (
                  <Chip key={r.id} icon={r.icon} label={r.label} active={f.recommended.includes(r.id)} onPress={() => toggleArr('recommended', r.id)} />
                ))}
              </View>
            </Section>

            <Divider colors={colors} />

            {/* Type of place */}
            <Section title="Type of place" colors={colors}>
              <View style={[styles.segment, { borderColor: colors.borderLight }]}>
                {PLACE_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={styles.segmentBtn}
                    onPress={() => { light(); setF((p) => ({ ...p, placeType: t })); }}
                  >
                    {f.placeType === t && (
                      <LinearGradient
                        colors={STAYON_GRADIENT}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={StyleSheet.absoluteFill}
                      />
                    )}
                    <Text style={[styles.segmentText, { color: f.placeType === t ? '#fff' : colors.textPrimary }]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Section>

            <Divider colors={colors} />

            {/* Price range with histogram */}
            <Section title="Price range" subtitle="Nightly prices before fees and taxes" colors={colors}>
              <View style={styles.histogram}>
                {PRICE_HISTOGRAM.map((h, i) => {
                  const barPrice = 10 + i * priceStep;
                  const inRange = barPrice >= f.minPrice && barPrice <= f.maxPrice;
                  const barHeight = 8 + (h / maxBar) * 60;
                  return inRange ? (
                    <LinearGradient
                      key={i}
                      colors={STAYON_GRADIENT}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={[styles.bar, { height: barHeight }]}
                    />
                  ) : (
                    <View
                      key={i}
                      style={[styles.bar, { height: barHeight, backgroundColor: colors.borderLight }]}
                    />
                  );
                })}
              </View>
              {/* Draggable dual-thumb range slider */}
              <View
                style={styles.sliderArea}
                onLayout={(e) => setTrackW(e.nativeEvent.layout.width)}
              >
                {/* Inactive rail */}
                <View style={[styles.sliderRail, { backgroundColor: colors.borderLight }]} />
                {/* Active (selected) portion — STAYON gradient */}
                {trackW > 0 && (
                  <LinearGradient
                    colors={STAYON_GRADIENT}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[
                      styles.sliderActive,
                      {
                        left: priceToX(f.minPrice),
                        width: Math.max(0, priceToX(f.maxPrice) - priceToX(f.minPrice)),
                      },
                    ]}
                  />
                )}
                {/* Min thumb */}
                {trackW > 0 && (
                  <View
                    {...minResponder.panHandlers}
                    style={[
                      styles.thumb,
                      { borderColor: colors.primary, backgroundColor: '#fff', left: priceToX(f.minPrice) - THUMB_SIZE / 2 },
                    ]}
                  />
                )}
                {/* Max thumb */}
                {trackW > 0 && (
                  <View
                    {...maxResponder.panHandlers}
                    style={[
                      styles.thumb,
                      { borderColor: colors.primary, backgroundColor: '#fff', left: priceToX(f.maxPrice) - THUMB_SIZE / 2 },
                    ]}
                  />
                )}
              </View>

              {/* Read-only live value labels */}
              <View style={styles.priceInputs}>
                <View style={[styles.priceBox, { borderColor: colors.borderLight }]}>
                  <Text style={[styles.priceBoxLabel, { color: colors.textSecondary }]}>Minimum</Text>
                  <Text style={[styles.priceBoxValue, { color: colors.textPrimary }]}>${f.minPrice}</Text>
                </View>
                <View style={[styles.priceLine, { backgroundColor: colors.borderLight }]} />
                <View style={[styles.priceBox, { borderColor: colors.borderLight }]}>
                  <Text style={[styles.priceBoxLabel, { color: colors.textSecondary }]}>Maximum</Text>
                  <Text style={[styles.priceBoxValue, { color: colors.textPrimary }]}>${f.maxPrice}{f.maxPrice >= 1000 ? '+' : ''}</Text>
                </View>
              </View>
              {/* Preset range chips */}
              <View style={[styles.wrap, { marginTop: 12 }]}>
                {[
                  { l: 'Under $100', min: 10, max: 100 },
                  { l: '$100–$250', min: 100, max: 250 },
                  { l: '$250–$500', min: 250, max: 500 },
                  { l: '$500+', min: 500, max: 1000 },
                ].map((r) => (
                  <Chip
                    key={r.l}
                    label={r.l}
                    active={f.minPrice === r.min && f.maxPrice === r.max}
                    onPress={() => { light(); setF((p) => ({ ...p, minPrice: r.min, maxPrice: r.max })); }}
                  />
                ))}
              </View>
            </Section>

            <Divider colors={colors} />

            {/* Rooms and beds */}
            <Section title="Rooms and beds" colors={colors}>
              <RoomRow label="Bedrooms" value={f.bedrooms} onSelect={(v) => setF((p) => ({ ...p, bedrooms: v }))} />
              <RoomRow label="Beds" value={f.beds} onSelect={(v) => setF((p) => ({ ...p, beds: v }))} />
              <RoomRow label="Bathrooms" value={f.bathrooms} onSelect={(v) => setF((p) => ({ ...p, bathrooms: v }))} />
            </Section>

            <Divider colors={colors} />

            {/* Property type */}
            <Section title="Property type" colors={colors}>
              <View style={styles.grid}>
                {PROPERTY_TYPES.map((pt) => {
                  const active = f.propertyTypes.includes(pt.id);
                  return (
                    <TouchableOpacity
                      key={pt.id}
                      style={[styles.typeCard, { borderColor: active ? colors.primary : colors.borderLight, borderWidth: active ? 2.5 : 1.5 }]}
                      onPress={() => toggleArr('propertyTypes', pt.id)}
                      activeOpacity={0.85}
                    >
                      <Image source={{ uri: pt.image }} style={styles.typeImage} resizeMode="cover" />
                      {active && (
                        <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.typeCheck}>
                          <Ionicons name="checkmark" size={13} color="#fff" />
                        </LinearGradient>
                      )}
                      <Text style={[styles.typeLabel, { color: colors.textPrimary }]}>{pt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Section>

            <Divider colors={colors} />

            {/* Amenities — collapsible accordion */}
            <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.lg }}>
              <TouchableOpacity
                style={styles.accordionHeader}
                onPress={() => { light(); setAmenitiesOpen(!amenitiesOpen); }}
                activeOpacity={0.7}
              >
                <View>
                  <Text style={{ fontSize: fontSizes.lg, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.3 }}>Amenities</Text>
                  {f.amenities.length > 0 && (
                    <Text style={{ fontSize: fontSizes.sm, color: colors.primary, marginTop: 2, fontWeight: '600' }}>{f.amenities.length} selected</Text>
                  )}
                </View>
                <View style={[styles.accordionChevron, { backgroundColor: colors.backgroundSecondary }]}>
                  <Ionicons name={amenitiesOpen ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textPrimary} />
                </View>
              </TouchableOpacity>

              {amenitiesOpen && (
                <View style={{ marginTop: 8 }}>
                  {amenitiesToShow.map((a) => {
                    const active = f.amenities.includes(a.id);
                    return (
                      <TouchableOpacity
                        key={a.id}
                        style={[styles.amenityRow, { borderColor: colors.borderLight }]}
                        onPress={() => toggleArr('amenities', a.id)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.amenityLeft}>
                          <Ionicons name={a.icon as any} size={22} color={colors.textPrimary} />
                          <Text style={[styles.amenityLabel, { color: colors.textPrimary }]}>{a.label}</Text>
                        </View>
                        <View style={[styles.checkbox, { borderColor: active ? colors.primary : colors.borderLight, backgroundColor: active ? colors.primary : 'transparent' }]}>
                          {active && <Ionicons name="checkmark" size={15} color="#fff" />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                  <TouchableOpacity style={styles.showMore} onPress={() => { light(); setShowAllAmenities(!showAllAmenities); }}>
                    <Text style={[styles.showMoreText, { color: colors.textPrimary }]}>
                      {showAllAmenities ? 'Show less' : `Show all ${AMENITIES_ESSENTIAL.length + AMENITIES_MORE.length} amenities`}
                    </Text>
                    <Ionicons name={showAllAmenities ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <Divider colors={colors} />

            {/* Booking options */}
            <Accordion title="Booking options" count={f.booking.length} open={bookingOpen} onToggle={() => { light(); setBookingOpen(!bookingOpen); }} colors={colors} styles={styles}>
              {BOOKING_OPTIONS.map((b) => {
                const active = f.booking.includes(b.id);
                return (
                  <TouchableOpacity
                    key={b.id}
                    style={[styles.bookingRow, { borderColor: colors.borderLight }]}
                    onPress={() => toggleArr('booking', b.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={b.icon as any} size={22} color={colors.textPrimary} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.bookingLabel, { color: colors.textPrimary }]}>{b.label}</Text>
                      <Text style={[styles.bookingSub, { color: colors.textSecondary }]}>{b.sub}</Text>
                    </View>
                    <View style={[styles.checkbox, { borderColor: active ? colors.primary : colors.borderLight, backgroundColor: active ? colors.primary : 'transparent' }]}>
                      {active && <Ionicons name="checkmark" size={15} color="#fff" />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </Accordion>

            <Divider colors={colors} />

            {/* Accessibility features */}
            <Accordion title="Accessibility features" count={f.accessibility.length} open={accessibilityOpen} onToggle={() => { light(); setAccessibilityOpen(!accessibilityOpen); }} colors={colors} styles={styles}>
              <View style={styles.wrap}>
                {ACCESSIBILITY.map((a) => (
                  <Chip key={a.id} icon={a.icon} label={a.label} active={f.accessibility.includes(a.id)} onPress={() => toggleArr('accessibility', a.id)} />
                ))}
              </View>
            </Accordion>

            <Divider colors={colors} />

            {/* Host language */}
            <Accordion title="Host language" count={f.languages.length} open={languagesOpen} onToggle={() => { light(); setLanguagesOpen(!languagesOpen); }} colors={colors} styles={styles}>
              <View style={styles.wrap}>
                {LANGUAGES.map((l) => (
                  <Chip key={l} label={l} active={f.languages.includes(l)} onPress={() => toggleArr('languages', l)} />
                ))}
              </View>
            </Accordion>

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: colors.borderLight, backgroundColor: colors.surface }]}>
            <TouchableOpacity onPress={reset}>
              <Text style={[styles.clearText, { color: colors.textPrimary }]}>Clear all</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyBtnWrap} onPress={apply} activeOpacity={0.9}>
              <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.applyBtn}>
                <Text style={styles.applyText}>Show {estCount.toLocaleString()} stays</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const Section = ({ title, subtitle, children, colors }: any) => (
  <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.lg }}>
    <Text style={{ fontSize: fontSizes.lg, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.3, marginBottom: subtitle ? spacing.xs / 2 : spacing.base }}>{title}</Text>
    {subtitle && <Text style={{ fontSize: fontSizes.sm, color: colors.textSecondary, marginBottom: spacing.base }}>{subtitle}</Text>}
    {children}
  </View>
);

const Divider = ({ colors }: any) => (
  <View style={{ height: 1, backgroundColor: colors.borderLight, marginHorizontal: spacing.lg }} />
);

// Collapsible filter section with a chevron — same look as the Amenities dropdown.
const Accordion = ({ title, count, open, onToggle, colors, children, styles }: any) => (
  <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.lg }}>
    <TouchableOpacity style={styles.accordionHeader} onPress={onToggle} activeOpacity={0.7}>
      <View>
        <Text style={{ fontSize: fontSizes.lg, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.3 }}>{title}</Text>
        {count > 0 && (
          <Text style={{ fontSize: fontSizes.sm, color: colors.primary, marginTop: 2, fontWeight: '600' }}>{count} selected</Text>
        )}
      </View>
      <View style={[styles.accordionChevron, { backgroundColor: colors.backgroundSecondary }]}>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textPrimary} />
      </View>
    </TouchableOpacity>
    {open && <View style={{ marginTop: spacing.base }}>{children}</View>}
  </View>
);

function makeStyles(colors: any, width: number) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '94%', overflow: 'hidden' },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: spacing.base, paddingVertical: spacing.md, borderBottomWidth: 1,
    },
    closeBtn: { width: 36, height: 36, justifyContent: 'center' },
    headerTitle: { fontSize: fontSizes.md, fontWeight: '700' },
    scroll: { paddingBottom: spacing.sm },
    wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    chip: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 16, paddingVertical: 10, borderRadius: 30,
      borderWidth: 1.5, borderColor: colors.borderLight, backgroundColor: colors.card,
      overflow: 'hidden',
    },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
    chipTextActive: { color: '#fff' },
    segment: { flexDirection: 'row', borderWidth: 1.5, borderRadius: 14, overflow: 'hidden', padding: 4, gap: 4 },
    segmentBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    segmentText: { fontSize: 14, fontWeight: '700' },
    histogram: { flexDirection: 'row', alignItems: 'flex-end', height: 72, gap: 2, marginBottom: 0 },
    bar: { flex: 1, borderRadius: 2 },
    // Draggable price slider
    sliderArea: { height: THUMB_SIZE, justifyContent: 'center', marginTop: 4, marginBottom: 20 },
    sliderRail: { position: 'absolute', left: 0, right: 0, height: 4, borderRadius: 2 },
    sliderActive: { position: 'absolute', height: 4, borderRadius: 2 },
    thumb: {
      position: 'absolute', top: 0, width: THUMB_SIZE, height: THUMB_SIZE,
      borderRadius: THUMB_SIZE / 2, borderWidth: 3,
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25, shadowRadius: 4, elevation: 4,
    },
    priceInputs: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    priceBox: { flex: 1, borderWidth: 1.5, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center' },
    priceBoxLabel: { fontSize: 11, fontWeight: '600' },
    priceBoxValue: { fontSize: 18, fontWeight: '800', marginTop: 2 },
    priceLine: { width: 12, height: 1.5 },
    roomRow: { marginBottom: 18 },
    roomStepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
    roomLabel: { fontSize: 16, fontWeight: '600' },
    stepper: { flexDirection: 'row', alignItems: 'center', gap: 18 },
    stepBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
    stepValue: { fontSize: 16, fontWeight: '700', minWidth: 40, textAlign: 'center' },
    roomPill: { minWidth: 48, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 22, borderWidth: 1.5, alignItems: 'center' },
    roomPillText: { fontSize: 14, fontWeight: '600' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    typeCard: {
      width: (width - 40 - 24) / 3, borderWidth: 1.5, borderRadius: 14,
      padding: 8, gap: 8, alignItems: 'center', overflow: 'hidden',
    },
    typeImage: { width: '100%', height: 64, borderRadius: 10 },
    typeCheck: { position: 'absolute', top: 14, right: 14, width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
    typeLabel: { fontSize: 13, fontWeight: '600', paddingBottom: 4 },
    accordionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    accordionChevron: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    amenityRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 14, borderBottomWidth: 1,
    },
    amenityLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
    amenityLabel: { fontSize: 15, fontWeight: '500' },
    checkbox: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
    showMore: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 14 },
    showMoreText: { fontSize: 15, fontWeight: '700', textDecorationLine: 'underline' },
    bookingRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 1 },
    bookingLabel: { fontSize: 15, fontWeight: '600' },
    bookingSub: { fontSize: 13, marginTop: 2 },
    footer: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderTopWidth: 1,
    },
    clearText: { fontSize: 16, fontWeight: '700', textDecorationLine: 'underline' },
    applyBtnWrap: { borderRadius: 14, overflow: 'hidden' },
    applyBtn: { paddingHorizontal: 28, paddingVertical: 15, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    applyText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  });
}
