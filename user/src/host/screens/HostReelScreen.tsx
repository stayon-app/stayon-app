import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useHaptics } from '../hooks/useHaptics';
import { fonts, fontSizes, spacing, borderRadius, letterSpacing, shadows } from '../constants';
import { withOpacity } from '../utils/color';
import { STAYON_GRADIENT } from '../components/GradientButton';
import { getReels, submitReel, deleteReel, STATUS_META, type Reel } from '../../data/reels';
import { Api } from '../../api';

// Faded backdrop behind the upload prompt — a soft travel scene.
const REEL_BG = 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=800&q=80&auto=format&fit=crop';

const STEPS = ['upload', 'details', 'review'] as const;
const STEP_META = [
  { n: 'Step 1', t: 'Add your vlog', s: 'Pick a video straight from your phone — iPhone & Android high‑quality clips work great.' },
  { n: 'Step 2', t: 'Describe it', s: 'A clear title and location help guests find and trust your vlog.' },
  { n: 'Step 3', t: 'Review & submit', s: 'Check it over — the StayOn team reviews every vlog before it goes live.' },
];

const GUIDELINES = [
  'Show off your place — a tour, the view, the neighbourhood',
  'Vertical video, 15–60 seconds, bright & steady',
  'No guests’ faces without consent; no contact details',
  'Keep it real — your own footage of your own listing',
];

export function HostReelScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { light, success, selection } = useHaptics();
  const styles = makeStyles(colors);

  const [i, setI] = useState(0);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [caption, setCaption] = useState('');
  const [mine, setMine] = useState<Reel[]>([]);
  const [justSubmitted, setJustSubmitted] = useState(false);

  useFocusEffect(React.useCallback(() => {
    let active = true;
    getReels().then((r) => { if (active) setMine(r.filter((x) => x.author === 'host')); });
    return () => { active = false; };
  }, []));

  const pickVideo = async () => {
    light();
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], quality: 1, videoMaxDuration: 90 });
    if (!res.canceled) { setVideoUri(res.assets[0].uri); if (!coverUri) setCoverUri(res.assets[0].uri); }
  };
  const pickCover = async () => {
    light();
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (!res.canceled) setCoverUri(res.assets[0].uri);
  };

  const canNext = i === 0 ? !!videoUri : i === 1 ? title.trim().length > 1 : true;

  const back = () => { light(); if (i === 0) navigation.goBack(); else setI(i - 1); };
  const next = async () => {
    if (!canNext) return;
    if (i < STEPS.length - 1) { selection(); setI(i + 1); return; }
    // submit
    success();
    const updated = await submitReel({
      title, location, caption,
      thumbnail: coverUri || 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&h=700&fit=crop',
      videoUri: videoUri || undefined,
      author: 'host',
    });
    setMine(updated.filter((r) => r.author === 'host'));
    try {
      await Api.auth.ensureSession();
      await Api.reels.create({ kind: 'reel', caption: caption || title, mediaUrl: videoUri || coverUri || '', thumbUrl: coverUri || '' });
    } catch { /* backend offline — ignore */ }
    setVideoUri(null); setCoverUri(null); setTitle(''); setLocation(''); setCaption('');
    setI(0); setJustSubmitted(true); setTimeout(() => setJustSubmitted(false), 4500);
  };

  const remove = async (id: string) => { selection(); setMine((await deleteReel(id)).filter((r) => r.author === 'host')); };

  const meta = STEP_META[i];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.topPill} onPress={back} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name={i === 0 ? 'close' : 'chevron-back'} size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Post a vlog</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['2xl'] }}>
        <Text style={styles.stepNum}>{meta.n} of {STEPS.length}</Text>
        <Text style={styles.stepTitle}>{meta.t}</Text>
        <Text style={styles.stepSub}>{meta.s}</Text>

        {justSubmitted && i === 0 && (
          <View style={styles.successBar}>
            <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
            <Text style={styles.successText}>Submitted! The StayOn team reviews vlogs (usually 24–48h). Approved ones go live in StayReels.</Text>
          </View>
        )}

        {/* STEP 1 — upload */}
        {i === 0 && (
          <>
            <TouchableOpacity style={styles.upload} activeOpacity={0.85} onPress={pickVideo}>
              {videoUri ? (
                <>
                  {coverUri ? <Image source={{ uri: coverUri }} style={StyleSheet.absoluteFill as any} resizeMode="cover" /> : null}
                  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.55)']} style={StyleSheet.absoluteFill as any} />
                  <View style={styles.playPill}><Ionicons name="checkmark-circle" size={18} color="#fff" /><Text style={styles.playPillText}>Vlog added</Text></View>
                  <View style={styles.changeBtn}><Text style={styles.changeText}>Change video</Text></View>
                </>
              ) : (
                <>
                  <Image source={{ uri: REEL_BG }} style={StyleSheet.absoluteFill as any} resizeMode="cover" />
                  <View style={[StyleSheet.absoluteFill as any, styles.uploadScrim]} />
                  <View style={styles.uploadInner}>
                    <View style={styles.uploadIcon}><Ionicons name="cloud-upload-outline" size={28} color={colors.primary} /></View>
                    <Text style={styles.uploadTitle}>Upload from your gallery</Text>
                    <Text style={styles.uploadSub}>Pick a vertical video of your place</Text>
                    <View style={styles.uploadHints}>
                      <View style={styles.hintChip}><Ionicons name="phone-portrait-outline" size={12} color={colors.textSecondary} /><Text style={styles.hintText}>iPhone & Android</Text></View>
                      <View style={styles.hintChip}><Ionicons name="sparkles-outline" size={12} color={colors.textSecondary} /><Text style={styles.hintText}>Full quality</Text></View>
                    </View>
                  </View>
                </>
              )}
            </TouchableOpacity>

            {videoUri && (
              <TouchableOpacity style={styles.coverRow} onPress={pickCover}>
                <Ionicons name="image-outline" size={16} color={colors.primary} />
                <Text style={styles.coverText}>{coverUri ? 'Change cover image' : 'Add a cover image (optional)'}</Text>
              </TouchableOpacity>
            )}

            {mine.length > 0 && (
              <>
                <Text style={styles.section}>Your vlogs</Text>
                {mine.map((r) => {
                  const m = STATUS_META[r.status];
                  const tint = r.status === 'live' ? colors.primary : r.status === 'rejected' ? colors.error : colors.warning;
                  return (
                    <View key={r.id} style={styles.myReel}>
                      <Image source={{ uri: r.thumbnail }} style={styles.myThumb} resizeMode="cover" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.myTitle} numberOfLines={1}>{r.title}</Text>
                        {!!r.location && <Text style={styles.myLoc} numberOfLines={1}>{r.location}</Text>}
                        <View style={[styles.statusPill, { backgroundColor: withOpacity(tint, 0.14) }]}>
                          <Ionicons name={m.icon as any} size={12} color={tint} />
                          <Text style={[styles.statusText, { color: tint }]}>{m.label}</Text>
                        </View>
                      </View>
                      <TouchableOpacity onPress={() => remove(r.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="trash-outline" size={16} color={colors.textTertiary} />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </>
            )}
          </>
        )}

        {/* STEP 2 — details */}
        {i === 1 && (
          <>
            <Text style={styles.label}>Title</Text>
            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Tour of the cliffside villa" placeholderTextColor={colors.textTertiary} />
            <Text style={styles.label}>Location</Text>
            <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="e.g. Goa, India" placeholderTextColor={colors.textTertiary} />
            <Text style={styles.label}>Caption</Text>
            <TextInput style={[styles.input, { minHeight: 90 }]} value={caption} onChangeText={setCaption} placeholder="Tell guests what makes it special…" placeholderTextColor={colors.textTertiary} multiline textAlignVertical="top" />
          </>
        )}

        {/* STEP 3 — review */}
        {i === 2 && (
          <>
            <View style={styles.previewCard}>
              <View style={styles.previewMedia}>
                {coverUri ? <Image source={{ uri: coverUri }} style={StyleSheet.absoluteFill as any} resizeMode="cover" /> : <View style={[StyleSheet.absoluteFill as any, { backgroundColor: colors.backgroundSecondary }]} />}
                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.75)']} style={StyleSheet.absoluteFill as any} />
                <View style={styles.previewPlay}><Ionicons name="play" size={20} color="#fff" /></View>
                <View style={styles.previewText}>
                  <Text style={styles.previewTitle} numberOfLines={1}>{title || 'Your vlog'}</Text>
                  {!!location && <Text style={styles.previewLoc} numberOfLines={1}>{location}</Text>}
                </View>
              </View>
              {!!caption && <Text style={styles.previewCaption}>{caption}</Text>}
            </View>

            <View style={styles.guidelines}>
              <Text style={styles.guideTitle}>Before you post</Text>
              {GUIDELINES.map((g, idx) => (<View key={idx} style={styles.guideRow}><Ionicons name="checkmark" size={14} color={colors.primary} /><Text style={styles.guideText}>{g}</Text></View>))}
              <Text style={styles.guideNote}>Every vlog is reviewed by the StayOn team before it appears live — keeps the feed real and high‑quality.</Text>
            </View>
          </>
        )}
      </ScrollView>

      {/* Progress segments */}
      <View style={styles.progress}>
        {STEPS.map((_, idx) => (
          <View key={idx} style={[styles.progSeg, { backgroundColor: idx <= i ? colors.primary : colors.borderLight }]} />
        ))}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity onPress={back}><Text style={styles.backText}>{i === 0 ? 'Cancel' : 'Back'}</Text></TouchableOpacity>
        <TouchableOpacity activeOpacity={0.9} disabled={!canNext} onPress={next} style={{ minWidth: 140 }}>
          <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.nextBtn, !canNext && { opacity: 0.4 }]}>
            {i === STEPS.length - 1 && <Ionicons name="send" size={15} color="#fff" />}
            <Text style={styles.nextText}>{i === STEPS.length - 1 ? 'Submit for review' : 'Next'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
    topPill: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, ...shadows.card },
    topTitle: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.bold },
    stepNum: { fontSize: fontSizes.sm, color: colors.primary, ...fonts.bold },
    stepTitle: { fontSize: fontSizes['2xl'], letterSpacing: letterSpacing.tight, color: colors.textPrimary, marginTop: 4, ...fonts.bold },
    stepSub: { fontSize: fontSizes.base, color: colors.textSecondary, lineHeight: 21, marginTop: 6, marginBottom: spacing.lg, ...fonts.regular },
    successBar: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', padding: spacing.base, borderRadius: borderRadius.md, backgroundColor: colors.primarySubtle, marginBottom: spacing.base },
    successText: { flex: 1, fontSize: fontSizes.sm, color: colors.textPrimary, lineHeight: 18, ...fonts.medium },
    upload: { height: 300, borderRadius: borderRadius.xl, overflow: 'hidden', backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.borderLight, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
    uploadInner: { alignItems: 'center', gap: 6, paddingHorizontal: spacing.lg },
    uploadIcon: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, marginBottom: 6, ...shadows.card },
    uploadScrim: { backgroundColor: withOpacity(colors.card, 0.8) },
    uploadTitle: { fontSize: fontSizes.md, color: colors.textPrimary, ...fonts.bold },
    uploadSub: { fontSize: fontSizes.sm, color: colors.textSecondary, ...fonts.regular },
    uploadHints: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
    hintChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: 999, backgroundColor: colors.backgroundSecondary },
    hintText: { fontSize: fontSizes.xs, color: colors.textSecondary, ...fonts.semiBold },
    playPill: { position: 'absolute', top: spacing.base, left: spacing.base, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: 999 },
    playPillText: { color: '#fff', fontSize: fontSizes.xs, ...fonts.bold },
    changeBtn: { position: 'absolute', bottom: spacing.base, right: spacing.base, backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: 999 },
    changeText: { color: colors.textPrimary, fontSize: fontSizes.xs, ...fonts.bold },
    coverRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md },
    coverText: { fontSize: fontSizes.sm, color: colors.primary, ...fonts.semiBold },
    label: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: spacing.base, marginBottom: 6, ...fonts.semiBold },
    input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderLight, borderRadius: borderRadius.md, paddingHorizontal: spacing.base, paddingVertical: spacing.md, fontSize: fontSizes.base, color: colors.textPrimary },
    previewCard: { borderRadius: borderRadius.xl, overflow: 'hidden', backgroundColor: colors.card, ...shadows.card },
    previewMedia: { height: 320, justifyContent: 'flex-end' },
    previewPlay: { position: 'absolute', alignSelf: 'center', top: '44%', width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
    previewText: { padding: spacing.base },
    previewTitle: { color: '#fff', fontSize: fontSizes.lg, ...fonts.bold },
    previewLoc: { color: 'rgba(255,255,255,0.9)', fontSize: fontSizes.sm, marginTop: 2, ...fonts.regular },
    previewCaption: { fontSize: fontSizes.sm, color: colors.textSecondary, lineHeight: 19, padding: spacing.base, ...fonts.regular },
    guidelines: { marginTop: spacing.lg, padding: spacing.base, borderRadius: borderRadius.lg, backgroundColor: colors.card, ...shadows.card },
    guideTitle: { fontSize: fontSizes.base, color: colors.textPrimary, marginBottom: spacing.sm, ...fonts.bold },
    guideRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
    guideText: { flex: 1, fontSize: fontSizes.sm, color: colors.textSecondary, lineHeight: 18, ...fonts.regular },
    guideNote: { fontSize: fontSizes.xs, color: colors.textTertiary, marginTop: spacing.sm, lineHeight: 16, ...fonts.regular },
    section: { fontSize: fontSizes.lg, letterSpacing: letterSpacing.snug, color: colors.textPrimary, marginTop: spacing.xl, marginBottom: spacing.sm, ...fonts.bold },
    myReel: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.sm, borderRadius: borderRadius.lg, backgroundColor: colors.card, marginBottom: spacing.sm, ...shadows.card },
    myThumb: { width: 48, height: 64, borderRadius: borderRadius.md, backgroundColor: colors.backgroundSecondary },
    myTitle: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.semiBold },
    myLoc: { fontSize: fontSizes.sm, color: colors.textTertiary, marginTop: 1, ...fonts.regular },
    statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginTop: 4, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: 999 },
    statusText: { fontSize: fontSizes.xs, ...fonts.bold },
    progress: { flexDirection: 'row', gap: 6, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
    progSeg: { flex: 1, height: 4, borderRadius: 2 },
    footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.borderLight, backgroundColor: colors.surface },
    backText: { fontSize: fontSizes.base, color: colors.textSecondary, ...fonts.bold },
    nextBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: spacing.base, paddingHorizontal: spacing.lg, borderRadius: borderRadius.lg },
    nextText: { color: '#fff', fontSize: fontSizes.md, ...fonts.bold },
  });

export default HostReelScreen;
