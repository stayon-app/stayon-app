import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useHaptics } from '../hooks/useHaptics';
import { confirmAction } from '../utils/confirm';
import { fonts, fontSizes, spacing, borderRadius, letterSpacing, shadows } from '../constants';
import { withOpacity } from '../utils/color';
import { ScreenHeader, EmptyState } from '../components/common';
import { STAYON_GRADIENT } from '../components/GradientButton';
import { getListings, type HostListing } from '../data/listings';
import {
  getIssues, addIssue, cycleIssueStatus, deleteIssue, getDamages, resolveDamage,
  ISSUE_CATEGORIES, STATUS_META, type MaintenanceIssue, type DamageReport, type IssueCategory, type IssueStatus,
} from '../data/maintenance';

const STATUS_COLOR = (s: IssueStatus, colors: any) => s === 'open' ? colors.error : s === 'in_progress' ? colors.warning : colors.success;

export function MaintenanceScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { light, selection, success } = useHaptics();
  const styles = makeStyles(colors);

  const [tab, setTab] = useState<'issues' | 'damages'>('issues');
  const [issues, setIssues] = useState<MaintenanceIssue[]>([]);
  const [damages, setDamages] = useState<DamageReport[]>([]);
  const [listings, setListings] = useState<HostListing[]>([]);

  // add-issue sheet
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [cat, setCat] = useState<IssueCategory>('other');
  const [listingId, setListingId] = useState<string | undefined>();
  const [note, setNote] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      Promise.all([getIssues(), getDamages(), getListings()]).then(([i, d, l]) => {
        if (!active) return; setIssues(i); setDamages(d); setListings(l);
      });
      return () => { active = false; };
    }, [])
  );

  const openCount = issues.filter((i) => i.status !== 'fixed').length;
  const damageOpen = damages.filter((d) => !d.resolved).length;

  const submitIssue = async () => {
    if (!title.trim()) return;
    success();
    const lst = listings.find((l) => l.id === listingId);
    setIssues(await addIssue({ title: title.trim(), category: cat, listingId, listingTitle: lst?.title, note: note.trim() || undefined }));
    setAdding(false); setTitle(''); setCat('other'); setListingId(undefined); setNote('');
  };

  const cycle = async (id: string) => { selection(); setIssues(await cycleIssueStatus(id)); };
  const removeIssue = (id: string) => confirmAction({ title: 'Delete task?', confirmText: 'Delete', destructive: true, onConfirm: async () => setIssues(await deleteIssue(id)) });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Maintenance & damages" onBack={() => navigation.goBack()}
        rightActions={tab === 'issues' ? [{ icon: 'add', onPress: () => { light(); setAdding(true); }, accessibilityLabel: 'Add task' }] : []} />

      {/* Tabs */}
      <View style={styles.tabs}>
        {([['issues', `Tasks${openCount ? ` (${openCount})` : ''}`], ['damages', `Damages${damageOpen ? ` (${damageOpen})` : ''}`]] as const).map(([k, label]) => (
          <TouchableOpacity key={k} style={[styles.tab, tab === k && styles.tabActive]} onPress={() => { selection(); setTab(k); }}>
            <Text style={[styles.tabText, tab === k && styles.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['4xl'] }}>
        {tab === 'issues' ? (
          issues.length === 0 ? (
            <EmptyState illustration="maintenance" icon="construct-outline" title="No maintenance tasks" message="Log upkeep tasks to keep your place guest‑ready." actionLabel="Add a task" onAction={() => { light(); setAdding(true); }} />
          ) : (
            issues.map((i) => {
              const c = ISSUE_CATEGORIES.find((x) => x.key === i.category);
              return (
                <View key={i.id} style={styles.card}>
                  <View style={styles.issueTop}>
                    <View style={[styles.catIcon, { backgroundColor: colors.primarySubtle }]}><Ionicons name={(c?.icon ?? 'construct-outline') as any} size={18} color={colors.primary} /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.issueTitle}>{i.title}</Text>
                      <Text style={styles.issueSub} numberOfLines={1}>{[c?.label, i.listingTitle].filter(Boolean).join(' · ')}</Text>
                    </View>
                    <TouchableOpacity onPress={() => removeIssue(i.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="trash-outline" size={16} color={colors.textTertiary} />
                    </TouchableOpacity>
                  </View>
                  {!!i.note && <Text style={styles.issueNote}>{i.note}</Text>}
                  <TouchableOpacity style={styles.statusRow} onPress={() => cycle(i.id)} activeOpacity={0.8}>
                    <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR(i.status, colors) }]} />
                    <Text style={[styles.statusText, { color: STATUS_COLOR(i.status, colors) }]}>{STATUS_META[i.status].label}</Text>
                    <Ionicons name="sync" size={13} color={colors.textTertiary} />
                    <Text style={styles.statusHint}>tap to advance</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )
        ) : (
          damages.length === 0 ? (
            <EmptyState illustration="damages" icon="image-outline" title="No damage reports" message="Reports you file at checkout appear here with photos." />
          ) : (
            damages.map((d) => (
              <View key={d.id} style={styles.card}>
                <View style={styles.issueTop}>
                  <View style={[styles.catIcon, { backgroundColor: withOpacity(colors.warning, 0.14) }]}><Ionicons name="alert-circle-outline" size={18} color={colors.warning} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.issueTitle}>{d.guestName}</Text>
                    <Text style={styles.issueSub} numberOfLines={1}>{d.listingTitle}</Text>
                  </View>
                  <TouchableOpacity style={[styles.resolveBtn, d.resolved && { backgroundColor: colors.primarySubtle }]} onPress={async () => { selection(); setDamages(await resolveDamage(d.id)); }}>
                    <Ionicons name={d.resolved ? 'checkmark-circle' : 'ellipse-outline'} size={14} color={d.resolved ? colors.success : colors.textTertiary} />
                    <Text style={[styles.resolveText, d.resolved && { color: colors.success }]}>{d.resolved ? 'Resolved' : 'Open'}</Text>
                  </TouchableOpacity>
                </View>
                {!!d.note && <Text style={styles.issueNote}>{d.note}</Text>}
                {d.photos.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginTop: spacing.sm }} contentContainerStyle={{ gap: spacing.sm }}>
                    {d.photos.map((uri, i) => <Image key={i} source={{ uri }} style={styles.damagePhoto} contentFit="cover" />)}
                  </ScrollView>
                )}
                <Text style={styles.feeNote}>StayOn takes 0% — settle any agreed reimbursement directly with the guest.</Text>
              </View>
            ))
          )
        )}
      </ScrollView>

      {/* Add-issue sheet */}
      <Modal visible={adding} transparent animationType="slide" onRequestClose={() => setAdding(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setAdding(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>New maintenance task</Text>

            <Text style={styles.label}>What needs doing?</Text>
            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Fix leaking kitchen tap" placeholderTextColor={colors.textTertiary} />

            <Text style={styles.label}>Category</Text>
            <View style={styles.catWrap}>
              {ISSUE_CATEGORIES.map((c) => (
                <TouchableOpacity key={c.key} style={[styles.catChip, cat === c.key && styles.catChipActive]} onPress={() => { light(); setCat(c.key); }}>
                  <Ionicons name={c.icon as any} size={14} color={cat === c.key ? colors.primary : colors.textSecondary} />
                  <Text style={[styles.catChipText, cat === c.key && { color: colors.primary }]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {listings.length > 0 && (
              <>
                <Text style={styles.label}>Stay (optional)</Text>
                <View style={styles.catWrap}>
                  {listings.map((l) => (
                    <TouchableOpacity key={l.id} style={[styles.catChip, listingId === l.id && styles.catChipActive]} onPress={() => { light(); setListingId(listingId === l.id ? undefined : l.id); }}>
                      <Text style={[styles.catChipText, listingId === l.id && { color: colors.primary }]} numberOfLines={1}>{l.title}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <Text style={styles.label}>Note (optional)</Text>
            <TextInput style={[styles.input, { minHeight: 70 }]} value={note} onChangeText={setNote} placeholder="Any details…" placeholderTextColor={colors.textTertiary} multiline textAlignVertical="top" />

            <TouchableOpacity activeOpacity={0.9} disabled={!title.trim()} onPress={submitIssue}>
              <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.saveBtn, !title.trim() && { opacity: 0.5 }]}>
                <Text style={styles.saveText}>Add task</Text>
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
    tabs: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
    tab: { height: 34, justifyContent: 'center', paddingHorizontal: spacing.base, borderRadius: 17, backgroundColor: colors.card, ...shadows.card },
    tabActive: { backgroundColor: withOpacity(colors.primary, 0.12) },
    tabText: { fontSize: fontSizes.sm, color: colors.textSecondary, ...fonts.semiBold },
    tabTextActive: { color: colors.primary },
    card: { backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.base, marginBottom: spacing.md, ...shadows.card },
    issueTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    catIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
    issueTitle: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.bold },
    issueSub: { fontSize: fontSizes.sm, color: colors.textTertiary, marginTop: 1, ...fonts.regular },
    issueNote: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: spacing.sm, lineHeight: 19, ...fonts.regular },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderLight },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    statusText: { fontSize: fontSizes.sm, ...fonts.bold },
    statusHint: { fontSize: fontSizes.xs, color: colors.textTertiary, ...fonts.regular },
    resolveBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 5, borderRadius: 999, backgroundColor: colors.backgroundSecondary },
    resolveText: { fontSize: fontSizes.xs, color: colors.textSecondary, ...fonts.bold },
    damagePhoto: { width: 84, height: 84, borderRadius: borderRadius.md, backgroundColor: colors.backgroundSecondary },
    feeNote: { fontSize: fontSizes.xs, color: colors.textTertiary, marginTop: spacing.sm, ...fonts.regular },
    // sheet
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.lg, paddingBottom: spacing['2xl'], maxHeight: '88%' },
    handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderLight, marginBottom: spacing.md },
    sheetTitle: { fontSize: fontSizes.xl, color: colors.textPrimary, ...fonts.bold },
    label: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: spacing.base, marginBottom: 6, ...fonts.semiBold },
    input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderLight, borderRadius: borderRadius.md, paddingHorizontal: spacing.base, paddingVertical: spacing.md, fontSize: fontSizes.base, color: colors.textPrimary },
    catWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    catChip: { flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: 200, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 999, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.card },
    catChipActive: { borderColor: colors.primary, backgroundColor: colors.primarySubtle },
    catChipText: { fontSize: fontSizes.sm, color: colors.textSecondary, ...fonts.semiBold },
    saveBtn: { marginTop: spacing.lg, paddingVertical: spacing.base, borderRadius: borderRadius.lg, alignItems: 'center' },
    saveText: { fontSize: fontSizes.md, color: '#fff', ...fonts.bold },
  });

export default MaintenanceScreen;
