import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useHaptics } from '../hooks/useHaptics';
import { fonts, fontSizes, spacing, borderRadius, letterSpacing } from '../constants';
import { withOpacity } from '../utils/color';
import { ScreenHeader } from '../components/common';
import { STAYON_GRADIENT } from '../components/GradientButton';
import { getReservations, type HostReservation } from '../data/reservations';
import { buildMonthlyEarnings, getHostingSince, lifetimeTotal, type MonthEarnings } from '../data/earnings';

export function MonthlyEarningsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { format } = useCurrency();
  const { light } = useHaptics();
  const styles = makeStyles(colors);
  const [months, setMonths] = useState<MonthEarnings[]>([]);
  const [year, setYear] = useState<number | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      (async () => {
        const [res, since] = await Promise.all([getReservations(), getHostingSince()]);
        if (!active) return;
        const now = new Date();
        const list = buildMonthlyEarnings(res, since, { year: now.getFullYear(), month: now.getMonth() });
        setMonths(list);
        setOpen(list.find((m) => m.bookings > 0)?.key ?? list[0]?.key ?? null);
      })();
      return () => { active = false; };
    }, [])
  );

  const years = Array.from(new Set(months.map((m) => m.year))).sort((a, b) => b - a);
  const shown = year ? months.filter((m) => m.year === year) : months;
  const lifetime = lifetimeTotal(months);
  const totalNights = months.reduce((s, m) => s + m.nights, 0);
  const bestMonth = months.reduce<MonthEarnings | null>((best, m) => (!best || m.earnings > best.earnings ? m : best), null);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Monthly earnings" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['4xl'] }}>
        {/* Lifetime summary */}
        <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <Text style={styles.heroLabel}>Lifetime earnings</Text>
          <Text style={styles.heroValue}>{format(lifetime)}</Text>
          <View style={styles.heroMetaRow}>
            <Text style={styles.heroSub}>{months.length} months hosting · {totalNights} nights</Text>
          </View>
          {bestMonth && bestMonth.earnings > 0 && (
            <View style={styles.bestPill}>
              <Ionicons name="trophy-outline" size={13} color="#fff" />
              <Text style={styles.bestText}>Best month: {bestMonth.label} · {format(bestMonth.earnings)}</Text>
            </View>
          )}
        </LinearGradient>

        {/* Year filter */}
        {years.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.yearScroll} contentContainerStyle={styles.yearRow}>
            <TouchableOpacity style={[styles.yearChip, !year && styles.yearChipActive]} onPress={() => { light(); setYear(null); }}>
              <Text style={[styles.yearText, !year && styles.yearTextActive]}>All</Text>
            </TouchableOpacity>
            {years.map((y) => (
              <TouchableOpacity key={y} style={[styles.yearChip, year === y && styles.yearChipActive]} onPress={() => { light(); setYear(y); }}>
                <Text style={[styles.yearText, year === y && styles.yearTextActive]}>{y}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <Text style={styles.note}>Earnings count confirmed and completed stays. StayOn takes 0% — every amount is yours, plus cleaning; only taxes pass through.</Text>

        {/* Month list */}
        {shown.map((mo) => {
          const isOpen = open === mo.key;
          const hasBookings = mo.bookings > 0;
          return (
            <View key={mo.key} style={styles.monthCard}>
              <TouchableOpacity style={styles.monthHead} activeOpacity={hasBookings ? 0.7 : 1} onPress={() => { if (!hasBookings) return; light(); setOpen(isOpen ? null : mo.key); }}>
                <View style={[styles.monthIcon, { backgroundColor: hasBookings ? colors.primarySubtle : colors.backgroundSecondary }]}>
                  <Text style={[styles.monthIconText, { color: hasBookings ? colors.primary : colors.textTertiary }]}>{mo.monthShort}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.monthLabel}>{mo.label}</Text>
                  <Text style={styles.monthMeta}>
                    {hasBookings ? `${mo.bookings} booking${mo.bookings > 1 ? 's' : ''} · ${mo.nights} night${mo.nights > 1 ? 's' : ''}` : 'No bookings'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.monthAmount, !hasBookings && { color: colors.textTertiary }]}>{format(mo.earnings)}</Text>
                  {hasBookings && <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textTertiary} style={{ marginTop: 2 }} />}
                </View>
              </TouchableOpacity>

              {isOpen && hasBookings && (
                <View style={styles.monthBody}>
                  {mo.scheduled > 0 && (
                    <View style={styles.splitRow}>
                      <View style={styles.splitLeft}><View style={[styles.splitDot, { backgroundColor: colors.success }]} /><Text style={styles.splitLabel}>Paid out</Text></View>
                      <Text style={styles.splitValue}>{format(mo.realised)}</Text>
                    </View>
                  )}
                  {mo.scheduled > 0 && (
                    <View style={styles.splitRow}>
                      <View style={styles.splitLeft}><View style={[styles.splitDot, { backgroundColor: colors.warning }]} /><Text style={styles.splitLabel}>Scheduled</Text></View>
                      <Text style={styles.splitValue}>{format(mo.scheduled)}</Text>
                    </View>
                  )}
                  {mo.reservations.map((r) => (
                    <TouchableOpacity key={r.id} style={styles.resRow} onPress={() => navigation.navigate('ReservationDetail', { id: r.id })}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.resGuest}>{r.guestName}</Text>
                        <Text style={styles.resMeta}>{r.checkIn} · {r.nights}n · {r.status === 'completed' ? 'Paid' : 'Scheduled'}</Text>
                      </View>
                      <Text style={styles.resAmount}>{format(r.payout)}</Text>
                      <Ionicons name="chevron-forward" size={15} color={colors.textTertiary} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          );
        })}
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
    heroMetaRow: { marginTop: spacing.sm },
    heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: fontSizes.sm, ...fonts.medium },
    bestPill: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: 999 },
    bestText: { color: '#fff', fontSize: fontSizes.xs, ...fonts.semiBold },
    yearScroll: { flexGrow: 0, flexShrink: 0, marginTop: spacing.lg },
    yearRow: { gap: spacing.sm, alignItems: 'center' },
    yearChip: { height: 32, justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderLight },
    yearChipActive: { backgroundColor: withOpacity(colors.primary, 0.12), borderColor: colors.primary },
    yearText: { fontSize: fontSizes.sm, color: colors.textSecondary, ...fonts.semiBold },
    yearTextActive: { color: colors.primary },
    note: { fontSize: fontSizes.sm, color: colors.textTertiary, lineHeight: 18, marginTop: spacing.md, marginBottom: spacing.base, ...fonts.regular },
    monthCard: { backgroundColor: colors.card, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.borderLight, marginBottom: spacing.sm, overflow: 'hidden' },
    monthHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.base },
    monthIcon: { width: 44, height: 44, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' },
    monthIconText: { fontSize: fontSizes.sm, ...fonts.bold },
    monthLabel: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.bold },
    monthMeta: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 1, ...fonts.regular },
    monthAmount: { fontSize: fontSizes.md, color: colors.textPrimary, ...fonts.bold },
    monthBody: { paddingHorizontal: spacing.base, paddingBottom: spacing.base, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderLight, paddingTop: spacing.sm },
    splitRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
    splitLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    splitDot: { width: 8, height: 8, borderRadius: 4 },
    splitLabel: { fontSize: fontSizes.sm, color: colors.textSecondary, ...fonts.medium },
    splitValue: { fontSize: fontSizes.sm, color: colors.textPrimary, ...fonts.semiBold },
    resRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderLight },
    resGuest: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.semiBold },
    resMeta: { fontSize: fontSizes.xs, color: colors.textTertiary, marginTop: 1, ...fonts.regular },
    resAmount: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.bold },
  });

export default MonthlyEarningsScreen;
