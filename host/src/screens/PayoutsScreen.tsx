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
import { buildPayouts, type Payout } from '../data/analytics';
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

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      getReservations().then((res) => {
        if (!active) return;
        const p = buildPayouts(res);
        setPaid(p.paid); setScheduled(p.scheduled); setNext(p.nextPayout);
      });
      getPayout().then((m) => { if (active) setMethod(m); });
      return () => { active = false; };
    }, [])
  );

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
    card: { backgroundColor: colors.card, borderRadius: borderRadius.lg, paddingHorizontal: spacing.base, ...shadows.card },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight },
    rowIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
    rowTitle: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.semiBold },
    rowSub: { fontSize: fontSizes.sm, color: colors.textTertiary, marginTop: 1, ...fonts.regular },
    rowAmount: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.bold },
    empty: { fontSize: fontSizes.base, color: colors.textTertiary, textAlign: 'center', paddingVertical: spacing.xl, ...fonts.regular },
  });

export default PayoutsScreen;
