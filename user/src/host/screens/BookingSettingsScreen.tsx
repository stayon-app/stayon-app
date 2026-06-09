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
import { FeeReminder } from '../components/FeeReminder';
import { getListings, type HostListing } from '../data/listings';
import {
  getBookingSettings, setBookingSettings, ADVANCE_OPTIONS, PREP_OPTIONS, WINDOW_OPTIONS,
  type BookingSettings,
} from '../data/bookingSettings';

export function BookingSettingsScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const { light, selection } = useHaptics();
  const styles = makeStyles(colors);

  const [listings, setListings] = useState<HostListing[]>([]);
  const [activeId, setActiveId] = useState<string | null>(route?.params?.id ?? null);
  const [s, setS] = useState<BookingSettings | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      (async () => {
        const ls = await getListings();
        if (!active) return;
        setListings(ls);
        const id = activeId ?? ls[0]?.id ?? null;
        setActiveId(id);
        if (id) setS(await getBookingSettings(id, ls.find((l) => l.id === id)?.minNights ?? 1));
      })();
      return () => { active = false; };
    }, [activeId])
  );

  const save = async (patch: Partial<BookingSettings>) => {
    if (!activeId || !s) return;
    selection();
    const next = { ...s, ...patch };
    setS(next);
    await setBookingSettings(activeId, next);
  };

  if (!s) return <SafeAreaView style={styles.container} edges={['top']}><ScreenHeader title="Booking & availability" onBack={() => navigation.goBack()} /></SafeAreaView>;

  const Chips = ({ options, value, onPick }: any) => (
    <View style={styles.chipWrap}>
      {options.map((o: any) => {
        const sel = value === o.v;
        return (
          <TouchableOpacity key={o.v} style={[styles.chip, sel && styles.chipSel]} onPress={() => onPick(o.v)}>
            <Text style={[styles.chipText, sel && { color: colors.primary }]}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const Stepper = ({ value, onChange, min = 1, max = 365, suffix }: any) => (
    <View style={styles.stepper}>
      <TouchableOpacity style={styles.stepBtn} onPress={() => onChange(Math.max(min, value - 1))}><Ionicons name="remove" size={18} color={value <= min ? colors.textTertiary : colors.textPrimary} /></TouchableOpacity>
      <Text style={styles.stepVal}>{value}{suffix ? ` ${suffix}` : ''}</Text>
      <TouchableOpacity style={styles.stepBtn} onPress={() => onChange(Math.min(max, value + 1))}><Ionicons name="add" size={18} color={value >= max ? colors.textTertiary : colors.textPrimary} /></TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Booking & availability" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['4xl'] }}>
        {/* Listing selector */}
        {listings.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginBottom: spacing.md }} contentContainerStyle={{ gap: spacing.sm, alignItems: 'center' }}>
            {listings.map((l) => (
              <TouchableOpacity key={l.id} style={[styles.lTab, activeId === l.id && styles.lTabActive]} onPress={() => { selection(); setActiveId(l.id); setS(null); }}>
                <Text style={[styles.lTabText, activeId === l.id && { color: colors.primary }]} numberOfLines={1}>{l.title}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* How guests book */}
        <Text style={styles.section}>How guests book</Text>
        <View style={styles.card}>
          <Row title="Instant Book" sub="Guests book without waiting for approval"
            right={<Toggle on={s.instantBook} onPress={() => save({ instantBook: !s.instantBook })} colors={colors} />} colors={colors} last />
        </View>

        {/* Trip length */}
        <Text style={styles.section}>Trip length</Text>
        <View style={styles.card}>
          <Row title="Minimum nights" right={<Stepper value={s.minNights} onChange={(v: number) => save({ minNights: Math.min(v, s.maxNights) })} min={1} max={365} />} colors={colors} />
          <Row title="Maximum nights" right={<Stepper value={s.maxNights} onChange={(v: number) => save({ maxNights: Math.max(v, s.minNights) })} min={1} max={365} />} colors={colors} last />
        </View>

        {/* Advance notice */}
        <Text style={styles.section}>Advance notice</Text>
        <Text style={styles.hint}>How much notice you need before a guest arrives.</Text>
        <Chips options={ADVANCE_OPTIONS} value={s.advanceNotice} onPick={(v: number) => save({ advanceNotice: v })} />

        {/* Preparation time */}
        <Text style={styles.section}>Preparation time</Text>
        <Text style={styles.hint}>Block nights before & after each stay to clean and reset.</Text>
        <Text style={styles.subLabel}>Before a stay</Text>
        <Chips options={PREP_OPTIONS} value={s.prepBefore} onPick={(v: number) => save({ prepBefore: v })} />
        <Text style={styles.subLabel}>After a stay</Text>
        <Chips options={PREP_OPTIONS} value={s.prepAfter} onPick={(v: number) => save({ prepAfter: v })} />

        {/* Availability window */}
        <Text style={styles.section}>Availability window</Text>
        <Text style={styles.hint}>How far ahead guests can book.</Text>
        <Chips options={WINDOW_OPTIONS} value={s.windowMonths} onPick={(v: number) => save({ windowMonths: v })} />

        {/* Length-of-stay discounts */}
        <Text style={styles.section}>Length-of-stay discounts</Text>
        <View style={styles.card}>
          <View style={styles.discRow}>
            <View style={{ flex: 1 }}><Text style={styles.discTitle}>Weekly (7+ nights)</Text><Text style={styles.discSub}>Encourage longer stays</Text></View>
            <View style={styles.pctBox}>
              <TextInput style={styles.pctInput} value={s.weeklyDiscount ? String(s.weeklyDiscount) : ''} onChangeText={(t) => setS({ ...s, weeklyDiscount: Math.min(60, Number(t.replace(/[^0-9]/g, '')) || 0) })} onBlur={() => save({ weeklyDiscount: s.weeklyDiscount })} keyboardType="number-pad" placeholder="0" placeholderTextColor={colors.textTertiary} />
              <Text style={styles.pctSign}>%</Text>
            </View>
          </View>
          <View style={[styles.discRow, { borderBottomWidth: 0 }]}>
            <View style={{ flex: 1 }}><Text style={styles.discTitle}>Monthly (28+ nights)</Text><Text style={styles.discSub}>Fill long gaps</Text></View>
            <View style={styles.pctBox}>
              <TextInput style={styles.pctInput} value={s.monthlyDiscount ? String(s.monthlyDiscount) : ''} onChangeText={(t) => setS({ ...s, monthlyDiscount: Math.min(60, Number(t.replace(/[^0-9]/g, '')) || 0) })} onBlur={() => save({ monthlyDiscount: s.monthlyDiscount })} keyboardType="number-pad" placeholder="0" placeholderTextColor={colors.textTertiary} />
              <Text style={styles.pctSign}>%</Text>
            </View>
          </View>
        </View>

        <View style={{ marginTop: spacing.lg }}><FeeReminder /></View>
      </ScrollView>
    </SafeAreaView>
  );
}

const Row = ({ title, sub, right, colors, last }: any) => {
  const styles = makeStyles(colors);
  return (
    <View style={[styles.row, !last && styles.rowDivider]}>
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
    lTab: { maxWidth: 180, height: 34, justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: 17, backgroundColor: colors.card, ...shadows.card },
    lTabActive: { backgroundColor: withOpacity(colors.primary, 0.12) },
    lTabText: { fontSize: fontSizes.sm, color: colors.textSecondary, ...fonts.semiBold },
    section: { fontSize: fontSizes.lg, letterSpacing: letterSpacing.snug, color: colors.textPrimary, marginTop: spacing.xl, marginBottom: spacing.xs, ...fonts.bold },
    hint: { fontSize: fontSizes.sm, color: colors.textTertiary, marginBottom: spacing.sm, ...fonts.regular },
    subLabel: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.sm, ...fonts.semiBold },
    card: { backgroundColor: colors.card, borderRadius: borderRadius.lg, paddingHorizontal: spacing.base, ...shadows.card },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
    rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight },
    rowTitle: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.semiBold },
    rowSub: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 1, ...fonts.regular },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    chip: { paddingHorizontal: spacing.base, paddingVertical: spacing.sm, borderRadius: 999, borderWidth: 1.5, borderColor: colors.borderLight, backgroundColor: colors.card },
    chipSel: { borderColor: colors.primary, backgroundColor: colors.primarySubtle },
    chipText: { fontSize: fontSizes.sm, color: colors.textSecondary, ...fonts.semiBold },
    stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    stepBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.backgroundSecondary },
    stepVal: { minWidth: 60, textAlign: 'center', fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.bold },
    discRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight },
    discTitle: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.semiBold },
    discSub: { fontSize: fontSizes.sm, color: colors.textTertiary, marginTop: 1, ...fonts.regular },
    pctBox: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: colors.backgroundSecondary, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, height: 44 },
    pctInput: { minWidth: 34, textAlign: 'right', fontSize: fontSizes.md, color: colors.textPrimary, ...fonts.bold },
    pctSign: { fontSize: fontSizes.base, color: colors.textSecondary, ...fonts.semiBold },
    toggle: { width: 42, height: 24, borderRadius: 12, backgroundColor: colors.borderLight, padding: 3, justifyContent: 'center' },
    knob: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff', ...shadows.card },
  });

export default BookingSettingsScreen;
