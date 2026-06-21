import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useHaptics } from '../hooks/useHaptics';
import { STAYON_GRADIENT } from '../components/GradientButton';
import { spacing, fontSizes, fonts, borderRadius } from '../constants';

const ISSUE_TYPES = [
  { id: 'refund', icon: 'cash-outline', title: 'Request a refund', sub: 'Get money back for an issue with your stay' },
  { id: 'listing', icon: 'home-outline', title: 'Stay not as described', sub: 'The place was different from the listing' },
  { id: 'cleanliness', icon: 'sparkles-outline', title: 'Cleanliness issue', sub: 'The property wasn\'t clean on arrival' },
  { id: 'checkin', icon: 'key-outline', title: 'Couldn\'t check in', sub: 'Access problems or host unreachable' },
  { id: 'safety', icon: 'shield-outline', title: 'Safety concern', sub: 'Report a safety or security issue' },
  { id: 'other', icon: 'ellipsis-horizontal-circle-outline', title: 'Something else', sub: 'A different problem with your trip' },
];

export function ResolutionCenterScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const { light, medium, success } = useHaptics();
  const booking = route?.params?.booking;

  const [step, setStep] = useState<'select' | 'detail'>('select');
  const [selectedIssue, setSelectedIssue] = useState<typeof ISSUE_TYPES[0] | null>(null);
  const [description, setDescription] = useState('');

  const styles = makeStyles(colors);

  const pickIssue = (issue: typeof ISSUE_TYPES[0]) => {
    medium();
    setSelectedIssue(issue);
    setStep('detail');
  };

  const submit = () => {
    if (description.trim().length < 10) {
      Alert.alert('Add more detail', 'Please describe the issue in a few words so our team can help.');
      return;
    }
    success();
    Alert.alert(
      'Request Submitted',
      `Case #RC-${Math.random().toString(36).substring(2, 8).toUpperCase()} created. Our support team will respond within 24 hours, and your host has been notified.`,
      [{ text: 'Done', onPress: () => navigation.goBack() }]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => step === 'detail' ? setStep('select') : navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name={step === 'detail' ? 'arrow-back' : 'close'} size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Resolution Center</Text>
        <View style={{ width: 22 }} />
      </View>

      {step === 'select' ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.intro}>
            <Text style={[styles.introTitle, { color: colors.textPrimary }]}>What went wrong?</Text>
            <Text style={[styles.introSub, { color: colors.textSecondary }]}>
              We're here to help. Choose the issue that best describes your situation and we'll guide you through resolving it.
            </Text>
          </View>

          {booking && (
            <View style={[styles.bookingChip, { backgroundColor: colors.primarySubtle }]}>
              <Ionicons name="receipt-outline" size={16} color={colors.primary} />
              <Text style={[styles.bookingChipText, { color: colors.primary }]}>
                {[booking.property, booking.bookingId].filter((v) => v != null && typeof v !== 'object').join(' · ')}
              </Text>
            </View>
          )}

          <View style={styles.issueList}>
            {ISSUE_TYPES.map((issue) => (
              <TouchableOpacity
                key={issue.id}
                style={[styles.issueRow, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
                onPress={() => pickIssue(issue)}
                activeOpacity={0.8}
              >
                <View style={[styles.issueIcon, { backgroundColor: colors.backgroundSecondary }]}>
                  <Ionicons name={issue.icon as any} size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.issueTitle, { color: colors.textPrimary }]}>{issue.title}</Text>
                  <Text style={[styles.issueSub, { color: colors.textSecondary }]}>{issue.sub}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.contactRow}
            onPress={() => navigation.navigate('CustomerSupport')}
          >
            <Ionicons name="headset-outline" size={18} color={colors.primary} />
            <Text style={[styles.contactText, { color: colors.primary }]}>Or contact support directly</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={80}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.base, paddingBottom: spacing['3xl'] }}>
            <View style={[styles.selectedBanner, { backgroundColor: colors.primarySubtle }]}>
              <Ionicons name={selectedIssue?.icon as any} size={22} color={colors.primary} />
              <Text style={[styles.selectedTitle, { color: colors.primary }]}>{selectedIssue?.title}</Text>
            </View>

            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Describe what happened</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.backgroundSecondary, color: colors.textPrimary, borderColor: colors.borderLight }]}
              placeholder="Share the details so our team and your host can help resolve this quickly..."
              placeholderTextColor={colors.textTertiary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />

            <TouchableOpacity style={[styles.photoBtn, { borderColor: colors.borderLight }]} onPress={() => light()}>
              <Ionicons name="camera-outline" size={20} color={colors.primary} />
              <Text style={[styles.photoBtnText, { color: colors.primary }]}>Add photos as evidence</Text>
            </TouchableOpacity>

            {selectedIssue?.id === 'refund' && (
              <View style={[styles.refundNote, { backgroundColor: colors.goldLight }]}>
                <Ionicons name="information-circle-outline" size={18} color={colors.goldDark} />
                <Text style={[styles.refundNoteText, { color: colors.goldDark }]}>
                  Refund amount depends on the cancellation policy and how far into your stay you are. Our team will confirm the eligible amount.
                </Text>
              </View>
            )}

            <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
              <Text style={[styles.infoTitle, { color: colors.textPrimary }]}>What happens next</Text>
              {['Your host is notified and has 24h to respond', 'StayOn support reviews the case', 'You\'ll get a resolution or refund decision'].map((s, i) => (
                <View key={i} style={styles.stepItem}>
                  <View style={[styles.stepDot, { backgroundColor: colors.primary }]}>
                    <Text style={styles.stepDotText}>{i + 1}</Text>
                  </View>
                  <Text style={[styles.stepText, { color: colors.textSecondary }]}>{s}</Text>
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.borderLight }]}>
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.submitBtnWrap}
              onPress={submit}
              disabled={description.trim().length < 10}
            >
              <LinearGradient
                colors={description.trim().length >= 10 ? STAYON_GRADIENT : [colors.primaryUltraLight, colors.primaryUltraLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitBtn}
              >
                <Text style={[styles.submitText, { color: description.trim().length >= 10 ? '#fff' : colors.primary }]}>
                  Submit request
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
    headerTitle: { fontSize: fontSizes.lg, ...fonts.semiBold },
    intro: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.base },
    introTitle: { fontSize: fontSizes['2xl'], ...fonts.bold, letterSpacing: -0.5, marginBottom: spacing.sm },
    introSub: { fontSize: fontSizes.base, lineHeight: 20 },
    bookingChip: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginHorizontal: spacing.lg, paddingHorizontal: 14, paddingVertical: spacing.sm, borderRadius: borderRadius.md, marginBottom: spacing.base, alignSelf: 'flex-start' },
    bookingChipText: { fontSize: fontSizes.sm, ...fonts.semiBold },
    issueList: { paddingHorizontal: spacing.lg, gap: spacing.sm },
    issueRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: borderRadius.md, borderWidth: 1 },
    issueIcon: { width: 44, height: 44, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center' },
    issueTitle: { fontSize: fontSizes.base, ...fonts.bold },
    issueSub: { fontSize: fontSizes.xs, marginTop: 2 },
    contactRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
    contactText: { fontSize: fontSizes.base, ...fonts.semiBold },
    selectedBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: 14, borderRadius: borderRadius.md, marginBottom: spacing.lg },
    selectedTitle: { fontSize: fontSizes.md, ...fonts.bold },
    fieldLabel: { fontSize: fontSizes.base, ...fonts.bold, marginBottom: spacing.sm },
    textArea: { borderRadius: borderRadius.md, padding: 14, fontSize: fontSizes.base, borderWidth: 1, minHeight: 120, marginBottom: 14 },
    photoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: 13, borderRadius: borderRadius.md, borderWidth: 1.5, borderStyle: 'dashed', marginBottom: spacing.base },
    photoBtnText: { fontSize: fontSizes.base, ...fonts.semiBold },
    refundNote: { flexDirection: 'row', gap: spacing.sm, padding: 14, borderRadius: borderRadius.md, marginBottom: spacing.base, alignItems: 'flex-start' },
    refundNoteText: { flex: 1, fontSize: fontSizes.sm, lineHeight: 18 },
    infoCard: { borderRadius: borderRadius.md, borderWidth: 1, padding: spacing.base },
    infoTitle: { fontSize: fontSizes.base, ...fonts.bold, marginBottom: 14 },
    stepItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
    stepDot: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    stepDotText: { color: '#fff', fontSize: fontSizes.xs, ...fonts.bold },
    stepText: { flex: 1, fontSize: fontSizes.sm, lineHeight: 18 },
    footer: { padding: spacing.base, borderTopWidth: 1 },
    submitBtnWrap: { borderRadius: borderRadius.md, overflow: 'hidden' },
    submitBtn: { paddingVertical: spacing.base, borderRadius: borderRadius.md, alignItems: 'center' },
    submitText: { fontSize: fontSizes.md, ...fonts.bold },
  });
}
