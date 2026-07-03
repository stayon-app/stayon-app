import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useHaptics } from '../hooks/useHaptics';
import { fonts, spacing, borderRadius } from '../constants';
import { STAYON_GRADIENT } from '../components/GradientButton';
import { categoryLabel, type Experience } from '../data/experiences';
import { getPolicy } from '../data/cancellationPolicy';
import { addBooking, type Booking } from '../data/bookings';
import { getCards, type SavedCard } from '../data/cards';

export const ExperienceCheckoutScreen: React.FC<any> = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { format } = useCurrency();
  const { light, success } = useHaptics();
  const s = makeStyles(colors);

  const exp: Experience = route?.params?.experience;
  const people: number = route?.params?.people || 1;

  const [card, setCard] = useState<SavedCard | null>(null);
  const [paying, setPaying] = useState(false);
  const [done, setDone] = useState(false);
  const [code, setCode] = useState('');

  useEffect(() => {
    getCards().then((cards) => setCard(cards.find((c) => c.isDefault) || cards[0] || null));
  }, []);

  if (!exp) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: colors.textSecondary }}>Nothing to check out.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={{ color: colors.primary, marginTop: 8 }}>Go back</Text></TouchableOpacity>
      </SafeAreaView>
    );
  }

  const subtotal = exp.pricePerPerson * people;
  const total = subtotal; // experiences are priced per person; no taxes added

  const confirmAndPay = async () => {
    light();
    setPaying(true);
    const ref = `EXP-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const booking: Booking = {
      id: `exp-booking-${Date.now()}`,
      confirmationCode: ref,
      kind: 'experience',
      property: exp.title,
      location: exp.location,
      image: exp.images[0],
      checkIn: exp.dateLabel || 'Date TBC',
      checkOut: exp.durationLabel || '',
      nights: 1,
      guests: people,
      subtotal,
      cleaningFee: 0,
      taxes: 0,
      total,
      status: 'upcoming',
      card: card ? `${card.brand} •••• ${card.last4}` : undefined,
      createdAt: Date.now(),
    };
    try { await addBooking(booking); } catch { /* best effort */ }
    // Simulate a short payment authorisation before showing confirmation.
    setTimeout(() => { setCode(ref); setDone(true); setPaying(false); success(); }, 900);
  };

  // ---- Confirmation state ----
  if (done) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, alignItems: 'center', paddingTop: spacing['3xl'] }}>
          <View style={s.successBadge}>
            <Ionicons name="checkmark" size={42} color="#fff" />
          </View>
          <Text style={s.successTitle}>You're booked! 🎉</Text>
          <Text style={s.successSub}>Your experience is confirmed and saved to your Trips.</Text>

          <View style={s.refCard}>
            <Text style={s.refLabel}>BOOKING REFERENCE</Text>
            <Text style={s.refCode}>{code}</Text>
          </View>

          <View style={s.summaryCard}>
            <Image source={{ uri: exp.images[0] }} style={s.summaryImg} />
            <View style={{ flex: 1 }}>
              <Text style={s.summaryTitle} numberOfLines={2}>{exp.title}</Text>
              <Text style={s.summaryMeta}>{exp.dateLabel || 'Date TBC'} · {people} {people === 1 ? 'person' : 'people'}</Text>
              <Text style={s.summaryMeta}>{format(total)} paid</Text>
            </View>
          </View>

          <TouchableOpacity style={{ width: '100%', marginTop: spacing.xl }} activeOpacity={0.9}
            onPress={() => navigation.navigate('Main', { screen: 'TripsTab' })}>
            <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.payBtn}>
              <Text style={s.payText}>View in Trips</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={s.doneBtn} onPress={() => navigation.popToTop?.() || navigation.navigate('Main')}>
            <Text style={[s.doneText, { color: colors.textSecondary }]}>Done</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ---- Checkout state ----
  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Confirm and pay</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140 }}>
        {/* Experience summary */}
        <View style={s.summaryCard}>
          <Image source={{ uri: exp.images[0] }} style={s.summaryImg} />
          <View style={{ flex: 1 }}>
            <Text style={s.summaryCat}>{categoryLabel(exp.category)}</Text>
            <Text style={s.summaryTitle} numberOfLines={2}>{exp.title}</Text>
            <Text style={s.summaryMeta}>{exp.dateLabel || 'Date TBC'}{exp.location ? ` · ${exp.location}` : ''}</Text>
          </View>
        </View>

        {/* People */}
        <View style={s.row}>
          <Text style={s.rowLabel}>Guests</Text>
          <Text style={s.rowValue}>{people} {people === 1 ? 'person' : 'people'}</Text>
        </View>

        {/* Payment method */}
        <Text style={s.section}>Pay with</Text>
        <TouchableOpacity style={s.payRow} activeOpacity={0.85}
          onPress={() => navigation.navigate('PaymentMethods')}>
          <View style={s.cardIcon}><Ionicons name="card" size={18} color={colors.primary} /></View>
          <View style={{ flex: 1 }}>
            {card ? (
              <>
                <Text style={s.cardName}>{card.brand} •••• {card.last4}</Text>
                <Text style={s.cardSub}>Default card</Text>
              </>
            ) : (
              <Text style={s.cardName}>Add a payment method</Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </TouchableOpacity>

        {/* Price details */}
        <Text style={s.section}>Price details</Text>
        <View style={s.priceCard}>
          <View style={s.priceRow}>
            <Text style={s.priceLabel}>{format(exp.pricePerPerson)} × {people} {people === 1 ? 'person' : 'people'}</Text>
            <Text style={s.priceVal}>{format(subtotal)}</Text>
          </View>
          <View style={[s.priceRow, s.priceTotalRow, { borderTopColor: colors.borderLight }]}>
            <Text style={s.priceTotalLabel}>Total</Text>
            <Text style={s.priceTotalVal}>{format(total)}</Text>
          </View>
        </View>

        {/* Cancellation policy note */}
        <View style={s.policyNote}>
          <Ionicons name="shield-checkmark-outline" size={16} color={colors.primary} />
          <Text style={s.policyText}>
            {getPolicy(exp.cancellationPolicy).tier} cancellation · {getPolicy(exp.cancellationPolicy).summary}
          </Text>
        </View>
      </ScrollView>

      {/* Sticky pay footer */}
      <View style={[s.footer, { backgroundColor: colors.background, borderTopColor: colors.borderLight }]}>
        <View>
          <Text style={s.footerTotal}>{format(total)}</Text>
          <Text style={s.footerSub}>total</Text>
        </View>
        <TouchableOpacity onPress={confirmAndPay} disabled={paying} activeOpacity={0.9} style={{ flex: 1, marginLeft: spacing.lg }}>
          <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.payBtn}>
            {paying ? <ActivityIndicator color="#fff" /> : <Text style={s.payText}>Confirm & pay</Text>}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.backgroundSecondary, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, ...fonts.bold, color: colors.textPrimary },
    summaryCard: { flexDirection: 'row', gap: spacing.md, backgroundColor: colors.card, borderRadius: borderRadius.xl, padding: spacing.md, borderWidth: 1, borderColor: colors.borderLight },
    summaryImg: { width: 76, height: 76, borderRadius: borderRadius.lg },
    summaryCat: { fontSize: 11, ...fonts.semiBold, color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
    summaryTitle: { fontSize: 15, ...fonts.bold, color: colors.textPrimary },
    summaryMeta: { fontSize: 13, ...fonts.regular, color: colors.textSecondary, marginTop: 2 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.lg },
    rowLabel: { fontSize: 15, ...fonts.medium, color: colors.textSecondary },
    rowValue: { fontSize: 15, ...fonts.semiBold, color: colors.textPrimary },
    section: { fontSize: 16, ...fonts.bold, color: colors.textPrimary, marginTop: spacing.xl, marginBottom: spacing.sm },
    payRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.card, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.borderLight, padding: spacing.md },
    cardIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primarySubtle, alignItems: 'center', justifyContent: 'center' },
    cardName: { fontSize: 15, ...fonts.semiBold, color: colors.textPrimary },
    cardSub: { fontSize: 12, ...fonts.regular, color: colors.textSecondary },
    priceCard: { backgroundColor: colors.card, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.borderLight, padding: spacing.base },
    priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
    priceLabel: { fontSize: 14, ...fonts.regular, color: colors.textSecondary },
    priceVal: { fontSize: 14, ...fonts.medium, color: colors.textPrimary },
    priceTotalRow: { borderTopWidth: 1, marginTop: 4, paddingTop: spacing.sm },
    priceTotalLabel: { fontSize: 15, ...fonts.bold, color: colors.textPrimary },
    priceTotalVal: { fontSize: 16, ...fonts.bold, color: colors.primary },
    policyNote: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', marginTop: spacing.lg },
    policyText: { flex: 1, fontSize: 13, ...fonts.regular, color: colors.textSecondary, lineHeight: 18 },
    footer: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl, borderTopWidth: 1 },
    footerTotal: { fontSize: 20, ...fonts.bold, color: colors.textPrimary },
    footerSub: { fontSize: 12, ...fonts.regular, color: colors.textSecondary },
    payBtn: { paddingVertical: spacing.md + 2, borderRadius: borderRadius.lg, alignItems: 'center' },
    payText: { fontSize: 16, ...fonts.bold, color: '#fff' },
    // Confirmation
    successBadge: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#22B07D', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
    successTitle: { fontSize: 24, ...fonts.bold, color: colors.textPrimary, textAlign: 'center' },
    successSub: { fontSize: 15, ...fonts.regular, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs, paddingHorizontal: spacing.lg },
    refCard: { width: '100%', backgroundColor: colors.card, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.borderLight, alignItems: 'center', paddingVertical: spacing.lg, marginTop: spacing.xl },
    refLabel: { fontSize: 11, ...fonts.semiBold, color: colors.textSecondary, letterSpacing: 1 },
    refCode: { fontSize: 22, ...fonts.bold, color: colors.primary, marginTop: 4 },
    doneBtn: { marginTop: spacing.md, padding: spacing.sm },
    doneText: { fontSize: 15, ...fonts.semiBold },
  });
}

export default ExperienceCheckoutScreen;
