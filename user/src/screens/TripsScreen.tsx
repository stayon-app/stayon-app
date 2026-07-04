import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  TextInput,
  Share,
  Platform,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STAYON_GRADIENT } from '../components/GradientButton';
import { Skeleton } from '../components/common/SkeletonLoader';
import { EmptyState, useToast } from '../components/common';
import { Reveal } from '../components/Reveal';
import { openDirections } from '../utils/tripActions';
import { useAuth } from '../contexts';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useHaptics } from '../hooks/useHaptics';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { fontSizes, fonts, spacing, borderRadius, lineHeights } from '../constants';
import { withOpacity } from '../utils/color';
import { getBookings, cancelBooking, restoreBooking, Booking } from '../data/bookings';
import { Api } from '../api';
import {
  ItineraryItem,
  ItineraryItemType,
  ITINERARY_TYPES,
  SEED_ITINERARIES,
  typeMeta,
  parseTimeToMinutes,
  makeItemId,
} from '../data/itineraries';

const ITINERARIES_KEY = '@stayon_itineraries';

// Enable LayoutAnimation on Android so add/remove of itinerary items animate.
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Subtle ease for live itinerary updates.
const animateLive = () => {
  LayoutAnimation.configureNext(
    LayoutAnimation.create(220, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity)
  );
};

const TYPE_COLOR: Record<string, (colors: any) => string> = {
  primary: (c) => c.primary,
  info: (c) => c.info,
  secondary: (c) => c.secondary,
  gold: (c) => c.gold,
  textTertiary: (c) => c.textTertiary,
};

interface Trip {
  id: string;
  property: string;
  location: string;
  address?: string; // exact address — only shown for confirmed/completed trips
  image: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  total: number;
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled';
  bookingId: string;
  kind?: 'stay' | 'experience';
  reviewed?: boolean;
  // Present for trips backed by the shared bookings store (needed for cancel + refund).
  fromStore?: boolean;
  taxes?: number;
  refundAmount?: number;
  cancelReason?: string;
}

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop';

// Map a stored Booking into the Trip card shape the screen already renders.
function bookingToTrip(b: Booking): Trip {
  const rawStatus = b.status === 'upcoming' ? 'confirmed' : b.status;
  const status: Trip['status'] = STATUS_COLORS[rawStatus as string] ? (rawStatus as Trip['status']) : 'confirmed';
  return {
    id: String(b.id ?? ''),
    property: b.property ?? 'Stay',
    location: b.location ?? '',
    address: b.address,
    image: typeof b.image === 'string' && b.image.length > 0 ? b.image : FALLBACK_IMAGE,
    checkIn: b.checkIn ?? '',
    checkOut: b.checkOut ?? '',
    nights: typeof b.nights === 'number' && b.nights > 0 ? b.nights : 1,
    total: typeof b.total === 'number' ? b.total : 0,
    status,
    bookingId: b.confirmationCode ?? '',
    kind: b.kind ?? (String(b.confirmationCode ?? '').startsWith('EXP-') ? 'experience' : 'stay'),
    reviewed: false,
    fromStore: true,
    taxes: typeof b.taxes === 'number' ? b.taxes : 0,
    refundAmount: b.refundAmount,
    cancelReason: b.cancelReason,
  };
}

const CANCEL_REASONS = [
  'Change of plans',
  'Found a better option',
  'Trip postponed',
  'Booked by mistake',
  'Other',
] as const;

const UPCOMING: Trip[] = [
  {
    id: '1', property: 'Manhattan Luxury Loft', location: 'New York, NY',
    address: '15 W 55th St, New York, NY 10019',
    image: 'https://images.unsplash.com/photo-1555636222-cae831e670b3?w=400&h=300&fit=crop',
    checkIn: 'Jun 15, 2026', checkOut: 'Jun 20, 2026', nights: 5, total: 1820,
    status: 'confirmed', bookingId: 'STY-A8K2M1',
  },
  {
    id: '2', property: 'Malibu Beachfront Villa', location: 'Malibu, CA',
    address: '21400 Pacific Coast Hwy, Malibu, CA 90265',
    image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&h=300&fit=crop',
    checkIn: 'Jul 3, 2026', checkOut: 'Jul 7, 2026', nights: 4, total: 2280,
    status: 'pending', bookingId: 'STY-B3N9P4',
  },
];

const PAST: Trip[] = [
  {
    id: '3', property: 'Chelsea Townhouse', location: 'London, UK',
    address: '48 Cheyne Walk, Chelsea, London SW3 5LR',
    image: 'https://images.unsplash.com/photo-1577495508326-19a1b3cf65b7?w=400&h=300&fit=crop',
    checkIn: 'May 10, 2026', checkOut: 'May 15, 2026', nights: 5, total: 2100,
    status: 'completed', bookingId: 'STY-C5Q1R7', reviewed: false,
  },
  {
    id: '4', property: 'Vancouver Waterfront Condo', location: 'Vancouver, Canada',
    address: '1601 Bayshore Dr, Coal Harbour, Vancouver, BC V6G 3K3',
    image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop',
    checkIn: 'Apr 2, 2026', checkOut: 'Apr 6, 2026', nights: 4, total: 920,
    status: 'completed', bookingId: 'STY-D7S3T2', reviewed: true,
  },
];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  confirmed: { bg: '#D1FAE5', text: '#059669' },
  pending: { bg: '#FEF3C7', text: '#D97706' },
  completed: { bg: '#E0E7FF', text: '#4F46E5' },
  cancelled: { bg: '#FEE2E2', text: '#DC2626' },
};

// One-tap starter suggestions shown when a trip has no itinerary yet.
const EMPTY_STARTERS: { type: ItineraryItemType; title: string; subtitle: string; time: string }[] = [
  { type: 'check-in', title: 'Add check-in', subtitle: 'Arrival at your stay', time: '3:00 PM' },
  { type: 'dining', title: 'Add a dinner', subtitle: 'A restaurant or reservation', time: '7:00 PM' },
  { type: 'activity', title: 'Add an activity', subtitle: 'Sightseeing or a tour', time: '10:00 AM' },
];

export const TripsScreen: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { colors } = useTheme();
  const { format } = useCurrency();
  const { light, medium, warning } = useHaptics();
  const navigation = useNavigation<any>();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [receiptTrip, setReceiptTrip] = useState<Trip | null>(null);

  // --- Cancel-with-reason modal state ---
  const [cancelTarget, setCancelTarget] = useState<Trip | null>(null);
  const [cancelReason, setCancelReason] = useState<string | null>(null);
  const [cancelOtherText, setCancelOtherText] = useState('');

  // --- Trip planner / itinerary state ---
  const [itineraries, setItineraries] = useState<Record<string, ItineraryItem[]>>(SEED_ITINERARIES);
  const [hydrated, setHydrated] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDay, setDraftDay] = useState('1');
  const [draftTime, setDraftTime] = useState('');
  const [draftType, setDraftType] = useState<ItineraryItemType>('activity');
  const [draftLocation, setDraftLocation] = useState('');

  const styles = makeStyles(colors);

  // Load persisted itineraries on mount (merged over seed so seed shows first run).
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(ITINERARIES_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Record<string, ItineraryItem[]>;
          setItineraries((prev) => ({ ...prev, ...parsed }));
        }
      } catch {
        // ignore corrupt storage, fall back to seed
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  // Persist on change (only after hydration to avoid clobbering with seed-only).
  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(ITINERARIES_KEY, JSON.stringify(itineraries)).catch(() => {});
  }, [itineraries, hydrated]);

  // Brief skeleton on mount so the trips list never flashes blank.
  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  // Load bookings from the shared store on focus so a just-confirmed booking
  // (and any cancellations) are always reflected.
  const loadBookings = React.useCallback(() => {
    let alive = true;
    getBookings()
      .then((list) => { if (alive) setBookings(list); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  useFocusEffect(loadBookings);

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Trips</Text>
        </View>
        <View style={styles.tripsEmpty}>
          {/* Itinerary preview — photo cards on a timeline */}
          <View style={styles.illus}>
            <View style={styles.illusSpine} />
            {[
              'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=200&q=80&auto=format&fit=crop',
              'https://images.unsplash.com/photo-1530866957042-7e9a37a8f0a5?w=200&q=80&auto=format&fit=crop',
              'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&q=80&auto=format&fit=crop',
            ].map((img, i) => (
              <View key={i} style={styles.illusRow}>
                <View style={[styles.illusDot, i === 1 && styles.illusDotActive]} />
                <View style={styles.illusCard}>
                  <Image source={{ uri: img }} style={styles.illusImg} />
                  <View style={styles.illusBars}>
                    <View style={[styles.illusBar, { width: '72%' }]} />
                    <View style={[styles.illusBar, { width: '45%' }]} />
                  </View>
                </View>
              </View>
            ))}
          </View>

          <Text style={styles.tripsEmptyTitle}>Log in to see your trips</Text>
          <Text style={styles.tripsEmptySub}>Log in to view your upcoming and past stays — they’ll appear here in order.</Text>
          <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.navigate('Auth')}>
            <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.tripsEmptyBtn}>
              <Text style={styles.tripsEmptyBtnText}>Log in or Sign up</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Open the cancel-with-reason modal for a trip.
  const handleCancel = (trip: Trip) => {
    warning();
    setCancelReason(null);
    setCancelOtherText('');
    setCancelTarget(trip);
  };

  const closeCancelModal = () => {
    light();
    setCancelTarget(null);
    setCancelReason(null);
    setCancelOtherText('');
  };

  // The effective reason text (Other → free text, falling back to the chip label).
  const effectiveCancelReason = (): string => {
    if (cancelReason === 'Other') {
      return cancelOtherText.trim() || 'Other';
    }
    return cancelReason ?? '';
  };

  // Whether the confirm button is enabled.
  const canConfirmCancel =
    !!cancelReason && (cancelReason !== 'Other' || cancelOtherText.trim().length > 0);

  const confirmCancel = async () => {
    if (!cancelTarget || !canConfirmCancel) return;
    const trip = cancelTarget;
    const reason = effectiveCancelReason();
    const taxes = trip.taxes ?? 0;
    const refund = Math.max(0, trip.total - taxes);
    warning();
    try {
      const updated = await cancelBooking(trip.id, reason);
      setBookings(updated);
      // mirror to backend by shared code (fail-safe)
      try { await Api.auth.ensureSession(); await Api.bookings.cancelByCode(trip.bookingId); } catch {}
    } catch {
      // ignore persistence failure; still close + inform
    }
    setCancelTarget(null);
    setCancelReason(null);
    setCancelOtherText('');
    // Snackbar with Undo instead of a blocking alert.
    toast.show({
      type: 'info',
      message: `Trip cancelled — ${format(refund)} refund processing.`,
      duration: 6000,
      actionText: 'Undo',
      onActionPress: async () => {
        try {
          const restored = await restoreBooking(trip.id);
          setBookings(restored);
          toast.success('Trip restored.');
        } catch { /* ignore */ }
      },
    });
  };

  const handleReceipt = (trip: Trip) => {
    light();
    setReceiptTrip(trip);
  };

  const openItinerary = (tripId: string) => {
    light();
    setSelectedTripId(tripId);
  };

  const closeItinerary = () => {
    light();
    setSelectedTripId(null);
  };

  const openAddModal = () => {
    light();
    setDraftTitle('');
    setDraftDay('1');
    setDraftTime('');
    setDraftType('activity');
    setDraftLocation('');
    setAddModalOpen(true);
  };

  const handleAddItem = () => {
    if (!selectedTripId) return;
    const title = draftTitle.trim();
    const time = draftTime.trim();
    if (!title) {
      Alert.alert('Add a title', 'Please give your plan a title.');
      return;
    }
    if (!/^\d{1,2}:\d{2}\s*(AM|PM)$/i.test(time)) {
      Alert.alert('Check the time', 'Enter a time like "2:00 PM".');
      return;
    }
    const dayNumber = Math.max(1, parseInt(draftDay, 10) || 1);

    setItineraries((prev) => {
      const existing = prev[selectedTripId] ?? [];
      // Reuse an existing day's label/key if this day already exists.
      const sameDay = existing.find((it) => it.dayNumber === dayNumber);
      const dayKey = sameDay ? sameDay.dayKey : `custom-day-${dayNumber}`;
      const dayLabel = sameDay ? sameDay.dayLabel : `Day ${dayNumber}`;
      const newItem: ItineraryItem = {
        id: makeItemId(),
        dayKey,
        dayLabel,
        dayNumber,
        sortTime: parseTimeToMinutes(time),
        time: time.toUpperCase(),
        type: draftType,
        title,
        location: draftLocation.trim() || undefined,
      };
      return { ...prev, [selectedTripId]: [...existing, newItem] };
    });
    animateLive();
    medium();
    setAddModalOpen(false);
  };

  const handleRemoveItem = (itemId: string) => {
    if (!selectedTripId) return;
    light();
    Alert.alert('Remove plan?', 'This will remove the item from your itinerary.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          animateLive();
          setItineraries((prev) => {
            const existing = prev[selectedTripId] ?? [];
            return { ...prev, [selectedTripId]: existing.filter((it) => it.id !== itemId) };
          });
          medium();
        },
      },
    ]);
  };

  // Open the add modal pre-filled from a one-tap starter suggestion.
  const openStarter = (starter: { type: ItineraryItemType; title: string; time: string }) => {
    light();
    setDraftTitle(starter.title);
    setDraftDay('1');
    setDraftTime(starter.time);
    setDraftType(starter.type);
    setDraftLocation('');
    setAddModalOpen(true);
  };

  // Build a nicely formatted plain-text itinerary for share / copy.
  const buildItineraryText = (trip: Trip | undefined, days: { dayNumber: number; dayLabel: string; items: ItineraryItem[] }[]): string => {
    const lines: string[] = [];
    if (trip) {
      lines.push(trip.property);
      lines.push(trip.location);
      lines.push(`${trip.checkIn} - ${trip.checkOut} · ${trip.nights} nights`);
    } else {
      lines.push('My Itinerary');
    }
    lines.push('');
    for (const day of days) {
      lines.push(`Day ${day.dayNumber} · ${day.dayLabel}`);
      for (const it of day.items) {
        const loc = it.location ? ` · ${it.location}` : '';
        lines.push(`  ${it.time} · ${it.title}${loc}`);
      }
      lines.push('');
    }
    lines.push('Planned with StayOn');
    return lines.join('\n').trim();
  };

  const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
      // Web: use the async Clipboard API when available.
      const nav: any = (globalThis as any).navigator;
      if (Platform.OS === 'web' && nav && nav.clipboard) {
        await nav.clipboard.writeText(text);
        return true;
      }
    } catch {
      // fall through to false
    }
    return false;
  };

  const handleCopyItinerary = async (text: string) => {
    light();
    const copied = await copyToClipboard(text);
    if (copied) {
      Alert.alert('Copied', 'Your itinerary was copied to the clipboard.');
    } else {
      Alert.alert('Your itinerary', text);
    }
  };

  const handleShareItinerary = async (trip: Trip | undefined, text: string) => {
    light();
    try {
      await Share.share({
        message: text,
        title: trip ? `Itinerary · ${trip.property}` : 'My Itinerary',
      });
    } catch {
      // Share can be unavailable (e.g. web) — fall back to copy / show.
      await handleCopyItinerary(text);
    }
  };

  const renderAddModal = () => (
    <Modal visible={addModalOpen} animationType="slide" transparent onRequestClose={() => setAddModalOpen(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeaderRow}>
            <Text style={styles.modalTitle}>Add to itinerary</Text>
            <TouchableOpacity onPress={() => setAddModalOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.fieldLabel}>Title</Text>
            <TextInput
              style={styles.input}
              value={draftTitle}
              onChangeText={setDraftTitle}
              placeholder="e.g. Brooklyn Bridge walk"
              placeholderTextColor={colors.textTertiary}
            />

            <Text style={styles.fieldLabel}>Type</Text>
            <View style={styles.segmentRow}>
              {ITINERARY_TYPES.map((t) => {
                const active = draftType === t.type;
                const c = (TYPE_COLOR[t.colorKey] ?? TYPE_COLOR.primary)(colors);
                return (
                  <TouchableOpacity
                    key={t.type}
                    onPress={() => { light(); setDraftType(t.type); }}
                    style={[styles.segment, active && { backgroundColor: c + '1A', borderColor: c }]}
                  >
                    <Ionicons name={t.icon as any} size={16} color={active ? c : colors.textTertiary} />
                    <Text style={[styles.segmentText, { color: active ? c : colors.textSecondary }]}>{t.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.rowTwo}>
              <View style={styles.flex1}>
                <Text style={styles.fieldLabel}>Day</Text>
                <TextInput
                  style={styles.input}
                  value={draftDay}
                  onChangeText={(v) => setDraftDay(v.replace(/[^0-9]/g, ''))}
                  placeholder="1"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.fieldLabel}>Time</Text>
                <TextInput
                  style={styles.input}
                  value={draftTime}
                  onChangeText={setDraftTime}
                  placeholder="2:00 PM"
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="characters"
                />
              </View>
            </View>

            <Text style={styles.fieldLabel}>Location (optional)</Text>
            <TextInput
              style={styles.input}
              value={draftLocation}
              onChangeText={setDraftLocation}
              placeholder="e.g. Central Park"
              placeholderTextColor={colors.textTertiary}
            />

            <TouchableOpacity activeOpacity={0.9} onPress={handleAddItem} style={styles.modalAddBtnWrap}>
              <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.modalAddBtn}>
                <Text style={styles.modalAddBtnText}>Add to itinerary</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // Cancel-with-reason modal. Asks why, shows the calm refund summary
  // (stay money refunded, taxes withheld), and confirms via the store.
  const renderCancelModal = () => {
    const trip = cancelTarget;
    const taxes = trip?.taxes ?? 0;
    const refund = trip ? Math.max(0, trip.total - taxes) : 0;
    return (
      <Modal visible={!!cancelTarget} animationType="slide" transparent onRequestClose={closeCancelModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Cancel your trip?</Text>
              <TouchableOpacity
                onPress={closeCancelModal}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel="Close cancel dialog"
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {!!trip && (
                <Text style={styles.cancelPropertyText}>
                  {trip.property} · {trip.checkIn}
                </Text>
              )}

              <Text style={styles.fieldLabel}>Why are you cancelling?</Text>
              <View style={styles.reasonList}>
                {CANCEL_REASONS.map((reason) => {
                  const active = cancelReason === reason;
                  return (
                    <TouchableOpacity
                      key={reason}
                      activeOpacity={0.85}
                      onPress={() => { light(); setCancelReason(reason); }}
                      style={[styles.reasonChip, active && styles.reasonChipActive]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={`Reason: ${reason}`}
                    >
                      <Ionicons
                        name={active ? 'radio-button-on' : 'radio-button-off'}
                        size={18}
                        color={active ? colors.primary : colors.textTertiary}
                      />
                      <Text style={[styles.reasonChipText, active && styles.reasonChipTextActive]}>
                        {reason}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {cancelReason === 'Other' && (
                <TextInput
                  style={[styles.input, { marginTop: spacing.sm }]}
                  value={cancelOtherText}
                  onChangeText={setCancelOtherText}
                  placeholder="Tell us a little more"
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  accessibilityLabel="Other cancellation reason"
                />
              )}

              {/* Refund summary — calm and clear. */}
              <View style={styles.refundCard}>
                <View style={styles.refundRow}>
                  <Ionicons name="cash-outline" size={18} color={colors.success} />
                  <Text style={styles.refundCardTitle}>You'll be refunded ${refund}</Text>
                </View>
                <Text style={styles.refundCardSub}>
                  Taxes (${taxes}) are non-refundable — they're remitted to the government.
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={canConfirmCancel ? 0.9 : 1}
                onPress={confirmCancel}
                disabled={!canConfirmCancel}
                style={styles.modalAddBtnWrap}
                accessibilityRole="button"
                accessibilityState={{ disabled: !canConfirmCancel }}
                accessibilityLabel="Confirm cancellation"
              >
                <LinearGradient
                  colors={STAYON_GRADIENT}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.modalAddBtn, !canConfirmCancel && styles.modalAddBtnDisabled]}
                >
                  <Text style={styles.modalAddBtnText}>Confirm cancellation</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={closeCancelModal}
                style={styles.keepBtn}
                accessibilityRole="button"
                accessibilityLabel="Keep my booking"
              >
                <Text style={styles.keepBtnText}>Keep my booking</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  // The shared store is the source of truth for booking trips. We merge in the
  // static mock PAST trips (review/rebook demo) but de-dupe by bookingId so a
  // seeded/store trip wins. Newly-confirmed bookings appear under Upcoming and
  // cancellations move to Past automatically.
  const storeTrips = bookings.map(bookingToTrip);
  const storeUpcoming = storeTrips.filter((t) => t.status === 'confirmed' || t.status === 'pending');
  const storePast = storeTrips.filter((t) => t.status === 'completed' || t.status === 'cancelled');

  const storeBookingIds = new Set(storeTrips.map((t) => t.bookingId));
  const mockPast = PAST.filter((t) => !storeBookingIds.has(t.bookingId));

  const trips = activeTab === 'upcoming'
    ? storeUpcoming
    : [...storePast, ...mockPast];

  const renderTrip = (trip: Trip) => {
    const statusColor = STATUS_COLORS[trip.status] ?? STATUS_COLORS.confirmed;
    const statusLabel = trip.status ? trip.status.charAt(0).toUpperCase() + trip.status.slice(1) : 'Confirmed';
    // Exact address + directions are unlocked only once the stay is confirmed
    // (or already completed). Hidden while pending and after cancellation.
    const canSeeAddress = trip.status === 'confirmed' || trip.status === 'completed';
    const tripImageUri = typeof trip.image === 'string' && trip.image.length > 0 ? trip.image : FALLBACK_IMAGE;
    const perNight = trip.nights > 0 ? Math.round(trip.total / trip.nights) : trip.total;
    return (
      <View key={trip.id} style={styles.tripCard}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => navigation.navigate('PropertyDetails', {
            property: { id: trip.id, title: trip.property, location: trip.location, price: perNight, rating: 4.9, images: [tripImageUri], latitude: 0, longitude: 0 }
          })}
        >
          <Image source={{ uri: tripImageUri }} style={styles.tripImage} resizeMode="cover" />
          <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
            <Text style={[styles.statusText, { color: statusColor.text }]}>
              {statusLabel}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.tripInfo}>
          <Text style={styles.tripProperty}>{trip.property}</Text>
          <View style={styles.tripMetaRow}>
            <Ionicons name="location-outline" size={14} color={colors.textTertiary} />
            <Text style={styles.tripLocationText}>{trip.location}</Text>
          </View>

          {/* Exact address — revealed only once confirmed (directions live in
              the stay details map, not here). */}
          {canSeeAddress ? (
            !!trip.address && (
              <View style={styles.tripMetaRow}>
                <Ionicons name="home-outline" size={14} color={colors.textTertiary} />
                <Text style={styles.tripAddressText} numberOfLines={2}>{trip.address}</Text>
              </View>
            )
          ) : (
            <View style={styles.tripMetaRow}>
              <Ionicons name="lock-closed-outline" size={14} color={colors.textTertiary} />
              <Text style={styles.tripLockedText}>
                {trip.status === 'cancelled'
                  ? 'Address unavailable — booking cancelled'
                  : 'Exact address shown once your booking is confirmed'}
              </Text>
            </View>
          )}

          <View style={styles.tripMetaRow}>
            <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.tripDatesText}>
              {trip.kind === 'experience'
                ? `${trip.checkIn}${trip.checkOut ? ` · ${trip.checkOut}` : ''}`
                : `${trip.checkIn} – ${trip.checkOut} · ${trip.nights} nights`}
            </Text>
          </View>
          <View style={styles.tripMetaRow}>
            <Ionicons name="receipt-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.tripDatesText}>{trip.bookingId} · {format(Number(trip.total) || 0)}</Text>
          </View>

          {trip.status === 'cancelled' && trip.refundAmount != null && (
            <View style={styles.tripMetaRow}>
              <Ionicons name="cash-outline" size={14} color={colors.success} />
              <Text style={styles.refundText}>
                Refunded ${trip.refundAmount} · taxes withheld
              </Text>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actionRow}>
            {activeTab === 'upcoming' ? (
              <>
                {canSeeAddress && !!trip.address && (
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => openDirections({ label: `${trip.address}` })}
                    accessibilityRole="button"
                    accessibilityLabel="Get directions"
                  >
                    <Ionicons name="navigate-outline" size={15} color={colors.primary} />
                    <Text style={styles.actionBtnText}>Directions</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => navigation.navigate('Chat', { hostId: '1', hostName: 'Host', propertyTitle: trip.property })}
                >
                  <Ionicons name="chatbubble-outline" size={15} color={colors.primary} />
                  <Text style={styles.actionBtnText}>Message</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtnDanger} onPress={() => handleCancel(trip)}>
                  <Ionicons name="close-circle-outline" size={15} color={colors.error} />
                  <Text style={styles.actionBtnDangerText}>Cancel</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {trip.status !== 'cancelled' && (!trip.reviewed ? (
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => navigation.navigate('WriteReview', { property: { title: trip.property, location: trip.location, image: trip.image }, bookingCode: trip.bookingId })}
                  >
                    <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.actionBtn, styles.reviewBtn]}>
                      <Ionicons name="star-outline" size={15} color="#fff" />
                      <Text style={styles.reviewBtnText}>Write Review</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.reviewedBadge}>
                    <Ionicons name="checkmark-circle" size={15} color={colors.success} />
                    <Text style={styles.reviewedText}>Reviewed</Text>
                  </View>
                ))}
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => navigation.navigate('PropertyDetails', {
                    property: { id: trip.id, title: trip.property, location: trip.location, price: perNight, rating: 4.9, images: [tripImageUri], latitude: 0, longitude: 0 }
                  })}
                >
                  <Ionicons name="repeat-outline" size={15} color={colors.primary} />
                  <Text style={styles.actionBtnText}>Rebook</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Experiences don't have check-in codes or itineraries — show a
              simple "what to know" strip instead. */}
          {activeTab === 'upcoming' && trip.kind === 'experience' && (
            <View style={styles.essentials}>
              <View style={styles.essentialRow}>
                <View style={styles.essentialIcon}>
                  <Ionicons name="sparkles-outline" size={16} color={colors.primary} />
                </View>
                <View style={styles.essentialBody}>
                  <Text style={styles.essentialTitle}>Experience booked</Text>
                  <Text style={styles.essentialSub} numberOfLines={1}>
                    {trip.checkIn || 'Date TBC'}{trip.checkOut ? ` · ${trip.checkOut}` : ''}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Trip essentials strip — stays only */}
          {activeTab === 'upcoming' && trip.kind !== 'experience' && (() => {
            const itemCount = itineraries[trip.id]?.length ?? 0;
            const hasItinerary = itemCount > 0;
            const showCheckin = trip.status === 'confirmed';
            return (
              <View style={styles.essentials}>
                {showCheckin && (
                  <View style={[styles.essentialRow, styles.essentialRowDivider]}>
                    <View style={styles.essentialIcon}>
                      <Ionicons name="key-outline" size={16} color={colors.goldDark} />
                    </View>
                    <View style={styles.essentialBody}>
                      <Text style={styles.essentialTitle}>Self check-in</Text>
                      <Text style={styles.essentialSub} numberOfLines={1}>Code arrives 24h before · 3:00 PM</Text>
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => openItinerary(trip.id)}
                  style={styles.essentialRow}
                >
                  <View style={styles.essentialIcon}>
                    <Ionicons name="map-outline" size={16} color={colors.primary} />
                  </View>
                  <View style={styles.essentialBody}>
                    <Text style={styles.essentialTitle}>
                      {hasItinerary ? 'View itinerary' : 'Plan your itinerary'}
                    </Text>
                    <Text style={styles.essentialSub} numberOfLines={1}>
                      {hasItinerary
                        ? `${itemCount} ${itemCount === 1 ? 'plan' : 'plans'} added`
                        : 'Add things to do on your trip'}
                    </Text>
                  </View>
                  {hasItinerary && (
                    <View style={styles.essentialCount}>
                      <Text style={styles.essentialCountText}>{itemCount}</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>
            );
          })()}
        </View>
      </View>
    );
  };

  // --- Itinerary view (in-screen, driven by selectedTripId) ---
  if (selectedTripId) {
    const trip = [...storeTrips, ...UPCOMING, ...PAST].find((t) => t.id === selectedTripId);
    const rawItems = itineraries[selectedTripId];
    const items = Array.isArray(rawItems) ? rawItems : [];

    // Group by day, days ordered by dayNumber, items ordered by sortTime.
    const days = (() => {
      const map = new Map<number, { dayNumber: number; dayLabel: string; items: ItineraryItem[] }>();
      for (const it of items) {
        if (!map.has(it.dayNumber)) {
          map.set(it.dayNumber, { dayNumber: it.dayNumber, dayLabel: it.dayLabel, items: [] });
        }
        map.get(it.dayNumber)!.items.push(it);
      }
      const arr = Array.from(map.values()).sort((a, b) => a.dayNumber - b.dayNumber);
      arr.forEach((d) => d.items.sort((a, b) => a.sortTime - b.sortTime));
      return arr;
    })();

    const totalItems = items.length;
    const dayCount = days.length;
    const itineraryText = buildItineraryText(trip, days);
    const summaryLabel = dayCount > 0
      ? `${dayCount === 1 ? 'Day 1' : `Day 1–${dayCount}`} · ${totalItems} ${totalItems === 1 ? 'plan' : 'plans'}`
      : 'No plans yet';

    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.itineraryHeader}>
          <TouchableOpacity onPress={closeItinerary} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.itineraryHeaderTextWrap}>
            <Text style={styles.headerTitle} numberOfLines={1}>Itinerary</Text>
            {trip && <Text style={styles.itinerarySubtitle} numberOfLines={1}>{trip.property} · {trip.location}</Text>}
          </View>
          {totalItems > 0 && (
            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={() => handleCopyItinerary(itineraryText)}
                style={styles.headerActionBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Copy itinerary"
              >
                <Ionicons name="copy-outline" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleShareItinerary(trip, itineraryText)}
                style={styles.headerActionBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Share itinerary"
              >
                <Ionicons name="share-outline" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {totalItems > 0 && (
          <View style={styles.summaryBar}>
            <Ionicons name="time-outline" size={14} color={colors.primary} />
            <Text style={styles.summaryText}>{summaryLabel}</Text>
          </View>
        )}

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {totalItems === 0 ? (
            <View style={styles.guidedEmpty}>
              <View style={styles.guidedIconWrap}>
                <Ionicons name="sparkles-outline" size={40} color={colors.primary} />
              </View>
              <Text style={styles.guidedTitle}>Start your plan</Text>
              <Text style={styles.guidedSub}>
                Build a day-by-day timeline for {trip ? trip.property : 'your trip'}. Tap a starter to begin.
              </Text>

              <View style={styles.starterList}>
                {EMPTY_STARTERS.map((s) => {
                  const meta = typeMeta(s.type);
                  const c = (TYPE_COLOR[meta.colorKey] ?? TYPE_COLOR.primary)(colors);
                  return (
                    <TouchableOpacity
                      key={s.title}
                      activeOpacity={0.85}
                      onPress={() => openStarter(s)}
                      style={styles.starterCard}
                      accessibilityLabel={s.title}
                    >
                      <View style={[styles.starterIcon, { backgroundColor: c + '1A' }]}>
                        <Ionicons name={meta.icon as any} size={18} color={c} />
                      </View>
                      <View style={styles.flex1}>
                        <Text style={styles.starterTitle}>{s.title}</Text>
                        <Text style={styles.starterSub}>{s.subtitle}</Text>
                      </View>
                      <Ionicons name="add-circle-outline" size={22} color={c} />
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity activeOpacity={0.9} onPress={openAddModal} style={styles.guidedCustomBtn}>
                <Text style={styles.guidedCustomText}>Or add something custom</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {days.map((day) => (
                <View key={day.dayNumber} style={styles.daySection}>
                  <View style={styles.dayHeaderRow}>
                    <Text style={styles.dayHeader}>Day {day.dayNumber}</Text>
                    <Text style={styles.dayHeaderSub}>· {day.dayLabel}</Text>
                  </View>

                  {day.items.map((item, idx) => {
                    const meta = typeMeta(item.type);
                    const dotColor = (TYPE_COLOR[meta.colorKey] ?? TYPE_COLOR.primary)(colors);
                    const isLast = idx === day.items.length - 1;
                    return (
                      <View key={item.id} style={styles.timelineRow}>
                        {/* Left connector + dot */}
                        <View style={styles.timelineGutter}>
                          <View style={[styles.timelineDot, { borderColor: dotColor, backgroundColor: colors.card }]}>
                            <Ionicons name={meta.icon as any} size={13} color={dotColor} />
                          </View>
                          {!isLast && <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />}
                        </View>

                        {/* Content */}
                        <View style={[styles.timelineCard, isLast && { marginBottom: 0 }]}>
                          <View style={styles.timelineTopRow}>
                            <Text style={styles.timelineTitle} numberOfLines={2}>{item.title}</Text>
                            <View style={styles.timelineTopRight}>
                              <Text style={[styles.timelineTime, { color: dotColor }]}>{item.time}</Text>
                              <TouchableOpacity
                                onPress={() => handleRemoveItem(item.id)}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                accessibilityLabel={`Remove ${item.title}`}
                              >
                                <Ionicons name="close" size={16} color={colors.textTertiary} />
                              </TouchableOpacity>
                            </View>
                          </View>
                          <View style={styles.timelineTypeRow}>
                            <View style={[styles.typeChip, { backgroundColor: dotColor + '1A' }]}>
                              <Text style={[styles.typeChipText, { color: dotColor }]}>{meta.label}</Text>
                            </View>
                            {!!item.location && (
                              <View style={styles.timelineLocationRow}>
                                <Ionicons name="location-outline" size={12} color={colors.textTertiary} />
                                <Text style={styles.timelineLocation} numberOfLines={1}>{item.location}</Text>
                              </View>
                            )}
                          </View>
                          {!!item.notes && <Text style={styles.timelineNotes}>{item.notes}</Text>}
                        </View>
                      </View>
                    );
                  })}
                </View>
              ))}

              <TouchableOpacity activeOpacity={0.9} onPress={openAddModal} style={styles.addBtnWrap}>
                <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.addBtn}>
                  <Ionicons name="add" size={18} color="#fff" />
                  <Text style={styles.addBtnText}>Add to itinerary</Text>
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>

        {renderAddModal()}
        {renderCancelModal()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Trips</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {(['upcoming', 'past'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => { light(); setActiveTab(tab); }}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'upcoming' ? 'Upcoming' : 'Past trips'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <View key={i} style={styles.tripCard}>
              <Skeleton width="100%" height={160} borderRadius={0} />
              <View style={styles.tripInfo}>
                <Skeleton width="70%" height={18} borderRadius={6} style={{ marginBottom: 10 }} />
                <Skeleton width="50%" height={13} borderRadius={6} style={{ marginBottom: 8 }} />
                <Skeleton width="60%" height={13} borderRadius={6} style={{ marginBottom: 8 }} />
                <Skeleton width="45%" height={13} borderRadius={6} />
              </View>
            </View>
          ))
        ) : trips.length > 0 ? (
          trips.map((t, i) => (
            <Reveal key={t.id} delay={Math.min(i, 6) * 80}>
              {renderTrip(t)}
            </Reveal>
          ))
        ) : (
          <View style={styles.tripsEmpty}>
            {/* Itinerary preview — photo cards on a timeline */}
            <View style={styles.illus}>
              <View style={styles.illusSpine} />
              {[
                'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=200&q=80&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1530866957042-7e9a37a8f0a5?w=200&q=80&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&q=80&auto=format&fit=crop',
              ].map((img, i) => (
                <View key={i} style={styles.illusRow}>
                  <View style={[styles.illusDot, i === 1 && styles.illusDotActive]} />
                  <View style={styles.illusCard}>
                    <Image source={{ uri: img }} style={styles.illusImg} />
                    <View style={styles.illusBars}>
                      <View style={[styles.illusBar, { width: '72%' }]} />
                      <View style={[styles.illusBar, { width: '45%' }]} />
                    </View>
                  </View>
                </View>
              ))}
            </View>

            <Text style={styles.tripsEmptyTitle}>
              {activeTab === 'upcoming' ? 'Build the perfect trip' : 'No past trips yet'}
            </Text>
            <Text style={styles.tripsEmptySub}>
              {activeTab === 'upcoming'
                ? 'Explore homes, stays and things to do. When you book, your reservations will appear here in order.'
                : 'Once you’ve completed a stay, your travel history will live here.'}
            </Text>
            <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.navigate('Main', { screen: 'ExploreTab' })}>
              <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.tripsEmptyBtn}>
                <Text style={styles.tripsEmptyBtnText}>Start exploring</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {renderCancelModal()}

      {/* Formatted receipt sheet (replaces the old Alert dump) */}
      <Modal visible={!!receiptTrip} transparent animationType="slide" onRequestClose={() => setReceiptTrip(null)}>
        <View style={styles.receiptBackdrop}>
          <View style={[styles.receiptSheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.receiptHandle, { backgroundColor: colors.borderLight }]} />
            {receiptTrip && (() => {
              const t = receiptTrip;
              const nights = Math.max(1, t.nights || 1);
              const subtotal = Math.round((Number(t.total) || 0) * 0.82);
              const cleaning = Math.round((Number(t.total) || 0) * 0.07);
              const taxes = Math.max(0, (Number(t.total) || 0) - subtotal - cleaning);
              const Row = ({ k, v, strong, muted }: any) => (
                <View style={styles.receiptRow}>
                  <Text style={[styles.receiptK, { color: muted ? colors.success : colors.textSecondary }]}>{k}</Text>
                  <Text style={[strong ? styles.receiptVStrong : styles.receiptV, { color: muted ? colors.success : colors.textPrimary }]}>{v}</Text>
                </View>
              );
              return (
                <>
                  <Text style={[styles.receiptHead, { color: colors.textTertiary }]}>Receipt</Text>
                  <Text style={[styles.receiptProp, { color: colors.textPrimary }]}>{t.property}</Text>
                  <Text style={[styles.receiptMeta, { color: colors.textSecondary }]}>{t.checkIn} – {t.checkOut} · {nights} night{nights === 1 ? '' : 's'}</Text>
                  <View style={[styles.receiptDivider, { backgroundColor: colors.borderLight }]} />
                  <Row k={`Stay · ${nights} night${nights === 1 ? '' : 's'}`} v={format(subtotal)} />
                  <Row k="Cleaning fee" v={format(cleaning)} />
                  <Row k="Taxes" v={format(taxes)} />
                  <Row k="Platform fee" v={`${format(0)} · 0%`} muted />
                  <View style={[styles.receiptDivider, { backgroundColor: colors.borderLight }]} />
                  <Row k="Total paid" v={format(Number(t.total) || 0)} strong />
                  <View style={styles.receiptCodeRow}>
                    <View style={[styles.receiptCode, { backgroundColor: colors.primarySubtle }]}>
                      <Ionicons name="receipt-outline" size={13} color={colors.primary} />
                      <Text style={[styles.receiptCodeText, { color: colors.primary }]}>{t.bookingId}</Text>
                    </View>
                  </View>
                  <TouchableOpacity activeOpacity={0.9} onPress={() => setReceiptTrip(null)}>
                    <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.receiptDone}>
                      <Text style={styles.receiptDoneText}>Done</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      <toast.ToastContainer />
    </SafeAreaView>
  );
};

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
    headerTitle: { fontSize: fontSizes['2xl'], ...fonts.bold, color: colors.textPrimary, letterSpacing: -0.5 },
    tabRow: { flexDirection: 'row', paddingHorizontal: spacing.lg, gap: spacing.sm, marginBottom: spacing.sm },
    tab: { paddingHorizontal: spacing.lg, paddingVertical: 9, borderRadius: borderRadius.full, backgroundColor: colors.backgroundSecondary },
    tabActive: { backgroundColor: colors.primary },
    tabText: { fontSize: fontSizes.sm, ...fonts.semiBold, color: colors.textSecondary },
    tabTextActive: { color: '#fff' },
    scrollView: { flex: 1 },
    content: { padding: spacing.lg, paddingBottom: 100 },
    tripCard: {
      backgroundColor: colors.card,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: spacing.lg,
      overflow: 'hidden',
    },
    tripImage: { width: '100%', height: 160 },
    statusBadge: {
      position: 'absolute', top: spacing.md, left: spacing.md,
      paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.base,
    },
    statusText: { fontSize: fontSizes.xs, ...fonts.bold },
    tripInfo: { padding: spacing.base },
    tripProperty: { fontSize: fontSizes.md, ...fonts.bold, color: colors.textPrimary, marginBottom: spacing.xs },
    tripMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: spacing.xs },
    tripLocationText: { fontSize: fontSizes.sm, color: colors.textTertiary },
    tripAddressText: { flex: 1, fontSize: fontSizes.sm, ...fonts.medium, color: colors.textSecondary },
    tripLockedText: { flex: 1, fontSize: fontSizes.sm, ...fonts.regular, color: colors.textTertiary, fontStyle: 'italic' },
    tripDatesText: { fontSize: fontSizes.sm, color: colors.textSecondary },
    actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, flexWrap: 'wrap' },
    actionBtn: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
      paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.base,
      backgroundColor: colors.primarySubtle,
    },
    actionBtnText: { fontSize: fontSizes.xs, ...fonts.semiBold, color: colors.primary },
    actionBtnDanger: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
      paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.base,
      backgroundColor: '#FEE2E2',
    },
    actionBtnDangerText: { fontSize: fontSizes.xs, ...fonts.semiBold, color: colors.error },
    reviewBtn: {},
    reviewBtnText: { fontSize: fontSizes.xs, ...fonts.bold, color: '#fff' },
    reviewedBadge: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
      paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    },
    reviewedText: { fontSize: fontSizes.xs, ...fonts.semiBold, color: colors.success },
    // --- Trip essentials strip ---
    essentials: {
      marginTop: spacing.md,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.backgroundSecondary,
      overflow: 'hidden',
    },
    essentialRow: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
      paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.md,
    },
    essentialRowDivider: {
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
    },
    essentialIcon: {
      width: 30, height: 30, borderRadius: borderRadius.full,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: colors.card,
    },
    essentialBody: { flex: 1 },
    essentialTitle: { fontSize: fontSizes.sm, ...fonts.semiBold, color: colors.textPrimary },
    essentialSub: { fontSize: fontSizes.xs, color: colors.textTertiary, marginTop: 1 },
    essentialCount: {
      minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: borderRadius.full,
      backgroundColor: colors.primarySubtle, alignItems: 'center', justifyContent: 'center',
    },
    essentialCountText: { fontSize: fontSizes.xs, ...fonts.bold, color: colors.primary },
    emptyState: { alignItems: 'center', paddingVertical: 80 },
    receiptBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    receiptSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.lg, paddingBottom: spacing['2xl'] },
    receiptHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: spacing.md },
    receiptHead: { fontSize: fontSizes.sm, ...fonts.semiBold },
    receiptProp: { fontSize: fontSizes.xl, ...fonts.bold, marginTop: 2 },
    receiptMeta: { fontSize: fontSizes.sm, ...fonts.regular, marginTop: 2 },
    receiptDivider: { height: StyleSheet.hairlineWidth, marginVertical: spacing.md },
    receiptRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
    receiptK: { fontSize: fontSizes.base, ...fonts.regular },
    receiptV: { fontSize: fontSizes.base, ...fonts.semiBold },
    receiptVStrong: { fontSize: fontSizes.lg, ...fonts.bold },
    receiptCodeRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
    receiptCode: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: borderRadius.full },
    receiptCodeText: { fontSize: fontSizes.xs, ...fonts.bold },
    receiptCard: { fontSize: fontSizes.sm, ...fonts.medium },
    receiptDone: { marginTop: spacing.lg, paddingVertical: spacing.base, borderRadius: borderRadius.lg, alignItems: 'center' },
    receiptDoneText: { fontSize: fontSizes.md, color: '#fff', ...fonts.bold },
    tripsEmpty: { alignItems: 'center', paddingTop: spacing['2xl'], paddingHorizontal: spacing.lg },
    illus: { width: '100%', maxWidth: 360, alignSelf: 'center', position: 'relative', paddingLeft: 4, marginBottom: spacing['2xl'] },
    illusSpine: { position: 'absolute', left: 9, top: 24, bottom: 24, width: 2, backgroundColor: colors.borderLight, borderRadius: 1 },
    illusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.base, marginBottom: spacing.md },
    illusDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.borderLight, borderWidth: 2, borderColor: colors.background },
    illusDotActive: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.textTertiary },
    illusCard: {
      flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md,
      backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.sm,
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 14 },
        android: { elevation: 3 },
        default: { boxShadow: '0 6px 16px rgba(0,0,0,0.08)' } as any,
      }),
    },
    illusImg: { width: 56, height: 56, borderRadius: borderRadius.md, backgroundColor: colors.backgroundSecondary },
    illusBars: { flex: 1, gap: 8 },
    illusBar: { height: 10, borderRadius: 5, backgroundColor: colors.backgroundSecondary },
    tripsEmptyTitle: { fontSize: fontSizes.xl, ...fonts.bold, color: colors.textPrimary, textAlign: 'center' },
    tripsEmptySub: { fontSize: fontSizes.base, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginTop: spacing.sm, marginBottom: spacing.xl, paddingHorizontal: spacing.md },
    tripsEmptyBtn: { paddingHorizontal: spacing['2xl'], paddingVertical: spacing.base, borderRadius: borderRadius.lg },
    tripsEmptyBtnText: { fontSize: fontSizes.base, ...fonts.bold, color: '#fff' },
    emptyText: { fontSize: fontSizes.md, color: colors.textSecondary, marginTop: spacing.base, marginBottom: spacing.lg },
    exploreButton: { paddingHorizontal: spacing['2xl'], paddingVertical: spacing.md, borderRadius: borderRadius.lg },
    exploreButtonText: { fontSize: fontSizes.base, ...fonts.bold, color: '#fff' },
    authPrompt: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing['2xl'] },
    authPromptTitle: { fontSize: fontSizes['2xl'], ...fonts.bold, color: colors.textPrimary, marginTop: spacing.xl, marginBottom: spacing.sm, letterSpacing: -0.5 },
    authPromptText: { fontSize: fontSizes.base, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xl, lineHeight: lineHeights.md },
    authButton: { paddingHorizontal: spacing['2xl'], paddingVertical: spacing.base, borderRadius: borderRadius.lg },
    authButtonText: { fontSize: fontSizes.base, ...fonts.bold, color: '#fff' },

    // --- Itinerary header ---
    itineraryHeader: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
      paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md,
    },
    backBtn: {
      width: 40, height: 40, borderRadius: borderRadius.full,
      alignItems: 'center', justifyContent: 'center', backgroundColor: colors.backgroundSecondary,
    },
    itineraryHeaderTextWrap: { flex: 1 },
    itinerarySubtitle: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 2 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    headerActionBtn: {
      width: 40, height: 40, borderRadius: borderRadius.full,
      alignItems: 'center', justifyContent: 'center', backgroundColor: colors.backgroundSecondary,
    },

    // --- Summary bar ---
    summaryBar: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      marginHorizontal: spacing.lg, marginBottom: spacing.sm,
      paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
      borderRadius: borderRadius.full, alignSelf: 'flex-start',
      backgroundColor: colors.primarySubtle,
    },
    summaryText: { fontSize: fontSizes.xs, ...fonts.semiBold, color: colors.primary },

    // --- Guided empty state ---
    guidedEmpty: { alignItems: 'center', paddingTop: spacing.xl },
    guidedIconWrap: {
      width: 72, height: 72, borderRadius: borderRadius.full,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: colors.primarySubtle, marginBottom: spacing.base,
    },
    guidedTitle: { fontSize: fontSizes.xl, ...fonts.bold, color: colors.textPrimary, letterSpacing: -0.3 },
    guidedSub: {
      fontSize: fontSizes.sm, color: colors.textSecondary, textAlign: 'center',
      marginTop: spacing.xs, marginBottom: spacing.lg, lineHeight: lineHeights.sm,
      paddingHorizontal: spacing.lg,
    },
    starterList: { width: '100%', gap: spacing.sm },
    starterCard: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.md,
      padding: spacing.md, borderRadius: borderRadius.md,
      borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card,
    },
    starterIcon: {
      width: 38, height: 38, borderRadius: borderRadius.full,
      alignItems: 'center', justifyContent: 'center',
    },
    starterTitle: { fontSize: fontSizes.base, ...fonts.semiBold, color: colors.textPrimary },
    starterSub: { fontSize: fontSizes.xs, color: colors.textTertiary, marginTop: 1 },
    guidedCustomBtn: { marginTop: spacing.lg, paddingVertical: spacing.sm },
    guidedCustomText: { fontSize: fontSizes.sm, ...fonts.semiBold, color: colors.primary },

    // --- Timeline ---
    daySection: { marginBottom: spacing.lg },
    dayHeaderRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: spacing.md },
    dayHeader: { fontSize: fontSizes.lg, ...fonts.bold, color: colors.textPrimary, letterSpacing: -0.3 },
    dayHeaderSub: { fontSize: fontSizes.sm, ...fonts.medium, color: colors.textSecondary },
    timelineRow: { flexDirection: 'row' },
    timelineGutter: { width: 30, alignItems: 'center' },
    timelineDot: {
      width: 30, height: 30, borderRadius: borderRadius.full, borderWidth: 2,
      alignItems: 'center', justifyContent: 'center', zIndex: 1,
    },
    timelineLine: { width: 2, flex: 1, marginVertical: 2 },
    timelineCard: {
      flex: 1, marginLeft: spacing.md, marginBottom: spacing.base,
      backgroundColor: colors.card, borderRadius: borderRadius.md,
      borderWidth: 1, borderColor: colors.border, padding: spacing.md,
    },
    timelineTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
    timelineTitle: { flex: 1, fontSize: fontSizes.base, ...fonts.semiBold, color: colors.textPrimary },
    timelineTopRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    timelineTime: { fontSize: fontSizes.sm, ...fonts.bold },
    timelineTypeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap' },
    typeChip: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: borderRadius.full },
    typeChipText: { fontSize: fontSizes.xs, ...fonts.semiBold },
    timelineLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, flexShrink: 1 },
    timelineLocation: { fontSize: fontSizes.xs, color: colors.textTertiary, flexShrink: 1 },
    timelineNotes: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: spacing.sm, lineHeight: lineHeights.sm },

    // --- Add button (timeline footer) ---
    addBtnWrap: { marginTop: spacing.sm },
    addBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
      paddingVertical: spacing.base, borderRadius: borderRadius.lg,
    },
    addBtnText: { fontSize: fontSizes.base, ...fonts.bold, color: '#fff' },

    // --- Add modal ---
    modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
    modalSheet: {
      backgroundColor: colors.card, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl,
      padding: spacing.lg, paddingBottom: spacing['2xl'], maxHeight: '88%',
    },
    modalHandle: {
      width: 40, height: 4, borderRadius: borderRadius.full, backgroundColor: colors.border,
      alignSelf: 'center', marginBottom: spacing.md,
    },
    modalHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
    modalTitle: { fontSize: fontSizes.xl, ...fonts.bold, color: colors.textPrimary, letterSpacing: -0.3 },
    fieldLabel: { fontSize: fontSizes.sm, ...fonts.semiBold, color: colors.textSecondary, marginBottom: spacing.xs, marginTop: spacing.md },
    input: {
      borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md,
      paddingHorizontal: spacing.md, paddingVertical: spacing.md,
      fontSize: fontSizes.base, color: colors.textPrimary, backgroundColor: colors.background,
    },
    segmentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    segment: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
      paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
      borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.border,
      backgroundColor: colors.backgroundSecondary,
    },
    segmentText: { fontSize: fontSizes.sm, ...fonts.semiBold },
    rowTwo: { flexDirection: 'row', gap: spacing.md },
    flex1: { flex: 1 },
    modalAddBtnWrap: { marginTop: spacing.xl },
    modalAddBtn: { paddingVertical: spacing.base, borderRadius: borderRadius.lg, alignItems: 'center' },
    modalAddBtnDisabled: { opacity: 0.45 },
    modalAddBtnText: { fontSize: fontSizes.base, ...fonts.bold, color: '#fff' },

    // --- Cancel-with-reason modal ---
    refundText: { fontSize: fontSizes.sm, ...fonts.semiBold, color: colors.success },
    cancelPropertyText: { fontSize: fontSizes.sm, color: colors.textSecondary, marginBottom: spacing.xs },
    reasonList: { gap: spacing.sm, marginTop: spacing.xs },
    reasonChip: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
      paddingHorizontal: spacing.md, paddingVertical: spacing.md,
      borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border,
      backgroundColor: colors.backgroundSecondary,
    },
    reasonChipActive: { borderColor: colors.primary, backgroundColor: colors.primarySubtle },
    reasonChipText: { fontSize: fontSizes.base, ...fonts.medium, color: colors.textSecondary },
    reasonChipTextActive: { color: colors.textPrimary, ...fonts.semiBold },
    refundCard: {
      marginTop: spacing.lg, padding: spacing.md, borderRadius: borderRadius.md,
      borderWidth: 1, borderColor: colors.border, backgroundColor: colors.backgroundSecondary,
    },
    refundRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    refundCardTitle: { fontSize: fontSizes.base, ...fonts.bold, color: colors.textPrimary },
    refundCardSub: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: spacing.xs, lineHeight: lineHeights.sm },
    keepBtn: { marginTop: spacing.md, paddingVertical: spacing.sm, alignItems: 'center' },
    keepBtnText: { fontSize: fontSizes.sm, ...fonts.semiBold, color: colors.textSecondary },
  });
}
