import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useHaptics } from '../hooks/useHaptics';
import { confirmAction } from '../utils/confirm';
import { fonts, fontSizes, spacing, borderRadius, letterSpacing } from '../constants';
import { withOpacity } from '../utils/color';
import { ScreenHeader } from '../components/common';
import { StatusBadge } from '../components/StatusBadge';
import { STAYON_GRADIENT } from '../components/GradientButton';
import { getReservations, setReservationStatus, type HostReservation } from '../data/reservations';
import { Api } from '../../api';

export function ReservationDetailScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const { format } = useCurrency();
  const { light, success } = useHaptics();
  const styles = makeStyles(colors);
  const id = route?.params?.id;
  const [r, setR] = useState<HostReservation | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      getReservations().then((all) => { if (active) setR(all.find((x) => x.id === id) ?? null); });
      return () => { active = false; };
    }, [id])
  );

  if (!r) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScreenHeader title="Reservation" onBack={() => navigation.goBack()} />
      </SafeAreaView>
    );
  }

  const accept = async () => {
    success();
    const all = await setReservationStatus(r.id, 'confirmed');
    setR(all.find((x) => x.id === r.id) ?? null);
    try { await Api.auth.ensureSession(); await Api.reservations.actByCode(r.code, 'accept'); } catch {}
  };
  const decline = () => confirmAction({
    title: 'Decline request?', message: 'The guest will be notified and not charged.', confirmText: 'Decline', destructive: true,
    onConfirm: async () => {
      const all = await setReservationStatus(r.id, 'cancelled');
      setR(all.find((x) => x.id === r.id) ?? null);
      try { await Api.auth.ensureSession(); await Api.reservations.actByCode(r.code, 'decline'); } catch {}
    },
  });

  const kv = (k: string, v: string) => (
    <View style={styles.kv}><Text style={styles.k}>{k}</Text><Text style={styles.v}>{v}</Text></View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Reservation" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing['4xl'] }}>
        {/* Guest + listing */}
        <View style={styles.headerCard}>
          <Image source={{ uri: r.guestAvatar }} style={styles.avatar} contentFit="cover" />
          <View style={{ flex: 1 }}>
            <Text style={styles.guest}>{r.guestName}</Text>
            <Text style={styles.code}>{r.code}</Text>
          </View>
          <StatusBadge status={r.status} />
        </View>

        <View style={styles.listingRow}>
          <Image source={{ uri: r.image }} style={styles.listingImg} contentFit="cover" />
          <Text style={styles.listingTitle} numberOfLines={2}>{r.listingTitle}</Text>
        </View>

        {!!r.message && (
          <View style={styles.message}>
            <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.primary} />
            <Text style={styles.messageText}>{r.message}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trip details</Text>
          {kv('Check‑in', r.checkIn)}
          {kv('Check‑out', r.checkOut)}
          {kv('Nights', String(r.nights))}
          {kv('Guests', String(r.guests))}
          {kv('Booking type', r.instant ? 'Instant book' : 'Request to book')}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Earnings</Text>
          {kv(`${format(r.subtotal / r.nights)} × ${r.nights} nights`, format(r.subtotal))}
          {kv('Cleaning fee', format(r.cleaningFee))}
          {kv('StayOn fee', 'Free')}
          <View style={[styles.kv, styles.payoutRow]}>
            <Text style={styles.payoutK}>Your payout</Text>
            <Text style={styles.payoutV}>{format(r.payout)}</Text>
          </View>
          <Text style={styles.note}>StayOn charges no platform fee — you keep the full nightly rate and cleaning fee. The guest pays {format(r.total)} (incl. taxes); only taxes pass through.</Text>
        </View>

        {/* Message guest */}
        <TouchableOpacity style={styles.msgBtn} onPress={() => { light(); navigation.navigate('Main', { screen: 'InboxTab' }); }}>
          <Ionicons name="chatbubbles-outline" size={18} color={colors.primary} />
          <Text style={styles.msgBtnText}>Message {r.guestName.split(' ')[0]}</Text>
        </TouchableOpacity>

        {/* Stay management — confirmed bookings */}
        {r.status === 'confirmed' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Manage this stay</Text>
            <TouchableOpacity style={styles.manageRow} onPress={() => { light(); navigation.navigate('CheckInPrep', { id: r.id }); }}>
              <View style={[styles.manageIcon, { backgroundColor: colors.primarySubtle }]}>
                <Ionicons name="enter-outline" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.manageTitle}>Check‑in prep</Text>
                <Text style={styles.manageSub}>Ready the place & send arrival details</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.manageRow} onPress={() => { light(); navigation.navigate('Checkout', { id: r.id }); }}>
              <View style={[styles.manageIcon, { backgroundColor: colors.primarySubtle }]}>
                <Ionicons name="exit-outline" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.manageTitle}>Checkout</Text>
                <Text style={styles.manageSub}>Inspect, report damage & complete</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Review guest — completed bookings */}
        {r.status === 'completed' && (
          <TouchableOpacity style={[styles.msgBtn, { marginTop: spacing.md }]} onPress={() => { light(); navigation.navigate('GuestReview', { id: r.id, guestName: r.guestName }); }}>
            <Ionicons name="star-outline" size={18} color={colors.primary} />
            <Text style={styles.msgBtnText}>Review {r.guestName.split(' ')[0]}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Footer actions for pending requests */}
      {r.status === 'pending' && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.declineBtn} onPress={decline}>
            <Text style={styles.declineText}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={0.9} onPress={accept}>
            <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.acceptBtn}>
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={styles.acceptText}>Accept request</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    headerCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginHorizontal: spacing.lg, marginTop: spacing.base, padding: spacing.base, borderRadius: borderRadius.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderLight },
    avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.backgroundSecondary },
    guest: { fontSize: fontSizes.lg, letterSpacing: letterSpacing.snug, color: colors.textPrimary, ...fonts.bold },
    code: { fontSize: fontSizes.sm, color: colors.textTertiary, marginTop: 2, ...fonts.medium },
    listingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginHorizontal: spacing.lg, marginTop: spacing.md },
    listingImg: { width: 44, height: 44, borderRadius: borderRadius.md, backgroundColor: colors.backgroundSecondary },
    listingTitle: { flex: 1, fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.semiBold },
    message: { flexDirection: 'row', gap: 8, marginHorizontal: spacing.lg, marginTop: spacing.md, padding: spacing.base, borderRadius: borderRadius.lg, backgroundColor: colors.primarySubtle, borderWidth: 1, borderColor: withOpacity(colors.primary, 0.2) },
    messageText: { flex: 1, fontSize: fontSizes.base, lineHeight: 21, color: colors.textPrimary, ...fonts.regular },
    section: { marginHorizontal: spacing.lg, marginTop: spacing.xl },
    sectionTitle: { fontSize: fontSizes.lg, letterSpacing: letterSpacing.snug, color: colors.textPrimary, marginBottom: spacing.sm, ...fonts.bold },
    kv: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight },
    k: { fontSize: fontSizes.base, color: colors.textSecondary, ...fonts.regular },
    v: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.semiBold },
    payoutRow: { borderBottomWidth: 0, marginTop: 2 },
    payoutK: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.bold },
    payoutV: { fontSize: fontSizes.lg, color: colors.primary, ...fonts.bold },
    note: { fontSize: fontSizes.sm, color: colors.textTertiary, marginTop: 6, ...fonts.regular },
    msgBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: spacing.lg, marginTop: spacing.xl, paddingVertical: spacing.base, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.borderLight },
    msgBtnText: { fontSize: fontSizes.base, color: colors.primary, ...fonts.semiBold },
    manageRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight },
    manageIcon: { width: 40, height: 40, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' },
    manageTitle: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.semiBold },
    manageSub: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 1, ...fonts.regular },
    footer: { flexDirection: 'row', gap: spacing.md, padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.borderLight, backgroundColor: colors.surface },
    declineBtn: { paddingVertical: spacing.base, paddingHorizontal: spacing.xl, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.error },
    declineText: { fontSize: fontSizes.base, color: colors.error, ...fonts.bold },
    acceptBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: spacing.base, borderRadius: borderRadius.lg },
    acceptText: { color: '#fff', fontSize: fontSizes.md, ...fonts.bold },
  });

export default ReservationDetailScreen;
