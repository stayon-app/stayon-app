import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useHaptics } from '../hooks/useHaptics';
import { fonts, fontSizes, spacing, borderRadius, letterSpacing, shadows } from '../constants';
import { withOpacity } from '../utils/color';
import { ScreenHeader } from '../components/common';
import { STAYON_GRADIENT } from '../components/GradientButton';
import { getListings, type HostListing } from '../data/listings';
import { getReservations } from '../data/reservations';
import { getIdentity } from '../data/account';
import { getPayout } from '../data/account';

interface Step { key: string; title: string; sub: string; done: boolean; route?: string; params?: any; }

const TIPS = [
  { icon: 'sunny-outline', title: 'Bright daytime photos', body: 'Listings with 12+ light, tidy photos get the most clicks. Lead with your best room.' },
  { icon: 'flash-outline', title: 'Turn on Instant Book', body: 'Instant‑book listings appear in more searches and convert faster.' },
  { icon: 'chatbubbles-outline', title: 'Reply within an hour', body: 'Fast replies lift your response rate — a key search‑ranking signal.' },
  { icon: 'pricetag-outline', title: 'Price a little low at first', body: 'A few early 5‑star reviews are worth more than a few extra dollars. Raise later.' },
];

export function FirstBookingScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { light } = useHaptics();
  const styles = makeStyles(colors);

  const [steps, setSteps] = useState<Step[]>([]);
  const [hasBooking, setHasBooking] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      (async () => {
        const [ls, res, ident, payout] = await Promise.all([getListings(), getReservations(), getIdentity(), getPayout()]);
        if (!active) return;
        const published = ls.find((l) => l.status === 'published');
        const enoughPhotos = ls.find((l) => (l.images?.length ?? 0) >= 6);
        setHasBooking(res.some((r) => r.status === 'confirmed' || r.status === 'completed'));
        setSteps([
          { key: 'verify', title: 'Verify your identity', sub: 'Builds guest trust — required to publish', done: ident.status === 'verified', route: 'IdentityVerification' },
          { key: 'payout', title: 'Add a payout method', sub: 'So you get paid (you keep 100%)', done: !!payout, route: 'PayoutSetup' },
          { key: 'listing', title: 'Publish a listing', sub: 'Your place needs to be live to get booked', done: !!published, route: published ? 'ListingDetails' : 'ListingCreate', params: published ? { id: published.id } : undefined },
          { key: 'photos', title: 'Add 6+ photos', sub: 'More bright photos = more bookings', done: !!enoughPhotos, route: published ? 'ListingEdit' : 'ListingCreate', params: published ? { id: published.id } : undefined },
        ]);
      })();
      return () => { active = false; };
    }, [])
  );

  const doneCount = steps.filter((s) => s.done).length;
  const pct = steps.length ? Math.round((doneCount / steps.length) * 100) : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Get your first booking" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['4xl'] }}>
        {/* Progress hero */}
        <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <Text style={styles.heroLabel}>{hasBooking ? 'You’re up and running 🎉' : 'Setup progress'}</Text>
          <Text style={styles.heroValue}>{pct}%</Text>
          <View style={styles.bar}><View style={[styles.barFill, { width: `${pct}%` }]} /></View>
          <Text style={styles.heroSub}>{hasBooking ? 'Keep your calendar fresh and replies quick to keep bookings coming.' : `${doneCount} of ${steps.length} steps done — finish to start getting booked.`}</Text>
        </LinearGradient>

        {/* Checklist */}
        <Text style={styles.section}>Your setup checklist</Text>
        <View style={styles.card}>
          {steps.map((s, i) => (
            <TouchableOpacity key={s.key} style={[styles.step, i < steps.length - 1 && styles.divider]} activeOpacity={0.8}
              onPress={() => { if (!s.route) return; light(); s.params ? navigation.navigate(s.route, s.params) : navigation.navigate(s.route as never); }}>
              <Ionicons name={s.done ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={s.done ? colors.success : colors.textTertiary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.stepTitle, s.done && { color: colors.textSecondary, textDecorationLine: 'line-through' }]}>{s.title}</Text>
                <Text style={styles.stepSub}>{s.sub}</Text>
              </View>
              {!s.done && <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* New-listing promo */}
        <Text style={styles.section}>First‑booking boost</Text>
        <View style={styles.promoCard}>
          <View style={styles.promoTop}>
            <View style={styles.promoBadge}><Text style={styles.promoBadgeText}>20% OFF</Text></View>
            <Text style={styles.promoTitle}>New‑listing promotion</Text>
          </View>
          <Text style={styles.promoBody}>Offer 20% off to your first 3 guests. It’s the fastest way to earn those crucial first reviews that push your listing up the search results.</Text>
          <TouchableOpacity style={styles.promoBtn} activeOpacity={0.9} onPress={() => { light(); navigation.navigate('Listings'); }}>
            <Text style={styles.promoBtnText}>Set up in your listing</Text>
            <Ionicons name="arrow-forward" size={15} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Rank tips */}
        <Text style={styles.section}>Climb the search results</Text>
        {TIPS.map((t) => (
          <View key={t.title} style={styles.tipRow}>
            <View style={[styles.tipIcon, { backgroundColor: colors.primarySubtle }]}><Ionicons name={t.icon as any} size={18} color={colors.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tipTitle}>{t.title}</Text>
              <Text style={styles.tipBody}>{t.body}</Text>
            </View>
          </View>
        ))}

        <View style={styles.feeBanner}>
          <Ionicons name="pricetag" size={16} color={colors.primary} />
          <Text style={styles.feeText}>Remember: StayOn charges 0% — your biggest advantage over other platforms is that you keep 100% of every booking.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    hero: { borderRadius: borderRadius.xl, padding: spacing.xl, ...shadows.raised },
    heroLabel: { color: 'rgba(255,255,255,0.9)', fontSize: fontSizes.sm, ...fonts.semiBold },
    heroValue: { color: '#fff', fontSize: fontSizes['4xl'], letterSpacing: letterSpacing.tight, marginTop: 2, ...fonts.bold },
    bar: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.25)', marginTop: spacing.sm, overflow: 'hidden' },
    barFill: { height: 8, borderRadius: 4, backgroundColor: '#fff' },
    heroSub: { color: 'rgba(255,255,255,0.9)', fontSize: fontSizes.sm, marginTop: spacing.sm, lineHeight: 18, ...fonts.regular },
    section: { fontSize: fontSizes.lg, letterSpacing: letterSpacing.snug, color: colors.textPrimary, marginTop: spacing.xl, marginBottom: spacing.sm, ...fonts.bold },
    card: { backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.base, ...shadows.card },
    step: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
    divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight },
    stepTitle: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.semiBold },
    stepSub: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 1, ...fonts.regular },
    promoCard: { backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.base, borderWidth: 1, borderColor: withOpacity(colors.primary, 0.25), ...shadows.card },
    promoTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    promoBadge: { backgroundColor: colors.primary, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 8 },
    promoBadgeText: { color: '#fff', fontSize: fontSizes.xs, ...fonts.bold },
    promoTitle: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.bold },
    promoBody: { fontSize: fontSizes.base, color: colors.textSecondary, lineHeight: 21, marginTop: spacing.sm, ...fonts.regular },
    promoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: spacing.md, paddingVertical: spacing.md, borderRadius: borderRadius.md, backgroundColor: colors.primary },
    promoBtnText: { color: '#fff', fontSize: fontSizes.base, ...fonts.bold },
    tipRow: { flexDirection: 'row', gap: spacing.md, padding: spacing.base, borderRadius: borderRadius.lg, backgroundColor: colors.card, marginBottom: spacing.sm, ...shadows.card },
    tipIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
    tipTitle: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.semiBold },
    tipBody: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 2, lineHeight: 18, ...fonts.regular },
    feeBanner: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: spacing.lg, padding: spacing.base, borderRadius: borderRadius.lg, backgroundColor: colors.primarySubtle },
    feeText: { flex: 1, fontSize: fontSizes.sm, color: colors.textPrimary, lineHeight: 19, ...fonts.medium },
  });

export default FirstBookingScreen;
