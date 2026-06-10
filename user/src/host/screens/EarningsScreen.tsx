import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { fonts, fontSizes, spacing, borderRadius, letterSpacing } from '../constants';
import { withOpacity } from '../utils/color';
import { ScreenHeader } from '../components/common';
import { StatCard } from '../components/StatCard';
import { EarningsChart } from '../components/EarningsChart';
import { getReservations, type HostReservation } from '../data/reservations';
import { Api } from '../../api';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function EarningsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { format } = useCurrency();
  const styles = makeStyles(colors);
  const [res, setRes] = useState<HostReservation[]>([]);
  const [live, setLive] = useState<{ grossUSD: number; netUSD: number; bookings: number } | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      getReservations().then((r) => { if (active) setRes(r); });
      // Authoritative earnings from the backend (real bookings across devices).
      (async () => { try { await Api.auth.ensureSession(); const e = await Api.earnings(); if (active) setLive(e); } catch { /* offline → local */ } })();
      return () => { active = false; };
    }, [])
  );

  const earning = res.filter((r) => r.status === 'confirmed' || r.status === 'completed');
  // Prefer the backend total when it has real bookings; else compute locally.
  const total = (live && live.bookings > 0) ? live.netUSD : earning.reduce((s, r) => s + r.payout, 0);
  const pendingPayout = res.filter((r) => r.status === 'confirmed').reduce((s, r) => s + r.payout, 0);
  const nights = earning.reduce((s, r) => s + r.nights, 0);
  const avgRate = earning.length ? Math.round(earning.reduce((s, r) => s + r.subtotal / r.nights, 0) / earning.length) : 0;

  // Monthly buckets (last 6 visible) from each reservation's check-in month.
  const monthOf = (s: string) => MONTHS.findIndex((m) => s.startsWith(m));
  const buckets = MONTHS.map((m) => ({ label: m, value: 0 }));
  earning.forEach((r) => { const i = monthOf(r.checkIn); if (i >= 0) buckets[i].value += r.payout; });
  const firstWith = buckets.findIndex((b) => b.value > 0);
  const start = Math.max(0, Math.min(firstWith === -1 ? 0 : firstWith, 6));
  const chart = buckets.slice(start, start + 6);

  // Status split
  const byStatus = (st: string) => res.filter((r) => r.status === st).length;
  const statusBars = [
    { key: 'Confirmed', n: byStatus('confirmed'), c: colors.success },
    { key: 'Completed', n: byStatus('completed'), c: colors.primary },
    { key: 'Pending', n: byStatus('pending'), c: colors.warning },
    { key: 'Cancelled', n: byStatus('cancelled'), c: colors.error },
  ];
  const statusTotal = Math.max(1, statusBars.reduce((s, b) => s + b.n, 0));

  // Payout timeline (confirmed → paid after checkout)
  const timeline = res.filter((r) => r.status === 'confirmed' || r.status === 'completed')
    .slice(0, 5)
    .map((r) => ({ ...r, paid: r.status === 'completed' }));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Earnings & analytics" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['4xl'] }}>
        {/* Hero total */}
        <LinearGradient colors={['#0D9488', '#6366F1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <Text style={styles.heroLabel}>Total earnings</Text>
          <Text style={styles.heroValue}>{format(total)}</Text>
          <Text style={styles.heroSub}>{earning.length} bookings · {nights} nights</Text>
        </LinearGradient>

        {/* Stat grid */}
        <View style={styles.statRow}>
          <StatCard label="Pending payout" value={format(pendingPayout)} icon="time" tint={colors.warning} />
          <View style={{ width: spacing.md }} />
          <StatCard label="Avg nightly" value={format(avgRate)} icon="pricetag" />
        </View>

        {/* Revenue chart */}
        <Text style={styles.sectionTitle}>Revenue by month</Text>
        <View style={styles.card}>
          <EarningsChart data={chart} />
        </View>

        {/* Full monthly history */}
        <TouchableOpacity style={styles.monthlyRow} activeOpacity={0.8} onPress={() => navigation.navigate('MonthlyEarnings')}>
          <View style={[styles.monthlyIcon, { backgroundColor: colors.primarySubtle }]}>
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.monthlyTitle}>Monthly earnings</Text>
            <Text style={styles.monthlySub}>Every month since you started hosting</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.monthlyRow} activeOpacity={0.8} onPress={() => navigation.navigate('Payouts')}>
          <View style={[styles.monthlyIcon, { backgroundColor: colors.primarySubtle }]}><Ionicons name="wallet-outline" size={20} color={colors.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.monthlyTitle}>Payouts</Text>
            <Text style={styles.monthlySub}>Next payout, scheduled & paid history</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.monthlyRow} activeOpacity={0.8} onPress={() => navigation.navigate('Trends')}>
          <View style={[styles.monthlyIcon, { backgroundColor: colors.primarySubtle }]}><Ionicons name="trending-up-outline" size={20} color={colors.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.monthlyTitle}>Trends</Text>
            <Text style={styles.monthlySub}>Occupancy, avg rate, repeat guests</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </TouchableOpacity>

        {/* Booking status split */}
        <Text style={styles.sectionTitle}>Bookings by status</Text>
        <View style={styles.card}>
          <View style={styles.segBar}>
            {statusBars.filter((b) => b.n > 0).map((b) => (
              <View key={b.key} style={{ flex: b.n, backgroundColor: b.c, height: 12 }} />
            ))}
            {statusTotal === 0 && <View style={{ flex: 1, height: 12, backgroundColor: colors.borderLight }} />}
          </View>
          <View style={styles.legend}>
            {statusBars.map((b) => (
              <View key={b.key} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: b.c }]} />
                <Text style={styles.legendText}>{b.key} · {b.n}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Payout timeline */}
        <Text style={styles.sectionTitle}>Payouts</Text>
        <View style={styles.card}>
          {timeline.length === 0 ? (
            <Text style={styles.empty}>No payouts yet.</Text>
          ) : timeline.map((t, i) => (
            <View key={t.id} style={[styles.payRow, i < timeline.length - 1 && styles.payDivider]}>
              <View style={[styles.payIcon, { backgroundColor: withOpacity(t.paid ? colors.success : colors.warning, 0.14) }]}>
                <Ionicons name={t.paid ? 'checkmark' : 'time'} size={15} color={t.paid ? colors.success : colors.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.payTitle}>{t.guestName}</Text>
                <Text style={styles.paySub}>{t.paid ? `Paid · ${t.checkOut}` : `Scheduled after ${t.checkOut}`}</Text>
              </View>
              <Text style={styles.payAmount}>{format(t.payout)}</Text>
            </View>
          ))}
        </View>

        {/* Export */}
        <View style={styles.exportRow}>
          <Ionicons name="download-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.exportText}>Export statement (CSV / PDF) — coming with payouts setup</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    hero: { borderRadius: borderRadius.xl, padding: spacing.xl },
    heroLabel: { color: 'rgba(255,255,255,0.85)', fontSize: fontSizes.sm, ...fonts.medium },
    heroValue: { color: '#fff', fontSize: fontSizes['5xl'], letterSpacing: letterSpacing.tight, marginTop: 4, ...fonts.bold },
    heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: fontSizes.sm, marginTop: spacing.sm, ...fonts.medium },
    statRow: { flexDirection: 'row', marginTop: spacing.base },
    sectionTitle: { fontSize: fontSizes.lg, letterSpacing: letterSpacing.snug, color: colors.textPrimary, marginTop: spacing.xl, marginBottom: spacing.sm, ...fonts.bold },
    card: { backgroundColor: colors.card, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.borderLight, padding: spacing.base },
    segBar: { flexDirection: 'row', borderRadius: 999, overflow: 'hidden', marginBottom: spacing.md },
    legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 9, height: 9, borderRadius: 5 },
    legendText: { fontSize: fontSizes.sm, color: colors.textSecondary, ...fonts.medium },
    empty: { fontSize: fontSizes.sm, color: colors.textTertiary, textAlign: 'center', paddingVertical: spacing.md, ...fonts.regular },
    payRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
    payDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight },
    payIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    payTitle: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.semiBold },
    paySub: { fontSize: fontSizes.sm, color: colors.textTertiary, marginTop: 1, ...fonts.regular },
    payAmount: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.bold },
    exportRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: spacing.xl, padding: spacing.base, borderRadius: borderRadius.md, backgroundColor: colors.backgroundSecondary },
    exportText: { flex: 1, fontSize: fontSizes.sm, color: colors.textSecondary, ...fonts.regular },
    monthlyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md, padding: spacing.base, borderRadius: borderRadius.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderLight },
    monthlyIcon: { width: 40, height: 40, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' },
    monthlyTitle: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.semiBold },
    monthlySub: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 1, ...fonts.regular },
  });

export default EarningsScreen;
