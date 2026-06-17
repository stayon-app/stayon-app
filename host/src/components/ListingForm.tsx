import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useHaptics } from '../hooks/useHaptics';
import { useLocationDetection } from '../hooks/useLocationDetection';
import { fonts, fontSizes, spacing, borderRadius, letterSpacing } from '../constants';
import { withOpacity } from '../utils/color';
import { Chip } from './common';
import { STAYON_GRADIENT } from './GradientButton';
import {
  AMENITY_OPTIONS, AMENITY_CATEGORY_ORDER, SAFETY_OPTIONS, PROPERTY_TYPES,
  listingUSD, type HostListing, type HouseRules,
} from '../data/listings';
import { CURRENCIES } from '../utils/currency';

interface ListingFormProps {
  initial: HostListing;
  mode: 'create' | 'edit';
  onSubmit: (listing: HostListing, status: HostListing['status']) => void;
}

const RULES: { key: keyof HouseRules; label: string; sub: string }[] = [
  { key: 'smoking', label: 'Smoking allowed', sub: 'Guests may smoke on the property' },
  { key: 'pets', label: 'Pets allowed', sub: 'Guests can bring pets' },
  { key: 'parties', label: 'Parties/events allowed', sub: 'Gatherings are permitted' },
  { key: 'quietHours', label: 'Quiet hours', sub: 'Enforce quiet hours at night' },
  { key: 'extraGuests', label: 'Extra guests', sub: 'Allow guests beyond the booking' },
];

export const ListingForm: React.FC<ListingFormProps> = ({ initial, mode, onSubmit }) => {
  const { colors } = useTheme();
  const { format, currency } = useCurrency();
  const { light } = useHaptics();
  const { location, loading: locating, refreshLocation } = useLocationDetection();
  const styles = makeStyles(colors);
  // Normalise so an older/partial listing can't crash on missing arrays/objects.
  const [d, setD] = useState<HostListing>(() => ({
    ...initial,
    images: initial.images ?? [],
    videos: initial.videos ?? [],
    amenities: initial.amenities ?? [],
    safety: initial.safety ?? [],
    houseRules: initial.houseRules ?? { smoking: false, pets: false, parties: false, quietHours: true, extraGuests: false },
  }));
  const locked = mode === 'edit'; // location is fixed once created
  const MAX_VIDEOS = 3;

  const set = (patch: Partial<HostListing>) => setD((prev) => ({ ...prev, ...patch }));
  // Amounts are authored in the listing's currency (host's currency for a new one).
  const priceCur = d.priceCurrency || (mode === 'create' ? currency.code : 'USD');
  const curSymbol = CURRENCIES[priceCur]?.symbol || '$';
  const toggleArr = (key: 'amenities' | 'safety', id: string) =>
    set({ [key]: d[key].includes(id) ? d[key].filter((x) => x !== id) : [...d[key], id] } as any);
  const setRule = (k: keyof HouseRules, v: boolean) => set({ houseRules: { ...d.houseRules, [k]: v } });

  const useCurrentLocation = () => {
    light();
    refreshLocation();
    set({
      latitude: location.latitude,
      longitude: location.longitude,
      city: d.city || location.city,
      state: d.state || location.region,
      country: d.country || location.country,
    });
  };

  // Pick multiple photos from the device gallery / files.
  const pickPhotos = async () => {
    light();
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed', 'Allow photo access to add photos.'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.85,
    });
    if (!res.canceled) set({ images: [...d.images, ...res.assets.map((a) => a.uri)] });
  };

  // Pick videos — capped at 3 total.
  const pickVideos = async () => {
    light();
    if (d.videos.length >= MAX_VIDEOS) { Alert.alert('Limit reached', `You can add up to ${MAX_VIDEOS} videos.`); return; }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed', 'Allow video access to add videos.'); return; }
    const remaining = MAX_VIDEOS - d.videos.length;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
    });
    if (!res.canceled) {
      const picked = res.assets.map((a) => a.uri).slice(0, remaining);
      set({ videos: [...d.videos, ...picked] });
    }
  };

  const canPublish = !!(d.title || '').trim() && !!(d.address || '').trim() && !!(d.city || '').trim() && d.price > 0;

  const Stepper = ({ label, value, onChange, min = 0 }: { label: string; value: number; onChange: (v: number) => void; min?: number }) => (
    <View style={styles.stepRow}>
      <Text style={styles.stepLabel}>{label}</Text>
      <View style={styles.stepper}>
        <TouchableOpacity style={styles.stepBtn} onPress={() => { light(); onChange(Math.max(min, value - 1)); }}>
          <Ionicons name="remove" size={18} color={value <= min ? colors.textTertiary : colors.primary} />
        </TouchableOpacity>
        <Text style={styles.stepValue}>{value}</Text>
        <TouchableOpacity style={styles.stepBtn} onPress={() => { light(); onChange(value + 1); }}>
          <Ionicons name="add" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const Toggle = ({ on, onPress }: { on: boolean; onPress: () => void }) => (
    <TouchableOpacity style={[styles.switch, { backgroundColor: on ? colors.primary : colors.borderLight }]} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.knob, { alignSelf: on ? 'flex-end' : 'flex-start' }]} />
    </TouchableOpacity>
  );

  const num = (val: number | undefined, onChange: (n: number) => void, ph: string) => (
    <TextInput
      style={styles.input}
      value={val ? String(val) : ''}
      onChangeText={(t) => onChange(Number(t.replace(/[^0-9]/g, '')) || 0)}
      keyboardType="number-pad" placeholder={ph} placeholderTextColor={colors.textTertiary}
    />
  );
  const txt = (val: string | undefined, onChange: (t: string) => void, ph: string, opts: any = {}) => (
    <TextInput
      style={[styles.input, opts.multiline && styles.textarea]}
      value={val} onChangeText={onChange} placeholder={ph} placeholderTextColor={colors.textTertiary}
      {...opts}
    />
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={80}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['4xl'] }}>
        {/* Photos & videos */}
        <Text style={styles.section}>Photos & videos</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, flexShrink: 0 }} contentContainerStyle={{ gap: spacing.sm, alignItems: 'center' }}>
          {d.images.map((uri, i) => (
            <View key={`p${i}`} style={styles.media}>
              <Image source={{ uri }} style={styles.mediaImg} contentFit="cover" />
              <TouchableOpacity style={styles.mediaX} onPress={() => set({ images: d.images.filter((_, j) => j !== i) })}>
                <Ionicons name="close" size={13} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
          {d.videos.map((uri, i) => (
            <View key={`v${i}`} style={[styles.media, styles.videoTile]}>
              <Ionicons name="play-circle" size={26} color="#fff" />
              <Text style={styles.videoLabel} numberOfLines={1}>Video</Text>
              <TouchableOpacity style={styles.mediaX} onPress={() => set({ videos: d.videos.filter((_, j) => j !== i) })}>
                <Ionicons name="close" size={13} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
        <View style={styles.addMediaRow}>
          <TouchableOpacity style={styles.pickBtn} onPress={pickPhotos} activeOpacity={0.85}>
            <Ionicons name="images-outline" size={18} color={colors.primary} />
            <Text style={styles.pickText}>Add photos</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pickBtn, d.videos.length >= MAX_VIDEOS && { opacity: 0.5 }]}
            onPress={pickVideos}
            disabled={d.videos.length >= MAX_VIDEOS}
            activeOpacity={0.85}
          >
            <Ionicons name="videocam-outline" size={18} color={colors.primary} />
            <Text style={styles.pickText}>Add video ({d.videos.length}/{MAX_VIDEOS})</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.hint}>Photos show first in the guest gallery. You can add up to {MAX_VIDEOS} videos.</Text>

        {/* Basics */}
        <Text style={styles.section}>Basics</Text>
        <Text style={styles.label}>Title</Text>
        {txt(d.title, (t) => set({ title: t }), 'e.g. Sunlit Loft in the City')}
        <Text style={styles.label}>Property type</Text>
        <View style={styles.chipWrap}>
          {PROPERTY_TYPES.map((t) => <Chip key={t} label={t} selected={d.type === t} onPress={() => { light(); set({ type: t }); }} />)}
        </View>
        <Text style={styles.label}>Description — what your place offers</Text>
        {txt(d.description, (t) => set({ description: t }), 'Describe the space, the vibe, what guests will love…', { multiline: true, textAlignVertical: 'top' })}

        {/* Address (fixed after create) */}
        <View style={styles.sectionRow}>
          <Text style={styles.section}>Address</Text>
          {locked && <View style={styles.lockPill}><Ionicons name="lock-closed" size={11} color={colors.textTertiary} /><Text style={styles.lockText}>Fixed</Text></View>}
        </View>
        {locked ? (
          <View style={styles.lockedAddress}>
            <Ionicons name="location" size={16} color={colors.primary} />
            <Text style={styles.lockedAddressText}>
              {[d.address, d.area, d.city, d.state, d.country, d.zipcode].filter(Boolean).join(', ')}
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.label}>Street address</Text>
            {txt(d.address, (t) => set({ address: t }), 'House no. & street')}
            <View style={styles.row2}>
              <View style={{ flex: 1 }}><Text style={styles.label}>Area / locality</Text>{txt(d.area, (t) => set({ area: t }), 'Neighborhood')}</View>
              <View style={{ width: spacing.md }} />
              <View style={{ flex: 1 }}><Text style={styles.label}>City</Text>{txt(d.city, (t) => set({ city: t }), 'City')}</View>
            </View>
            <View style={styles.row2}>
              <View style={{ flex: 1 }}><Text style={styles.label}>State</Text>{txt(d.state, (t) => set({ state: t }), 'State')}</View>
              <View style={{ width: spacing.md }} />
              <View style={{ flex: 1 }}><Text style={styles.label}>Zip / postal</Text>{txt(d.zipcode, (t) => set({ zipcode: t }), 'Zip')}</View>
            </View>
            <Text style={styles.label}>Country</Text>
            {txt(d.country, (t) => set({ country: t }), 'Country')}
            <TouchableOpacity style={styles.pinBtn} onPress={useCurrentLocation} activeOpacity={0.85}>
              <Ionicons name="navigate" size={16} color={colors.primary} />
              <Text style={styles.pinText}>{locating ? 'Locating…' : 'Pin my current location'}</Text>
            </TouchableOpacity>
            {!!d.latitude && <Text style={styles.hint}>Pinned at {d.latitude.toFixed(4)}, {d.longitude?.toFixed(4)} · this becomes the fixed map location.</Text>}
          </>
        )}

        {/* Capacity */}
        <Text style={styles.section}>Capacity</Text>
        <View style={styles.card}>
          <Stepper label="Guests" value={d.guests} onChange={(v) => set({ guests: v })} min={1} />
          <Stepper label="Bedrooms" value={d.bedrooms} onChange={(v) => set({ bedrooms: v })} />
          <Stepper label="Beds" value={d.beds} onChange={(v) => set({ beds: v })} min={1} />
          <Stepper label="Bathrooms" value={d.bathrooms} onChange={(v) => set({ bathrooms: v })} />
        </View>

        {/* Pricing — authored in the host's currency; guests see their own. */}
        <Text style={styles.section}>Pricing ({priceCur})</Text>
        <View style={styles.row2}>
          <View style={{ flex: 1 }}><Text style={styles.label}>Nightly rate ({curSymbol})</Text>{num(d.price, (n) => set({ price: n, priceCurrency: priceCur }), '100')}</View>
          <View style={{ width: spacing.md }} />
          <View style={{ flex: 1 }}><Text style={styles.label}>Weekend rate ({curSymbol})</Text>{num(d.weekendPrice, (n) => set({ weekendPrice: n, priceCurrency: priceCur }), 'optional')}</View>
        </View>
        <Text style={styles.label}>Cleaning fee ({curSymbol})</Text>
        {num(d.cleaningFee, (n) => set({ cleaningFee: n, priceCurrency: priceCur }), '0')}
        <Text style={styles.hint}>You earn {format(listingUSD(d.price, priceCur))} / night{d.cleaningFee ? ` + ${format(listingUSD(d.cleaningFee, priceCur))} cleaning` : ''}. Guests see this in their own currency; taxes added at checkout.</Text>

        {/* Amenities — grouped by category, host ticks what applies */}
        <View style={styles.sectionRow}>
          <Text style={styles.section}>Amenities</Text>
          <Text style={styles.countPill}>{d.amenities.length} selected</Text>
        </View>
        {AMENITY_CATEGORY_ORDER.map((cat) => {
          const items = AMENITY_OPTIONS.filter((a) => a.category === cat);
          if (!items.length) return null;
          return (
            <View key={cat} style={{ marginTop: spacing.md }}>
              <Text style={styles.amenityCat}>{cat}</Text>
              <View style={styles.chipWrap}>
                {items.map((a) => (
                  <Chip key={a.id} label={a.label} icon={a.icon as any} selected={d.amenities.includes(a.id)} onPress={() => { light(); toggleArr('amenities', a.id); }} />
                ))}
              </View>
            </View>
          );
        })}

        {/* House rules */}
        <Text style={styles.section}>House rules</Text>
        <View style={styles.card}>
          {RULES.map((r, i) => (
            <View key={r.key} style={[styles.ruleRow, i < RULES.length - 1 && styles.ruleDivider]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.ruleTitle}>{r.label}</Text>
                <Text style={styles.ruleSub}>{r.sub}</Text>
              </View>
              <Toggle on={d.houseRules[r.key]} onPress={() => { light(); setRule(r.key, !d.houseRules[r.key]); }} />
            </View>
          ))}
        </View>

        {/* Safety */}
        <Text style={styles.section}>Safety</Text>
        <View style={styles.chipWrap}>
          {SAFETY_OPTIONS.map((s) => <Chip key={s.id} label={s.label} icon={s.icon as any} selected={d.safety.includes(s.id)} onPress={() => { light(); toggleArr('safety', s.id); }} />)}
        </View>

        {/* Booking */}
        <Text style={styles.section}>Booking & policies</Text>
        <View style={styles.ruleRow}>
          <View style={{ flex: 1 }}><Text style={styles.ruleTitle}>Instant Book</Text><Text style={styles.ruleSub}>Guests book without approval</Text></View>
          <Toggle on={d.instantBook} onPress={() => { light(); set({ instantBook: !d.instantBook }); }} />
        </View>
        <Text style={styles.label}>Minimum nights</Text>
        <View style={[styles.card, { paddingHorizontal: spacing.base }]}>
          <Stepper label="Min nights" value={d.minNights} onChange={(v) => set({ minNights: v })} min={1} />
        </View>
        <Text style={styles.label}>Cancellation policy</Text>
        <View style={styles.chipWrap}>
          {(['Flexible', 'Moderate', 'Strict'] as const).map((p) => (
            <Chip key={p} label={p} selected={d.cancellationPolicy === p} onPress={() => { light(); set({ cancellationPolicy: p }); }} />
          ))}
        </View>
        <View style={styles.row2}>
          <View style={{ flex: 1 }}><Text style={styles.label}>Check‑in</Text>{txt(d.checkInTime, (t) => set({ checkInTime: t }), '3:00 PM')}</View>
          <View style={{ width: spacing.md }} />
          <View style={{ flex: 1 }}><Text style={styles.label}>Check‑out</Text>{txt(d.checkOutTime, (t) => set({ checkOutTime: t }), '11:00 AM')}</View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.draftBtn} onPress={() => onSubmit(d, mode === 'edit' ? d.status : 'draft')}>
          <Text style={styles.draftText}>{mode === 'edit' ? 'Cancel' : 'Save draft'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={0.9} disabled={!canPublish} onPress={() => onSubmit(d, mode === 'edit' ? d.status : 'published')}>
          <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.publish, !canPublish && { opacity: 0.5 }]}>
            <Text style={styles.publishText}>{mode === 'edit' ? 'Save changes' : 'Publish'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const makeStyles = (colors: any) =>
  StyleSheet.create({
    section: { fontSize: fontSizes.lg, letterSpacing: letterSpacing.snug, color: colors.textPrimary, marginTop: spacing.xl, marginBottom: spacing.sm, ...fonts.bold },
    sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    countPill: { fontSize: fontSizes.xs, color: colors.primary, marginTop: spacing.xl, ...fonts.bold },
    amenityCat: { fontSize: fontSizes.sm, letterSpacing: 0.5, textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 6, ...fonts.bold },
    label: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: spacing.md, marginBottom: 6, ...fonts.semiBold },
    input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderLight, borderRadius: borderRadius.md, paddingHorizontal: spacing.base, paddingVertical: spacing.md, fontSize: fontSizes.base, color: colors.textPrimary },
    textarea: { minHeight: 90 },
    hint: { fontSize: fontSizes.sm, color: colors.textTertiary, marginTop: 6, ...fonts.regular },
    row2: { flexDirection: 'row' },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: 4 },
    card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderLight, borderRadius: borderRadius.lg, paddingHorizontal: spacing.base },
    // media
    media: { width: 92, height: 92, borderRadius: borderRadius.md, overflow: 'hidden', backgroundColor: colors.backgroundSecondary },
    mediaImg: { width: '100%', height: '100%' },
    videoTile: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.textPrimary, gap: 2 },
    videoLabel: { color: '#fff', fontSize: 11, ...fonts.semiBold },
    mediaX: { position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
    addMediaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
    pickBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary, backgroundColor: colors.primarySubtle },
    pickText: { color: colors.primary, fontSize: fontSizes.sm, ...fonts.semiBold },
    // address
    lockPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: colors.backgroundSecondary, marginTop: spacing.xl },
    lockText: { fontSize: 11, color: colors.textTertiary, ...fonts.semiBold },
    lockedAddress: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: spacing.base, borderRadius: borderRadius.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderLight },
    lockedAddressText: { flex: 1, fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.medium },
    pinBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: spacing.md, paddingVertical: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary, backgroundColor: colors.primarySubtle },
    pinText: { color: colors.primary, fontSize: fontSizes.base, ...fonts.semiBold },
    // steppers
    stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight },
    stepLabel: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.medium },
    stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.base },
    stepBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: colors.borderLight, alignItems: 'center', justifyContent: 'center' },
    stepValue: { fontSize: fontSizes.base, color: colors.textPrimary, minWidth: 22, textAlign: 'center', ...fonts.bold },
    // rules
    ruleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md },
    ruleDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight },
    ruleTitle: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.semiBold },
    ruleSub: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 2, ...fonts.regular },
    switch: { width: 46, height: 28, borderRadius: 14, padding: 3, justifyContent: 'center' },
    knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },
    // footer
    footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.borderLight, backgroundColor: colors.surface },
    draftBtn: { paddingVertical: spacing.base, paddingHorizontal: spacing.lg, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.borderLight },
    draftText: { fontSize: fontSizes.base, color: colors.textSecondary, ...fonts.semiBold },
    publish: { paddingVertical: spacing.base, borderRadius: borderRadius.lg, alignItems: 'center' },
    publishText: { color: '#fff', fontSize: fontSizes.md, ...fonts.bold },
  });

export default ListingForm;
