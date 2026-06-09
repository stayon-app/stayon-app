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
import { fonts, fontSizes, spacing, borderRadius, letterSpacing, shadows } from '../constants';
import { withOpacity } from '../utils/color';
import { ScreenHeader } from '../components/common';
import { STAYON_GRADIENT } from '../components/GradientButton';
import { getReservations } from '../data/reservations';
import { buildPayouts, buildDailyEarnings, buildMonthlyEarnings, earningsSummary, type Payout, type DayEarning, type MonthEarning } from '../data/analytics';
import { getPayout, type Payout as PayoutMethod } from '../data/account';

export function PayoutsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { format } = useCurrency();
  const { light } = useHaptics();
  const styles = makeStyles(colors);

  const [paid, setPaid] = useState<Payout[]>([]);
  const [scheduled, setScheduled] = useState<Payout[]>([]);
  const [next, setNext] = useState<Payout | null>(null);
  const [method, setMethod] = useState<PayoutMethod | null>(null);
  const [days, setDays] = useState<DayEarning[]>([]);
  const [months, setMonths] = useState<MonthEarning[]>([]);
  const [summary, setSummary] = useState({ lifetime: 0, thisMonth: 0, best: null as MonthEarning | null, monthsCount: 0 });
  const [mode, setMode] = useState<'month' | 'day'>('month');

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      getReservations().then((res) => {
        if (!active) return;
        const p = buildPayouts(res);
        setPaid(p.paid); setScheduled(p.scheduled); setNext(p.nextPayout);
        setDays(buildDailyEarnings(res));
        setMonths(buildMonthlyEarnings(res));
        setSummary(earningsSummary(res, new Date()));
      });
      getPayout().then((m) => { if (active) setMethod(m); });
      return () => { active = false; };
    }, [])
  );

  const maxMonth = months.reduce((m, x) => Math.max(m, x.amount), 0) || 1;

  const scheduledTotal = scheduled.reduce((s, p) => s + p.amount, 0);
  const paidTotal = paid.reduce((s, p) => s + p.amount, 0);

  const Row = ({ p }: { p: Payout }) => (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: withOpacity(p.status === 'paid' ? colors.success : colors.warning, 0.14) }]}>
        <Ionicons name={p.status === 'paid' ? 'checkmark' : 'time'} size={16} color={p.status === 'paid' ? colors.success : colors.warning} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{p.guestName}</Text>
        <Text style={styles.rowSub} numberOfLines={1}>{p.releaseLabel}</Text>
      </View>
      <Text style={styles.rowAmount}>{format(p.amount)}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Payouts" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['4xl'] }}>
        {/* Next payout hero */}
        <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <Text style={styles.heroLabel}>Next payout</Text>
          {next ? (
            <>
              <Text style={styles.heroValue}>{format(next.amount)}</Text>
              <Text style={styles.heroSub}>{next.guestName} · {next.releaseLabel}</Text>
            </>
          ) : (
            <>
              <Text style={styles.heroValue}>{format(0)}</Text>
              <Text style={styles.heroSub}>No upcoming payouts yet</Text>
            </>
          )}
          <View style={styles.heroChips}>
            <View style={styles.heroChip}><Text style={styles.heroChipText}>{format(scheduledTotal)} scheduled</Text></View>
            <View style={styles.heroChip}><Text style={styles.heroChipText}>{format(paidTotal)} paid</Text></View>
          </View>
        </LinearGradient>

        {/* Payout method */}
        <TouchableOpacity style={styles.methodCard} activeOpacity={0.85} onPress={() => { light(); navigation.navigate('PayoutSetup'); }}>
          <View style={[styles.methodIcon, { backgroundColor: method ? colors.primarySubtle : colors.goldLight }]}>
            <Ionicons name={method ? 'card' : 'alert-circle'} size={20} color={method ? colors.primary : colors.goldDark} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.methodTitle}>{method ? method.label : 'Add a payout method'}</Text>
            <Text style={styles.methodSub}>{method ? `${method.holder} · default` : 'Required to receive your earnings'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </TouchableOpacity>

        <View style={styles.feeNote}>
          <Ionicons name="pricetag-outline" size={14} color={colors.primary} />
          <Text style={styles.feeNoteText}>StayOn takes 0% — your payout is the full nightly rate + cleaning. Payouts release ~24h after check‑in.</Text>
        </View>

        {/* Lifetime / this-month / best-month */}
        <View style={styles.statRow}>
          <View style={styles.statTile}><Text style={styles.statVal}>{format(summary.lifetime)}</Text><Text style={styles.statLabel}>Lifetime</Text></View>
          <View style={styles.statTile}><Text style={styles.statVal}>{format(summary.thisMonth)}</Text><Text style={styles.statLabel}>This month</Text></View>
          <View style={styles.statTile}><Text style={styles.statVal}>{summary.best ? summary.best.short : '—'}</Text><Text style={styles.statLabel}>Best month</Text></View>
        </View>

        {/* Earnings breakdown — day-wise & month-wise */}
        <View style={styles.breakHeader}>
          <Text style={styles.section}>Earnings breakdown</Text>
          <View style={styles.toggle}>
            <TouchableOpacity style={[styles.toggleBtn, mode === 'month' && styles.toggleOn]} onPress={() => { light(); setMode('month'); }}>
              <Text style={[styles.toggleText, mode === 'month' && styles.toggleTextOn]}>Month</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.toggleBtn, mode === 'day' && styles.toggleOn]} onPress={() => { light(); setMode('day'); }}>
              <Text style={[styles.toggleText, mode === 'day' && styles.toggleTextOn]}>Day</Text>
            </TouchableOpacity>
          </View>
        </View>

        {mode === 'month' ? (
          months.length === 0 ? <Text style={styles.empty}>No earnings yet.</Text> : (
            <ScrollView style={[styles.card, months.length > 5 && styles.breakScroll]} nestedScrollEnabled showsVerticalScrollIndicator={months.length > 5}>
              {months.map((m) => (
                <View key={m.key} style={styles.mRow}>
                  <View style={{ width: 52 }}>
                    <Text style={styles.mShort}>{m.short}</Text>
                    <Text style={styles.mYear}>{m.label.split(' ')[1]}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${Math.max(6, (m.amount / maxMonth) * 100)}%`, backgroundColor: m.best ? colors.primary : withOpacity(colors.primary, 0.45) }]} />
                    </View>
                    <Text style={styles.mMeta}>{m.bookings} booking{m.bookings !== 1 ? 's' : ''} · {m.nights} night{m.nights !== 1 ? 's' : ''}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.mAmount}>{format(m.amount)}</Text>
                    {m.best && <View style={styles.bestBadge}><Ionicons name="trophy" size={9} color={colors.goldDark} /><Text style={styles.bestText}>Best</Text></View>}
                  </View>
                </View>
              ))}
            </ScrollView>
          )
        ) : (
          days.length === 0 ? <Text style={styles.empty}>No earnings yet.</Text> : (
            <ScrollView style={[styles.card, days.length > 6 && styles.breakScroll]} nestedScrollEnabled showsVerticalScrollIndicator={days.length > 6}>
              {days.map((d, i) => (
                <View key={i} style={styles.dRow}>
                  <View style={styles.dDate}>
                    <Text style={styles.dDay}>{d.date.getDate()}</Text>
                    <Text style={styles.dMon}>{d.label.split(' ')[0]}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dTitle} numberOfLines={1}>{d.items[0].guestName}{d.items.length > 1 ? ` +${d.items.length - 1} more` : ''}</Text>
                    <Text style={styles.dSub} numberOfLines={1}>{d.weekday} · {d.items[0].listingTitle} · {d.items.reduce((s, x) => s + x.nights, 0)} nights</Text>
                  </View>
                  <Text style={styles.mAmount}>{format(d.amount)}</Text>
                </View>
              ))}
            </ScrollView>
          )
        )}

        {/* Scheduled */}
        {scheduled.length > 0 && (
          <>
            <Text style={styles.section}>Scheduled</Text>
            <View style={styles.card}>{scheduled.map((p) => <Row key={p.id} p={p} />)}</View>
          </>
        )}

        {/* History */}
        <Text style={styles.section}>Payout history</Text>
        {paid.length === 0 ? (
          <Text style={styles.empty}>No payouts yet. Completed stays will appear here.</Text>
        ) : (
          <View style={styles.card}>{paid.map((p) => <Row key={p.id} p={p} />)}</View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    hero: { borderRadius: borderRadius.xl, padding: spacing.xl, ...shadows.raised },
    heroLabel: { color: 'rgba(255,255,255,0.85)', fontSize: fontSizes.sm, ...fonts.medium },
    heroValue: { color: '#fff', fontSize: fontSizes['5xl'], letterSpacing: letterSpacing.tight, marginTop: 4, ...fonts.bold },
    heroSub: { color: 'rgba(255,255,255,0.9)', fontSize: fontSizes.sm, marginTop: spacing.xs, ...fonts.medium },
    heroChips: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.base },
    heroChip: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: 999 },
    heroChipText: { color: '#fff', fontSize: fontSizes.xs, ...fonts.bold },
    methodCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md, padding: spacing.base, borderRadius: borderRadius.lg, backgroundColor: colors.card, ...shadows.card },
    methodIcon: { width: 40, height: 40, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' },
    methodTitle: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.bold },
    methodSub: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 1, ...fonts.regular },
    feeNote: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: spacing.md, padding: spacing.base, borderRadius: borderRadius.md, backgroundColor: colors.primarySubtle },
    feeNoteText: { flex: 1, fontSize: fontSizes.sm, color: colors.textPrimary, lineHeight: 18, ...fonts.medium },
    section: { fontSize: fontSizes.lg, letterSpacing: letterSpacing.snug, color: colors.textPrimary, marginTop: spacing.xl, marginBottom: spacing.sm, ...fonts.bold },
    statRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
    statTile: { flex: 1, alignItems: 'center', paddingVertical: spacing.md, borderRadius: borderRadius.lg, backgroundColor: colors.card, ...shadows.card },
    statVal: { fontSize: fontSizes.md, color: colors.textPrimary, ...fonts.bold },
    statLabel: { fontSize: fontSizes.xs, color: colors.textSecondary, marginTop: 2, ...fonts.medium },
    breakHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    toggle: { flexDirection: 'row', backgroundColor: colors.backgroundSecondary, borderRadius: 999, padding: 3, marginTop: spacing.lg },
    toggleBtn: { paddingHorizontal: spacing.base, paddingVertical: 6, borderRadius: 999 },
    toggleOn: { backgroundColor: colors.card, ...shadows.card },
    toggleText: { fontSize: fontSizes.sm, color: colors.textSecondary, ...fonts.semiBold },
    toggleTextOn: { color: colors.primary, ...fonts.bold },
    mRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight },
    mShort: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.bold },
    mYear: { fontSize: fontSizes.xs, color: colors.textTertiary, ...fonts.regular },
    barTrack: { height: 8, borderRadius: 4, backgroundColor: colors.backgroundSecondary, overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: 4 },
    mMeta: { fontSize: fontSizes.xs, color: colors.textTertiary, marginTop: 4, ...fonts.regular },
    mAmount: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.bold },
    bestBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 3, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 999, backgroundColor: colors.goldLight },
    bestText: { fontSize: 9, color: colors.goldDark, ...fonts.bold },
    dRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight },
    dDate: { width: 44, height: 44, borderRadius: borderRadius.md, backgroundColor: colors.primarySubtle, alignItems: 'center', justifyContent: 'center' },
    dDay: { fontSize: fontSizes.base, color: colors.primary, ...fonts.bold },
    dMon: { fontSize: 9, color: colors.primary, ...fonts.semiBold },
    dTitle: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.semiBold },
    dSub: { fontSize: fontSizes.xs, color: colors.textTertiary, marginTop: 1, ...fonts.regular },
    card: { backgroundColor: colors.card, borderRadius: borderRadius.lg, paddingHorizontal: spacing.base, ...shadows.card },
    breakScroll: { maxHeight: 360 },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight },
    rowIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
    rowTitle: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.semiBold },
    rowSub: { fontSize: fontSizes.sm, color: colors.textTertiary, marginTop: 1, ...fonts.regular },
    rowAmount: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.bold },
    empty: { fontSize: fontSizes.base, color: colors.textTertiary, textAlign: 'center', paddingVertical: spacing.xl, ...fonts.regular },
  });

export default PayoutsScreen;
