import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  TextInput,
  Modal,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar } from 'react-native-calendars';
import dayjs from 'dayjs';
import { fonts, spacing, borderRadius } from '../constants';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { GradientButton, STAYON_GRADIENT } from '../components/GradientButton';
import { useHaptics } from '../hooks/useHaptics';
import { getTaxBreakdown } from '../utils/tax';
import {
  SavedCard,
  detectBrand,
  formatCardNumber,
  getCards,
  addCard as addCardToStore,
} from '../data/cards';
import { setPendingBooking, clearPendingBooking } from '../data/pendingBooking';

interface BookingScreenProps {
  navigation: any;
  route: any;
}

export const BookingScreen: React.FC<BookingScreenProps> = ({
  navigation,
  route,
}) => {
  const { colors } = useTheme();
  const { format, currencyCode } = useCurrency();
  const styles = makeStyles(colors);
  const haptics = useHaptics();
  const { property } = route.params || {};

  // Location may be a string ("New York, NY") OR an object {city, country, ...}
  const locationText = (() => {
    const loc: any = property?.location;
    if (!loc) return 'New York, NY';
    if (typeof loc === 'string') return loc;
    return [loc.city, loc.country].filter(Boolean).join(', ') || loc.neighborhood || 'New York, NY';
  })();

  // reviews may be a number (count) OR an array of review objects
  const reviewsCount = (() => {
    const r: any = property?.reviews;
    if (Array.isArray(r)) return r.length;
    if (typeof r === 'number') return r;
    return property?.reviewCount ?? 127;
  })();

  // host may be a string or an object {name,...}
  const hostName = (() => {
    const h: any = property?.host;
    if (!h) return 'the host';
    if (typeof h === 'string') return h;
    return h.name || 'the host';
  })();

  // images may be string[] OR {uri,...}[] — coerce to a string URL so
  // <Image source={{uri}}> never receives an object (which crashes).
  const heroImage = (() => {
    const fallback = 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&h=300&fit=crop';
    const first: any = property?.images?.[0];
    if (typeof first === 'string' && first) return first;
    if (first && typeof first.uri === 'string' && first.uri) return first.uri;
    const img: any = property?.image;
    if (typeof img === 'string' && img) return img;
    return fallback;
  })();

  // Dates flow in from the property page if provided, else sensible defaults
  const [checkInDate, setCheckInDate] = useState<string>(
    route.params?.checkInDate || dayjs().add(7, 'day').format('YYYY-MM-DD')
  );
  const [checkOutDate, setCheckOutDate] = useState<string>(
    route.params?.checkOutDate || dayjs().add(12, 'day').format('YYYY-MM-DD')
  );
  const [guests, setGuests] = useState(() => {
    const g = Number(route.params?.guests);
    return Number.isFinite(g) && g >= 1 ? Math.floor(g) : 2;
  });
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'apple' | 'google' | 'paypal'>('card');
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);

  // Saved-card wallet (shared store). The user can pick one of these, or add a
  // new card inline below.
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [showNewCard, setShowNewCard] = useState(false);
  const [showCardPicker, setShowCardPicker] = useState(false); // collapsible saved-card chooser
  const [newCardNumber, setNewCardNumber] = useState('');
  const [newCardExpiry, setNewCardExpiry] = useState('');
  const [newCardCvc, setNewCardCvc] = useState('');
  const [newCardTouched, setNewCardTouched] = useState(false);
  const [saveToWallet, setSaveToWallet] = useState(true);

  // rating may be a number, numeric string, or (defensively) something else.
  const ratingValue = (() => {
    const rt = Number(property?.rating);
    return Number.isFinite(rt) && rt > 0 ? rt : 4.9;
  })();

  const newCardDigits = newCardNumber.replace(/\D/g, '');
  const newCardBrand = detectBrand(newCardDigits);
  const newCardNumberValid = newCardDigits.length >= 15;
  const showNewCardError = newCardTouched && !newCardNumberValid && newCardDigits.length > 0;

  // Load the saved wallet on mount; preselect the default card.
  useEffect(() => {
    let active = true;
    getCards().then((cards) => {
      if (!active) return;
      setSavedCards(cards);
      const def = cards.find((c) => c.isDefault) ?? cards[0];
      if (def) setSelectedCardId(def.id);
    });
    return () => { active = false; };
  }, []);

  // Date / guest picker modals
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showGuestPicker, setShowGuestPicker] = useState(false);
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rulesAccepted, setRulesAccepted] = useState(false);
  // Stepped wizard
  const [step, setStep] = useState(0); // 0 Review · 1 Message · 2 Pay
  const [hostMessage, setHostMessage] = useState('');
  const [messageFocused, setMessageFocused] = useState(false);
  const [showPriceDetails, setShowPriceDetails] = useState(false);
  const [showTaxBreakdown, setShowTaxBreakdown] = useState(false);

  const messageHasContent = hostMessage.trim().length > 0;

  // Live-computed values — every date change reflects here instantly
  const nights = Math.max(1, dayjs(checkOutDate).diff(dayjs(checkInDate), 'day'));
  const checkIn = dayjs(checkInDate).format('MMM D, YYYY');
  const checkOut = dayjs(checkOutDate).format('MMM D, YYYY');
  const pricePerNight = (() => {
    const p = Number(property?.price);
    return Number.isFinite(p) && p > 0 ? p : 285;
  })();
  const subtotal = nights * pricePerNight;
  const cleaningFee = Math.round(subtotal * 0.12);
  // Location-aware lodging/occupancy tax (varies by US state / UK / EU country).
  const tax = getTaxBreakdown(locationText, subtotal);
  const discount = promoApplied ? Math.round(subtotal * 0.10) : 0;
  const total = subtotal + cleaningFee + tax.total - discount;

  // Resume-booking: once the guest reaches the Pay step, remember this in-progress
  // checkout so the Home screen can nudge them to finish it later. Cleared on confirm.
  useEffect(() => {
    if (step !== 2 || !property) return;
    const image = property?.images?.[0] || property?.image;
    setPendingBooking({
      property,
      checkInDate,
      checkOutDate,
      guests,
      image,
      title: typeof property?.title === 'string' ? property.title : 'Your stay',
      location: locationText,
      nights,
      total,
      checkInLabel: dayjs(checkInDate).format('MMM D'),
      checkOutLabel: dayjs(checkOutDate).format('MMM D'),
    });
  }, [step, property, checkInDate, checkOutDate, guests, nights, total, locationText]);

  // Build marked range for the calendar
  const markedDates = (() => {
    const marks: any = {};
    let cur = dayjs(checkInDate);
    const end = dayjs(checkOutDate);
    while (cur.isBefore(end) || cur.isSame(end, 'day')) {
      const key = cur.format('YYYY-MM-DD');
      marks[key] = {
        color: colors.primary,
        textColor: '#fff',
        startingDay: key === checkInDate,
        endingDay: key === checkOutDate,
      };
      cur = cur.add(1, 'day');
    }
    return marks;
  })();

  const handleDayPress = (day: { dateString: string }) => {
    const d = day.dateString;
    if (!rangeStart) {
      // first tap → start a new range
      setRangeStart(d);
      setCheckInDate(d);
      setCheckOutDate(d);
    } else {
      // second tap → complete the range
      if (dayjs(d).isAfter(dayjs(rangeStart))) {
        setCheckInDate(rangeStart);
        setCheckOutDate(d);
      } else {
        setCheckInDate(d);
        setCheckOutDate(rangeStart);
      }
      setRangeStart(null);
    }
  };

  const selectedCard = savedCards.find((c) => c.id === selectedCardId) ?? null;
  const cardSub = showNewCard
    ? 'New card'
    : selectedCard
    ? `${(selectedCard.brand || 'card').toUpperCase()} •••• ${selectedCard.last4}`
    : 'Add a card to pay';

  const PAYMENT_METHODS = [
    { id: 'card', label: 'Credit or debit card', sub: cardSub, icon: 'card' },
    { id: 'apple', label: 'Apple Pay', sub: 'Fast & secure', icon: 'logo-apple' },
    { id: 'google', label: 'Google Pay', sub: 'Fast & secure', icon: 'logo-google' },
    { id: 'paypal', label: 'PayPal', sub: 'Pay with your account', icon: 'logo-paypal' },
  ] as const;

  const applyPromo = () => {
    if (promoCode.trim().toUpperCase() === 'STAY10' || promoCode.trim().length >= 4) {
      haptics.success();
      setPromoApplied(true);
      setPromoError(null);
    } else {
      haptics.warning();
      setPromoError('Invalid code — try STAY10 for 10% off.');
    }
  };

  const removePromo = () => {
    haptics.light();
    setPromoApplied(false);
    setPromoCode('');
    setPromoError(null);
  };

  // Brand accent color for saved-card chips (premium card look).
  const brandColor = (b?: string) => {
    switch ((b || '').toLowerCase()) {
      case 'visa': return '#1A1F71';
      case 'mastercard': return '#EB001B';
      case 'amex': return '#2E77BC';
      case 'discover': return '#FF6000';
      case 'rupay': return '#0C7D43';
      default: return colors.primary;
    }
  };

  // Instant Book vs Request to Book (host setting — mock: instant if rating high)
  const isInstantBook = property?.isInstantBook ?? (ratingValue >= 4.9);

  const STEP_TITLES = ['Review and continue', `Write a message to ${hostName}`, 'Confirm and pay'];

  const handleConfirmBooking = () => {
    if (!rulesAccepted) {
      Alert.alert('Agree to house rules', 'Please confirm you agree to the house rules and StayOn policies before continuing.');
      return;
    }

    // Resolve which card pays (only relevant when the card method is selected).
    let cardSummary = '';
    if (paymentMethod === 'card') {
      if (showNewCard) {
        // Validate the inline new-card form before continuing.
        setNewCardTouched(true);
        if (!newCardNumberValid) {
          Alert.alert('Invalid card', 'Please enter a valid card number.');
          return;
        }
        const last4 = newCardDigits.slice(-4);
        const brand = newCardBrand ?? 'card';
        cardSummary = `${brand.toUpperCase()} •••• ${last4}`;
        // Persist to the shared wallet only if the user opted in.
        if (saveToWallet) {
          addCardToStore({
            brand,
            last4,
            expiry: newCardExpiry || '12/28',
            isDefault: savedCards.length === 0,
          }).then(setSavedCards);
        }
      } else if (selectedCard) {
        cardSummary = `${(selectedCard.brand || 'card').toUpperCase()} •••• ${selectedCard.last4}`;
      } else {
        Alert.alert('Choose a card', 'Please select a saved card or add a new one to pay.');
        return;
      }
    }

    // Booking completed — drop the resume-booking nudge.
    clearPendingBooking();

    navigation.navigate('BookingConfirmation', {
      property,
      nights,
      checkIn,
      checkOut,
      guests,
      total,
      paymentMethod,
      card: paymentMethod === 'card' ? cardSummary : undefined,
      bookingType: isInstantBook ? 'instant' : 'request',
      hostMessage,
    });
  };

  const handleNext = () => {
    if (step < 2) { haptics.light(); setStep(step + 1); return; }
    handleConfirmBooking();
  };

  // Back arrow: on steps 1/2 slide to the PREVIOUS phase; on step 0 leave the wizard.
  const handleBack = () => {
    haptics.light();
    if (step > 0) setStep(step - 1);
    else navigation.goBack();
  };

  return (
    <View style={styles.container}>
      {/* Wizard header */}
      <View style={styles.wizHeader}>
        <TouchableOpacity
          style={styles.wizBackBtn}
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel={step > 0 ? 'Go back to previous step' : 'Close booking'}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          {step > 0 && <Text style={styles.wizBackLabel}>Back</Text>}
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          style={styles.wizIconBtn}
          onPress={() => { haptics.light(); navigation.goBack(); }}
          accessibilityRole="button"
          accessibilityLabel="Close booking"
        >
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
      {/* Step progress — segmented bar */}
      <View style={styles.segWrap}>
        <View style={styles.segBars}>
          {['Review', 'Message', 'Pay'].map((label, i) => (
            i <= step ? (
              <LinearGradient
                key={label}
                colors={STAYON_GRADIENT}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.segBar}
              />
            ) : (
              <View key={label} style={[styles.segBar, { backgroundColor: colors.borderLight }]} />
            )
          ))}
        </View>
        <View style={styles.segLabels}>
          {['Review', 'Message', 'Pay'].map((label, i) => {
            const isActive = i === step;
            const isDone = i < step;
            return (
              <View key={label} style={styles.segLabelCell}>
                <Text
                  style={[
                    styles.segLabel,
                    { color: isActive ? colors.primary : isDone ? colors.textSecondary : colors.textTertiary },
                    isActive && fonts.bold,
                  ]}
                >
                  {label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      <Text style={styles.wizTitle}>{STEP_TITLES[step]}</Text>

      <ScrollView style={styles.scrollView} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* STEP 0 — Review and continue */}
        {step === 0 && (
          <View style={[styles.reviewCard, { borderColor: colors.borderLight }]}>
            {/* Property summary */}
            <View style={styles.reviewProp}>
              <Image source={{ uri: heroImage }} style={styles.reviewImg} resizeMode="cover" />
              <View style={{ flex: 1 }}>
                <Text style={styles.reviewTitle} numberOfLines={2}>{typeof property?.title === 'string' && property.title ? property.title : 'Manhattan Luxury Loft'}</Text>
                <View style={styles.reviewMeta}>
                  <Ionicons name="star" size={13} color={colors.textPrimary} />
                  <Text style={styles.reviewMetaText}>{ratingValue} ({reviewsCount})</Text>
                  <Text style={styles.reviewMetaText}>· Guest favourite</Text>
                </View>
              </View>
            </View>
            <View style={[styles.reviewDivider, { backgroundColor: colors.borderLight }]} />

            {/* Dates */}
            <View style={styles.reviewRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.reviewRowLabel}>Dates</Text>
                <Text style={styles.reviewRowValue}>{checkIn} – {checkOut}</Text>
              </View>
              <TouchableOpacity style={styles.changeBtn} onPress={() => { setRangeStart(null); setShowDatePicker(true); }}>
                <Text style={styles.changeBtnText}>Change</Text>
              </TouchableOpacity>
            </View>

            {/* Guests */}
            <View style={styles.reviewRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.reviewRowLabel}>Guests</Text>
                <Text style={styles.reviewRowValue}>{guests} {guests === 1 ? 'guest' : 'guests'}</Text>
              </View>
              <TouchableOpacity style={styles.changeBtn} onPress={() => setShowGuestPicker(true)}>
                <Text style={styles.changeBtnText}>Change</Text>
              </TouchableOpacity>
            </View>

            {/* Total price */}
            <View style={styles.reviewRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.reviewRowLabel}>Total price</Text>
                <Text style={styles.reviewRowValue}>{format(total)} including taxes ({currencyCode})</Text>
              </View>
              <TouchableOpacity style={styles.changeBtn} onPress={() => setShowPriceDetails(true)} accessibilityRole="button" accessibilityLabel="View price details">
                <Text style={styles.changeBtnText}>Details</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.reviewDivider, { backgroundColor: colors.borderLight }]} />

            <Text style={styles.policyNote}>
              {isInstantBook ? 'Free cancellation before check-in. ' : 'You won\'t be charged until the host accepts. '}
              <Text style={styles.policyLink}>Full policy</Text>
            </Text>
          </View>
        )}

        {/* STEP 1 — Message to host */}
        {step === 1 && (
          <View>
            <Text style={styles.stepSub}>
              Before you can continue, let {hostName} know a little about your trip and why their place is a good fit.
            </Text>
            <View
              style={[
                styles.messageWrap,
                {
                  borderColor: messageFocused
                    ? colors.primary
                    : messageHasContent
                    ? colors.success
                    : colors.borderLight,
                  backgroundColor: colors.backgroundSecondary,
                },
                messageFocused && styles.messageWrapFocused,
              ]}
            >
              <TextInput
                style={[styles.messageArea, { color: colors.textPrimary }]}
                placeholder={`Example: "Hi ${hostName}, my partner and I are visiting for a friend's wedding and your place is right nearby."`}
                placeholderTextColor={colors.textTertiary}
                value={hostMessage}
                onChangeText={setHostMessage}
                onFocus={() => setMessageFocused(true)}
                onBlur={() => setMessageFocused(false)}
                multiline
                numberOfLines={6}
                maxLength={500}
                textAlignVertical="top"
                accessibilityLabel={`Message to ${hostName}`}
              />
            </View>
            <View style={styles.messageHintRow}>
              {messageHasContent ? (
                <View style={styles.messageHintInline}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                  <Text style={[styles.messageHint, { color: colors.success }]}>Looks good</Text>
                </View>
              ) : (
                <Text style={[styles.messageHint, { color: colors.textTertiary }]}>
                  Optional, but hosts reply faster to a quick hello
                </Text>
              )}
              <Text style={[styles.messageCount, { color: colors.textTertiary }]}>{hostMessage.length}/500</Text>
            </View>
          </View>
        )}

        {/* STEP 2 — Confirm and pay */}
        {step === 2 && (
          <View>
            {/* Instant / Request banner */}
            <View style={[styles.bookTypeBanner, { backgroundColor: isInstantBook ? colors.primarySubtle : colors.goldLight }]}>
              <Ionicons name={isInstantBook ? 'flash' : 'time-outline'} size={20} color={isInstantBook ? colors.primary : colors.goldDark} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.bookTypeTitle, { color: isInstantBook ? colors.primary : colors.goldDark }]}>
                  {isInstantBook ? 'Instant Book' : 'Request to Book'}
                </Text>
                <Text style={[styles.bookTypeSub, { color: colors.textSecondary }]}>
                  {isInstantBook ? 'Your booking confirms immediately.' : 'The host has 24h to accept. You won\'t be charged until then.'}
                </Text>
              </View>
            </View>

            {/* Promo */}
            <Text style={styles.payLabel}>Promo code</Text>
            {promoApplied ? (
              <View style={[styles.promoAppliedChip, { backgroundColor: colors.primarySubtle, borderColor: colors.success }]}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.promoAppliedTitle, { color: colors.textPrimary }]}>
                    {(promoCode.trim() || 'STAY10').toUpperCase()} applied
                  </Text>
                  <Text style={[styles.promoAppliedSub, { color: colors.success }]}>
                    You saved {format(discount)} (10% off)
                  </Text>
                </View>
                <TouchableOpacity onPress={removePromo} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityRole="button" accessibilityLabel="Remove promo code">
                  <Ionicons name="close-circle" size={22} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.promoRow}>
                  <View style={[styles.promoInputWrap, promoError && { borderColor: colors.error }]}>
                    <Ionicons name="pricetag-outline" size={18} color={colors.textTertiary} />
                    <TextInput
                      style={styles.promoInput}
                      placeholder="Enter code (try STAY10)"
                      placeholderTextColor={colors.textTertiary}
                      value={promoCode}
                      onChangeText={(t) => { setPromoCode(t); if (promoError) setPromoError(null); }}
                      autoCapitalize="characters"
                    />
                  </View>
                  <TouchableOpacity style={[styles.promoBtn, { backgroundColor: colors.primary }]} onPress={applyPromo}>
                    <Text style={styles.promoBtnText}>Apply</Text>
                  </TouchableOpacity>
                </View>
                {promoError && (
                  <View style={styles.promoErrorRow}>
                    <Ionicons name="alert-circle" size={13} color={colors.error} />
                    <Text style={[styles.promoErrorText, { color: colors.error }]}>{promoError}</Text>
                  </View>
                )}
              </>
            )}

            {/* Payment methods */}
            <Text style={[styles.payLabel, { marginTop: spacing.lg }]}>Pay with</Text>
            {PAYMENT_METHODS.map((method) => {
              const isCard = method.id === 'card';
              const active = paymentMethod === method.id;
              return (
                <TouchableOpacity
                  key={method.id}
                  style={[styles.paymentMethod, active && styles.paymentMethodActive]}
                  onPress={() => {
                    haptics.light();
                    if (isCard) {
                      // Selecting the card method opens its chooser; tapping again toggles it.
                      if (active) setShowCardPicker((v) => !v);
                      else { setPaymentMethod('card'); setShowCardPicker(true); }
                    } else {
                      setPaymentMethod(method.id);
                      setShowCardPicker(false);
                    }
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Pay with ${method.label}`}
                  accessibilityState={isCard ? { selected: active, expanded: showCardPicker } : { selected: active }}
                >
                  <View style={[styles.paymentIcon, active && { backgroundColor: colors.primarySubtle }]}>
                    <Ionicons name={method.icon as any} size={22} color={active ? colors.primary : colors.textSecondary} />
                  </View>
                  <View style={styles.paymentInfo}>
                    <Text style={styles.paymentText}>{method.label}</Text>
                    {isCard ? (
                      <View style={styles.paymentSubRow}>
                        <Text style={styles.paymentSubtext}>{method.sub}</Text>
                        <Ionicons
                          name={showCardPicker ? 'chevron-up' : 'chevron-down'}
                          size={16}
                          color={active ? colors.primary : colors.textSecondary}
                          style={{ marginLeft: 4 }}
                        />
                      </View>
                    ) : (
                      <Text style={styles.paymentSubtext}>{method.sub}</Text>
                    )}
                  </View>
                  {!isCard && (
                    <Ionicons name={active ? 'radio-button-on' : 'radio-button-off'} size={22} color={active ? colors.primary : colors.textTertiary} />
                  )}
                </TouchableOpacity>
              );
            })}

            {/* Saved-card picker + add-new — only when the card method is chosen AND expanded */}
            {paymentMethod === 'card' && showCardPicker && (
              <View style={styles.cardPicker}>
                {savedCards.length === 0 && !showNewCard && (
                  <Text style={styles.cardEmptyHint}>No saved cards — add one below</Text>
                )}

                {savedCards.map((card) => {
                  const selected = !showNewCard && selectedCardId === card.id;
                  return (
                    <TouchableOpacity
                      key={card.id}
                      style={[styles.savedCardRow, { borderColor: selected ? colors.primary : colors.borderLight }, selected && { backgroundColor: colors.primarySubtle }]}
                      onPress={() => { haptics.light(); setShowNewCard(false); setSelectedCardId(card.id); setShowCardPicker(false); }}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      accessibilityLabel={`Pay with ${(card.brand || 'card').toUpperCase()} ending ${card.last4}, expires ${card.expiry}`}
                    >
                      <View style={[styles.savedCardIcon, { backgroundColor: brandColor(card.brand) }]}>
                        <Ionicons name="card" size={18} color="#fff" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.savedCardBrand}>
                          {(card.brand || 'card').toUpperCase()} •••• {card.last4}
                          {card.isDefault ? '  · Default' : ''}
                        </Text>
                        <Text style={styles.savedCardExp}>Exp {card.expiry}</Text>
                      </View>
                      <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={22} color={selected ? colors.primary : colors.textTertiary} />
                    </TouchableOpacity>
                  );
                })}

                {/* Add a new card toggle */}
                <TouchableOpacity
                  style={[styles.savedCardRow, { borderColor: showNewCard ? colors.primary : colors.borderLight }, showNewCard && { backgroundColor: colors.primarySubtle }]}
                  onPress={() => { haptics.light(); setShowNewCard((v) => !v); }}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: showNewCard }}
                  accessibilityLabel="Add a new card"
                >
                  <View style={[styles.savedCardIcon, { backgroundColor: colors.backgroundSecondary }]}>
                    <Ionicons name="add" size={20} color={colors.primary} />
                  </View>
                  <Text style={[styles.savedCardBrand, { flex: 1 }]}>Add a new card</Text>
                  <Ionicons name={showNewCard ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textTertiary} />
                </TouchableOpacity>

                {/* Inline new-card mini-form */}
                {showNewCard && (
                  <View style={styles.newCardForm}>
                    <Text style={styles.newCardLabel}>Card number</Text>
                    <View
                      style={[
                        styles.newCardNumberWrap,
                        { borderColor: showNewCardError ? colors.error : newCardNumberValid ? colors.success : colors.borderLight },
                      ]}
                    >
                      <TextInput
                        style={styles.newCardInput}
                        placeholder="1234 5678 9012 3456"
                        placeholderTextColor={colors.textTertiary}
                        keyboardType="number-pad"
                        value={newCardNumber}
                        onChangeText={(t) => setNewCardNumber(formatCardNumber(t))}
                        onBlur={() => setNewCardTouched(true)}
                        maxLength={19}
                        accessibilityLabel="New card number"
                      />
                      {newCardBrand && (
                        <View style={styles.newCardBadge}>
                          <Ionicons name="card" size={16} color={colors.primary} />
                          <Text style={styles.newCardBadgeText}>{newCardBrand.toUpperCase()}</Text>
                        </View>
                      )}
                    </View>
                    {showNewCardError && (
                      <View style={styles.newCardErrorRow}>
                        <Ionicons name="alert-circle" size={13} color={colors.error} />
                        <Text style={styles.newCardErrorText}>Enter a complete card number</Text>
                      </View>
                    )}

                    <View style={styles.newCardRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.newCardLabel}>Expiry</Text>
                        <TextInput
                          style={[styles.newCardSmallInput, { borderColor: colors.borderLight }]}
                          placeholder="MM/YY"
                          placeholderTextColor={colors.textTertiary}
                          value={newCardExpiry}
                          onChangeText={setNewCardExpiry}
                          maxLength={5}
                          accessibilityLabel="New card expiry"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.newCardLabel}>CVC</Text>
                        <TextInput
                          style={[styles.newCardSmallInput, { borderColor: colors.borderLight }]}
                          placeholder="123"
                          placeholderTextColor={colors.textTertiary}
                          keyboardType="number-pad"
                          secureTextEntry
                          value={newCardCvc}
                          onChangeText={setNewCardCvc}
                          maxLength={4}
                          accessibilityLabel="New card CVC"
                        />
                      </View>
                    </View>

                    {/* Save to wallet */}
                    <TouchableOpacity
                      style={styles.saveWalletRow}
                      onPress={() => { haptics.light(); setSaveToWallet((v) => !v); }}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: saveToWallet }}
                      accessibilityLabel="Save this card to my wallet"
                    >
                      <View style={[styles.saveWalletBox, { borderColor: saveToWallet ? colors.primary : colors.textTertiary, backgroundColor: saveToWallet ? colors.primary : 'transparent' }]}>
                        {saveToWallet && <Ionicons name="checkmark" size={14} color="#fff" />}
                      </View>
                      <Text style={styles.saveWalletText}>Save this card to my wallet</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* Price summary */}
            <Text style={[styles.payLabel, { marginTop: spacing.lg }]}>Price details</Text>
            <View style={[styles.payPriceCard, { borderColor: colors.borderLight }]}>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>{format(pricePerNight)} x {nights} night{nights > 1 ? 's' : ''}</Text>
                <Text style={styles.priceValue}>{format(subtotal)}</Text>
              </View>
              <View style={styles.priceRow}><Text style={styles.priceLabel}>Cleaning fee</Text><Text style={styles.priceValue}>{format(cleaningFee)}</Text></View>
              <TouchableOpacity style={styles.priceRow} activeOpacity={0.7} onPress={() => setShowTaxBreakdown((v) => !v)} accessibilityRole="button" accessibilityLabel={showTaxBreakdown ? 'Hide tax breakdown' : 'Show tax breakdown'}>
                <View style={styles.taxLabelRow}>
                  <Text style={styles.priceLabel}>Taxes</Text>
                  <Ionicons name={showTaxBreakdown ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textSecondary} />
                </View>
                <Text style={styles.priceValue}>{format(tax.total)}</Text>
              </TouchableOpacity>
              {showTaxBreakdown && (
                <>
                  {tax.lines.map((line) => (
                    <View key={line.label} style={styles.priceRow}><Text style={[styles.priceLabel, styles.taxSub]}>{line.label}</Text><Text style={[styles.priceValue, styles.taxSub]}>{format(line.amount)}</Text></View>
                  ))}
                </>
              )}
              {promoApplied && (
                <View style={styles.priceRow}><Text style={[styles.priceLabel, { color: colors.success }]}>Promo discount</Text><Text style={[styles.priceValue, { color: colors.success }]}>-{format(discount)}</Text></View>
              )}
              <View style={styles.divider} />
              <View style={styles.priceRow}><Text style={styles.totalLabel}>Total ({currencyCode})</Text><Text style={styles.totalValue}>{format(total)}</Text></View>
            </View>

            {/* Urgency */}
            <View style={[styles.urgency, { backgroundColor: colors.backgroundSecondary }]}>
              <Ionicons name="time-outline" size={15} color={colors.textSecondary} />
              <Text style={[styles.urgencyText, { color: colors.textSecondary }]}>Only 19 hours left to book your dates</Text>
            </View>

            {/* House rules acceptance */}
            <TouchableOpacity
              style={[styles.acceptRow, { backgroundColor: colors.card, borderColor: rulesAccepted ? colors.primary : colors.borderLight, marginTop: spacing.base }]}
              onPress={() => setRulesAccepted(!rulesAccepted)}
              activeOpacity={0.8}
            >
              <View style={[styles.acceptBox, { borderColor: rulesAccepted ? colors.primary : colors.textTertiary, backgroundColor: rulesAccepted ? colors.primary : 'transparent' }]}>
                {rulesAccepted && <Ionicons name="checkmark" size={15} color="#fff" />}
              </View>
              <Text style={[styles.termsText, { flex: 1 }]}>
                I agree to the Host's House Rules, Ground rules, and StayOn's Rebooking & Refund Policy.
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Footer: step caption + Next/Confirm */}
      <View style={styles.wizFooter}>
        <Text style={styles.stepCaption}>Step {step + 1} of 3</Text>
        <GradientButton
          label={step < 2 ? 'Next' : (isInstantBook ? `Confirm and pay · ${format(total)}` : 'Request to book')}
          icon={step === 2 ? 'lock-closed' : undefined}
          onPress={handleNext}
        />
        {step === 2 && (
          <View style={styles.securedRow}>
            <Ionicons name="lock-closed" size={13} color={colors.success} />
            <Text style={styles.footerNote}>
              Secured payment · You'll be directed to secure checkout.
            </Text>
          </View>
        )}
      </View>

      {/* Price details modal */}
      <Modal visible={showPriceDetails} transparent animationType="slide" presentationStyle="overFullScreen">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Price details</Text>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>{format(pricePerNight)} x {nights} night{nights > 1 ? 's' : ''}</Text>
              <Text style={styles.priceValue}>{format(subtotal)}</Text>
            </View>
            <View style={styles.priceRow}><Text style={styles.priceLabel}>Cleaning fee</Text><Text style={styles.priceValue}>{format(cleaningFee)}</Text></View>
            <TouchableOpacity style={styles.priceRow} activeOpacity={0.7} onPress={() => setShowTaxBreakdown((v) => !v)} accessibilityRole="button" accessibilityLabel={showTaxBreakdown ? 'Hide tax breakdown' : 'Show tax breakdown'}>
              <View style={styles.taxLabelRow}>
                <Text style={styles.priceLabel}>Taxes</Text>
                <Ionicons name={showTaxBreakdown ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textSecondary} />
              </View>
              <Text style={styles.priceValue}>{format(tax.total)}</Text>
            </TouchableOpacity>
            {showTaxBreakdown && (
              <>
                {tax.lines.map((line) => (
                  <View key={line.label} style={styles.priceRow}><Text style={[styles.priceLabel, styles.taxSub]}>{line.label}</Text><Text style={[styles.priceValue, styles.taxSub]}>{format(line.amount)}</Text></View>
                ))}
              </>
            )}
            {promoApplied && (
              <View style={styles.priceRow}><Text style={[styles.priceLabel, { color: colors.success }]}>Promo discount</Text><Text style={[styles.priceValue, { color: colors.success }]}>-{format(discount)}</Text></View>
            )}
            <View style={styles.divider} />
            <View style={styles.priceRow}><Text style={styles.totalLabel}>Total ({currencyCode})</Text><Text style={styles.totalValue}>{format(total)}</Text></View>
            <TouchableOpacity style={styles.modalDoneWrap} activeOpacity={0.9} onPress={() => setShowPriceDetails(false)}>
              <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.modalDoneBtn}>
                <Text style={styles.modalDoneText}>Done</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Date picker modal */}
      <Modal visible={showDatePicker} transparent animationType="slide" presentationStyle="overFullScreen">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Select dates</Text>
              <Text style={styles.modalSub}>{nights} night{nights > 1 ? 's' : ''}</Text>
            </View>
            <Calendar
              minDate={dayjs().format('YYYY-MM-DD')}
              markingType="period"
              markedDates={markedDates}
              onDayPress={handleDayPress}
              theme={{
                todayTextColor: colors.primary,
                arrowColor: colors.primary,
                textMonthFontWeight: '800',
                textDayFontWeight: '600',
                calendarBackground: colors.surface,
                dayTextColor: colors.textPrimary,
                monthTextColor: colors.textPrimary,
                textDisabledColor: colors.textTertiary,
              }}
            />
            <TouchableOpacity style={styles.modalDoneWrap} activeOpacity={0.9} onPress={() => setShowDatePicker(false)}>
              <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.modalDoneBtn}>
                <Text style={styles.modalDoneText}>Done · {checkIn} – {checkOut}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Guest picker modal */}
      <Modal visible={showGuestPicker} transparent animationType="slide" presentationStyle="overFullScreen">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Guests</Text>
            <View style={styles.guestRow}>
              <View>
                <Text style={styles.guestLabel}>Guests</Text>
                <Text style={styles.guestSub}>Ages 13 or above</Text>
              </View>
              <View style={styles.stepper}>
                <TouchableOpacity
                  style={[styles.stepBtn, guests <= 1 && styles.stepBtnDisabled]}
                  onPress={() => setGuests(Math.max(1, guests - 1))}
                  disabled={guests <= 1}
                  accessibilityRole="button"
                  accessibilityLabel="Decrease guests"
                >
                  <Ionicons name="remove" size={20} color={guests <= 1 ? colors.textTertiary : colors.primary} />
                </TouchableOpacity>
                <Text style={styles.stepValue}>{guests}</Text>
                <TouchableOpacity
                  style={[styles.stepBtn, guests >= 16 && styles.stepBtnDisabled]}
                  onPress={() => setGuests(Math.min(16, guests + 1))}
                  disabled={guests >= 16}
                  accessibilityRole="button"
                  accessibilityLabel="Increase guests"
                >
                  <Ionicons name="add" size={20} color={guests >= 16 ? colors.textTertiary : colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity style={styles.modalDoneWrap} activeOpacity={0.9} onPress={() => setShowGuestPicker(false)}>
              <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.modalDoneBtn}>
                <Text style={styles.modalDoneText}>Done</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const makeStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // Wizard
  wizHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingTop: Platform.OS === 'ios' ? 50 : 16, paddingBottom: 4,
  },
  wizIconBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  wizBackBtn: { flexDirection: 'row', alignItems: 'center', height: 40, paddingRight: 8, gap: 2 },
  wizBackLabel: { fontSize: 15, ...fonts.semiBold, color: colors.textPrimary },
  checkInHeading: { fontSize: 15, ...fonts.semiBold, color: colors.textPrimary },
  checkInSubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  checkInRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: borderRadius.lg, borderWidth: 1.5,
  },
  checkInRowActive: {
    ...Platform.select({
      ios: { shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 6 },
      android: { elevation: 2 },
      web: { boxShadow: `0 0 0 3px ${colors.primary}22` } as any,
    }),
  },
  checkInIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  checkInLabel: { fontSize: 15, ...fonts.semiBold },
  checkInSub: { fontSize: 13, color: colors.textSecondary, marginTop: 1 },
  wizTitle: { fontSize: 24, ...fonts.bold, color: colors.textPrimary, paddingHorizontal: 20, paddingBottom: 8 },
  reviewCard: { borderWidth: 1, borderRadius: 16, padding: 16 },
  reviewProp: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  reviewImg: { width: 64, height: 64, borderRadius: 10, backgroundColor: colors.backgroundSecondary },
  reviewTitle: { fontSize: 15, ...fonts.semiBold, color: colors.textPrimary },
  reviewMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, flexWrap: 'wrap' },
  reviewMetaText: { fontSize: 12, color: colors.textSecondary },
  reviewDivider: { height: 1, marginVertical: 14 },
  reviewRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  reviewRowLabel: { fontSize: 15, ...fonts.semiBold, color: colors.textPrimary },
  reviewRowValue: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  changeBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.backgroundSecondary },
  changeBtnText: { fontSize: 13, ...fonts.semiBold, color: colors.textPrimary, textDecorationLine: 'underline' },
  policyNote: { fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
  policyLink: { ...fonts.semiBold, color: colors.textPrimary, textDecorationLine: 'underline' },
  stepSub: { fontSize: 15, color: colors.textSecondary, lineHeight: 22, marginBottom: 16 },
  messageWrap: {
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
  },
  messageWrapFocused: {
    ...Platform.select({
      ios: { shadowColor: colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.25, shadowRadius: 6 },
      android: { elevation: 3 },
      web: { boxShadow: `0 0 0 3px ${colors.primary}26` } as any,
    }),
  },
  messageArea: { padding: 14, fontSize: 15, minHeight: 140 },
  messageHintRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
  messageHintInline: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  messageHint: { fontSize: 12, ...fonts.medium },
  messageCount: { fontSize: 12, ...fonts.regular },
  payLabel: { fontSize: 16, ...fonts.semiBold, color: colors.textPrimary, marginBottom: 10 },
  payPriceCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    backgroundColor: colors.card,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 14 },
      android: { elevation: 2 },
      web: { boxShadow: '0 6px 16px rgba(0,0,0,0.06)' } as any,
    }),
  },
  urgency: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, marginTop: 12 },
  urgencyText: { fontSize: 13, ...fonts.medium },
  footerNote: { fontSize: 12, color: colors.textSecondary, textAlign: 'center' },
  securedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 4 },
  wizFooter: {
    paddingHorizontal: spacing.lg, paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.lg,
    borderTopWidth: 1, borderTopColor: colors.borderLight, gap: 12,
  },
  stepCaption: { fontSize: 12, ...fonts.semiBold, color: colors.textSecondary, textAlign: 'center', marginBottom: 2 },
  // Labeled step progress
  // Segmented progress bar
  segWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  segBars: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  segBar: {
    flex: 1,
    height: 6,
    borderRadius: borderRadius.full,
  },
  segLabels: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  segLabelCell: { flex: 1 },
  segLabel: { fontSize: 13, ...fonts.medium, letterSpacing: 0.1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 50 : spacing.lg,
    paddingBottom: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.background,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    ...fonts.semiBold,
    color: colors.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.base,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cardTitle: {
    fontSize: 20,
    ...fonts.semiBold,
    color: colors.textPrimary,
    marginBottom: spacing.base,
    letterSpacing: -0.3,
  },
  tripRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  tripInfo: {
    flex: 1,
  },
  tripLabel: {
    fontSize: 14,
    ...fonts.regular,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  tripValue: {
    fontSize: 16,
    ...fonts.medium,
    color: colors.textPrimary,
  },
  editText: {
    fontSize: 16,
    ...fonts.semiBold,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  propertyRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  propertyImage: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  propertyInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  propertyTitle: {
    fontSize: 16,
    ...fonts.semiBold,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  propertyLocation: {
    fontSize: 14,
    ...fonts.regular,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  propertyRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    ...fonts.regular,
    color: colors.textSecondary,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  priceLabel: {
    fontSize: 16,
    ...fonts.regular,
    color: colors.textPrimary,
  },
  priceValue: {
    fontSize: 16,
    ...fonts.medium,
    color: colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.sm,
  },
  totalLabel: {
    fontSize: 17,
    ...fonts.bold,
    color: colors.textPrimary,
  },
  totalValue: {
    fontSize: 22,
    ...fonts.bold,
    color: colors.primary,
    letterSpacing: -0.4,
  },
  policyText: {
    fontSize: 15,
    ...fonts.regular,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  learnMore: {
    fontSize: 15,
    ...fonts.semiBold,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  promoRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  promoAppliedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  promoAppliedTitle: { fontSize: 15, ...fonts.bold },
  promoAppliedSub: { fontSize: 13, ...fonts.medium, marginTop: 1 },
  promoErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
    marginLeft: 2,
  },
  promoErrorText: { fontSize: 13, ...fonts.medium },
  promoInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  promoInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
  },
  promoBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
  },
  promoBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: 4,
  },
  paymentMethodActive: {
    backgroundColor: colors.primarySubtle,
  },
  paymentIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentInfo: {
    flex: 1,
  },
  paymentText: {
    fontSize: 16,
    ...fonts.medium,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  paymentSubtext: {
    fontSize: 14,
    ...fonts.regular,
    color: colors.textSecondary,
  },
  paymentSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  // Saved-card picker + inline add-new form
  cardPicker: { marginTop: spacing.sm, gap: spacing.sm },
  cardEmptyHint: { fontSize: 13, ...fonts.regular, color: colors.textTertiary, paddingVertical: spacing.xs },
  savedCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm + 2,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
  },
  savedCardIcon: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  savedCardBrand: { fontSize: 15, ...fonts.medium, color: colors.textPrimary },
  savedCardExp: { fontSize: 13, ...fonts.regular, color: colors.textSecondary, marginTop: 2 },
  newCardForm: {
    padding: spacing.base,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.backgroundSecondary,
    gap: spacing.xs,
  },
  newCardLabel: { fontSize: 13, ...fonts.semiBold, color: colors.textSecondary, marginBottom: 6 },
  newCardNumberWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    backgroundColor: colors.background,
    marginBottom: 4,
  },
  newCardInput: { flex: 1, paddingVertical: 12, fontSize: 15, letterSpacing: 1, color: colors.textPrimary },
  newCardBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  newCardBadgeText: { fontSize: 11, ...fonts.bold, color: colors.textSecondary, letterSpacing: 0.5 },
  newCardErrorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  newCardErrorText: { fontSize: 12, ...fonts.medium, color: colors.error },
  newCardRow: { flexDirection: 'row', gap: spacing.md, marginTop: 6 },
  newCardSmallInput: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.background,
  },
  saveWalletRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: spacing.base },
  saveWalletBox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  saveWalletText: { fontSize: 14, ...fonts.medium, color: colors.textPrimary, flex: 1 },
  rulesText: {
    fontSize: 15,
    ...fonts.regular,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  rulesList: {
    gap: spacing.xs,
  },
  ruleItem: {
    fontSize: 15,
    ...fonts.regular,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  bookTypeBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.base,
  },
  bookTypeTitle: { fontSize: 15, ...fonts.bold },
  bookTypeSub: { fontSize: 13, ...fonts.regular, color: colors.textSecondary, marginTop: 2, lineHeight: 18 },
  acceptRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    marginBottom: spacing.base,
  },
  acceptBox: {
    width: 24, height: 24, borderRadius: 7, borderWidth: 2,
    justifyContent: 'center', alignItems: 'center', marginTop: 1,
  },
  termsSection: {
    marginVertical: spacing.base,
  },
  termsText: {
    fontSize: 13,
    ...fonts.regular,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
    padding: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.lg,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
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
  footerInfo: { minWidth: 80 },
  footerTotal: { fontSize: 20, ...fonts.bold, color: colors.textPrimary },
  footerNights: { fontSize: 12, ...fonts.regular, color: colors.textSecondary, marginTop: 1 },
  confirmButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: spacing.base + 2,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
      android: {
        elevation: 10,
      },
      web: {
        boxShadow: `0 4px 16px ${colors.primary}60`,
      },
    }),
  },
  confirmButtonText: {
    fontSize: 16,
    ...fonts.bold,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  // Date / guest modals
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderLight, alignSelf: 'center', marginBottom: 16 },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 20, ...fonts.bold, color: colors.textPrimary, marginBottom: 8 },
  modalSub: { fontSize: 14, ...fonts.semiBold, color: colors.primary },
  modalDoneWrap: { marginTop: 16, borderRadius: 14, overflow: 'hidden' },
  modalDoneBtn: { paddingVertical: 15, borderRadius: 14, alignItems: 'center' },
  modalDoneText: { color: '#fff', fontSize: 15, ...fonts.bold },
  taxLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  taxSub: { paddingLeft: 14, opacity: 0.8 },
  guestRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  guestLabel: { fontSize: 16, ...fonts.semiBold, color: colors.textPrimary },
  guestSub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  stepBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, borderColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  stepBtnDisabled: { borderColor: colors.borderLight },
  stepValue: { fontSize: 18, ...fonts.bold, color: colors.textPrimary, minWidth: 24, textAlign: 'center' },
});
