import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { fonts, fontSizes, spacing, borderRadius, letterSpacing, shadows } from '../constants';
import { withOpacity } from '../utils/color';
import { ScreenHeader } from '../components/common';
import { EarningsChart } from '../components/EarningsChart';
import { getReservations } from '../data/reservations';
import { buildTrends, type Trends } from '../data/analytics';

export function TrendsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { format } = useCurrency();
  const styles = makeStyles(colors);
  const [t, setT] = useState<Trends | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      getReservations().then((res) => { if (active) setT(buildTrends(res, new Date())); });
      return () => { active = false; };
    }, [])
  );

  if (!t) return <SafeAreaView style={styles.container} edges={['top']}><ScreenHeader title="Trends" onBack={() => navigation.goBack()} /></SafeAreaView>;

  const kpis = [
    { icon: 'bar-chart', tint: colors.primary, value: `${t.occupancy}%`, label: 'Occupancy (next 30d)' },
    { icon: 'pricetag', tint: colors.info, value: format(t.adr), label: 'Avg nightly rate' },
    { icon: 'repeat', tint: colors.success, value: `${t.repeatRate}%`, label: 'Repeat guests' },
    { icon: 'moon', tint: colors.gold, value: `${t.avgStay}`, label: 'Avg nights / stay' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Trends" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['4xl'] }}>
        <Text style={styles.lead}>How your hosting is performing — refreshed from your live reservations.</Text>

        {/* KPI grid */}
        <View style={styles.grid}>
          {kpis.map((k) => (
            <View key={k.label} style={styles.kpi}>
              <View style={[styles.kpiIcon, { backgroundColor: withOpacity(k.tint, 0.14) }]}><Ionicons name={k.icon as any} size={18} color={k.tint} /></View>
              <Text style={styles.kpiValue}>{k.value}</Text>
              <Text style={styles.kpiLabel}>{k.label}</Text>
            </View>
          ))}
        </View>

        {/* Revenue trend */}
        <View style={styles.sectionHead}>
          <Text style={styles.section}>Revenue trend</Text>
          {t.momPct !== null && (
            <View style={[styles.trendPill, { backgroundColor: withOpacity(t.momPct >= 0 ? colors.success : colors.error, 0.14) }]}>
              <Ionicons name={t.momPct >= 0 ? 'trending-up' : 'trending-down'} size={12} color={t.momPct >= 0 ? colors.success : colors.error} />
              <Text style={[styles.trendPillText, { color: t.momPct >= 0 ? colors.success : colors.error }]}>{t.momPct >= 0 ? '+' : ''}{t.momPct}% MoM</Text>
            </View>
          )}
        </View>
        <View style={styles.card}><EarningsChart data={t.monthly} /></View>

        {/* Summary */}
        <Text style={styles.section}>This period</Text>
        <View style={styles.card}>
          <Line k="Total bookings" v={String(t.totalBookings)} colors={colors} />
          <Line k="Total nights" v={String(t.totalNights)} colors={colors} />
          <Line k="Unique guests" v={String(t.uniqueGuests)} colors={colors} />
          <Line k="Repeat guests" v={`${t.repeatRate}%`} colors={colors} last />
        </View>

        <View style={styles.tipCard}>
          <Ionicons name="bulb-outline" size={16} color={colors.gold} />
          <Text style={styles.tipText}>
            {t.occupancy < 50
              ? 'Occupancy is light for the next month — a weekly discount or lower weekday price can fill gaps.'
              : t.repeatRate > 0
                ? 'Guests are coming back — great sign. Keep replies fast and your place spotless.'
                : 'Solid performance. Try a small weekend premium on your busiest nights to lift earnings.'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const Line = ({ k, v, colors, last }: any) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.md, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight }}>
    <Text style={{ fontSize: fontSizes.base, color: colors.textSecondary, ...fonts.regular }}>{k}</Text>
    <Text style={{ fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.bold }}>{v}</Text>
  </View>
);

const makeStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    lead: { fontSize: fontSizes.base, color: colors.textSecondary, lineHeight: 22, marginBottom: spacing.base, ...fonts.regular },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.md },
    kpi: { width: '47%', flexGrow: 1, padding: spacing.base, borderRadius: borderRadius.lg, backgroundColor: colors.card, ...shadows.card },
    kpiIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
    kpiValue: { fontSize: fontSizes['2xl'], color: colors.textPrimary, ...fonts.bold },
    kpiLabel: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 2, ...fonts.medium },
    sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xl, marginBottom: spacing.sm },
    section: { fontSize: fontSizes.lg, letterSpacing: letterSpacing.snug, color: colors.textPrimary, ...fonts.bold },
    trendPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 999 },
    trendPillText: { fontSize: fontSizes.xs, ...fonts.bold },
    card: { backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.base, ...shadows.card },
    tipCard: { flexDirection: 'row', gap: 8, marginTop: spacing.lg, padding: spacing.base, borderRadius: borderRadius.lg, backgroundColor: colors.goldLight, alignItems: 'flex-start' },
    tipText: { flex: 1, fontSize: fontSizes.sm, color: colors.textPrimary, lineHeight: 19, ...fonts.medium },
  });

export default TrendsScreen;
