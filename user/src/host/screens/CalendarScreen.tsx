import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import dayjs from 'dayjs';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useHaptics } from '../hooks/useHaptics';
import { fonts, fontSizes, spacing, borderRadius, letterSpacing, shadows } from '../constants';
import { withOpacity } from '../utils/color';
import { EmptyState } from '../components/common';
import { STAYON_GRADIENT } from '../components/GradientButton';
import { getListings, listingUSD, type HostListing } from '../data/listings';
import { getReservations } from '../data/reservations';
import { getBlocked, toggleBlocked, bookedDates, getDatePrices, setDatePrice } from '../data/calendar';
import { Api } from '../../api';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function CalendarScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { format, convert, toUSD, currency } = useCurrency();
  const { light, selection, success } = useHaptics();
  const styles = makeStyles(colors);

  const [listings, setListings] = useState<HostListing[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [month, setMonth] = useState(dayjs().startOf('month'));
  const [blocked, setBlocked] = useState<Set<string>>(new Set());
  const [booked, setBooked] = useState<Set<string>>(new Set());
  const [prices, setPrices] = useState<Record<string, number>>({});

  // Edit sheet
  const [editDate, setEditDate] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState('');
  const [blockInput, setBlockInput] = useState(false);

  // Range editing (apply a price/block to many dates at once)
  const [rangeMode, setRangeMode] = useState(false);
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);
  const [rangePrice, setRangePrice] = useState('');
  const [rangeBlock, setRangeBlock] = useState(false);
  const [showRangeSheet, setShowRangeSheet] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      (async () => {
        const ls = await getListings();
        if (!active) return;
        setListings(ls);
        const id = activeId ?? ls[0]?.id ?? null;
        setActiveId(id);
        if (id) {
          const [bl, res, dp] = await Promise.all([getBlocked(id), getReservations(), getDatePrices(id)]);
          if (!active) return;
          setBlocked(new Set(bl));
          setBooked(bookedDates(res, id));
          setPrices(dp);
        }
      })();
      return () => { active = false; };
    }, [activeId])
  );

  const listing = listings.find((l) => l.id === activeId);
  const base = listingUSD(listing?.price, listing?.priceCurrency);
  const weekend = listingUSD(listing?.weekendPrice ?? listing?.price, listing?.priceCurrency);
  const priceFor = (ds: string, isWeekend: boolean) => prices[ds] ?? (isWeekend ? weekend : base);

  // Push blocked dates + price overrides to the backend so guests see real
  // availability on every device. Only for listings synced to the backend.
  const syncCalendar = async (blockedSet: Set<string>, priceMap: Record<string, number>) => {
    const remoteId = listings.find((l) => l.id === activeId)?.remoteId;
    if (!remoteId) return;
    const dayKeys = new Set<string>([...blockedSet, ...Object.keys(priceMap)]);
    const days = [...dayKeys].map((day) => ({ day, blocked: blockedSet.has(day), priceUSD: priceMap[day] ?? null }));
    try { await Api.auth.ensureSession(); await Api.listings.setCalendar(remoteId, days); } catch { /* offline — local still saved */ }
  };

  // Build the month grid
  const firstWeekday = month.day();
  const daysIn = month.daysInMonth();
  const today = dayjs().startOf('day');
  const cells: ({ d: number; ds: string } | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysIn; d++) cells.push({ d, ds: month.date(d).format('YYYY-MM-DD') });

  const openEdit = (ds: string, disabled: boolean) => {
    if (disabled) return;
    light();
    const isWeekend = [5, 6].includes(dayjs(ds).day());
    setEditDate(ds);
    setPriceInput(String(convert(priceFor(ds, isWeekend))));
    setBlockInput(blocked.has(ds));
  };

  const saveEdit = async () => {
    if (!editDate || !activeId) return;
    success();
    const isWeekend = [5, 6].includes(dayjs(editDate).day());
    const localPrice = Number(priceInput.replace(/[^0-9]/g, '')) || 0;
    const usd = toUSD(localPrice);
    const defaultUSD = isWeekend ? weekend : base;
    // Only store an override if it differs from the default.
    const nextPrices = await setDatePrice(activeId, editDate, Math.abs(usd - defaultUSD) < 0.5 ? null : usd);
    setPrices(nextPrices);
    // Apply block state if it changed.
    let nb = blocked;
    if (blockInput !== blocked.has(editDate)) {
      nb = new Set(await toggleBlocked(activeId, editDate));
      setBlocked(nb);
    }
    setEditDate(null);
    syncCalendar(nb, nextPrices);
  };

  const resetPrice = async () => {
    if (!editDate || !activeId) return;
    selection();
    const isWeekend = [5, 6].includes(dayjs(editDate).day());
    const np = await setDatePrice(activeId, editDate, null);
    setPrices(np);
    setPriceInput(String(convert(isWeekend ? weekend : base)));
  };

  // Range: first tap sets the start, second (later) tap sets the end → open sheet.
  const handleRangeTap = (ds: string, disabled: boolean) => {
    if (disabled) return;
    light();
    if (!rangeStart || (rangeStart && rangeEnd)) { setRangeStart(ds); setRangeEnd(null); return; }
    if (dayjs(ds).isBefore(dayjs(rangeStart), 'day')) { setRangeStart(ds); return; }
    setRangeEnd(ds); setRangePrice(''); setRangeBlock(false); setShowRangeSheet(true);
  };

  const rangeNights = (rangeStart && rangeEnd) ? dayjs(rangeEnd).diff(dayjs(rangeStart), 'day') + 1 : 0;

  const applyRange = async () => {
    if (!activeId || !rangeStart || !rangeEnd) return;
    success();
    const end = dayjs(rangeEnd);
    const usd = toUSD(Number(rangePrice.replace(/[^0-9]/g, '')) || 0);
    let np = prices;
    let nb = new Set(blocked);
    for (let d = dayjs(rangeStart); !d.isAfter(end, 'day'); d = d.add(1, 'day')) {
      const ds = d.format('YYYY-MM-DD');
      if (booked.has(ds) || d.isBefore(today, 'day')) continue;
      if (rangeBlock) {
        if (!nb.has(ds)) { const r = await toggleBlocked(activeId, ds); nb = new Set(r); }
      } else {
        np = await setDatePrice(activeId, ds, usd > 0 ? usd : null);
      }
    }
    setPrices({ ...np });
    setBlocked(nb);
    setShowRangeSheet(false); setRangeMode(false); setRangeStart(null); setRangeEnd(null);
    syncCalendar(nb, np);
  };

  const inRange = (ds: string) => {
    if (!rangeStart) return false;
    if (!rangeEnd) return ds === rangeStart;
    return !dayjs(ds).isBefore(dayjs(rangeStart), 'day') && !dayjs(ds).isAfter(dayjs(rangeEnd), 'day');
  };

  if (listings.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}><Text style={styles.title}>Calendar</Text></View>
        <EmptyState illustration="calendar" icon="calendar-outline" title="Publish a stay first" message="When you publish a stay you’ll be able to see and edit your calendar here." actionLabel="Create a stay" onAction={() => navigation.navigate('ListingCreate')} />
      </SafeAreaView>
    );
  }

  const editIsWeekend = editDate ? [5, 6].includes(dayjs(editDate).day()) : false;
  const hasOverride = editDate ? prices[editDate] != null : false;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Calendar</Text>
      </View>

      {/* Listing selector */}
      {listings.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.listingTabsScroll} contentContainerStyle={styles.listingTabs}>
          {listings.map((l) => (
            <TouchableOpacity key={l.id} style={[styles.lTab, activeId === l.id && styles.lTabActive]} onPress={() => { selection(); setActiveId(l.id); }}>
              <Text style={[styles.lTabText, activeId === l.id && { color: colors.primary }]} numberOfLines={1}>{l.title}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['4xl'] }}>
        {/* Range editing toggle */}
        <View style={styles.rangeBar}>
          <TouchableOpacity
            style={[styles.rangeToggle, rangeMode && styles.rangeToggleOn]}
            onPress={() => { light(); setRangeMode((m) => !m); setRangeStart(null); setRangeEnd(null); }}
          >
            <Ionicons name="calendar-clear-outline" size={15} color={rangeMode ? colors.primary : colors.textSecondary} />
            <Text style={[styles.rangeToggleText, rangeMode && { color: colors.primary }]}>{rangeMode ? 'Range editing on' : 'Edit a date range'}</Text>
          </TouchableOpacity>
          {rangeMode && <Text style={styles.rangeHint}>{rangeStart && !rangeEnd ? 'Now tap the end date' : 'Tap a start date'}</Text>}
        </View>

        {/* Calendar card */}
        <View style={styles.calCard}>
          {/* Month nav */}
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={() => { light(); setMonth(month.subtract(1, 'month')); }} style={styles.navBtn}><Ionicons name="chevron-back" size={20} color={colors.textPrimary} /></TouchableOpacity>
            <Text style={styles.monthLabel}>{month.format('MMMM YYYY')}</Text>
            <TouchableOpacity onPress={() => { light(); setMonth(month.add(1, 'month')); }} style={styles.navBtn}><Ionicons name="chevron-forward" size={20} color={colors.textPrimary} /></TouchableOpacity>
          </View>

          {/* Weekday header */}
          <View style={styles.weekRow}>
            {WEEKDAYS.map((w, i) => <Text key={i} style={styles.weekday}>{w}</Text>)}
          </View>

          {/* Grid */}
          <View style={styles.grid}>
            {cells.map((c, i) => {
              if (!c) return <View key={i} style={styles.cell} />;
              const date = dayjs(c.ds);
              const isWeekend = date.day() === 5 || date.day() === 6;
              const past = date.isBefore(today, 'day');
              const isBooked = booked.has(c.ds);
              const isBlocked = blocked.has(c.ds);
              const isToday = date.isSame(today, 'day');
              const custom = prices[c.ds] != null;
              const disabled = past || isBooked;
              const price = priceFor(c.ds, isWeekend);
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.cell, styles.dayCell,
                    isToday && { borderColor: colors.primary, borderWidth: 1.5 },
                    isBooked && { backgroundColor: withOpacity(colors.primary, 0.14), borderColor: 'transparent' },
                    isBlocked && { backgroundColor: colors.backgroundSecondary, borderColor: 'transparent' },
                    rangeMode && inRange(c.ds) && { backgroundColor: withOpacity(colors.primary, 0.22), borderColor: colors.primary },
                  ]}
                  activeOpacity={disabled ? 1 : 0.7}
                  onPress={() => rangeMode ? handleRangeTap(c.ds, disabled) : openEdit(c.ds, disabled)}
                >
                  <Text style={[styles.dayNum, past && { color: colors.textTertiary }, isBlocked && styles.struck]}>{c.d}</Text>
                  {isBooked ? (
                    <Text style={styles.cellTagBooked}>Booked</Text>
                  ) : isBlocked ? (
                    <Ionicons name="lock-closed" size={10} color={colors.textTertiary} />
                  ) : !past ? (
                    <Text style={[styles.cellPrice, custom && { color: colors.primary, ...fonts.bold }]} numberOfLines={1}>{format(price)}</Text>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <Legend color={colors.card} border label="Open" colors={colors} />
          <Legend color={withOpacity(colors.primary, 0.14)} label="Booked" colors={colors} />
          <Legend color={colors.backgroundSecondary} label="Blocked" colors={colors} />
          <Legend color={colors.card} dot={colors.primary} label="Custom price" colors={colors} />
        </View>
        <Text style={styles.hint}>Tap any open date to set a custom price or block it. Booked and past dates are locked.</Text>

        {/* Default pricing summary */}
        <View style={styles.priceCard}>
          <Text style={styles.priceCardTitle}>Default pricing</Text>
          <View style={styles.priceRow}><Text style={styles.priceK}>Weekday rate</Text><Text style={styles.priceV}>{format(base)}</Text></View>
          <View style={styles.priceRow}><Text style={styles.priceK}>Weekend rate</Text><Text style={styles.priceV}>{format(weekend)}</Text></View>
          {!!listing?.cleaningFee && <View style={styles.priceRow}><Text style={styles.priceK}>Cleaning fee</Text><Text style={styles.priceV}>{format(listingUSD(listing.cleaningFee, listing.priceCurrency))}</Text></View>}
          <Text style={styles.priceNote}>Per-night prices override these for specific dates. StayOn adds no fees — guests pay your price + taxes.</Text>
        </View>
      </ScrollView>

      {/* Edit date sheet */}
      <Modal visible={!!editDate} transparent animationType="slide" onRequestClose={() => setEditDate(null)}>
        <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={() => setEditDate(null)}>
          <TouchableOpacity activeOpacity={1} style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetDate}>{editDate ? dayjs(editDate).format('dddd, MMMM D') : ''}</Text>
            <Text style={styles.sheetSub}>{editIsWeekend ? 'Weekend night' : 'Weekday night'}</Text>

            {/* Price */}
            <Text style={styles.sheetLabel}>Price for this night</Text>
            <View style={styles.priceInputRow}>
              <Text style={styles.priceSym}>{currency.symbol}</Text>
              <TextInput
                style={styles.priceInput}
                value={priceInput}
                onChangeText={(t) => setPriceInput(t.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                placeholder={String(convert(editIsWeekend ? weekend : base))}
                placeholderTextColor={colors.textTertiary}
                editable={!blockInput}
              />
              {hasOverride && !blockInput && (
                <TouchableOpacity onPress={resetPrice}><Text style={styles.resetText}>Reset</Text></TouchableOpacity>
              )}
            </View>

            {/* Block toggle */}
            <TouchableOpacity style={styles.blockRow} onPress={() => { light(); setBlockInput((b) => !b); }}>
              <View style={[styles.blockIcon, { backgroundColor: blockInput ? withOpacity(colors.textPrimary, 0.1) : colors.backgroundSecondary }]}>
                <Ionicons name={blockInput ? 'lock-closed' : 'lock-open-outline'} size={18} color={blockInput ? colors.textPrimary : colors.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.blockTitle}>Block this date</Text>
                <Text style={styles.blockSub}>Guests can’t book a blocked night.</Text>
              </View>
              <View style={[styles.toggle, blockInput && { backgroundColor: colors.primary }]}>
                <View style={[styles.toggleKnob, blockInput && { transform: [{ translateX: 18 }] }]} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.9} onPress={saveEdit}>
              <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveBtn}>
                <Text style={styles.saveText}>Save</Text>
              </LinearGradient>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Range apply sheet */}
      <Modal visible={showRangeSheet} transparent animationType="slide" onRequestClose={() => setShowRangeSheet(false)}>
        <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={() => setShowRangeSheet(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetDate}>{rangeStart ? dayjs(rangeStart).format('MMM D') : ''} – {rangeEnd ? dayjs(rangeEnd).format('MMM D, YYYY') : ''}</Text>
            <Text style={styles.sheetSub}>{rangeNights} night{rangeNights === 1 ? '' : 's'} · booked & past dates are skipped</Text>

            {!rangeBlock && (
              <>
                <Text style={styles.sheetLabel}>Set price for every night in this range</Text>
                <View style={styles.priceInputRow}>
                  <Text style={styles.priceSym}>{currency.symbol}</Text>
                  <TextInput
                    style={styles.priceInput}
                    value={rangePrice}
                    onChangeText={(t) => setRangePrice(t.replace(/[^0-9]/g, ''))}
                    keyboardType="number-pad"
                    placeholder={String(convert(base))}
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>
                <Text style={styles.priceNote}>Leave blank to reset these dates to your default rate.</Text>
              </>
            )}

            <TouchableOpacity style={styles.blockRow} onPress={() => { light(); setRangeBlock((b) => !b); }}>
              <View style={[styles.blockIcon, { backgroundColor: rangeBlock ? withOpacity(colors.textPrimary, 0.1) : colors.backgroundSecondary }]}>
                <Ionicons name={rangeBlock ? 'lock-closed' : 'lock-open-outline'} size={18} color={rangeBlock ? colors.textPrimary : colors.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.blockTitle}>Block this whole range</Text>
                <Text style={styles.blockSub}>Guests can’t book any night in the range.</Text>
              </View>
              <View style={[styles.toggle, rangeBlock && { backgroundColor: colors.primary }]}>
                <View style={[styles.toggleKnob, rangeBlock && { transform: [{ translateX: 18 }] }]} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.9} onPress={applyRange}>
              <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveBtn}>
                <Text style={styles.saveText}>{rangeBlock ? `Block ${rangeNights} night${rangeNights === 1 ? '' : 's'}` : `Apply to ${rangeNights} night${rangeNights === 1 ? '' : 's'}`}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const Legend = ({ color, label, border, dot, colors }: any) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
    <View style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: color, borderWidth: border ? 1 : 0, borderColor: colors.borderLight, alignItems: 'center', justifyContent: 'center' }}>
      {dot && <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: dot }} />}
    </View>
    <Text style={{ fontSize: 13, color: colors.textSecondary }}>{label}</Text>
  </View>
);

const makeStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm },
    title: { fontSize: fontSizes['3xl'], letterSpacing: letterSpacing.tight, color: colors.textPrimary, ...fonts.bold },
    rangeBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
    rangeToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.base, paddingVertical: spacing.sm, borderRadius: 999, borderWidth: 1.5, borderColor: colors.borderLight, backgroundColor: colors.card },
    rangeToggleOn: { borderColor: colors.primary, backgroundColor: colors.primarySubtle },
    rangeToggleText: { fontSize: fontSizes.sm, color: colors.textSecondary, ...fonts.semiBold },
    rangeHint: { flex: 1, fontSize: fontSizes.sm, color: colors.primary, ...fonts.medium },
    listingTabsScroll: { flexGrow: 0, flexShrink: 0 },
    listingTabs: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, alignItems: 'center' },
    lTab: { maxWidth: 180, height: 34, justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: 17, backgroundColor: colors.card, ...shadows.card },
    lTabActive: { backgroundColor: withOpacity(colors.primary, 0.12) },
    lTabText: { fontSize: fontSizes.sm, color: colors.textSecondary, ...fonts.semiBold },
    calCard: { backgroundColor: colors.card, borderRadius: borderRadius.xl, padding: spacing.base, ...shadows.card },
    monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.base },
    navBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.backgroundSecondary },
    monthLabel: { fontSize: fontSizes.lg, letterSpacing: letterSpacing.snug, color: colors.textPrimary, ...fonts.bold },
    weekRow: { flexDirection: 'row', marginBottom: spacing.xs },
    weekday: { flex: 1, textAlign: 'center', fontSize: fontSizes.xs, color: colors.textTertiary, ...fonts.bold },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    cell: { width: `${100 / 7}%`, aspectRatio: 0.8, padding: 2 },
    dayCell: { borderRadius: borderRadius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderLight, alignItems: 'center', justifyContent: 'center', gap: 2 },
    dayNum: { fontSize: fontSizes.sm, color: colors.textPrimary, ...fonts.semiBold },
    struck: { textDecorationLine: 'line-through', color: colors.textTertiary },
    cellPrice: { fontSize: 10, color: colors.textSecondary, ...fonts.medium },
    cellTagBooked: { fontSize: 9, color: colors.primary, ...fonts.bold },
    legend: { flexDirection: 'row', gap: spacing.base, marginTop: spacing.base, flexWrap: 'wrap' },
    hint: { fontSize: fontSizes.sm, color: colors.textTertiary, marginTop: spacing.sm, ...fonts.regular },
    priceCard: { marginTop: spacing.xl, backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.base, ...shadows.card },
    priceCardTitle: { fontSize: fontSizes.base, color: colors.textPrimary, marginBottom: spacing.xs, ...fonts.bold },
    priceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight },
    priceK: { fontSize: fontSizes.base, color: colors.textSecondary, ...fonts.regular },
    priceV: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.bold },
    priceNote: { fontSize: fontSizes.sm, color: colors.textTertiary, marginTop: spacing.sm, ...fonts.regular },
    // Sheet
    sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.lg, paddingBottom: spacing['2xl'] },
    sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderLight, marginBottom: spacing.md },
    sheetDate: { fontSize: fontSizes.xl, color: colors.textPrimary, ...fonts.bold },
    sheetSub: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 2, ...fonts.regular },
    sheetLabel: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: spacing.lg, marginBottom: spacing.sm, ...fonts.semiBold },
    priceInputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.card, borderRadius: borderRadius.md, paddingHorizontal: spacing.base, height: 56, ...shadows.card },
    priceSym: { fontSize: fontSizes.lg, color: colors.textSecondary, ...fonts.semiBold },
    priceInput: { flex: 1, fontSize: fontSizes.xl, color: colors.textPrimary, ...fonts.bold },
    resetText: { fontSize: fontSizes.sm, color: colors.primary, ...fonts.bold },
    blockRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.base, padding: spacing.base, borderRadius: borderRadius.md, backgroundColor: colors.card, ...shadows.card },
    blockIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
    blockTitle: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.semiBold },
    blockSub: { fontSize: fontSizes.xs, color: colors.textTertiary, marginTop: 1, ...fonts.regular },
    toggle: { width: 42, height: 24, borderRadius: 12, backgroundColor: colors.borderLight, padding: 3, justifyContent: 'center' },
    toggleKnob: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff', ...shadows.card },
    saveBtn: { marginTop: spacing.lg, paddingVertical: spacing.base, borderRadius: borderRadius.lg, alignItems: 'center' },
    saveText: { fontSize: fontSizes.md, color: '#fff', ...fonts.bold },
  });

export default CalendarScreen;
