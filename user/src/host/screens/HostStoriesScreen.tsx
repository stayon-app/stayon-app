import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useHaptics } from '../hooks/useHaptics';
import { confirmAction } from '../utils/confirm';
import { fonts, fontSizes, spacing, borderRadius, letterSpacing, shadows } from '../constants';
import { withOpacity } from '../utils/color';
import { ScreenHeader } from '../components/common';
import { STAYON_GRADIENT } from '../components/GradientButton';
import { getStories, addStory, deleteStory, STORY_STATUS, type HostStory } from '../data/hostStories';

export function HostStoriesScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { light, success, selection } = useHaptics();
  const styles = makeStyles(colors);

  const [stories, setStories] = useState<HostStory[]>([]);
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [cover, setCover] = useState<string | null>(null);
  const [reading, setReading] = useState<HostStory | null>(null);

  useFocusEffect(React.useCallback(() => {
    let active = true;
    getStories().then((s) => { if (active) setStories(s); });
    return () => { active = false; };
  }, []));

  const pickCover = async () => {
    light();
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (!res.canceled) setCover(res.assets[0].uri);
  };

  const canPost = title.trim().length > 2 && body.trim().length > 20;
  const post = async () => {
    if (!canPost) return;
    success();
    setStories(await addStory({ title, body, cover: cover || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=900&q=80&auto=format&fit=crop' }));
    setComposing(false); setTitle(''); setBody(''); setCover(null);
  };
  const remove = (id: string) => confirmAction({ title: 'Delete story?', confirmText: 'Delete', destructive: true, onConfirm: async () => setStories(await deleteStory(id)) });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Hosting stories" onBack={() => navigation.goBack()}
        rightActions={[{ icon: 'create-outline', onPress: () => { light(); setComposing(true); }, accessibilityLabel: 'Write a story' }]} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['4xl'] }}>
        <Text style={styles.lead}>Share what you’ve learned — tips, your place’s story, a local guide. The StayOn team reviews each post before it’s published.</Text>

        {stories.map((s) => {
          const m = STORY_STATUS[s.status];
          const tint = s.status === 'published' ? colors.primary : s.status === 'rejected' ? colors.error : colors.warning;
          return (
            <TouchableOpacity key={s.id} style={styles.card} activeOpacity={0.9} onPress={() => { light(); setReading(s); }}>
              <Image source={{ uri: s.cover }} style={styles.cover} resizeMode="cover" />
              <View style={styles.cardBody}>
                <View style={[styles.statusPill, { backgroundColor: withOpacity(tint, 0.14) }]}>
                  <Ionicons name={m.icon as any} size={12} color={tint} />
                  <Text style={[styles.statusText, { color: tint }]}>{m.label}</Text>
                </View>
                <Text style={styles.cardTitle} numberOfLines={2}>{s.title}</Text>
                <Text style={styles.cardExcerpt} numberOfLines={2}>{s.body}</Text>
                <View style={styles.cardFoot}>
                  <Text style={styles.readMore}>Read</Text>
                  <TouchableOpacity onPress={() => remove(s.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="trash-outline" size={16} color={colors.textTertiary} />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Compose */}
      <Modal visible={composing} animationType="slide" onRequestClose={() => setComposing(false)}>
        <SafeAreaView style={styles.container} edges={['top']}>
          <ScreenHeader title="Write a story" onBack={() => setComposing(false)} />
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['4xl'] }}>
            <TouchableOpacity style={styles.coverPick} activeOpacity={0.85} onPress={pickCover}>
              {cover ? <Image source={{ uri: cover }} style={StyleSheet.absoluteFill as any} resizeMode="cover" /> : (
                <View style={styles.coverInner}><Ionicons name="image-outline" size={24} color={colors.primary} /><Text style={styles.coverText}>Add a cover image</Text></View>
              )}
            </TouchableOpacity>
            <TextInput style={styles.titleInput} value={title} onChangeText={setTitle} placeholder="Story title" placeholderTextColor={colors.textTertiary} />
            <TextInput style={styles.bodyInput} value={body} onChangeText={setBody} placeholder="Write your story… tips, your place’s story, a local guide." placeholderTextColor={colors.textTertiary} multiline textAlignVertical="top" />
            <Text style={styles.note}>Reviewed by the StayOn team before publishing — keep it real and helpful. No contact details.</Text>
            <TouchableOpacity activeOpacity={0.9} disabled={!canPost} onPress={post}>
              <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.postBtn, !canPost && { opacity: 0.5 }]}>
                <Text style={styles.postText}>Submit for review</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Read */}
      <Modal visible={!!reading} animationType="slide" onRequestClose={() => setReading(null)}>
        <SafeAreaView style={styles.container} edges={['top']}>
          <ScreenHeader title="" onBack={() => setReading(null)} />
          {reading && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing['4xl'] }}>
              <Image source={{ uri: reading.cover }} style={styles.readCover} resizeMode="cover" />
              <View style={{ padding: spacing.lg }}>
                <Text style={styles.readTitle}>{reading.title}</Text>
                <Text style={styles.readBody}>{reading.body}</Text>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    lead: { fontSize: fontSizes.base, color: colors.textSecondary, lineHeight: 22, marginBottom: spacing.base, ...fonts.regular },
    card: { borderRadius: borderRadius.xl, overflow: 'hidden', backgroundColor: colors.card, marginBottom: spacing.md, ...shadows.card },
    cover: { width: '100%', height: 150, backgroundColor: colors.backgroundSecondary },
    cardBody: { padding: spacing.base },
    statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: 999, marginBottom: spacing.sm },
    statusText: { fontSize: fontSizes.xs, ...fonts.bold },
    cardTitle: { fontSize: fontSizes.lg, letterSpacing: letterSpacing.snug, color: colors.textPrimary, ...fonts.bold },
    cardExcerpt: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 4, lineHeight: 19, ...fonts.regular },
    cardFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md },
    readMore: { fontSize: fontSizes.sm, color: colors.primary, ...fonts.bold },
    coverPick: { height: 180, borderRadius: borderRadius.lg, overflow: 'hidden', backgroundColor: colors.card, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.borderLight, alignItems: 'center', justifyContent: 'center' },
    coverInner: { alignItems: 'center', gap: 6 },
    coverText: { fontSize: fontSizes.sm, color: colors.primary, ...fonts.semiBold },
    titleInput: { marginTop: spacing.lg, fontSize: fontSizes.xl, color: colors.textPrimary, ...fonts.bold },
    bodyInput: { marginTop: spacing.md, minHeight: 200, fontSize: fontSizes.base, lineHeight: 23, color: colors.textPrimary, ...fonts.regular },
    note: { fontSize: fontSizes.sm, color: colors.textTertiary, marginTop: spacing.base, lineHeight: 18, ...fonts.regular },
    postBtn: { marginTop: spacing.lg, paddingVertical: spacing.base, borderRadius: borderRadius.lg, alignItems: 'center' },
    postText: { color: '#fff', fontSize: fontSizes.md, ...fonts.bold },
    readCover: { width: '100%', height: 240, backgroundColor: colors.backgroundSecondary },
    readTitle: { fontSize: fontSizes['2xl'], letterSpacing: letterSpacing.tight, color: colors.textPrimary, ...fonts.bold },
    readBody: { fontSize: fontSizes.base, lineHeight: 25, color: colors.textPrimary, marginTop: spacing.md, ...fonts.regular },
  });

export default HostStoriesScreen;
