import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useHaptics } from '../hooks/useHaptics';
import { fonts, fontSizes, spacing, borderRadius, letterSpacing, shadows } from '../constants';
import { withOpacity } from '../utils/color';
import { ScreenHeader } from '../components/common';
import { STAYON_GRADIENT } from '../components/GradientButton';

const COVERS = [
  { icon: 'home-outline', title: 'Damage protection', body: 'If a guest damages your place or belongings, document it at checkout with photos and a note — your report is logged for any reimbursement.' },
  { icon: 'shield-checkmark-outline', title: 'Verified guests', body: 'Require ID‑verified guests so you know who’s booking. Identity and reviews build a trusted community.' },
  { icon: 'lock-closed-outline', title: 'Secure on‑platform payments', body: 'Money and messages stay on StayOn. Contact details are hidden until a booking is confirmed, so deals can’t go off‑platform.' },
  { icon: 'call-outline', title: '24/7 support line', body: 'Reach StayOn’s Trust & Safety team any time from Help & support. For emergencies, contact local services first.' },
];

export function CoverScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { light } = useHaptics();
  const styles = makeStyles(colors);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="StayOn Cover" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['4xl'] }}>
        {/* Hero */}
        <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <Ionicons name="shield-checkmark" size={30} color="#fff" />
          <Text style={styles.heroTitle}>Host with peace of mind</Text>
          <Text style={styles.heroSub}>StayOn Cover comes with every booking at no extra cost — so you can host confidently from day one.</Text>
          <View style={styles.heroPill}><Ionicons name="pricetag" size={13} color="#fff" /><Text style={styles.heroPillText}>Included free · 0% platform fee</Text></View>
        </LinearGradient>

        {/* What's covered */}
        <Text style={styles.section}>What’s included</Text>
        {COVERS.map((c) => (
          <View key={c.title} style={styles.card}>
            <View style={[styles.icon, { backgroundColor: colors.primarySubtle }]}><Ionicons name={c.icon as any} size={20} color={colors.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{c.title}</Text>
              <Text style={styles.cardBody}>{c.body}</Text>
            </View>
          </View>
        ))}

        {/* File a report */}
        <Text style={styles.section}>If something goes wrong</Text>
        <TouchableOpacity style={styles.actionRow} activeOpacity={0.85} onPress={() => { light(); navigation.navigate('Maintenance'); }}>
          <View style={[styles.icon, { backgroundColor: withOpacity(colors.warning, 0.14) }]}><Ionicons name="document-text-outline" size={20} color={colors.warning} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>File a damage report</Text>
            <Text style={styles.cardBody}>Document damage with photos. Reports live in Maintenance → Damages.</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionRow} activeOpacity={0.85} onPress={() => { light(); navigation.navigate('Safety'); }}>
          <View style={[styles.icon, { backgroundColor: withOpacity(colors.error, 0.12) }]}><Ionicons name="warning-outline" size={20} color={colors.error} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Report a safety problem</Text>
            <Text style={styles.cardBody}>Reach Trust & Safety from the Safety & security center.</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </TouchableOpacity>

        <View style={styles.note}>
          <Ionicons name="information-circle-outline" size={15} color={colors.textTertiary} />
          <Text style={styles.noteText}>Because StayOn charges 0%, any agreed reimbursement for damages is settled directly between you and the guest — StayOn helps document and mediate.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    hero: { borderRadius: borderRadius.xl, padding: spacing.xl, ...shadows.raised },
    heroTitle: { color: '#fff', fontSize: fontSizes.xl, marginTop: spacing.sm, ...fonts.bold },
    heroSub: { color: 'rgba(255,255,255,0.9)', fontSize: fontSizes.base, lineHeight: 21, marginTop: 4, ...fonts.regular },
    heroPill: { flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 5, marginTop: spacing.base, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: 999 },
    heroPillText: { color: '#fff', fontSize: fontSizes.xs, ...fonts.bold },
    section: { fontSize: fontSizes.lg, letterSpacing: letterSpacing.snug, color: colors.textPrimary, marginTop: spacing.xl, marginBottom: spacing.sm, ...fonts.bold },
    card: { flexDirection: 'row', gap: spacing.md, padding: spacing.base, borderRadius: borderRadius.lg, backgroundColor: colors.card, marginBottom: spacing.sm, ...shadows.card },
    actionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.base, borderRadius: borderRadius.lg, backgroundColor: colors.card, marginBottom: spacing.sm, ...shadows.card },
    icon: { width: 40, height: 40, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' },
    cardTitle: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.bold },
    cardBody: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 2, lineHeight: 19, ...fonts.regular },
    note: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: spacing.lg, padding: spacing.base, borderRadius: borderRadius.lg, backgroundColor: colors.backgroundSecondary },
    noteText: { flex: 1, fontSize: fontSizes.sm, color: colors.textSecondary, lineHeight: 18, ...fonts.regular },
  });

export default CoverScreen;
