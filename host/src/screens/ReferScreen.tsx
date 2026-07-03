import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useHaptics } from '../hooks/useHaptics';
import { fonts, fontSizes, spacing, borderRadius, letterSpacing, shadows } from '../constants';
import { withOpacity } from '../utils/color';
import { ScreenHeader } from '../components/common';
import { STAYON_GRADIENT } from '../components/GradientButton';
import { getReferralCode, getReferrals, referralStats, STATUS_STEPS, type Referral } from '../data/referrals';

export function ReferScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { light, success } = useHaptics();
  const styles = makeStyles(colors);

  const [code, setCode] = useState('HOST-•••••');
  const [refs, setRefs] = useState<Referral[]>([]);
  const [copied, setCopied] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      getReferralCode().then((c) => { if (active) setCode(c); });
      getReferrals().then((r) => { if (active) setRefs(r); });
      return () => { active = false; };
    }, [])
  );

  const stats = referralStats(refs);
  const link = `https://stayon.app/host?ref=${code}`;
  const message = `Host on StayOn and keep 100% of what you earn — 0% platform fee, unlike other apps. Join with my link: ${link}`;

  const share = async () => {
    success();
    try {
      if (Platform.OS === 'web' && (globalThis as any).navigator?.share) {
        await (globalThis as any).navigator.share({ title: 'Host on StayOn', text: message, url: link });
      } else if (Platform.OS !== 'web') {
        await Share.share({ message });
      } else {
        copy();
      }
    } catch {}
  };
  const copy = () => {
    light();
    try { (globalThis as any).navigator?.clipboard?.writeText(link); } catch {}
    setCopied(true); setTimeout(() => setCopied(false), 1600);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Refer a host" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['4xl'] }}>
        {/* Hero */}
        <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <Ionicons name="gift" size={26} color="#fff" />
          <Text style={styles.heroTitle}>Invite hosts, grow together</Text>
          <Text style={styles.heroSub}>Share StayOn’s 0% advantage. When a host you invite gets their first booking, you both earn featured placement & a perk.</Text>
          <View style={styles.codeBox}>
            <Text style={styles.code}>{code}</Text>
            <TouchableOpacity style={styles.copyBtn} onPress={copy}>
              <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={15} color={colors.primary} />
              <Text style={styles.copyText}>{copied ? 'Copied' : 'Copy'}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.shareBtn} onPress={share} activeOpacity={0.9}>
            <Ionicons name="share-social" size={17} color={colors.primary} />
            <Text style={styles.shareText}>Share your link</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Stats */}
        <View style={styles.statRow}>
          <Stat value={stats.invited} label="Invited" colors={colors} />
          <Stat value={stats.joined} label="Joined" colors={colors} />
          <Stat value={stats.earning} label="Earning" colors={colors} />
        </View>

        {/* How it works */}
        <Text style={styles.section}>How it works</Text>
        <View style={styles.card}>
          {[
            { icon: 'share-social-outline', t: 'Share your link', s: 'Send it to anyone with a place to host.' },
            { icon: 'home-outline', t: 'They list & host', s: 'They sign up, publish a listing, and welcome a guest.' },
            { icon: 'ribbon-outline', t: 'You both get rewarded', s: 'Featured placement and a perk once they’re booked.' },
          ].map((x, i, a) => (
            <View key={x.t} style={[styles.howRow, i < a.length - 1 && styles.divider]}>
              <View style={[styles.howIcon, { backgroundColor: colors.primarySubtle }]}><Ionicons name={x.icon as any} size={18} color={colors.primary} /></View>
              <View style={{ flex: 1 }}><Text style={styles.howTitle}>{x.t}</Text><Text style={styles.howSub}>{x.s}</Text></View>
            </View>
          ))}
        </View>

        {/* Invited hosts */}
        <Text style={styles.section}>Hosts you invited</Text>
        {refs.map((r) => {
          const stepIdx = STATUS_STEPS.findIndex((s) => s.key === r.status);
          return (
            <View key={r.id} style={styles.refCard}>
              <Image source={{ uri: r.avatar }} style={styles.refAvatar} contentFit="cover" />
              <View style={{ flex: 1 }}>
                <Text style={styles.refName}>{r.name}</Text>
                <Text style={styles.refMeta}>Joined {r.joined}</Text>
                <View style={styles.refBar}>
                  {STATUS_STEPS.map((s, i) => (
                    <View key={s.key} style={[styles.refSeg, i <= stepIdx ? { backgroundColor: colors.primary } : { backgroundColor: colors.borderLight }]} />
                  ))}
                </View>
                <Text style={styles.refStatus}>{STATUS_STEPS[stepIdx]?.label}</Text>
              </View>
              {r.status === 'first_booking' && <Ionicons name="checkmark-circle" size={22} color={colors.success} />}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const Stat = ({ value, label, colors }: any) => {
  const styles = makeStyles(colors);
  return <View style={styles.stat}><Text style={styles.statVal}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
};

const makeStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    hero: { borderRadius: borderRadius.xl, padding: spacing.xl, ...shadows.raised },
    heroTitle: { color: '#fff', fontSize: fontSizes.xl, marginTop: spacing.sm, ...fonts.bold },
    heroSub: { color: 'rgba(255,255,255,0.9)', fontSize: fontSizes.sm, lineHeight: 19, marginTop: 4, ...fonts.regular },
    codeBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.lg, padding: spacing.base, borderRadius: borderRadius.md, backgroundColor: 'rgba(255,255,255,0.18)' },
    code: { color: '#fff', fontSize: fontSizes.lg, letterSpacing: 2, ...fonts.bold },
    copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#fff', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 999 },
    copyText: { color: colors.primary, fontSize: fontSizes.sm, ...fonts.bold },
    shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: spacing.md, paddingVertical: spacing.base, borderRadius: borderRadius.lg, backgroundColor: '#fff' },
    shareText: { color: colors.primary, fontSize: fontSizes.md, ...fonts.bold },
    statRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
    stat: { flex: 1, alignItems: 'center', paddingVertical: spacing.base, borderRadius: borderRadius.lg, backgroundColor: colors.card, ...shadows.card },
    statVal: { fontSize: fontSizes['2xl'], color: colors.textPrimary, ...fonts.bold },
    statLabel: { fontSize: fontSizes.xs, color: colors.textSecondary, marginTop: 2, ...fonts.medium },
    section: { fontSize: fontSizes.lg, letterSpacing: letterSpacing.snug, color: colors.textPrimary, marginTop: spacing.xl, marginBottom: spacing.sm, ...fonts.bold },
    card: { backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.base, ...shadows.card },
    howRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
    divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight },
    howIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
    howTitle: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.semiBold },
    howSub: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 1, ...fonts.regular },
    refCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.base, borderRadius: borderRadius.lg, backgroundColor: colors.card, marginBottom: spacing.sm, ...shadows.card },
    refAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.backgroundSecondary },
    refName: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.bold },
    refMeta: { fontSize: fontSizes.xs, color: colors.textTertiary, marginTop: 1, ...fonts.regular },
    refBar: { flexDirection: 'row', gap: 3, marginTop: 6 },
    refSeg: { flex: 1, height: 4, borderRadius: 2 },
    refStatus: { fontSize: fontSizes.xs, color: colors.primary, marginTop: 4, ...fonts.semiBold },
  });

export default ReferScreen;
