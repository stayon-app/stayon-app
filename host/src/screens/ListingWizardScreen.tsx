import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useHaptics } from '../hooks/useHaptics';
import { useLocationDetection } from '../hooks/useLocationDetection';
import { fonts, fontSizes, spacing, borderRadius, letterSpacing } from '../constants';
import { withOpacity } from '../utils/color';
import { confirmAction } from '../utils/confirm';
import { formatPrice } from '../utils/currency';
import { STAYON_GRADIENT } from '../components/GradientButton';
import {
  newDraft, saveListing, type HostListing,
  PLACE_TYPES, PLACE_KINDS, WHO_ELSE_OPTIONS, HIGHLIGHTS, DISCOUNT_OPTIONS,
  AMENITY_OPTIONS, AMENITY_CATEGORY_ORDER, SAFETY_OPTIONS, MIN_PHOTOS,
} from '../data/listings';
import { Api } from '../api';

const PHASE1 = ['p1intro', 'type', 'kind', 'location', 'basics', 'bathrooms', 'whoelse'];
const PHASE2 = ['p2intro', 'amenities', 'photos', 'title', 'highlights', 'description'];
const PHASE3 = ['p3intro', 'booking', 'price', 'weekend', 'discounts', 'safety', 'final'];
const STEPS = ['overview', ...PHASE1, ...PHASE2, ...PHASE3];

const INTRO_IMG = {
  p1intro: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1000&q=80&auto=format&fit=crop',
  p2intro: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1000&q=80&auto=format&fit=crop',
  p3intro: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1000&q=80&auto=format&fit=crop',
};
// StayOn charges NO platform fee — to guests or hosts.
const HOST_COMMISSION = 0;
const GUEST_SERVICE = 0;

export function ListingWizardScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { format, toUSD, currency } = useCurrency();
  const { light, medium, success } = useHaptics();
  const { location, refreshLocation } = useLocationDetection();
  const styles = makeStyles(colors);
  const [i, setI] = useState(0);
  const [d, setD] = useState<HostListing>(() => newDraft());
  const set = (p: Partial<HostListing>) => setD((prev) => ({ ...prev, ...p }));
  const id = STEPS[i];

  // progress segments (3 phases)
  const phaseProg = (arr: string[]) => (arr.includes(id) ? (arr.indexOf(id) + 1) / arr.length : (STEPS.indexOf(id) > STEPS.indexOf(arr[arr.length - 1]) ? 1 : 0));
  const segments = [phaseProg(PHASE1), phaseProg(PHASE2), phaseProg(PHASE3)];

  const canNext = (() => {
    if (id === 'type') return !!d.type;
    if (id === 'location') return !!(d.address.trim() && d.city.trim() && d.country.trim());
    if (id === 'photos') return d.images.length >= MIN_PHOTOS;
    if (id === 'title') return !!d.title.trim();
    if (id === 'price') return d.price > 0;
    return true;
  })();

  const back = () => { light(); if (i === 0) navigation.goBack(); else setI(i - 1); };
  const next = () => {
    light();
    if (i < STEPS.length - 1) { setI(i + 1); return; }
    // final → publish
    success();
    const listing = { ...d, status: 'published' as const, instantBook: d.bookingApproval === 'instant', title: d.title.trim(), address: d.address.trim(), city: d.city.trim(), country: d.country.trim() };
    // Publish to the shared backend so the listing is searchable by guests.
    // Best-effort: if the backend is offline it stays local-only on this device.
    Api.listings.create({
      title: listing.title, type: listing.type, placeType: listing.placeType, description: listing.description,
      address: listing.address, city: listing.city, state: listing.state, country: listing.country, zipcode: listing.zipcode,
      lat: listing.latitude, lng: listing.longitude,
      guests: listing.guests, bedrooms: listing.bedrooms, beds: listing.beds, bathrooms: listing.bathrooms,
      priceUSD: listing.price, weekendPriceUSD: listing.weekendPrice, cleaningFeeUSD: listing.cleaningFee,
      images: listing.images, amenities: listing.amenities, instantBook: listing.instantBook,
      safety: listing.safety, publish: true,
    }).catch(() => { /* offline → local only */ });
    saveListing(listing).then(() => navigation.goBack());
  };
  const saveExit = () => confirmAction({ title: 'Save & exit?', message: 'Your progress is kept as a draft.', confirmText: 'Save & exit', onConfirm: () => { saveListing({ ...d, status: 'draft' }).then(() => navigation.goBack()); } });

  const pickPhotos = async () => {
    light();
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed', 'Allow photo access to add pictures.'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.85 });
    if (!res.canceled) set({ images: [...d.images, ...res.assets.map((a) => a.uri)] });
  };

  const toggle = (key: 'amenities' | 'safety' | 'whoElse' | 'highlights', v: string, max?: number) => {
    medium();
    const cur = (d as any)[key] as string[] || [];
    if (cur.includes(v)) set({ [key]: cur.filter((x) => x !== v) } as any);
    else if (!max || cur.length < max) set({ [key]: [...cur, v] } as any);
  };

  const Counter = ({ label, sub, value, onChange, min = 0 }: any) => (
    <View style={styles.counterRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.counterLabel}>{label}</Text>
        {!!sub && <Text style={styles.counterSub}>{sub}</Text>}
      </View>
      <View style={styles.counter}>
        <TouchableOpacity style={styles.cBtn} onPress={() => { light(); onChange(Math.max(min, value - 1)); }}><Ionicons name="remove" size={18} color={value <= min ? colors.textTertiary : colors.textPrimary} /></TouchableOpacity>
        <Text style={styles.cVal}>{value}</Text>
        <TouchableOpacity style={styles.cBtn} onPress={() => { light(); onChange(value + 1); }}><Ionicons name="add" size={18} color={colors.textPrimary} /></TouchableOpacity>
      </View>
    </View>
  );

  // Price math. `base` is the host's authored amount in THEIR currency (whole
  // number, pinned). USD is derived live for the breakdown / other viewers.
  const base = d.price || 0;
  const baseUSD = toUSD(base);
  const guestBeforeUSD = baseUSD * (1 + GUEST_SERVICE);
  const youEarnUSD = baseUSD * (1 - HOST_COMMISSION);

  function renderStep() {
    switch (id) {
      case 'overview':
        return (
          <View style={styles.body}>
            <Text style={styles.h1}>It’s easy to get started on StayOn</Text>
            {[
              { n: 1, t: 'Tell us about your place', s: 'Share some basic info, like where it is and how many guests can stay.' },
              { n: 2, t: 'Make it stand out', s: 'Add photos plus a title and description — we’ll help you out.' },
              { n: 3, t: 'Finish up and publish', s: 'Choose a starting price, verify a few details, then publish.' },
            ].map((x) => (
              <View key={x.n} style={styles.ovRow}>
                <Text style={styles.ovNum}>{x.n}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ovTitle}>{x.t}</Text>
                  <Text style={styles.ovSub}>{x.s}</Text>
                </View>
              </View>
            ))}
          </View>
        );
      case 'p1intro': case 'p2intro': case 'p3intro': {
        const meta = id === 'p1intro' ? { n: 'Step 1', t: 'Tell us about your place', s: 'We’ll ask which type of property you have and whether guests book the entire place or a room. Then your location and how many guests can stay.' }
          : id === 'p2intro' ? { n: 'Step 2', t: 'Make your place stand out', s: 'Add the amenities your place offers, plus 6 or more photos. Then create a title and description.' }
          : { n: 'Step 3', t: 'Finish up and publish', s: 'Choose booking settings, set up pricing and discounts, then publish your listing.' };
        return (
          <View style={styles.introBody}>
            <Image source={{ uri: (INTRO_IMG as any)[id] }} style={styles.introImg} contentFit="cover" transition={250} />
            <Text style={styles.stepNum}>{meta.n}</Text>
            <Text style={styles.h1}>{meta.t}</Text>
            <Text style={styles.lead}>{meta.s}</Text>
          </View>
        );
      }
      case 'type':
        return (
          <View style={styles.body}>
            <Text style={styles.h2}>Which of these best describes your place?</Text>
            <View style={styles.grid}>
              {PLACE_TYPES.map((t) => {
                const sel = d.type === t.label;
                return (
                  <TouchableOpacity key={t.id} style={[styles.typeCard, sel && styles.typeCardSel]} onPress={() => { medium(); set({ type: t.label }); }} activeOpacity={0.85}>
                    <Ionicons name={t.icon as any} size={26} color={colors.textPrimary} />
                    <Text style={styles.typeLabel}>{t.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );
      case 'kind':
        return (
          <View style={styles.body}>
            <Text style={styles.h2}>What type of place will guests have?</Text>
            {PLACE_KINDS.map((k) => {
              const sel = d.placeType === k.id;
              return (
                <TouchableOpacity key={k.id} style={[styles.optCard, sel && styles.optCardSel]} onPress={() => { medium(); set({ placeType: k.id }); }} activeOpacity={0.85}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optTitle}>{k.label}</Text>
                    <Text style={styles.optSub}>{k.sub}</Text>
                  </View>
                  <Ionicons name={k.icon as any} size={24} color={colors.textPrimary} />
                </TouchableOpacity>
              );
            })}
          </View>
        );
      case 'location':
        return (
          <View style={styles.body}>
            <Text style={styles.h2}>Where’s your place located?</Text>
            <Text style={styles.lead}>Your address is only shared with guests after they’ve booked.</Text>
            <TouchableOpacity style={styles.pinBtn} onPress={() => { light(); refreshLocation(); set({ latitude: location.latitude, longitude: location.longitude, city: d.city || location.city, state: d.state || location.region, country: d.country || location.country }); }}>
              <Ionicons name="navigate" size={16} color={colors.primary} /><Text style={styles.pinText}>Use my current location</Text>
            </TouchableOpacity>
            {field('Street address', d.address, (t) => set({ address: t }), 'House no. & street')}
            {field('Nearby landmark (optional)', (d as any).landmark ?? '', (t) => set({ ...( { landmark: t } as any) }), 'Landmark')}
            {field('District / locality', d.area ?? '', (t) => set({ area: t }), 'Locality')}
            {field('City / town', d.city, (t) => set({ city: t }), 'City')}
            {field('State / union territory', d.state ?? '', (t) => set({ state: t }), 'State')}
            {field('PIN code', d.zipcode ?? '', (t) => set({ zipcode: t }), 'PIN')}
            {field('Country / region', d.country, (t) => set({ country: t }), 'Country')}
          </View>
        );
      case 'basics':
        return (
          <View style={styles.body}>
            <Text style={styles.h2}>Let’s start with the basics</Text>
            <Text style={styles.subHead}>How many people can stay here?</Text>
            <View style={styles.card}>
              <Counter label="Guests" value={d.guests} onChange={(v: number) => set({ guests: v })} min={1} />
              <Counter label="Bedrooms" value={d.bedrooms} onChange={(v: number) => set({ bedrooms: v })} />
              <Counter label="Beds" value={d.beds} onChange={(v: number) => set({ beds: v })} min={1} />
            </View>
            <Text style={styles.subHead}>Does every bedroom have a lock?</Text>
            {[['Yes', true], ['No', false]].map(([lbl, val]) => (
              <TouchableOpacity key={String(lbl)} style={[styles.optCard, d.bedroomLock === val && styles.optCardSel]} onPress={() => { medium(); set({ bedroomLock: val as boolean }); }}>
                <Text style={styles.optTitle}>{lbl}</Text>
                <Ionicons name={d.bedroomLock === val ? 'radio-button-on' : 'radio-button-off'} size={22} color={d.bedroomLock === val ? colors.primary : colors.textTertiary} />
              </TouchableOpacity>
            ))}
          </View>
        );
      case 'bathrooms':
        return (
          <View style={styles.body}>
            <Text style={styles.h2}>What kind of bathrooms are available?</Text>
            <View style={styles.card}>
              <Counter label="Bathrooms" sub="Total available to guests" value={d.bathrooms} onChange={(v: number) => set({ bathrooms: v })} />
            </View>
            <Text style={styles.subHead}>These bathrooms are…</Text>
            {([['private', 'Private and attached'], ['dedicated', 'Dedicated'], ['shared', 'Shared']] as const).map(([k, lbl]) => (
              <TouchableOpacity key={k} style={[styles.optCard, d.bathroomKind === k && styles.optCardSel]} onPress={() => { medium(); set({ bathroomKind: k }); }}>
                <Text style={styles.optTitle}>{lbl}</Text>
                <Ionicons name={d.bathroomKind === k ? 'radio-button-on' : 'radio-button-off'} size={22} color={d.bathroomKind === k ? colors.primary : colors.textTertiary} />
              </TouchableOpacity>
            ))}
          </View>
        );
      case 'whoelse':
        return (
          <View style={styles.body}>
            <Text style={styles.h2}>Who else might be there?</Text>
            <Text style={styles.lead}>Guests need to know whether they’ll encounter other people during their stay.</Text>
            <View style={styles.grid}>
              {WHO_ELSE_OPTIONS.map((w) => {
                const sel = (d.whoElse || []).includes(w.id);
                return (
                  <TouchableOpacity key={w.id} style={[styles.typeCard, sel && styles.typeCardSel]} onPress={() => toggle('whoElse', w.id)}>
                    <Ionicons name={w.icon as any} size={24} color={colors.textPrimary} />
                    <Text style={styles.typeLabel}>{w.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );
      case 'amenities':
        return (
          <View style={styles.body}>
            <Text style={styles.h2}>Tell guests what your place offers</Text>
            {AMENITY_CATEGORY_ORDER.map((cat) => {
              const items = AMENITY_OPTIONS.filter((a) => a.category === cat);
              if (!items.length) return null;
              return (
                <View key={cat} style={{ marginTop: spacing.md }}>
                  <Text style={styles.amenityCat}>{cat}</Text>
                  <View style={styles.chipWrap}>
                    {items.map((a) => {
                      const sel = d.amenities.includes(a.id);
                      return (
                        <TouchableOpacity key={a.id} style={[styles.amChip, sel && styles.amChipSel]} onPress={() => toggle('amenities', a.id)}>
                          <Ionicons name={a.icon as any} size={15} color={sel ? colors.primary : colors.textSecondary} />
                          <Text style={[styles.amChipText, sel && { color: colors.primary }]}>{a.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        );
      case 'photos':
        return (
          <View style={styles.body}>
            <Text style={styles.h2}>Add some photos of your place</Text>
            <Text style={styles.lead}>You’ll need at least {MIN_PHOTOS} photos to publish. You can add more or change later.</Text>
            <TouchableOpacity style={styles.bigDashed} onPress={pickPhotos}>
              <Ionicons name="images-outline" size={20} color={colors.primary} /><Text style={styles.bigDashedText}>Add photos from your device</Text>
            </TouchableOpacity>
            <Text style={[styles.lead, { color: d.images.length >= MIN_PHOTOS ? colors.success : colors.textTertiary }]}>{d.images.length}/{MIN_PHOTOS} added</Text>
            <View style={styles.photoGrid}>
              {d.images.map((uri, idx) => (
                <View key={idx} style={styles.photo}>
                  <Image source={{ uri }} style={styles.photoImg} contentFit="cover" />
                  <TouchableOpacity style={styles.photoX} onPress={() => set({ images: d.images.filter((_, j) => j !== idx) })}><Ionicons name="close" size={13} color="#fff" /></TouchableOpacity>
                  {idx === 0 && <View style={styles.coverTag}><Text style={styles.coverText}>Cover</Text></View>}
                </View>
              ))}
            </View>
          </View>
        );
      case 'title':
        return (
          <View style={styles.body}>
            <Text style={styles.h2}>Now, give your place a title</Text>
            <Text style={styles.lead}>Short titles work best. Have fun — you can always change it later.</Text>
            <TextInput style={[styles.input, styles.titleInput]} value={d.title} onChangeText={(t) => set({ title: t.slice(0, 50) })} placeholder="e.g. Sunlit loft near the river" placeholderTextColor={colors.textTertiary} multiline />
            <Text style={styles.lead}>{50 - d.title.length} characters available</Text>
          </View>
        );
      case 'highlights':
        return (
          <View style={styles.body}>
            <Text style={styles.h2}>Describe your place</Text>
            <Text style={styles.lead}>Choose up to 2 highlights. We’ll use these to get your description started.</Text>
            <View style={styles.chipWrap}>
              {HIGHLIGHTS.map((h) => {
                const sel = (d.highlights || []).includes(h.id);
                return (
                  <TouchableOpacity key={h.id} style={[styles.amChip, sel && styles.amChipSel]} onPress={() => toggle('highlights', h.id, 2)}>
                    <Ionicons name={h.icon as any} size={15} color={sel ? colors.primary : colors.textSecondary} />
                    <Text style={[styles.amChipText, sel && { color: colors.primary }]}>{h.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );
      case 'description':
        return (
          <View style={styles.body}>
            <Text style={styles.h2}>Create your description</Text>
            <Text style={styles.lead}>Share what makes your place special.</Text>
            <TextInput style={[styles.input, styles.textarea]} value={d.description} onChangeText={(t) => set({ description: t })} placeholder="You’ll love this place because…" placeholderTextColor={colors.textTertiary} multiline textAlignVertical="top" />
          </View>
        );
      case 'booking':
        return (
          <View style={styles.body}>
            <Text style={styles.h2}>Pick your booking settings</Text>
            <Text style={styles.lead}>You can change this at any time.</Text>
            {([['approve5', 'Approve your first 5 bookings', 'Start by reviewing requests, then switch to Instant Book.', 'Recommended'], ['instant', 'Use Instant Book', 'Let guests book automatically.', '']] as const).map(([k, t, s, tag]) => (
              <TouchableOpacity key={k} style={[styles.optCard, d.bookingApproval === k && styles.optCardSel]} onPress={() => { medium(); set({ bookingApproval: k }); }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optTitle}>{t}</Text>
                  {!!tag && <Text style={styles.recommend}>{tag}</Text>}
                  <Text style={styles.optSub}>{s}</Text>
                </View>
                <Ionicons name={k === 'instant' ? 'flash-outline' : 'calendar-outline'} size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            ))}
          </View>
        );
      case 'price':
        return (
          <View style={styles.body}>
            <Text style={styles.h2}>Now, set a weekday base price</Text>
            <Text style={styles.lead}>Tip: price a little lower at first to land your first bookings and reviews, then raise it. You’ll set a weekend price next.</Text>
            <View style={styles.priceWrap}>
              <Text style={styles.bigPrice}>{format(baseUSD)}</Text>
              <View style={styles.priceInputRow}>
                <Text style={styles.priceSymbol}>{currency.symbol}</Text>
                <TextInput style={styles.priceEdit} value={base ? String(base) : ''} onChangeText={(t) => { const local = Number(t.replace(/[^0-9]/g, '')) || 0; set({ price: local, priceCurrency: currency.code }); }} keyboardType="number-pad" placeholder="100" placeholderTextColor={colors.textTertiary} />
              </View>
              <Text style={styles.priceCurNote}>You’re pricing in {currency.code} ({currency.name})</Text>
            </View>
            <View style={styles.breakdown}>
              <View style={styles.bkRow}><Text style={styles.bkK}>Base price</Text><Text style={styles.bkV}>{format(baseUSD)}</Text></View>
              <View style={styles.bkRow}><Text style={styles.bkK}>StayOn service fee</Text><Text style={[styles.bkV, { color: colors.success }]}>Free</Text></View>
              <View style={[styles.bkRow, styles.bkTop]}><Text style={styles.bkKb}>Guest price before taxes</Text><Text style={styles.bkVb}>{format(guestBeforeUSD)}</Text></View>
            </View>
            <View style={[styles.breakdown, { marginTop: spacing.md }]}>
              <View style={styles.bkRow}><Text style={styles.bkKb}>You earn</Text><Text style={[styles.bkVb, { color: colors.primary }]}>{format(youEarnUSD)}</Text></View>
            </View>
            {currency.code !== 'USD' && (
              <View style={styles.fxHint}>
                <Ionicons name="globe-outline" size={15} color={colors.primary} />
                <Text style={styles.fxHintText}>Your price stays fixed at {currency.symbol}{base.toLocaleString()}. Guests in other countries see it converted at today’s exchange rate — a US guest would see about {formatPrice(Math.round(baseUSD), 'USD')}.</Text>
              </View>
            )}
            <Text style={[styles.lead, { marginTop: spacing.sm }]}>StayOn charges no service fee — to guests or to you. The guest pays exactly your price plus taxes, and you keep the full amount.</Text>
          </View>
        );
      case 'weekend':
        return (
          <View style={styles.body}>
            <Text style={styles.h2}>Set a weekend price</Text>
            <Text style={styles.lead}>Add a premium for Fridays and Saturdays.</Text>
            <View style={styles.priceWrap}>
              <Text style={styles.bigPrice}>{format(toUSD(d.weekendPrice || base))}</Text>
            </View>
            <Text style={styles.subHead}>Weekend premium</Text>
            <View style={styles.chipWrap}>
              {[0, 5, 10, 15, 20].map((p) => {
                const val = Math.round(base * (1 + p / 100));
                const sel = (d.weekendPrice || base) === val;
                return (
                  <TouchableOpacity key={p} style={[styles.amChip, sel && styles.amChipSel]} onPress={() => { medium(); set({ weekendPrice: val }); }}>
                    <Text style={[styles.amChipText, sel && { color: colors.primary }]}>{p === 0 ? 'No premium' : `+${p}%`}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );
      case 'discounts':
        return (
          <View style={styles.body}>
            <Text style={styles.h2}>Add discounts</Text>
            <Text style={styles.lead}>Help your place get booked faster and earn your first reviews.</Text>
            {DISCOUNT_OPTIONS.map((o) => {
              const on = (d.discounts as any)?.[o.id];
              return (
                <TouchableOpacity key={o.id} style={[styles.discCard, on && styles.optCardSel]} onPress={() => { medium(); set({ discounts: { ...d.discounts, [o.id]: !on } }); }}>
                  <Text style={styles.discPct}>{o.pct}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optTitle}>{o.title}</Text>
                    <Text style={styles.optSub}>{o.sub}</Text>
                  </View>
                  <Ionicons name={on ? 'checkbox' : 'square-outline'} size={22} color={on ? colors.primary : colors.textTertiary} />
                </TouchableOpacity>
              );
            })}
            <Text style={styles.lead}>Only one discount applies per stay.</Text>
          </View>
        );
      case 'safety':
        return (
          <View style={styles.body}>
            <Text style={styles.h2}>Share safety details</Text>
            <Text style={styles.lead}>Does your place have any of these?</Text>
            {([['camera', 'Exterior security camera present'], ['noise', 'Noise decibel monitor present'], ['weapons', 'Weapon(s) on the property']] as const).map(([k, lbl]) => {
              const on = (d.safetyDisclosures as any)?.[k];
              return (
                <TouchableOpacity key={k} style={styles.safetyRow} onPress={() => { medium(); set({ safetyDisclosures: { ...d.safetyDisclosures, [k]: !on } }); }}>
                  <Text style={styles.safetyLabel}>{lbl}</Text>
                  <Ionicons name={on ? 'checkbox' : 'square-outline'} size={22} color={on ? colors.primary : colors.textTertiary} />
                </TouchableOpacity>
              );
            })}
            <Text style={styles.subHead}>Safety items at your place</Text>
            <View style={styles.chipWrap}>
              {SAFETY_OPTIONS.map((s) => {
                const sel = d.safety.includes(s.id);
                return (
                  <TouchableOpacity key={s.id} style={[styles.amChip, sel && styles.amChipSel]} onPress={() => toggle('safety', s.id)}>
                    <Ionicons name={s.icon as any} size={15} color={sel ? colors.primary : colors.textSecondary} />
                    <Text style={[styles.amChipText, sel && { color: colors.primary }]}>{s.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );
      case 'final':
        return (
          <View style={styles.body}>
            <Text style={styles.h2}>Review and publish</Text>
            <Text style={styles.lead}>Here’s a quick look at your listing. You can edit anything later.</Text>
            <View style={styles.reviewCard}>
              {d.images[0] ? <Image source={{ uri: d.images[0] }} style={styles.reviewImg} contentFit="cover" /> : <View style={[styles.reviewImg, { backgroundColor: colors.backgroundSecondary }]} />}
              <View style={{ padding: spacing.base }}>
                <Text style={styles.reviewTitle}>{d.title || 'Your listing'}</Text>
                <Text style={styles.reviewMeta}>{[d.city, d.country].filter(Boolean).join(', ')}</Text>
                <Text style={styles.reviewMeta}>{d.type} · {d.guests} guests · {d.bedrooms} bd · {d.bathrooms} ba</Text>
                <Text style={styles.reviewPrice}>{format(baseUSD)} / night · {d.images.length} photos · {d.amenities.length} amenities</Text>
              </View>
            </View>
          </View>
        );
      default:
        return null;
    }
  }

  function field(label: string, value: string, onChange: (t: string) => void, ph: string) {
    return (
      <View key={label}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <TextInput style={styles.input} value={value} onChangeText={onChange} placeholder={ph} placeholderTextColor={colors.textTertiary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.topPill} onPress={i === 0 ? () => navigation.goBack() : saveExit}>
          <Text style={styles.topPillText}>{i === 0 ? 'Exit' : 'Save & exit'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.topPill}><Text style={styles.topPillText}>Questions?</Text></TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={80}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing['4xl'] }}>
          {renderStep()}
        </ScrollView>

        {/* Progress segments */}
        {i > 0 && (
          <View style={styles.progress}>
            {segments.map((p, idx) => (
              <View key={idx} style={styles.segTrack}><View style={[styles.segFill, { width: `${Math.round(p * 100)}%` }]} /></View>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity onPress={back}><Text style={styles.backText}>Back</Text></TouchableOpacity>
          <TouchableOpacity activeOpacity={0.9} disabled={!canNext} onPress={next} style={{ minWidth: 120 }}>
            <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.nextBtn, !canNext && { opacity: 0.4 }]}>
              <Text style={styles.nextText}>{i === 0 ? 'Get started' : id === 'final' ? 'Create listing' : 'Next'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
    topPill: { paddingHorizontal: spacing.base, paddingVertical: spacing.sm, borderRadius: 999, borderWidth: 1, borderColor: colors.borderLight },
    topPillText: { fontSize: fontSizes.sm, color: colors.textPrimary, ...fonts.semiBold },
    body: { paddingHorizontal: spacing.lg, paddingTop: spacing.base },
    introBody: { paddingHorizontal: spacing.lg, paddingTop: spacing.base, alignItems: 'flex-start' },
    introImg: { width: '100%', height: 280, borderRadius: borderRadius.xl, marginBottom: spacing.lg },
    stepNum: { fontSize: fontSizes.base, color: colors.textSecondary, marginBottom: 6, ...fonts.medium },
    h1: { fontSize: fontSizes['3xl'], letterSpacing: letterSpacing.tight, color: colors.textPrimary, lineHeight: 38, marginBottom: spacing.lg, ...fonts.bold },
    h2: { fontSize: fontSizes['2xl'], letterSpacing: letterSpacing.tight, color: colors.textPrimary, lineHeight: 30, marginBottom: spacing.sm, ...fonts.bold },
    lead: { fontSize: fontSizes.base, lineHeight: 22, color: colors.textSecondary, marginBottom: spacing.base, ...fonts.regular },
    subHead: { fontSize: fontSizes.md, color: colors.textPrimary, marginTop: spacing.lg, marginBottom: spacing.sm, ...fonts.semiBold },
    // overview
    ovRow: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.base, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderLight },
    ovNum: { fontSize: fontSizes.lg, color: colors.textPrimary, ...fonts.bold },
    ovTitle: { fontSize: fontSizes.lg, color: colors.textPrimary, ...fonts.bold },
    ovSub: { fontSize: fontSizes.base, color: colors.textSecondary, marginTop: 4, lineHeight: 21, ...fonts.regular },
    // grid / type
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.sm },
    typeCard: { width: '47%', borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.borderLight, padding: spacing.base, gap: spacing.md, backgroundColor: colors.card },
    typeCardSel: { borderColor: colors.primary, borderWidth: 2, backgroundColor: withOpacity(colors.primary, 0.06) },
    typeLabel: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.semiBold },
    // option cards
    optCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.borderLight, padding: spacing.base, marginBottom: spacing.sm, backgroundColor: colors.card },
    optCardSel: { borderColor: colors.primary, borderWidth: 2, backgroundColor: withOpacity(colors.primary, 0.06) },
    optTitle: { fontSize: fontSizes.md, color: colors.textPrimary, ...fonts.bold },
    optSub: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 2, lineHeight: 19, ...fonts.regular },
    recommend: { fontSize: fontSizes.sm, color: colors.success, marginTop: 2, ...fonts.semiBold },
    // location
    pinBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary, backgroundColor: colors.primarySubtle, marginBottom: spacing.sm },
    pinText: { color: colors.primary, fontSize: fontSizes.base, ...fonts.semiBold },
    fieldLabel: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: spacing.md, marginBottom: 6, ...fonts.semiBold },
    input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderLight, borderRadius: borderRadius.md, paddingHorizontal: spacing.base, paddingVertical: spacing.md, fontSize: fontSizes.base, color: colors.textPrimary },
    titleInput: { minHeight: 90, fontSize: fontSizes.lg },
    textarea: { minHeight: 130 },
    // counters
    card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderLight, borderRadius: borderRadius.lg, paddingHorizontal: spacing.base },
    counterRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight },
    counterLabel: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.medium },
    counterSub: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 2, ...fonts.regular },
    counter: { flexDirection: 'row', alignItems: 'center', gap: spacing.base },
    cBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: colors.borderLight, alignItems: 'center', justifyContent: 'center' },
    cVal: { fontSize: fontSizes.base, color: colors.textPrimary, minWidth: 22, textAlign: 'center', ...fonts.bold },
    // amenities chips
    amenityCat: { fontSize: fontSizes.sm, letterSpacing: 0.5, textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 6, ...fonts.bold },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: 4 },
    amChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.base, paddingVertical: spacing.sm, borderRadius: 999, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.card },
    amChipSel: { borderColor: colors.primary, backgroundColor: withOpacity(colors.primary, 0.1) },
    amChipText: { fontSize: fontSizes.sm, color: colors.textSecondary, ...fonts.medium },
    // photos
    bigDashed: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: spacing.lg, borderRadius: borderRadius.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary, backgroundColor: colors.primarySubtle, marginBottom: spacing.sm },
    bigDashedText: { color: colors.primary, fontSize: fontSizes.base, ...fonts.semiBold },
    photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
    photo: { width: '47%', aspectRatio: 1.2, borderRadius: borderRadius.md, overflow: 'hidden', backgroundColor: colors.backgroundSecondary },
    photoImg: { width: '100%', height: '100%' },
    photoX: { position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
    coverTag: { position: 'absolute', bottom: 6, left: 6, backgroundColor: '#fff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    coverText: { fontSize: 11, color: '#111', ...fonts.bold },
    // price
    priceWrap: { alignItems: 'center', marginVertical: spacing.xl },
    bigPrice: { fontSize: 56, color: colors.textPrimary, ...fonts.bold },
    priceInputRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 4, marginTop: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.borderLight, paddingBottom: 2 },
    priceSymbol: { fontSize: fontSizes.md, color: colors.textSecondary, paddingBottom: 3, ...fonts.semiBold },
    priceEdit: { minWidth: 100, textAlign: 'center', fontSize: fontSizes.lg, color: colors.textPrimary, ...fonts.semiBold },
    priceCurNote: { marginTop: spacing.sm, fontSize: fontSizes.sm, color: colors.textTertiary, ...fonts.medium },
    fxHint: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: spacing.md, padding: spacing.base, borderRadius: borderRadius.md, backgroundColor: colors.primarySubtle, borderWidth: 1, borderColor: withOpacity(colors.primary, 0.2) },
    fxHintText: { flex: 1, fontSize: fontSizes.sm, color: colors.textPrimary, lineHeight: 19, ...fonts.regular },
    breakdown: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderLight, borderRadius: borderRadius.lg, padding: spacing.base },
    bkRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
    bkTop: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderLight, marginTop: spacing.xs, paddingTop: spacing.sm },
    bkK: { fontSize: fontSizes.base, color: colors.textSecondary, ...fonts.regular },
    bkV: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.medium },
    bkKb: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.bold },
    bkVb: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.bold },
    // discounts
    discCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.borderLight, padding: spacing.base, marginBottom: spacing.sm, backgroundColor: colors.card },
    discPct: { fontSize: fontSizes.md, color: colors.textPrimary, minWidth: 44, ...fonts.bold },
    // safety
    safetyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.base, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight },
    safetyLabel: { flex: 1, fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.regular },
    // review
    reviewCard: { borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.borderLight, overflow: 'hidden', backgroundColor: colors.card, marginTop: spacing.sm },
    reviewImg: { width: '100%', height: 180 },
    reviewTitle: { fontSize: fontSizes.lg, color: colors.textPrimary, ...fonts.bold },
    reviewMeta: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 2, ...fonts.regular },
    reviewPrice: { fontSize: fontSizes.base, color: colors.textPrimary, marginTop: spacing.sm, ...fonts.semiBold },
    // progress + footer
    progress: { flexDirection: 'row', gap: 6, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
    segTrack: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.borderLight, overflow: 'hidden' },
    segFill: { height: 4, borderRadius: 2, backgroundColor: colors.primary },
    footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.borderLight, backgroundColor: colors.surface },
    backText: { fontSize: fontSizes.base, color: colors.textPrimary, textDecorationLine: 'underline', ...fonts.semiBold },
    nextBtn: { paddingVertical: spacing.md, paddingHorizontal: spacing.xl, borderRadius: borderRadius.md, alignItems: 'center' },
    nextText: { color: '#fff', fontSize: fontSizes.base, ...fonts.bold },
  });

export default ListingWizardScreen;
