import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useHaptics } from '../hooks/useHaptics';
import { fonts, fontSizes, spacing, borderRadius, letterSpacing, shadows } from '../constants';
import { withOpacity } from '../utils/color';
import { ScreenHeader } from '../components/common';
import { getScheduledRules, setScheduledRules, type ScheduledRule } from '../data/scheduledMessages';

export function ScheduledMessagesScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { light, selection } = useHaptics();
  const styles = makeStyles(colors);

  const [rules, setRules] = useState<ScheduledRule[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  useFocusEffect(React.useCallback(() => {
    let active = true;
    getScheduledRules().then((r) => { if (active) setRules(r); });
    return () => { active = false; };
  }, []));

  const persist = async (next: ScheduledRule[]) => { setRules(next); await setScheduledRules(next); };
  const toggle = (id: string) => { selection(); persist(rules.map((r) => r.id === id ? { ...r, enabled: !r.enabled } : r)); };
  const saveBody = (id: string) => { light(); persist(rules.map((r) => r.id === id ? { ...r, body: draft.trim() || r.body } : r)); setEditing(null); };

  const onCount = rules.filter((r) => r.enabled).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Scheduled messages" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['4xl'] }}>
        <View style={styles.banner}>
          <View style={styles.bannerIcon}><Ionicons name="time" size={20} color={colors.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>{onCount} automated message{onCount === 1 ? '' : 's'} on</Text>
            <Text style={styles.bannerSub}>StayOn sends these to guests automatically at the right moment — so you never forget.</Text>
          </View>
        </View>

        {rules.map((r) => (
          <View key={r.id} style={styles.card}>
            <View style={styles.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{r.label}</Text>
                <View style={styles.timingRow}>
                  <Ionicons name="alarm-outline" size={13} color={colors.textTertiary} />
                  <Text style={styles.timing}>{r.timing}</Text>
                </View>
              </View>
              <TouchableOpacity style={[styles.toggle, r.enabled && { backgroundColor: colors.primary }]} onPress={() => toggle(r.id)} activeOpacity={0.8}>
                <View style={[styles.knob, r.enabled && { transform: [{ translateX: 18 }] }]} />
              </TouchableOpacity>
            </View>

            {editing === r.id ? (
              <View style={styles.editBox}>
                <TextInput style={styles.input} value={draft} onChangeText={setDraft} multiline textAlignVertical="top" placeholder="Message… use {guest} for their name" placeholderTextColor={colors.textTertiary} />
                <View style={styles.editActions}>
                  <TouchableOpacity onPress={() => setEditing(null)}><Text style={styles.cancel}>Cancel</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={() => saveBody(r.id)}><Text style={styles.saveText}>Save</Text></TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.preview} activeOpacity={0.8} onPress={() => { light(); setEditing(r.id); setDraft(r.body); }}>
                <Text style={styles.previewText} numberOfLines={3}>{r.body}</Text>
                <View style={styles.editLink}><Ionicons name="create-outline" size={14} color={colors.primary} /><Text style={styles.editLinkText}>Edit</Text></View>
              </TouchableOpacity>
            )}
          </View>
        ))}

        <Text style={styles.note}>Messages send on StayOn only. The {'{guest}'} tag is replaced with the guest’s first name. Contact details stay hidden until a booking is confirmed.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    banner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.base, borderRadius: borderRadius.lg, backgroundColor: colors.primarySubtle, borderWidth: 1, borderColor: withOpacity(colors.primary, 0.2), marginBottom: spacing.lg },
    bannerIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
    bannerTitle: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.bold },
    bannerSub: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 1, lineHeight: 18, ...fonts.regular },
    card: { backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.base, marginBottom: spacing.md, ...shadows.card },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    cardTitle: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.bold },
    timingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    timing: { fontSize: fontSizes.sm, color: colors.textTertiary, ...fonts.medium },
    toggle: { width: 42, height: 24, borderRadius: 12, backgroundColor: colors.borderLight, padding: 3, justifyContent: 'center' },
    knob: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff', ...shadows.card },
    preview: { marginTop: spacing.md, padding: spacing.md, borderRadius: borderRadius.md, backgroundColor: colors.backgroundSecondary },
    previewText: { fontSize: fontSizes.sm, color: colors.textSecondary, lineHeight: 19, ...fonts.regular },
    editLink: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm },
    editLinkText: { fontSize: fontSizes.sm, color: colors.primary, ...fonts.bold },
    editBox: { marginTop: spacing.md },
    input: { backgroundColor: colors.backgroundSecondary, borderRadius: borderRadius.md, padding: spacing.md, minHeight: 84, fontSize: fontSizes.base, color: colors.textPrimary },
    editActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: spacing.lg, marginTop: spacing.sm },
    cancel: { fontSize: fontSizes.sm, color: colors.textSecondary, ...fonts.semiBold },
    saveBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: 999, backgroundColor: colors.primary },
    saveText: { fontSize: fontSizes.sm, color: '#fff', ...fonts.bold },
    note: { fontSize: fontSizes.sm, color: colors.textTertiary, marginTop: spacing.base, lineHeight: 18, ...fonts.regular },
  });

export default ScheduledMessagesScreen;
