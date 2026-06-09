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
import { getReservations } from '../data/reservations';
import { getListings } from '../data/listings';
import { getGuestReviews } from '../data/hostReviews';
import { buildTrends } from '../data/analytics';
import { buildSuggestions, CATEGORY_META, type SuggestionReport, type HostSuggestion } from '../services/hostSuggestions';

// Where each suggestion category sends the host to act.
const ROUTE_FOR: Record<string, string | undefined> = {
  pricing: 'Listings', growth: 'Reviews', highlight: 'Listings', fix: undefined, upgrade: undefined,
};

export function SmartSuggestionsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { light } = useHaptics();
  const styles = makeStyles(colors);

  const [report, setReport] = useState<SuggestionReport | null>(null);

  useFocusEffect(React.useCallback(() => {
    let active = true;
    (async () => {
      const [res, listings, reviews] = await Promise.all([getReservations(), getListings(), getGuestReviews()]);
      if (!active) return;
      const trends = buildTrends(res, new Date());
      setReport(buildSuggestions(reviews, trends, listings));
    })();
    return () => { active = false; };
  }, []));

  const sat = report?.satisfaction;
  const satColor = !sat ? colors.textTertiary : sat.tone === 'positive' ? colors.success : sat.tone === 'action' ? colors.error : colors.warning;

  const act = (s: HostSuggestion) => {
    const route = ROUTE_FOR[s.category];
    if (route) { light(); navigation.navigate(route); }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Smart suggestions" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['4xl'] }}>
        <View style={styles.introRow}>
          <Ionicons name="sparkles" size={16} color={colors.primary} />
          <Text style={styles.intro}>Personalised from your guest reviews and your numbers — what to fix, upgrade, highlight, and price.</Text>
        </View>

        {/* Satisfaction */}
        <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.satCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.satLabel}>Guest satisfaction</Text>
            <Text style={styles.satScore}>{sat ? `${sat.score}%` : '—'}</Text>
            <Text style={styles.satSub}>{sat?.label ?? 'Loading…'}{sat && sat.total > 0 ? ` · ${sat.avg.toFixed(1)}★ from ${sat.total} review${sat.total > 1 ? 's' : ''}` : ''}</Text>
          </View>
          <View style={styles.satRing}><Text style={styles.satRingText}>{sat ? sat.avg.toFixed(1) : '—'}</Text><Text style={styles.satRingStar}>★</Text></View>
        </LinearGradient>

        {/* Keep doing */}
        {report && report.positives.length > 0 && (
          <View style={styles.keepCard}>
            <View style={styles.keepHead}><Ionicons name="heart" size={15} color={colors.success} /><Text style={styles.keepTitle}>What guests love — keep it up</Text></View>
            {report.positives.map((p, i) => (
              <View key={i} style={styles.keepRow}><Ionicons name="checkmark-circle" size={15} color={colors.success} /><Text style={styles.keepText}>{p}</Text></View>
            ))}
          </View>
        )}

        {/* Suggestions */}
        <Text style={styles.section}>Recommended actions {report ? `(${report.suggestions.length})` : ''}</Text>
        {report && report.suggestions.length === 0 && (
          <View style={styles.allGood}>
            <Ionicons name="checkmark-done-circle" size={34} color={colors.success} />
            <Text style={styles.allGoodTitle}>You’re all optimised</Text>
            <Text style={styles.allGoodText}>No issues in your reviews and your numbers look healthy. Keep replying fast and your calendar fresh.</Text>
          </View>
        )}
        {report?.suggestions.map((s) => {
          const meta = CATEGORY_META[s.category];
          const tappable = !!ROUTE_FOR[s.category];
          return (
            <TouchableOpacity key={s.id} activeOpacity={tappable ? 0.85 : 1} disabled={!tappable} onPress={() => act(s)} style={styles.sCard}>
              <View style={[styles.sIcon, { backgroundColor: withOpacity(meta.color, 0.14) }]}>
                <Ionicons name={s.icon as any} size={20} color={meta.color} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.sTop}>
                  <Text style={styles.sTitle}>{s.title}</Text>
                  <View style={[styles.catPill, { backgroundColor: withOpacity(meta.color, 0.14) }]}>
                    <Text style={[styles.catText, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                </View>
                <Text style={styles.sDetail}>{s.detail}</Text>
                {!!s.evidence && (
                  <View style={styles.evRow}><Ionicons name="analytics-outline" size={12} color={colors.textTertiary} /><Text style={styles.evText}>{s.evidence}</Text></View>
                )}
              </View>
              {tappable && <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />}
            </TouchableOpacity>
          );
        })}

        <View style={styles.disclaimer}>
          <Ionicons name="information-circle-outline" size={14} color={colors.textTertiary} />
          <Text style={styles.disclaimerText}>Suggestions are generated on your device from your own reviews and stats — nothing is shared. They’re guidance, not guarantees.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    introRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginBottom: spacing.base },
    intro: { flex: 1, fontSize: fontSizes.base, color: colors.textSecondary, lineHeight: 21, ...fonts.regular },
    satCard: { flexDirection: 'row', alignItems: 'center', borderRadius: borderRadius.xl, padding: spacing.xl, ...shadows.raised },
    satLabel: { color: 'rgba(255,255,255,0.85)', fontSize: fontSizes.sm, ...fonts.medium },
    satScore: { color: '#fff', fontSize: fontSizes['5xl'], letterSpacing: letterSpacing.tight, marginTop: 2, ...fonts.bold },
    satSub: { color: 'rgba(255,255,255,0.92)', fontSize: fontSizes.sm, marginTop: 2, ...fonts.medium },
    satRing: { width: 64, height: 64, borderRadius: 32, borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
    satRingText: { color: '#fff', fontSize: fontSizes.xl, ...fonts.bold },
    satRingStar: { color: '#fff', fontSize: fontSizes.sm, marginLeft: 1, ...fonts.bold },
    keepCard: { marginTop: spacing.md, padding: spacing.base, borderRadius: borderRadius.lg, backgroundColor: withOpacity(colors.success, 0.08), borderWidth: 1, borderColor: withOpacity(colors.success, 0.2) },
    keepHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
    keepTitle: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.bold },
    keepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
    keepText: { flex: 1, fontSize: fontSizes.sm, color: colors.textSecondary, lineHeight: 19, ...fonts.regular },
    section: { fontSize: fontSizes.lg, letterSpacing: letterSpacing.snug, color: colors.textPrimary, marginTop: spacing.xl, marginBottom: spacing.sm, ...fonts.bold },
    allGood: { alignItems: 'center', paddingVertical: spacing['2xl'], gap: 8 },
    allGoodTitle: { fontSize: fontSizes.lg, color: colors.textPrimary, ...fonts.bold },
    allGoodText: { fontSize: fontSizes.base, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: spacing.lg, lineHeight: 21, ...fonts.regular },
    sCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, padding: spacing.base, borderRadius: borderRadius.lg, backgroundColor: colors.card, marginBottom: spacing.sm, ...shadows.card },
    sIcon: { width: 40, height: 40, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' },
    sTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    sTitle: { flex: 1, fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.bold },
    catPill: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 999 },
    catText: { fontSize: fontSizes.xs, ...fonts.bold },
    sDetail: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 4, lineHeight: 19, ...fonts.regular },
    evRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm },
    evText: { fontSize: fontSizes.xs, color: colors.textTertiary, ...fonts.medium },
    disclaimer: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', marginTop: spacing.lg, padding: spacing.base, borderRadius: borderRadius.md, backgroundColor: colors.backgroundSecondary },
    disclaimerText: { flex: 1, fontSize: fontSizes.xs, color: colors.textTertiary, lineHeight: 16, ...fonts.regular },
  });

export default SmartSuggestionsScreen;
