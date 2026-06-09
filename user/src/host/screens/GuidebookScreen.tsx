import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal } from 'react-native';
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
import { getListings, type HostListing } from '../data/listings';
import { getGuide, addGuideEntry, deleteGuideEntry, GUIDE_CATEGORIES, type GuideEntry, type GuideCategory } from '../data/guidebooks';

export function GuidebookScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const { light, selection, success } = useHaptics();
  const styles = makeStyles(colors);

  const [listings, setListings] = useState<HostListing[]>([]);
  const [activeId, setActiveId] = useState<string | null>(route?.params?.id ?? null);
  const [entries, setEntries] = useState<GuideEntry[]>([]);
  const [adding, setAdding] = useState(false);
  const [cat, setCat] = useState<GuideCategory>('eat');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [area, setArea] = useState('');

  useFocusEffect(React.useCallback(() => {
    let active = true;
    (async () => {
      const ls = await getListings();
      if (!active) return;
      setListings(ls);
      const id = activeId ?? ls[0]?.id ?? null;
      setActiveId(id);
      if (id) setEntries(await getGuide(id));
    })();
    return () => { active = false; };
  }, [activeId]));

  const canAdd = title.trim().length > 1 && note.trim().length > 3;
  const add = async () => {
    if (!canAdd || !activeId) return;
    success();
    setEntries(await addGuideEntry(activeId, { category: cat, title: title.trim(), note: note.trim(), area: area.trim() || undefined }));
    setAdding(false); setTitle(''); setNote(''); setArea('');
  };
  const remove = async (id: string) => { if (activeId) { selection(); setEntries(await deleteGuideEntry(activeId, id)); } };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Stay guidebook" onBack={() => navigation.goBack()}
        rightActions={[{ icon: 'add', onPress: () => { light(); setAdding(true); }, accessibilityLabel: 'Add recommendation' }]} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['4xl'] }}>
        <Text style={styles.lead}>Recommend your favourite local spots — guests see this guide on your stay. Great guidebooks earn great reviews.</Text>

        {listings.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginBottom: spacing.md }} contentContainerStyle={{ gap: spacing.sm, alignItems: 'center' }}>
            {listings.map((l) => (
              <TouchableOpacity key={l.id} style={[styles.lTab, activeId === l.id && styles.lTabActive]} onPress={() => { selection(); setActiveId(l.id); }}>
                <Text style={[styles.lTabText, activeId === l.id && { color: colors.primary }]} numberOfLines={1}>{l.title}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {GUIDE_CATEGORIES.map((c) => {
          const items = entries.filter((e) => e.category === c.key);
          if (items.length === 0) return null;
          return (
            <View key={c.key} style={{ marginBottom: spacing.lg }}>
              <View style={styles.catHead}><Ionicons name={c.icon as any} size={16} color={colors.primary} /><Text style={styles.catLabel}>{c.label}</Text></View>
              {items.map((e) => (
                <View key={e.id} style={styles.entry}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.entryTop}>
                      <Text style={styles.entryTitle}>{e.title}</Text>
                      {!!e.area && <View style={styles.areaPill}><Text style={styles.areaText}>{e.area}</Text></View>}
                    </View>
                    <Text style={styles.entryNote}>{e.note}</Text>
                  </View>
                  <TouchableOpacity onPress={() => remove(e.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="trash-outline" size={16} color={colors.textTertiary} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          );
        })}

        {entries.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="map-outline" size={34} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>No recommendations yet</Text>
            <Text style={styles.emptyText}>Add your favourite places to eat, see and do near your stay.</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => { light(); setAdding(true); }}><Text style={styles.emptyBtnText}>Add a recommendation</Text></TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Add entry */}
      <Modal visible={adding} transparent animationType="slide" onRequestClose={() => setAdding(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setAdding(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Add a recommendation</Text>
            <Text style={styles.label}>Category</Text>
            <View style={styles.catWrap}>
              {GUIDE_CATEGORIES.map((c) => (
                <TouchableOpacity key={c.key} style={[styles.catChip, cat === c.key && styles.catChipActive]} onPress={() => { light(); setCat(c.key); }}>
                  <Ionicons name={c.icon as any} size={14} color={cat === c.key ? colors.primary : colors.textSecondary} />
                  <Text style={[styles.catChipText, cat === c.key && { color: colors.primary }]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>Name</Text>
            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Sunrise Café" placeholderTextColor={colors.textTertiary} />
            <Text style={styles.label}>Why you recommend it</Text>
            <TextInput style={[styles.input, { minHeight: 64 }]} value={note} onChangeText={setNote} placeholder="What’s great about it…" placeholderTextColor={colors.textTertiary} multiline textAlignVertical="top" />
            <Text style={styles.label}>Distance / area (optional)</Text>
            <TextInput style={styles.input} value={area} onChangeText={setArea} placeholder="e.g. 5 min walk" placeholderTextColor={colors.textTertiary} />
            <TouchableOpacity activeOpacity={0.9} disabled={!canAdd} onPress={add}>
              <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.saveBtn, !canAdd && { opacity: 0.5 }]}>
                <Text style={styles.saveText}>Add to guidebook</Text>
              </LinearGradient>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    lead: { fontSize: fontSizes.base, color: colors.textSecondary, lineHeight: 22, marginBottom: spacing.base, ...fonts.regular },
    lTab: { maxWidth: 180, height: 34, justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: 17, backgroundColor: colors.card, ...shadows.card },
    lTabActive: { backgroundColor: withOpacity(colors.primary, 0.12) },
    lTabText: { fontSize: fontSizes.sm, color: colors.textSecondary, ...fonts.semiBold },
    catHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
    catLabel: { fontSize: fontSizes.lg, letterSpacing: letterSpacing.snug, color: colors.textPrimary, ...fonts.bold },
    entry: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, padding: spacing.base, borderRadius: borderRadius.lg, backgroundColor: colors.card, marginBottom: spacing.sm, ...shadows.card },
    entryTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
    entryTitle: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.bold },
    areaPill: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 999, backgroundColor: colors.primarySubtle },
    areaText: { fontSize: fontSizes.xs, color: colors.primary, ...fonts.semiBold },
    entryNote: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 3, lineHeight: 19, ...fonts.regular },
    empty: { alignItems: 'center', paddingVertical: spacing['4xl'], gap: 8 },
    emptyTitle: { fontSize: fontSizes.lg, color: colors.textPrimary, ...fonts.bold },
    emptyText: { fontSize: fontSizes.base, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: spacing.xl, ...fonts.regular },
    emptyBtn: { marginTop: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: 999, backgroundColor: colors.primarySubtle },
    emptyBtnText: { fontSize: fontSizes.base, color: colors.primary, ...fonts.bold },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.lg, paddingBottom: spacing['2xl'] },
    handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderLight, marginBottom: spacing.md },
    sheetTitle: { fontSize: fontSizes.xl, color: colors.textPrimary, ...fonts.bold },
    label: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: spacing.base, marginBottom: 6, ...fonts.semiBold },
    catWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    catChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 999, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.card },
    catChipActive: { borderColor: colors.primary, backgroundColor: colors.primarySubtle },
    catChipText: { fontSize: fontSizes.sm, color: colors.textSecondary, ...fonts.semiBold },
    input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderLight, borderRadius: borderRadius.md, paddingHorizontal: spacing.base, paddingVertical: spacing.md, fontSize: fontSizes.base, color: colors.textPrimary },
    saveBtn: { marginTop: spacing.lg, paddingVertical: spacing.base, borderRadius: borderRadius.lg, alignItems: 'center' },
    saveText: { color: '#fff', fontSize: fontSizes.md, ...fonts.bold },
  });

export default GuidebookScreen;
