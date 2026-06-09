import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Share, Animated, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { STAYON_GRADIENT } from '../components/GradientButton';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { fonts, fontSizes, spacing, borderRadius } from '../constants';
import { useHaptics } from '../hooks/useHaptics';
import { openDirections, addToCalendar, getWeather, WeatherNow } from '../utils/tripActions';
import { addPass } from '../data/wallet';
import { addBooking } from '../data/bookings';
import { addReservationFromBooking } from '../host/data/reservations';
import { useAuth } from '../contexts';
import { Api } from '../api';
import { getTaxBreakdown } from '../utils/tax';
import dayjs from 'dayjs';

const BOOKING_ID = `STY-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

export function BookingConfirmationScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { format, currencyCode } = useCurrency();
  const property = route?.params?.property ?? {
    title: 'Manhattan Luxury Loft',
    location: 'New York, NY',
    price: 285,
    rating: 4.97,
    images: [],
  };
  const nights = (() => {
    const n = Number(route?.params?.nights);
    return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 3;
  })();
  const checkIn = route?.params?.checkIn ?? dayjs().add(7, 'day').format('MMM D, YYYY');
  const checkOut = route?.params?.checkOut ?? dayjs().add(7 + nights, 'day').format('MMM D, YYYY');
  const guests = (() => {
    const g = Number(route?.params?.guests);
    return Number.isFinite(g) && g >= 1 ? Math.floor(g) : 2;
  })();
  const bookingType = route?.params?.bookingType ?? 'instant';
  // Location may be a string or an object {city, country, ...}
  const locationText = (() => {
    const loc: any = property.location;
    if (!loc) return 'New York, NY';
    if (typeof loc === 'string') return loc;
    return [loc.city, loc.country].filter(Boolean).join(', ') || loc.neighborhood || 'New York, NY';
  })();
  const propertyTitle = typeof property.title === 'string' && property.title
    ? property.title
    : 'Your Stay';
  const isRequest = bookingType === 'request';
  const { light } = useHaptics();

  const lat: number | undefined =
    typeof property.latitude === 'number' ? property.latitude : undefined;
  const lng: number | undefined =
    typeof property.longitude === 'number' ? property.longitude : undefined;
  const hasCoords =
    typeof lat === 'number' && typeof lng === 'number' && !(lat === 0 && lng === 0);

  const [weather, setWeather] = useState<WeatherNow | null>(null);
  const [showTaxBreakdown, setShowTaxBreakdown] = useState(false);

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // price may be missing/non-numeric on a partial property object (the default
  // only applies when params.property is entirely absent) — coerce so the
  // price math and ${...} renders never produce NaN.
  const pricePerNight = (() => {
    const p = Number((property as any)?.price);
    return Number.isFinite(p) && p > 0 ? p : 285;
  })();
  const subtotal = pricePerNight * nights;
  const cleaningFee = Math.round(subtotal * 0.12);
  // Location-aware lodging/occupancy tax (varies by US state / UK / EU country).
  const tax = getTaxBreakdown(locationText, subtotal);
  const total = subtotal + cleaningFee + tax.total;

  // property.images may be string[] OR {uri,caption}[] — normalize to a string URL
  // so saved passes/bookings never store an object (which crashes <Image source={{uri}}>).
  const passImage: string | undefined = (() => {
    const first: any = (property as any).images?.[0];
    if (typeof first === 'string') return first;
    if (first && typeof first.uri === 'string') return first.uri;
    const img: any = (property as any).image;
    return typeof img === 'string' ? img : undefined;
  })();

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 50, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  // Save every booking to the in-app Trip Wallet (non-blocking).
  useEffect(() => {
    try {
      addPass({
        id: BOOKING_ID,
        confirmationCode: BOOKING_ID,
        propertyTitle: propertyTitle,
        location: locationText,
        image: passImage,
        checkIn,
        checkOut,
        nights,
        guests,
        total,
        latitude: lat,
        longitude: lng,
        status: isRequest ? 'pending' : 'confirmed',
        createdAt: Date.now(),
      }).catch(() => {});
    } catch {
      /* never block render */
    }
  }, []);

  // Record confirmed bookings in the shared Trips store so they appear as
  // UPCOMING trips and can be cancelled later. Requests aren't charged yet, so
  // they're not added as upcoming trips. Non-blocking.
  useEffect(() => {
    if (isRequest) return;
    try {
      addBooking({
        id: BOOKING_ID,
        confirmationCode: BOOKING_ID,
        property: propertyTitle,
        location: locationText,
        // Exact address — only revealed to the guest once the booking is confirmed.
        address: typeof property.address === 'string' && property.address.trim()
          ? property.address.trim()
          : locationText,
        image: passImage,
        checkIn,
        checkOut,
        nights,
        guests,
        subtotal,
        cleaningFee,
        taxes: tax.total,
        total,
        status: 'upcoming',
        card: route?.params?.card,
        createdAt: Date.now(),
      }).catch(() => {});
    } catch {
      /* never block render */
    }
  }, []);

  // Single-app link: surface the SAME reservation (same confirmation ID) on the
  // host side so the host sees the booking the guest just made — a request shows
  // as pending, a confirmed/instant booking as confirmed.
  useEffect(() => {
    try {
      addReservationFromBooking({
        code: BOOKING_ID,
        guestName: user?.name || 'Guest',
        listingTitle: propertyTitle,
        image: passImage,
        checkIn, checkOut, nights, guests,
        subtotal, cleaningFee, taxes: tax.total, total,
        instant: !isRequest,
      }).catch(() => {});
    } catch { /* never block render */ }
  }, []);

  // Backend mirror: if this stay is a real backend listing (id 'l_…'), create
  // the booking on the server too — using the SAME confirmation code — so the
  // host sees the reservation across devices and Ops can oversee it. Fail-safe.
  useEffect(() => {
    const beId = typeof property?.hostListingId === 'string' ? property.hostListingId : '';
    if (!beId.startsWith('l_')) return; // only backend listings can mirror
    (async () => {
      try {
        await Api.auth.ensureSession(user?.name);
        await Api.bookings.create({ listingId: beId, code: BOOKING_ID, checkIn, checkOut, guests });
      } catch { /* backend offline / mock listing — ignore */ }
    })();
  }, []);

  // Fetch destination weather when coordinates are available.
  useEffect(() => {
    if (!hasCoords) return;
    let alive = true;
    getWeather(lat as number, lng as number)
      .then((w) => { if (alive) setWeather(w); })
      .catch(() => {});
    return () => { alive = false; };
  }, [hasCoords, lat, lng]);

  const handleDirections = () => {
    light();
    openDirections({ latitude: lat, longitude: lng, label: locationText });
  };

  const handleCalendar = () => {
    light();
    const parsed = dayjs(checkIn, 'MMM D, YYYY');
    const base = parsed.isValid() ? parsed : dayjs();
    const start = (base.isValid() ? base : dayjs()).hour(15).minute(0).second(0);
    const startDate = start.isValid() ? start.toDate() : new Date();
    const endDate = start.isValid() ? start.hour(16).toDate() : new Date();
    addToCalendar({
      title: 'Stay at ' + propertyTitle,
      location: locationText,
      details: 'Check-in ' + checkIn + ' · Confirmation ' + BOOKING_ID,
      start: startDate,
      end: endDate,
    });
  };

  const handleWallet = () => {
    light();
    navigation.navigate('StayWallet');
  };

  const handleShare = () => {
    Share.share({
      message: `I just booked "${propertyTitle}" on StayOn! Staying ${nights} nights from ${checkIn} to ${checkOut}. Booking ID: ${BOOKING_ID}`,
      title: 'My StayOn Booking',
    });
  };

  const styles = makeStyles(colors);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Success / Pending animation */}
        <LinearGradient
          colors={isRequest ? [colors.gold, colors.goldDark] : [colors.primary, colors.primaryLight]}
          style={styles.header}
        >
          <Animated.View style={[styles.checkCircle, { transform: [{ scale: scaleAnim }] }]}>
            <Ionicons name={isRequest ? 'hourglass-outline' : 'checkmark'} size={56} color="#fff" />
          </Animated.View>
          <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
            <Text style={styles.successTitle}>{isRequest ? 'Request Sent!' : 'Booking Confirmed!'}</Text>
            <Text style={styles.successSub}>
              {isRequest ? 'Waiting for host approval (within 24h)' : 'Get ready for your adventure'}
            </Text>
          </Animated.View>
        </LinearGradient>

        {/* Pending banner for requests */}
        {isRequest && (
          <View style={[styles.pendingBanner, { backgroundColor: colors.goldLight }]}>
            <Ionicons name="information-circle-outline" size={18} color={colors.goldDark} />
            <Text style={[styles.pendingText, { color: colors.goldDark }]}>
              You haven't been charged yet. We'll notify you the moment your host accepts — then your card is charged and the stay is confirmed.
            </Text>
          </View>
        )}

        {/* Booking ID */}
        <View style={[styles.bookingIdCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.bookingIdLabel, { color: colors.textSecondary }]}>
            {isRequest ? 'Request Reference' : 'Booking Reference'}
          </Text>
          <Text style={[styles.bookingId, { color: colors.primary }]}>{BOOKING_ID}</Text>
          <Text style={[styles.bookingIdSub, { color: colors.textTertiary }]}>
            {isRequest ? 'Sent to your email · awaiting approval' : 'Confirmation sent to your email'}
          </Text>
        </View>

        {/* Property summary */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Your Stay</Text>
          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

          <View style={styles.infoRow}>
            <Ionicons name="business-outline" size={18} color={colors.primary} />
            <View style={styles.infoText}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Property</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{propertyTitle}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={18} color={colors.primary} />
            <View style={styles.infoText}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Location</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{locationText}</Text>
            </View>
          </View>

          <View style={styles.dateRow}>
            <View style={styles.dateBox}>
              <Ionicons name="calendar-outline" size={16} color={colors.primary} />
              <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>Check-in</Text>
              <Text style={[styles.dateValue, { color: colors.textPrimary }]}>{checkIn}</Text>
              <Text style={[styles.dateSub, { color: colors.textSecondary }]}>After 3:00 PM</Text>
            </View>
            <View style={[styles.dateArrow, { backgroundColor: colors.primarySubtle }]}>
              <Ionicons name="arrow-forward" size={16} color={colors.primary} />
              <Text style={[styles.nightsBadge, { color: colors.primary }]}>{nights}n</Text>
            </View>
            <View style={styles.dateBox}>
              <Ionicons name="calendar-outline" size={16} color={colors.primary} />
              <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>Check-out</Text>
              <Text style={[styles.dateValue, { color: colors.textPrimary }]}>{checkOut}</Text>
              <Text style={[styles.dateSub, { color: colors.textSecondary }]}>Before 11:00 AM</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="people-outline" size={18} color={colors.primary} />
            <View style={styles.infoText}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Guests</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                {guests} guest{guests > 1 ? 's' : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick trip actions */}
        <View style={styles.tripActions}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.tripActionTile, { backgroundColor: colors.primarySubtle }]}
            onPress={handleDirections}
            accessibilityRole="button"
            accessibilityLabel="Get directions"
          >
            <Ionicons name="navigate-outline" size={22} color={colors.primary} />
            <Text style={[styles.tripActionText, { color: colors.primary }]}>Get directions</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.tripActionTile, { backgroundColor: colors.primarySubtle }]}
            onPress={handleCalendar}
            accessibilityRole="button"
            accessibilityLabel="Add to calendar"
          >
            <Ionicons name="calendar-number-outline" size={22} color={colors.primary} />
            <Text style={[styles.tripActionText, { color: colors.primary }]}>Add to calendar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.tripActionTile, { backgroundColor: colors.primarySubtle }]}
            onPress={handleWallet}
            accessibilityRole="button"
            accessibilityLabel="Open Wallet"
          >
            <Ionicons name="wallet-outline" size={22} color={colors.primary} />
            <Text style={[styles.tripActionText, { color: colors.primary }]}>Wallet</Text>
          </TouchableOpacity>
        </View>

        {/* Destination weather */}
        {weather && (
          <View style={[styles.weatherCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.weatherTop}>
              <Ionicons name={weather.icon as any} size={36} color={colors.primary} />
              <View style={styles.weatherNow}>
                <Text style={[styles.weatherTemp, { color: colors.textPrimary }]}>{weather.tempF}°F</Text>
                <Text style={[styles.weatherLabel, { color: colors.textSecondary }]}>{weather.label}</Text>
              </View>
              <Text style={[styles.weatherDest, { color: colors.textTertiary }]} numberOfLines={1}>
                {locationText}
              </Text>
            </View>
            {weather.daily.length > 0 && (
              <View style={[styles.weatherForecast, { borderTopColor: colors.borderLight }]}>
                {weather.daily.slice(0, 4).map((d, i) => (
                  <View key={`${d.day}-${i}`} style={styles.weatherDay}>
                    <Text style={[styles.weatherDayName, { color: colors.textSecondary }]}>{d.day}</Text>
                    <Ionicons name={d.icon as any} size={18} color={colors.primary} />
                    <Text style={[styles.weatherDayTemp, { color: colors.textPrimary }]}>
                      {d.hiF}°<Text style={{ color: colors.textTertiary }}> {d.loF}°</Text>
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Price breakdown */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Price Breakdown</Text>
          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

          {[
            { label: `${format(pricePerNight)} × ${nights} nights`, value: subtotal },
            { label: 'Cleaning fee', value: cleaningFee },
          ].map((row) => (
            <View key={row.label} style={styles.priceRow}>
              <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>{row.label}</Text>
              <Text style={[styles.priceValue, { color: colors.textPrimary }]}>{format(row.value)}</Text>
            </View>
          ))}
          {/* Taxes — tap to see Federal + State breakdown */}
          <TouchableOpacity style={styles.priceRow} activeOpacity={0.7} onPress={() => setShowTaxBreakdown((v) => !v)} accessibilityRole="button" accessibilityLabel={showTaxBreakdown ? 'Hide tax breakdown' : 'Show tax breakdown'}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>Taxes</Text>
              <Ionicons name={showTaxBreakdown ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textSecondary} />
            </View>
            <Text style={[styles.priceValue, { color: colors.textPrimary }]}>{format(tax.total)}</Text>
          </TouchableOpacity>
          {showTaxBreakdown && (
            <>
              {tax.lines.map((line) => (
                <View key={line.label} style={styles.priceRow}>
                  <Text style={[styles.priceLabel, { color: colors.textTertiary, paddingLeft: 14 }]}>{line.label}</Text>
                  <Text style={[styles.priceValue, { color: colors.textTertiary }]}>{format(line.amount)}</Text>
                </View>
              ))}
            </>
          )}

          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
          <View style={styles.priceRow}>
            <Text style={[styles.totalLabel, { color: colors.textPrimary }]}>Total ({currencyCode})</Text>
            <Text style={[styles.totalValue, { color: colors.primary }]}>{format(total)}</Text>
          </View>
        </View>

        {/* Payment info */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Payment</Text>
          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
          <View style={styles.infoRow}>
            <Ionicons name="card-outline" size={18} color={colors.primary} />
            <View style={styles.infoText}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Charged to</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>Visa •••• 4242</Text>
            </View>
            <View style={[styles.paidBadge, { backgroundColor: colors.primarySubtle }]}>
              <Text style={[styles.paidText, { color: colors.primary }]}>Paid</Text>
            </View>
          </View>
        </View>

        {/* Check-in instructions */}
        <View style={[styles.card, { backgroundColor: colors.goldLight, borderColor: colors.gold }]}>
          <View style={styles.tipRow}>
            <Ionicons name="key-outline" size={20} color={colors.goldDark} />
            <Text style={[styles.tipTitle, { color: colors.goldDark }]}>Check-in Instructions</Text>
          </View>
          <Text style={[styles.tipText, { color: colors.goldDark }]}>
            Self check-in with smart lock. The host will send the access code 24 hours before your arrival.
            Make sure your contact details are up to date.
          </Text>
        </View>

        {/* Cancellation policy */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.tipRow}>
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Cancellation Policy</Text>
          </View>
          <Text style={[styles.tipText, { color: colors.textSecondary }]}>
            Free cancellation before {dayjs(checkIn, 'MMM D, YYYY').subtract(5, 'day').format('MMM D')}.
            After that, cancel before check-in and get a 50% refund, minus the first night.
          </Text>
        </View>

        {/* Anti-phishing safety note */}
        <View style={[styles.safetyNote, { backgroundColor: colors.primarySubtle }]}>
          <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
          <Text style={[styles.safetyNoteText, { color: colors.textSecondary }]}>
            For your safety: StayOn will never ask you to pay by bank transfer or move off the app.
          </Text>
        </View>

        {/* StayCoins earned */}
        <View style={[styles.coinsCard, { backgroundColor: colors.primary }]}>
          <Ionicons name="star" size={22} color="#FFD700" />
          <View style={{ flex: 1 }}>
            <Text style={styles.coinsTitle}>You earned 285 StayCoins!</Text>
            <Text style={styles.coinsSub}>Added to your Gold Member balance</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={handleShare}
            accessibilityRole="button"
            accessibilityLabel="Share booking"
          >
            <Ionicons name="share-social-outline" size={20} color={colors.primary} />
            <Text style={[styles.actionBtnText, { color: colors.primary }]}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => navigation.navigate('Main', { screen: 'TripsTab' })}
            accessibilityRole="button"
            accessibilityLabel="My Trips"
          >
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            <Text style={[styles.actionBtnText, { color: colors.primary }]}>My Trips</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => navigation.navigate('Chat', {
              hostId: '1',
              hostName: 'Host',
              propertyTitle: propertyTitle,
            })}
            accessibilityRole="button"
            accessibilityLabel="Message host"
          >
            <Ionicons name="chatbubble-outline" size={20} color={colors.primary} />
            <Text style={[styles.actionBtnText, { color: colors.primary }]}>Message Host</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.homeBtnWrap}
          onPress={() => navigation.navigate('Main')}
        >
          <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.homeBtn}>
            <Text style={styles.homeBtnText}>Back to Home</Text>
          </LinearGradient>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { paddingBottom: spacing['3xl'] },
    header: {
      alignItems: 'center',
      paddingTop: spacing['3xl'],
      paddingBottom: spacing['4xl'],
      gap: spacing.base,
    },
    checkCircle: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: 'rgba(255,255,255,0.25)',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
      borderColor: 'rgba(255,255,255,0.5)',
    },
    successTitle: { color: '#fff', fontSize: 28, ...fonts.bold, letterSpacing: -0.5 },
    successSub: { color: 'rgba(255,255,255,0.9)', fontSize: 15, ...fonts.medium, marginTop: spacing.xs },
    pendingBanner: {
      flexDirection: 'row', gap: 10, alignItems: 'flex-start',
      marginHorizontal: 16, marginTop: 16, padding: 14, borderRadius: 14,
    },
    pendingText: { flex: 1, fontSize: 13, lineHeight: 18 },
    bookingIdCard: {
      marginHorizontal: spacing.base,
      marginTop: -spacing.xl,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      alignItems: 'center',
      borderWidth: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 6,
      marginBottom: spacing.base,
    },
    bookingIdLabel: { fontSize: 12, ...fonts.semiBold, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.xs },
    bookingId: { fontSize: 26, ...fonts.bold, letterSpacing: 3 },
    bookingIdSub: { fontSize: 12, ...fonts.regular, marginTop: spacing.xs },
    card: {
      marginHorizontal: spacing.base,
      borderRadius: borderRadius.lg,
      padding: spacing.base,
      borderWidth: 1,
      marginBottom: spacing.md,
    },
    cardTitle: { fontSize: 16, ...fonts.bold, marginBottom: spacing.md },
    divider: { height: 1, marginBottom: spacing.md },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
      marginBottom: spacing.md,
    },
    infoText: { flex: 1 },
    infoLabel: { fontSize: 12, ...fonts.regular, marginBottom: 2 },
    infoValue: { fontSize: 15, ...fonts.semiBold },
    dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    dateBox: { flex: 1, gap: 3 },
    dateLabel: { fontSize: 11 },
    dateValue: { fontSize: 14, fontWeight: '700' },
    dateSub: { fontSize: 11 },
    dateArrow: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 2,
    },
    nightsBadge: { fontSize: 10, fontWeight: '700' },
    priceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 6,
    },
    priceLabel: { fontSize: 14 },
    priceValue: { fontSize: 14, fontWeight: '600' },
    totalLabel: { fontSize: 16, fontWeight: '800' },
    totalValue: { fontSize: 20, fontWeight: '800' },
    paidBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
    },
    paidText: { fontSize: 12, fontWeight: '700' },
    safetyNote: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginHorizontal: spacing.base,
      borderRadius: borderRadius.lg,
      padding: spacing.base,
      marginBottom: spacing.md,
    },
    safetyNoteText: { flex: 1, fontSize: 13, lineHeight: 19, ...fonts.medium },
    tipRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    tipTitle: { fontSize: 15, fontWeight: '700' },
    tipText: { fontSize: 13, lineHeight: 19 },
    coinsCard: {
      marginHorizontal: 16,
      borderRadius: 16,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 12,
    },
    coinsTitle: { color: '#fff', fontWeight: '700', fontSize: 14 },
    coinsSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
    coinsBadge: { fontSize: 28 },
    tripActions: {
      flexDirection: 'row',
      marginHorizontal: spacing.base,
      gap: spacing.md,
      marginBottom: spacing.md,
    },
    tripActionTile: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.base,
      paddingHorizontal: spacing.xs,
      borderRadius: borderRadius.md,
      minHeight: 76,
    },
    tripActionText: {
      fontSize: fontSizes.xs,
      ...fonts.semiBold,
      textAlign: 'center',
    },
    weatherCard: {
      marginHorizontal: spacing.base,
      borderRadius: borderRadius.lg,
      padding: spacing.base,
      borderWidth: 1,
      marginBottom: spacing.md,
    },
    weatherTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    weatherNow: { gap: 2 },
    weatherTemp: { fontSize: fontSizes['2xl'], ...fonts.bold },
    weatherLabel: { fontSize: fontSizes.sm, ...fonts.medium },
    weatherDest: { flex: 1, fontSize: fontSizes.xs, ...fonts.regular, textAlign: 'right' },
    weatherForecast: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: 1,
    },
    weatherDay: {
      flex: 1,
      alignItems: 'center',
      gap: spacing.xs,
    },
    weatherDayName: { fontSize: fontSizes.xs, ...fonts.medium },
    weatherDayTemp: { fontSize: fontSizes.xs, ...fonts.semiBold },
    actions: {
      flexDirection: 'row',
      marginHorizontal: 16,
      gap: 10,
      marginBottom: 12,
    },
    actionBtn: {
      flex: 1,
      alignItems: 'center',
      gap: 6,
      paddingVertical: 12,
      borderRadius: 14,
      borderWidth: 1,
    },
    actionBtnText: { fontSize: 12, fontWeight: '600' },
    homeBtnWrap: {
      marginHorizontal: 16,
      borderRadius: 16,
      overflow: 'hidden',
    },
    homeBtn: {
      paddingVertical: 16,
      borderRadius: 16,
      alignItems: 'center',
    },
    homeBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  });
}
