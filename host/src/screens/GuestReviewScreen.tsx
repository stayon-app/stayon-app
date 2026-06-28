import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useHaptics } from '../hooks/useHaptics';
import { fonts, fontSizes, spacing, borderRadius, letterSpacing } from '../constants';
import { ScreenHeader } from '../components/common';
import { STAYON_GRADIENT } from '../components/GradientButton';
import { addHostToGuest } from '../data/hostReviews';

const CATS = [
  { key: 'overall', label: 'Overall' },
  { key: 'communication', label: 'Communication' },
  { key: 'cleanliness', label: 'Cleanliness' },
  { key: 'rules', label: 'Followed house rules' },
] as const;

export function GuestReviewScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const { light, success } = useHaptics();
  const styles = makeStyles(colors);
  const reservationId = route?.params?.id;
  const guestName = route?.params?.guestName ?? 'your guest';
  const [stars, setStars] = useState<Record<string, number>>({ overall: 0, communication: 0, cleanliness: 0, rules: 0 });
  const [recommend, setRecommend] = useState<boolean | null>(null);
  const [text, setText] = useState('');

  const canSubmit = Object.values(stars).every((s) => s > 0) && recommend !== null && text.trim().length >= 10;

  const submit = async () => {
    success();
    await addHostToGuest({
      reservationId, guestName,
      overall: stars.overall, communication: stars.communication, cleanliness: stars.cleanliness, rules: stars.rules,
      recommend: recommend === true, text: text.trim(),
    });
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title={`Review ${guestName.split(' ')[0]}`} onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['4xl'] }}>
        <Text style={styles.lead}>Your review helps other hosts and is shown on the guest’s profile.</Text>

        {CATS.map((c) => (
          <View key={c.key} style={styles.ratingRow}>
            <Text style={styles.ratingLabel}>{c.label}</Text>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity key={n} onPress={() => { light(); setStars((p) => ({ ...p, [c.key]: n })); }} hitSlop={{ top: 6, bottom: 6, left: 3, right: 3 }}>
                  <Ionicons name={stars[c.key] >= n ? 'star' : 'star-outline'} size={26} color={stars[c.key] >= n ? colors.gold : colors.textTertiary} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <Text style={styles.q}>Would you host {guestName.split(' ')[0]} again?</Text>
        <View style={styles.recRow}>
          {[['Yes', true], ['No', false]].map(([lbl, val]) => (
            <TouchableOpacity key={String(lbl)} style={[styles.recBtn, recommend === val && (val ? styles.recYes : styles.recNo)]} onPress={() => { light(); setRecommend(val as boolean); }}>
              <Ionicons name={val ? 'thumbs-up' : 'thumbs-down'} size={20} color={recommend === val ? (val ? colors.primary : colors.error) : colors.textTertiary} />
              <Text style={[styles.recText, recommend === val && { color: val ? colors.primary : colors.error }]}>{lbl}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.q}>Tell us more</Text>
        <TextInput style={styles.input} placeholder="How was your guest? (min 10 characters)" placeholderTextColor={colors.textTertiary} value={text} onChangeText={setText} multiline textAlignVertical="top" />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={0.9} disabled={!canSubmit} onPress={submit}>
          <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.submit, !canSubmit && { opacity: 0.5 }]}>
            <Text style={styles.submitText}>Submit review</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    lead: { fontSize: fontSizes.base, color: colors.textSecondary, marginBottom: spacing.lg, ...fonts.regular },
    ratingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight },
    ratingLabel: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.medium },
    stars: { flexDirection: 'row', gap: spacing.xs },
    q: { fontSize: fontSizes.md, color: colors.textPrimary, marginTop: spacing.xl, marginBottom: spacing.sm, ...fonts.bold },
    recRow: { flexDirection: 'row', gap: spacing.md },
    recBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.base, borderRadius: borderRadius.lg, borderWidth: 1.5, borderColor: colors.borderLight },
    recYes: { borderColor: colors.primary, backgroundColor: colors.primarySubtle },
    recNo: { borderColor: colors.error, backgroundColor: '#FEF2F2' },
    recText: { fontSize: fontSizes.base, color: colors.textSecondary, ...fonts.semiBold },
    input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderLight, borderRadius: borderRadius.md, padding: spacing.base, minHeight: 110, fontSize: fontSizes.base, color: colors.textPrimary },
    footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.borderLight, backgroundColor: colors.surface },
    submit: { paddingVertical: spacing.base, borderRadius: borderRadius.lg, alignItems: 'center' },
    submitText: { color: '#fff', fontSize: fontSizes.md, ...fonts.bold },
  });

export default GuestReviewScreen;
