import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { getListings, saveListing, listingUSD, type HostListing } from '../data/listings';
import { getReservations } from '../data/reservations';
import { buildTrends } from '../data/analytics';
import { getSmartSettings, setSmartSettings, suggestPricing, type SmartSettings, type PricingSuggestion } from '../data/smartPricing';

export function SmartPricingScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const { format } = useCurrency();
  const { light, success, selection } = useHaptics();
  const styles = makeStyles(colors);

  const [listings, setListings] = useState<HostListing[]>([]);
  const [activeId, setActiveId] = useState<string | null>(route?.params?.id ?? null);
  const [settings, setSettings] = useState<SmartSettings>({ enabled: false, minPrice: 0, maxPrice: 0 });
  const [sug, setSug] = useState<PricingSuggestion | null>(null);
  const [minIn, setMinIn] = useState('');
  const [maxIn, setMaxIn] = useState('');

  const load = React.useCallback(() => {
    let active = true;
    (async () => {
      const [ls, res] = await Promise.all([getListings(), getReservations()]);
      if (!active) return;
      setListings(ls);
      const id = activeId ?? ls[0]?.id ?? null;
      setActiveId(id);
      const listing = ls.find((l) => l.id === id);
      if (!listing) return;
      const s = await getSmartSettings(id!);
      setSettings(s); setMinIn(s.minPrice ? String(s.minPrice) : ''); setMaxIn(s.maxPrice ? String(s.maxPrice) : '');
      const trends = buildTrends(res, new Date());
      setSug(suggestPricing(listing.price || 0, trends.occupancy, new Date(), s));
    })();
    return () => { active = false; };
  }, [activeId]);
  useFocusEffect(load);

  const listing = listings.find((l) => l.id === activeId);
  const cur = listing?.priceCurrency;
  const fmt = (n: number) => format(listingUSD(n, cur));

  const persist = async (patch: Partial<SmartSettings>) => {
    if (!activeId || !listing) return;
    const next = { ...settings, ...patch };
    setSettings(next);
    await setSmartSettings(activeId, next);
    const occ = buildTrends(await getReservations(), new Date()).occupancy;
    setSug(suggestPricing(listing.price || 0, occ, new Date(), next));
  };

  const applySuggestion = async () => {
    if (!listing || !sug) return;
    success();
    const weekend = Math.round(sug.suggestedBase * (1 + sug.weekendPremiumPct / 100));
    await saveListing({ ...listing, price: sug.suggestedBase, weekendPrice: weekend });
    const ls = await getListings();
    setListings(ls);
  };

  if (!listing || !sug) {
    return <SafeAreaView style={styles.container} edges={['top']}><ScreenHeader title="Smart Pricing" onBack={() => navigation.goBack()} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Smart Pricing" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['4xl'] }}>
        {/* Listing selector */}
        {listings.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginBottom: spacing.md }} contentContainerStyle={{ gap: spacing.sm, alignItems: 'center' }}>
            {listings.map((l) => (
              <TouchableOpacity key={l.id} style={[styles.lTab, activeId === l.id && styles.lTabActive]} onPress={() => { selection(); setActiveId(l.id); }}>
                <Text style={[styles.lTabText, activeId === l.id && { color: colors.primary }]} numberOfLines={1}>{l.title}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Suggestion hero */}
        <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <Text style={styles.heroLabel}>Recommended weekday rate</Text>
          <Text style={styles.heroValue}>{fmt(sug.suggestedBase)}</Text>
          <View style={styles.heroRow}>
            <View style={styles.heroChip}>
              <Ionicons name={sug.deltaPct >= 0 ? 'trending-up' : 'trending-down'} size={12} color="#fff" />
              <Text style={styles.heroChipText}>{sug.deltaPct >= 0 ? '+' : ''}{sug.deltaPct}% vs your {fmt(listing.price)}</Text>
            </View>
            <View style={styles.heroChip}><Text style={styles.heroChipText}>Weekend +{sug.weekendPremiumPct}%</Text></View>
          </View>
          <TouchableOpacity style={styles.applyBtn} onPress={applySuggestion} activeOpacity={0.9}>
            <Text style={styles.applyText}>Apply this price</Text>
            <Ionicons name="checkmark" size={16} color={colors.primary} />
          </TouchableOpacity>
        </LinearGradient>

        {/* Auto toggle */}
        <View style={styles.toggleCard}>
          <View style={[styles.toggleIcon, { backgroundColor: colors.primarySubtle }]}><Ionicons name="flash" size={18} color={colors.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleTitle}>Keep prices optimized</Text>
            <Text style={styles.toggleSub}>StayOn adjusts nightly rates by demand & season, within your limits.</Text>
          </View>
          <TouchableOpacity style={[styles.toggle, settings.enabled && { backgroundColor: colors.primary }]} onPress={() => persist({ enabled: !settings.enabled })} activeOpacity={0.8}>
            <View style={[styles.knob, settings.enabled && { transform: [{ translateX: 18 }] }]} />
          </TouchableOpacity>
        </View>

        {/* Why */}
        <Text style={styles.section}>Why this price</Text>
        <View style={styles.card}>
          {sug.reasons.map((r, i) => (
            <View key={i} style={[styles.reasonRow, i < sug.reasons.length - 1 && styles.divider]}>
              <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
              <Text style={styles.reasonText}>{r}</Text>
            </View>
          ))}
          <Text style={styles.feeNote}>StayOn takes 0% — every rate Smart Pricing sets is yours to keep.</Text>
        </View>

        {/* Guardrails */}
        <Text style={styles.section}>Price limits</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Never go below (optional)</Text>
          <TextInput style={styles.input} value={minIn} onChangeText={setMinIn} onBlur={() => persist({ minPrice: Number(minIn.replace(/[^0-9]/g, '')) || 0 })} keyboardType="number-pad" placeholder={fmt(sug.range.min)} placeholderTextColor={colors.textTertiary} />
          <Text style={[styles.label, { marginTop: spacing.md }]}>Never go above (optional)</Text>
          <TextInput style={styles.input} value={maxIn} onChangeText={setMaxIn} onBlur={() => persist({ maxPrice: Number(maxIn.replace(/[^0-9]/g, '')) || 0 })} keyboardType="number-pad" placeholder={fmt(sug.range.max)} placeholderTextColor={colors.textTertiary} />
          <Text style={styles.hint}>Suggested healthy range: {fmt(sug.range.min)} – {fmt(sug.range.max)}.</Text>
        </View>

        {/* 7-day preview */}
        <Text style={styles.section}>Next 7 nights</Text>
        <View style={styles.card}>
          {sug.next7.map((d, i) => (
            <View key={i} style={[styles.dayRow, i < 6 && styles.divider]}>
              <Text style={styles.dayLabel}>{d.dateLabel}</Text>
              {d.tag && <View style={styles.dayTag}><Text style={styles.dayTagText}>{d.tag}</Text></View>}
              <View style={{ flex: 1 }} />
              <Text style={styles.dayPrice}>{fmt(d.price)}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    lTab: { maxWidth: 180, height: 34, justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: 17, backgroundColor: colors.card, ...shadows.card },
    lTabActive: { backgroundColor: withOpacity(colors.primary, 0.12) },
    lTabText: { fontSize: fontSizes.sm, color: colors.textSecondary, ...fonts.semiBold },
    hero: { borderRadius: borderRadius.xl, padding: spacing.xl, ...shadows.raised },
    heroLabel: { color: 'rgba(255,255,255,0.85)', fontSize: fontSizes.sm, ...fonts.medium },
    heroValue: { color: '#fff', fontSize: fontSizes['5xl'], letterSpacing: letterSpacing.tight, marginTop: 4, ...fonts.bold },
    heroRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
    heroChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: 999 },
    heroChipText: { color: '#fff', fontSize: fontSizes.xs, ...fonts.bold },
    applyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: spacing.lg, paddingVertical: spacing.base, borderRadius: borderRadius.lg, backgroundColor: '#fff' },
    applyText: { fontSize: fontSizes.md, color: colors.primary, ...fonts.bold },
    toggleCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md, padding: spacing.base, borderRadius: borderRadius.lg, backgroundColor: colors.card, ...shadows.card },
    toggleIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    toggleTitle: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.bold },
    toggleSub: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 1, lineHeight: 17, ...fonts.regular },
    toggle: { width: 42, height: 24, borderRadius: 12, backgroundColor: colors.borderLight, padding: 3, justifyContent: 'center' },
    knob: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff', ...shadows.card },
    section: { fontSize: fontSizes.lg, letterSpacing: letterSpacing.snug, color: colors.textPrimary, marginTop: spacing.xl, marginBottom: spacing.sm, ...fonts.bold },
    card: { backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.base, ...shadows.card },
    reasonRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: spacing.sm },
    divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight },
    reasonText: { flex: 1, fontSize: fontSizes.base, color: colors.textPrimary, lineHeight: 20, ...fonts.regular },
    feeNote: { fontSize: fontSizes.sm, color: colors.textTertiary, marginTop: spacing.sm, ...fonts.regular },
    label: { fontSize: fontSizes.sm, color: colors.textSecondary, marginBottom: 6, ...fonts.semiBold },
    input: { backgroundColor: colors.backgroundSecondary, borderRadius: borderRadius.md, paddingHorizontal: spacing.base, paddingVertical: spacing.md, fontSize: fontSizes.base, color: colors.textPrimary },
    hint: { fontSize: fontSizes.sm, color: colors.textTertiary, marginTop: spacing.sm, ...fonts.regular },
    dayRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
    dayLabel: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.semiBold },
    dayTag: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 999, backgroundColor: colors.primarySubtle },
    dayTagText: { fontSize: 10, color: colors.primary, ...fonts.bold },
    dayPrice: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.bold },
  });

export default SmartPricingScreen;
