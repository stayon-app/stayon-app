import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useHaptics } from '../hooks/useHaptics';
import { fonts, fontSizes, spacing, borderRadius, letterSpacing, shadows } from '../constants';
import { withOpacity } from '../utils/color';
import { ScreenHeader } from '../components/common';
import { STAYON_GRADIENT } from '../components/GradientButton';
import { getHostProfile, setHostProfile, type HostProfile } from '../data/hostProfile';
import { getGuestReviews, avgRating } from '../data/hostReviews';

const LANG_OPTIONS = ['English', 'Hindi', 'Telugu', 'Tamil', 'Spanish', 'French', 'Arabic', 'German', 'Mandarin', 'Portuguese'];

export function PublicProfileScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { light, selection, success } = useHaptics();
  const styles = makeStyles(colors);

  const [p, setP] = useState<HostProfile | null>(null);
  const [rating, setRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);

  useFocusEffect(React.useCallback(() => {
    let active = true;
    getHostProfile().then((v) => { if (active) setP(v); });
    getGuestReviews().then((r) => { if (active) { setRating(avgRating(r)); setReviewCount(r.length); } });
    return () => { active = false; };
  }, []));

  const save = async (patch: Partial<HostProfile>) => { if (!p) return; const next = { ...p, ...patch }; setP(next); await setHostProfile(patch); };
  const pickAvatar = async () => {
    light();
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.85 });
    if (!res.canceled) save({ avatar: res.assets[0].uri });
  };
  const toggleLang = (l: string) => {
    if (!p) return;
    selection();
    const cur = p.languages ?? [];
    save({ languages: cur.includes(l) ? cur.filter((x) => x !== l) : [...cur, l] });
  };

  if (!p) return <SafeAreaView style={styles.container} edges={['top']}><ScreenHeader title="Public profile" onBack={() => navigation.goBack()} /></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Public profile" onBack={() => { success(); navigation.goBack(); }} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['4xl'] }}>
        <Text style={styles.lead}>This is what guests see when they view your listing. Make it warm and real — it builds trust.</Text>

        {/* Avatar + stats preview */}
        <View style={styles.previewCard}>
          <TouchableOpacity onPress={pickAvatar} activeOpacity={0.85}>
            {p.avatar ? (
              <Image source={{ uri: p.avatar }} style={styles.avatar} contentFit="cover" />
            ) : (
              <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
                <Text style={styles.avatarTxt}>{(p.name || 'H').trim().charAt(0).toUpperCase()}</Text>
              </LinearGradient>
            )}
            <View style={styles.avatarEdit}><Ionicons name="camera" size={13} color="#fff" /></View>
          </TouchableOpacity>
          <Text style={styles.previewName}>{p.name}</Text>
          {!!p.bio && <Text style={styles.previewBio}>{p.bio}</Text>}
          <View style={styles.statRow}>
            <Stat value={rating > 0 ? rating.toFixed(1) : '—'} label="Rating" colors={colors} />
            <View style={styles.statDiv} />
            <Stat value={String(reviewCount)} label="Reviews" colors={colors} />
            <View style={styles.statDiv} />
            <Stat value={p.hostingSince ?? '—'} label="Hosting since" colors={colors} />
          </View>
        </View>

        <Field label="Display name" value={p.name} onChange={(t: string) => setP({ ...p, name: t })} onBlur={() => save({ name: p.name })} colors={colors} />
        <Field label="Tagline" value={p.bio ?? ''} onChange={(t: string) => setP({ ...p, bio: t })} onBlur={() => save({ bio: p.bio })} placeholder="A short line about you" colors={colors} />
        <Field label="About you" value={p.about ?? ''} onChange={(t: string) => setP({ ...p, about: t })} onBlur={() => save({ about: p.about })} placeholder="Tell guests who you are…" multiline colors={colors} />
        <Field label="Work" value={p.work ?? ''} onChange={(t: string) => setP({ ...p, work: t })} onBlur={() => save({ work: p.work })} placeholder="What you do" colors={colors} />
        <Field label="Fun fact" value={p.funFact ?? ''} onChange={(t: string) => setP({ ...p, funFact: t })} onBlur={() => save({ funFact: p.funFact })} placeholder="Something personable" colors={colors} />

        <Text style={styles.fieldLabel}>Languages</Text>
        <View style={styles.langWrap}>
          {LANG_OPTIONS.map((l) => {
            const on = (p.languages ?? []).includes(l);
            return (
              <TouchableOpacity key={l} style={[styles.langChip, on && styles.langChipOn]} onPress={() => toggleLang(l)}>
                <Text style={[styles.langText, on && { color: colors.primary }]}>{l}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.note}>
          <Ionicons name="lock-closed-outline" size={14} color={colors.textTertiary} />
          <Text style={styles.noteText}>Your verified legal identity stays private — only this friendly public profile is shown to guests.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const Field = ({ label, value, onChange, onBlur, placeholder, multiline, colors }: any) => {
  const styles = makeStyles(colors);
  return (
    <>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput style={[styles.input, multiline && { minHeight: 96 }]} value={value} onChangeText={onChange} onBlur={onBlur}
        placeholder={placeholder} placeholderTextColor={colors.textTertiary} multiline={multiline} textAlignVertical={multiline ? 'top' : 'center'} />
    </>
  );
};

const Stat = ({ value, label, colors }: any) => {
  const styles = makeStyles(colors);
  return <View style={styles.stat}><Text style={styles.statVal}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
};

const makeStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    lead: { fontSize: fontSizes.base, color: colors.textSecondary, lineHeight: 22, marginBottom: spacing.base, ...fonts.regular },
    previewCard: { alignItems: 'center', padding: spacing.lg, borderRadius: borderRadius.xl, backgroundColor: colors.card, ...shadows.card },
    avatar: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.backgroundSecondary },
    avatarTxt: { color: '#fff', fontSize: fontSizes['3xl'], ...fonts.bold },
    avatarEdit: { position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.card },
    previewName: { fontSize: fontSizes.xl, color: colors.textPrimary, marginTop: spacing.md, ...fonts.bold },
    previewBio: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 2, ...fonts.regular },
    statRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.base, paddingTop: spacing.base, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderLight, alignSelf: 'stretch' },
    statDiv: { width: StyleSheet.hairlineWidth, height: 26, backgroundColor: colors.borderLight },
    stat: { flex: 1, alignItems: 'center', gap: 2 },
    statVal: { fontSize: fontSizes.md, color: colors.textPrimary, ...fonts.bold },
    statLabel: { fontSize: fontSizes.xs, color: colors.textSecondary, ...fonts.medium },
    fieldLabel: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: spacing.lg, marginBottom: 6, ...fonts.semiBold },
    input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderLight, borderRadius: borderRadius.md, paddingHorizontal: spacing.base, paddingVertical: spacing.md, fontSize: fontSizes.base, color: colors.textPrimary },
    langWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    langChip: { paddingHorizontal: spacing.base, paddingVertical: spacing.sm, borderRadius: 999, borderWidth: 1.5, borderColor: colors.borderLight, backgroundColor: colors.card },
    langChipOn: { borderColor: colors.primary, backgroundColor: colors.primarySubtle },
    langText: { fontSize: fontSizes.sm, color: colors.textSecondary, ...fonts.semiBold },
    note: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', marginTop: spacing.lg, padding: spacing.base, borderRadius: borderRadius.md, backgroundColor: colors.backgroundSecondary },
    noteText: { flex: 1, fontSize: fontSizes.sm, color: colors.textSecondary, lineHeight: 18, ...fonts.regular },
  });

export default PublicProfileScreen;
