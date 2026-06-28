import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useHaptics } from '../hooks/useHaptics';
import { confirmAction } from '../utils/confirm';
import { fonts, fontSizes, spacing, borderRadius, letterSpacing, shadows } from '../constants';
import { withOpacity } from '../utils/color';
import { ScreenHeader } from '../components/common';
import { getSafety, setSafety, DEVICE_LABELS, type SafetySettings } from '../data/safety';
import { getIdentity } from '../data/account';

export function SafetyScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { light, selection, success } = useHaptics();
  const styles = makeStyles(colors);

  const [s, setS] = useState<SafetySettings | null>(null);
  const [verified, setVerified] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      getSafety().then((v) => { if (active) setS(v); });
      getIdentity().then((i) => { if (active) setVerified(i.status === 'verified'); });
      return () => { active = false; };
    }, [])
  );

  const save = async (patch: Partial<SafetySettings>) => { const next = await setSafety(patch); setS(next); };
  const toggleDevice = (k: keyof SafetySettings['devices']) => { selection(); if (s) save({ devices: { ...s.devices, [k]: !s.devices[k] } as any }); };

  const reportProblem = () => confirmAction({
    title: 'Report a safety problem?',
    message: 'This opens a secure report to StayOn’s Trust & Safety team. For an emergency, contact local services first.',
    confirmText: 'Continue', onConfirm: () => { success(); navigation.navigate('Support'); },
  });

  if (!s) return <SafeAreaView style={styles.container} edges={['top']}><ScreenHeader title="Safety & security" onBack={() => navigation.goBack()} /></SafeAreaView>;

  const deviceScore = Object.values(s.devices).filter(Boolean).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Safety & security" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['4xl'] }}>
        {/* Trust score banner */}
        <View style={styles.banner}>
          <View style={styles.bannerIcon}><Ionicons name="shield-checkmark" size={22} color={colors.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>{deviceScore}/{DEVICE_LABELS.length} safety items set</Text>
            <Text style={styles.bannerSub}>A well‑equipped place earns guest trust and better reviews.</Text>
          </View>
        </View>

        {/* Guest verification */}
        <Text style={styles.section}>Guest trust</Text>
        <View style={styles.card}>
          <Row icon="finger-print-outline" title="Require verified guests" sub="Only guests who passed ID verification can book"
            right={<Toggle on={s.requireVerifiedGuests} onPress={() => { selection(); save({ requireVerifiedGuests: !s.requireVerifiedGuests }); }} colors={colors} />} colors={colors} />
          <Row icon={verified ? 'shield-checkmark' : 'shield-half'} title="Your host verification" sub={verified ? 'Verified' : 'Finish verification to build trust'}
            tint={verified ? colors.success : colors.warning}
            right={<TouchableOpacity onPress={() => { light(); navigation.navigate('IdentityVerification'); }}><Ionicons name="chevron-forward" size={18} color={colors.textTertiary} /></TouchableOpacity>} colors={colors} last />
        </View>

        {/* Access */}
        <Text style={styles.section}>Access</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Smart‑lock / door code</Text>
          <View style={styles.codeRow}>
            <TextInput style={styles.codeInput} value={s.accessCode} onChangeText={(t) => setS({ ...s, accessCode: t })} onBlur={() => save({ accessCode: s.accessCode })}
              placeholder="e.g. 5847" placeholderTextColor={colors.textTertiary} keyboardType="number-pad" />
            <Ionicons name="key-outline" size={18} color={colors.primary} />
          </View>
          <Text style={styles.hint}>Shared with the guest only after a booking is confirmed.</Text>
        </View>

        {/* Safety devices */}
        <Text style={styles.section}>Safety devices</Text>
        <View style={styles.card}>
          {DEVICE_LABELS.map((d, i) => (
            <Row key={d.key} icon={d.icon} title={d.label} colors={colors} last={i === DEVICE_LABELS.length - 1}
              right={<Toggle on={s.devices[d.key]} onPress={() => toggleDevice(d.key)} colors={colors} />} />
          ))}
        </View>

        {/* Camera disclosure */}
        {s.devices.exteriorCamera && (
          <>
            <Text style={styles.section}>Camera disclosure</Text>
            <View style={styles.card}>
              <Text style={styles.hint}>Guests must be told about any exterior cameras. Cameras are never allowed indoors or in private spaces.</Text>
              <TextInput style={[styles.codeInput, { marginTop: spacing.sm }]} value={s.cameraDisclosure} onChangeText={(t) => setS({ ...s, cameraDisclosure: t })} onBlur={() => save({ cameraDisclosure: s.cameraDisclosure })}
                placeholder="e.g. Doorbell camera at the front entrance" placeholderTextColor={colors.textTertiary} multiline />
            </View>
          </>
        )}

        {/* Emergency contact */}
        <Text style={styles.section}>Emergency contact</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Name</Text>
          <TextInput style={styles.codeInput} value={s.emergencyName} onChangeText={(t) => setS({ ...s, emergencyName: t })} onBlur={() => save({ emergencyName: s.emergencyName })} placeholder="Local contact or caretaker" placeholderTextColor={colors.textTertiary} />
          <Text style={[styles.label, { marginTop: spacing.md }]}>Phone</Text>
          <TextInput style={styles.codeInput} value={s.emergencyPhone} onChangeText={(t) => setS({ ...s, emergencyPhone: t })} onBlur={() => save({ emergencyPhone: s.emergencyPhone })} placeholder="Reachable in an emergency" placeholderTextColor={colors.textTertiary} keyboardType="phone-pad" />
        </View>

        {/* Report a problem */}
        <TouchableOpacity style={styles.reportBtn} activeOpacity={0.85} onPress={reportProblem}>
          <Ionicons name="warning-outline" size={18} color={colors.error} />
          <View style={{ flex: 1 }}>
            <Text style={styles.reportTitle}>Report a safety problem</Text>
            <Text style={styles.reportSub}>Reach StayOn Trust & Safety. Emergency? Call local services first.</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const Row = ({ icon, title, sub, right, tint, colors, last }: any) => {
  const styles = makeStyles(colors);
  return (
    <View style={[styles.row, !last && styles.rowDivider]}>
      <View style={[styles.rowIcon, { backgroundColor: withOpacity(tint ?? colors.primary, 0.12) }]}><Ionicons name={icon} size={18} color={tint ?? colors.primary} /></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        {!!sub && <Text style={styles.rowSub}>{sub}</Text>}
      </View>
      {right}
    </View>
  );
};

const Toggle = ({ on, onPress, colors }: any) => {
  const styles = makeStyles(colors);
  return (
    <TouchableOpacity style={[styles.toggle, on && { backgroundColor: colors.primary }]} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.knob, on && { transform: [{ translateX: 18 }] }]} />
    </TouchableOpacity>
  );
};

const makeStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    banner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.base, borderRadius: borderRadius.lg, backgroundColor: colors.primarySubtle, borderWidth: 1, borderColor: withOpacity(colors.primary, 0.2) },
    bannerIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
    bannerTitle: { fontSize: fontSizes.md, color: colors.textPrimary, ...fonts.bold },
    bannerSub: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 1, ...fonts.regular },
    section: { fontSize: fontSizes.lg, letterSpacing: letterSpacing.snug, color: colors.textPrimary, marginTop: spacing.xl, marginBottom: spacing.sm, ...fonts.bold },
    card: { backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.base, ...shadows.card },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
    rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight },
    rowIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
    rowTitle: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.semiBold },
    rowSub: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 1, ...fonts.regular },
    label: { fontSize: fontSizes.sm, color: colors.textSecondary, marginBottom: 6, ...fonts.semiBold },
    codeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    codeInput: { flex: 1, backgroundColor: colors.backgroundSecondary, borderRadius: borderRadius.md, paddingHorizontal: spacing.base, paddingVertical: spacing.md, fontSize: fontSizes.base, color: colors.textPrimary },
    hint: { fontSize: fontSizes.sm, color: colors.textTertiary, marginTop: spacing.sm, lineHeight: 18, ...fonts.regular },
    toggle: { width: 42, height: 24, borderRadius: 12, backgroundColor: colors.borderLight, padding: 3, justifyContent: 'center' },
    knob: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff', ...shadows.card },
    reportBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.xl, padding: spacing.base, borderRadius: borderRadius.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: withOpacity(colors.error, 0.3) },
    reportTitle: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.bold },
    reportSub: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 1, lineHeight: 18, ...fonts.regular },
  });

export default SafetyScreen;
