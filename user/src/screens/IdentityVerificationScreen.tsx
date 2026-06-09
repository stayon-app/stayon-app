import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useHaptics } from '../hooks/useHaptics';
import { STAYON_GRADIENT } from '../components/GradientButton';
import { spacing, fontSizes, fonts, borderRadius } from '../constants';
import { Api } from '../api';

interface Step {
  id: string;
  icon: string;
  title: string;
  sub: string;
  status: 'done' | 'current' | 'pending';
}

export function IdentityVerificationScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { light, success } = useHaptics();

  const [steps, setSteps] = useState<Step[]>([
    { id: '1', icon: 'mail', title: 'Email verified', sub: 'mahindrabommu@gmail.com', status: 'done' },
    { id: '2', icon: 'call', title: 'Phone number', sub: 'Verify your mobile number', status: 'current' },
    { id: '3', icon: 'card', title: 'Government ID', sub: 'Upload a photo of your ID', status: 'pending' },
    { id: '4', icon: 'camera', title: 'Selfie verification', sub: 'Take a quick selfie to match your ID', status: 'pending' },
  ]);

  const completeStep = (id: string) => {
    success();
    setSteps((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      return prev.map((s, i) => {
        if (i === idx) return { ...s, status: 'done' };
        if (i === idx + 1 && s.status === 'pending') return { ...s, status: 'current' };
        return s;
      });
    });
    // Backend: record a KYC submission for the Ops verification queue. Fail-safe.
    (async () => {
      try {
        await Api.auth.ensureSession();
        await Api.identity.submit({ idType: id });
      } catch { /* backend offline — ignore */ }
    })();
  };

  const doneCount = steps.filter((s) => s.status === 'done').length;
  const progress = doneCount / steps.length;
  const allDone = doneCount === steps.length;

  const styles = makeStyles(colors);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Identity Verification</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Hero */}
        <LinearGradient colors={[colors.primary, colors.primaryLight]} style={styles.hero}>
          <Ionicons name={allDone ? 'shield-checkmark' : 'shield-outline'} size={44} color="#fff" />
          <Text style={styles.heroTitle}>{allDone ? 'You\'re Verified!' : 'Verify your identity'}</Text>
          <Text style={styles.heroSub}>
            {allDone
              ? 'You now have full access to instant booking and premium stays.'
              : 'Complete verification to unlock instant booking, build trust with hosts, and keep your account secure.'}
          </Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.progressLabel}>{doneCount} of {steps.length} steps complete</Text>
        </LinearGradient>

        {/* Steps */}
        <View style={styles.steps}>
          {steps.map((step, i) => (
            <View key={step.id} style={styles.stepRow}>
              {/* Timeline */}
              <View style={styles.timeline}>
                <View style={[
                  styles.stepDot,
                  step.status === 'done' && { backgroundColor: colors.success },
                  step.status === 'current' && { backgroundColor: colors.primary },
                  step.status === 'pending' && { backgroundColor: colors.borderLight },
                ]}>
                  <Ionicons
                    name={step.status === 'done' ? 'checkmark' : step.icon as any}
                    size={16}
                    color={step.status === 'pending' ? colors.textTertiary : '#fff'}
                  />
                </View>
                {i < steps.length - 1 && (
                  <View style={[styles.stepLine, { backgroundColor: step.status === 'done' ? colors.success : colors.borderLight }]} />
                )}
              </View>

              {/* Content */}
              <View style={[
                styles.stepCard,
                { backgroundColor: colors.card, borderColor: step.status === 'current' ? colors.primary : colors.borderLight },
              ]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>{step.title}</Text>
                  <Text style={[styles.stepSub, { color: colors.textSecondary }]}>{step.sub}</Text>
                </View>
                {step.status === 'done' && (
                  <View style={[styles.doneBadge, { backgroundColor: colors.primarySubtle }]}>
                    <Text style={[styles.doneText, { color: colors.success }]}>Verified</Text>
                  </View>
                )}
                {step.status === 'current' && (
                  <TouchableOpacity
                    activeOpacity={0.9}
                    style={styles.verifyBtnWrap}
                    onPress={() => {
                      light();
                      Alert.alert('Verify', `Start ${step.title.toLowerCase()}?`, [
                        { text: 'Cancel' },
                        { text: 'Verify', onPress: () => completeStep(step.id) },
                      ]);
                    }}
                  >
                    <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.verifyBtn}>
                      <Text style={styles.verifyText}>Verify</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Trust badges */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Why verify?</Text>
          {[
            { icon: 'flash', title: 'Instant booking', sub: 'Skip host approval on eligible stays' },
            { icon: 'star', title: 'Build trust', sub: 'Verified guests get accepted faster' },
            { icon: 'lock-closed', title: 'Account security', sub: 'Protect your account from fraud' },
          ].map((b) => (
            <View key={b.title} style={styles.benefitRow}>
              <View style={[styles.benefitIcon, { backgroundColor: colors.primarySubtle }]}>
                <Ionicons name={b.icon as any} size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.benefitTitle, { color: colors.textPrimary }]}>{b.title}</Text>
                <Text style={[styles.benefitSub, { color: colors.textSecondary }]}>{b.sub}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Privacy note */}
        <View style={[styles.privacyNote, { backgroundColor: colors.primarySubtle }]}>
          <Ionicons name="eye-off-outline" size={16} color={colors.primary} />
          <Text style={[styles.privacyText, { color: colors.primary }]}>
            Your ID is encrypted and never shared with hosts or other guests. We only use it to confirm your identity.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
    title: { fontSize: fontSizes['2xl'], ...fonts.bold, letterSpacing: -0.5 },
    hero: { margin: spacing.lg, borderRadius: borderRadius.xl, padding: spacing.xl, alignItems: 'center', gap: spacing.sm },
    heroTitle: { color: '#fff', fontSize: fontSizes['2xl'], ...fonts.bold, marginTop: spacing.xs },
    heroSub: { color: 'rgba(255,255,255,0.88)', fontSize: fontSizes.sm, textAlign: 'center', lineHeight: 19 },
    progressTrack: { width: '100%', height: 6, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 3, marginTop: spacing.md },
    progressFill: { height: 6, backgroundColor: '#fff', borderRadius: 3 },
    progressLabel: { color: 'rgba(255,255,255,0.9)', fontSize: fontSizes.xs, ...fonts.semiBold },
    steps: { paddingHorizontal: spacing.lg, marginBottom: spacing.base },
    stepRow: { flexDirection: 'row', gap: spacing.md },
    timeline: { alignItems: 'center' },
    stepDot: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    stepLine: { width: 2, flex: 1, marginVertical: spacing.xs },
    stepCard: {
      flex: 1, flexDirection: 'row', alignItems: 'center',
      padding: 14, borderRadius: borderRadius.md, borderWidth: 1.5, marginBottom: spacing.md,
    },
    stepTitle: { fontSize: fontSizes.base, ...fonts.bold },
    stepSub: { fontSize: fontSizes.xs, marginTop: 2 },
    doneBadge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.base },
    doneText: { fontSize: fontSizes.xs, ...fonts.bold },
    verifyBtnWrap: { borderRadius: borderRadius.base, overflow: 'hidden' },
    verifyBtn: { paddingHorizontal: spacing.base, paddingVertical: spacing.sm, borderRadius: borderRadius.base },
    verifyText: { color: '#fff', fontSize: fontSizes.sm, ...fonts.bold },
    section: { paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
    sectionTitle: { fontSize: fontSizes.lg, ...fonts.semiBold, marginBottom: 14 },
    benefitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: 14 },
    benefitIcon: { width: 40, height: 40, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center' },
    benefitTitle: { fontSize: fontSizes.md, ...fonts.bold },
    benefitSub: { fontSize: fontSizes.xs, marginTop: 1 },
    privacyNote: { flexDirection: 'row', gap: spacing.sm, marginHorizontal: spacing.lg, padding: 14, borderRadius: borderRadius.md, alignItems: 'flex-start' },
    privacyText: { flex: 1, fontSize: fontSizes.xs, lineHeight: 18 },
  });
}
