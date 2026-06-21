import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
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
import { getGuide, addGuideEntry, deleteGuideEntry, GUIDE_CATEGORIES, type GuideEntry, type GuideCategory } from '../data/guidebooks';
import { getHostProfile } from '../data/hostProfile';
import { fonts, fontSizes, spacing, borderRadius, letterSpacing } from '../constants';
import { withOpacity } from '../utils/color';
import { confirmAction } from '../utils/confirm';
import { formatPrice } from '../utils/currency';
import { STAYON_GRADIENT } from '../components/GradientButton';
import { searchPlaces, getPlaceDetails, reverseGeocode, geocodeAddress, newSessionToken, type PlaceSuggestion } from '../../services/places';
import {
  newDraft, saveListing, listingUSD, type HostListing,
  PLACE_TYPES, PLACE_KINDS, WHO_ELSE_OPTIONS, HIGHLIGHTS, DISCOUNT_OPTIONS,
  AMENITY_OPTIONS, AMENITY_CATEGORY_ORDER, SAFETY_OPTIONS, MIN_PHOTOS, PHOTO_ROOMS,
} from '../data/listings';
import { Api } from '../../api';
import { publishToBackend } from '../data/publishQueue';
import { LocationPickerMap } from '../../components/LocationPickerMap';
import { AmenityIcon } from '../../components/AmenityIcon';

const PHASE1 = ['p1intro', 'type', 'kind', 'location', 'basics', 'bathrooms', 'whoelse'];
const PHASE2 = ['p2intro', 'amenities', 'vibe', 'photos', 'title', 'highlights', 'description'];

// Setting + vibe tags — these MUST match the guest home's category pills and
// "Match your vibe" keys so a published listing surfaces under the right filter.
const SETTING_TAGS = [
  { id: 'beach', label: 'Beachfront', icon: 'sunny-outline' },
  { id: 'mountain', label: 'Mountain', icon: 'triangle-outline' },
  { id: 'city', label: 'City', icon: 'business-outline' },
  { id: 'nature', label: 'Countryside / Nature', icon: 'leaf-outline' },
  { id: 'lake', label: 'Lakefront', icon: 'water-outline' },
  { id: 'ski', label: 'Ski / Snow', icon: 'snow-outline' },
];
const VIBE_TAGS = [
  { id: 'romantic', label: 'Romantic', icon: 'heart-outline' },
  { id: 'adventure', label: 'Adventure', icon: 'compass-outline' },
  { id: 'wellness', label: 'Wellness', icon: 'flower-outline' },
  { id: 'family', label: 'Family-friendly', icon: 'people-outline' },
  { id: 'work', label: 'Work-friendly', icon: 'laptop-outline' },
  { id: 'luxury', label: 'Luxury', icon: 'diamond-outline' },
  { id: 'budget', label: 'Budget-friendly', icon: 'pricetag-outline' },
  { id: 'pet', label: 'Pet-friendly', icon: 'paw-outline' },
];
const PHASE3 = ['p3intro', 'booking', 'price', 'weekend', 'discounts', 'rules', 'cancellation', 'guide', 'safety', 'final'];
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
  const contentRef = useRef<ScrollView>(null);
  // reset scroll to top whenever the step changes (so no prior step bleeds in)
  useEffect(() => { contentRef.current?.scrollTo({ y: 0, animated: false }); }, [i]);
  const [d, setD] = useState<HostListing>(() => newDraft());
  const set = (p: Partial<HostListing>) => setD((prev) => ({ ...prev, ...p }));

  // Google Places address search for the location step.
  const [addrQuery, setAddrQuery] = useState('');
  const [mapKey, setMapKey] = useState(0); // bump to force the map to recenter
  const [locSaved, setLocSaved] = useState(false);
  // Local guide entries the host adds (stored by listing id).
  const [guide, setGuide] = useState<GuideEntry[]>([]);
  const [gCat, setGCat] = useState<GuideCategory>('eat');
  const [gTitle, setGTitle] = useState('');
  const [gNote, setGNote] = useState('');
  const [gArea, setGArea] = useState('');
  const [aiTagging, setAiTagging] = useState(false); // AI sorting photos by room
  useEffect(() => { getGuide(d.id).then(setGuide).catch(() => {}); }, [d.id]);
  const addGuide = async () => {
    if (!gTitle.trim()) return;
    medium();
    const next = await addGuideEntry(d.id, { category: gCat, title: gTitle.trim(), note: gNote.trim(), area: gArea.trim() || undefined });
    setGuide(next); setGTitle(''); setGNote(''); setGArea('');
  };
  const removeGuide = async (gid: string) => { setGuide(await deleteGuideEntry(d.id, gid)); };
  const [addrResults, setAddrResults] = useState<PlaceSuggestion[]>([]);
  const [addrSearching, setAddrSearching] = useState(false);
  const [addrPicked, setAddrPicked] = useState(false);
  const sessionRef = useRef<string>(newSessionToken());

  useEffect(() => {
    const q = addrQuery.trim();
    if (q.length < 3 || addrPicked) { setAddrResults([]); return; }
    const ctrl = new AbortController();
    setAddrSearching(true);
    const t = setTimeout(async () => {
      const res = await searchPlaces(q, { signal: ctrl.signal, sessionToken: sessionRef.current });
      setAddrResults(res);
      setAddrSearching(false);
    }, 280);
    return () => { ctrl.abort(); clearTimeout(t); };
  }, [addrQuery, addrPicked]);

  const pickAddress = async (s: PlaceSuggestion) => {
    medium();
    setAddrPicked(true);
    const fullText = s.full || `${s.title}, ${s.subtitle}`;
    setAddrQuery(fullText);
    setAddrResults([]);
    let detail = await getPlaceDetails(s.placeId, { sessionToken: sessionRef.current });
    sessionRef.current = newSessionToken(); // rotate after a completed selection
    // Fallback: if Place Details gave no coordinates, forward-geocode the text.
    if (!detail || typeof detail.lat !== 'number') {
      const geo = await geocodeAddress(fullText);
      if (geo && typeof geo.lat === 'number') detail = { ...(detail || {} as any), ...geo } as any;
    }
    if (detail && typeof detail.lat === 'number') {
      set({
        address: detail.street || s.title,
        area: detail.area ?? d.area,
        city: detail.city ?? d.city,
        state: detail.state ?? d.state,
        country: detail.country ?? d.country,
        zipcode: detail.zipcode ?? d.zipcode,
        latitude: detail.lat,
        longitude: detail.lng,
      });
      setMapKey((k) => k + 1); // force the map to recenter on the picked place
    } else {
      set({ address: s.title });
    }
  };

  // Host moved the map pin (drag/tap) or used current location → set coords and
  // reverse-geocode to auto-fill the address fields.
  const setPinAndAddress = async (la: number, ln: number) => {
    setLocSaved(false); // moving the pin requires re-saving
    set({ latitude: la, longitude: ln });
    const r = await reverseGeocode(la, ln);
    if (r) {
      const patch: any = { latitude: la, longitude: ln };
      if (r.street) patch.address = r.street;
      if (r.area) patch.area = r.area;
      if (r.city) patch.city = r.city;
      if (r.state) patch.state = r.state;
      if (r.country) patch.country = r.country;
      if (r.zipcode) patch.zipcode = r.zipcode;
      set(patch);
    }
  };
  const id = STEPS[i];

  // progress segments (3 phases)
  const phaseProg = (arr: string[]) => (arr.includes(id) ? (arr.indexOf(id) + 1) / arr.length : (STEPS.indexOf(id) > STEPS.indexOf(arr[arr.length - 1]) ? 1 : 0));
  const segments = [phaseProg(PHASE1), phaseProg(PHASE2), phaseProg(PHASE3)];

  // Only the essentials are mandatory; everything else is optional (skippable).
  // Mandatory: type · location · basics · photos · title · price.
  const canNext = (() => {
    switch (id) {
      case 'type': return !!d.type;
      case 'location':
        return !!(d.address.trim() && d.city.trim() && (d.state ?? '').trim() && d.country.trim() && (d.zipcode ?? '').trim());
      case 'basics': return d.guests > 0 && d.bedrooms > 0 && d.beds > 0;
      case 'photos': return d.images.length >= MIN_PHOTOS;
      case 'title': return d.title.trim().length >= 5;
      case 'price': return d.price > 0;
      // kind, bathrooms, who-else, amenities, vibe, highlights, description,
      // booking, weekend, discounts, safety, intros → optional.
      default: return true;
    }
  })();

  // Friendly reason shown when Next is blocked, so the host knows what's missing.
  const requiredHint = (canNext || id === 'overview' || id.endsWith('intro')) ? null : (
    id === 'type' ? 'Choose your property type.'
    : id === 'kind' ? 'Choose what guests will book.'
    : id === 'location' ? 'Enter the full address — street, city, state, country and PIN code.'
    : id === 'basics' ? 'Set guests, bedrooms and beds.'
    : id === 'bathrooms' ? 'Set the number and type of bathrooms.'
    : id === 'whoelse' ? 'Tell guests who else might be around.'
    : id === 'amenities' ? 'Select at least one amenity.'
    : id === 'vibe' ? 'Pick at least one setting or vibe.'
    : id === 'photos' ? `Add at least ${MIN_PHOTOS} photos.`
    : id === 'title' ? 'Give your place a title (at least 5 characters).'
    : id === 'highlights' ? 'Choose at least one highlight.'
    : id === 'description' ? 'Write a short description (at least 20 characters).'
    : id === 'booking' ? 'Choose how guests book.'
    : id === 'price' ? 'Set a nightly price.'
    : 'Complete this step to continue.'
  );

  const back = () => { light(); if (i === 0) navigation.goBack(); else setI(i - 1); };
  const next = () => {
    light();
    if (i < STEPS.length - 1) { setI(i + 1); return; }
    // final → publish (locally) AND submit to the backend for Ops review so it
    // can go public to users on other devices. Backend call is fail-safe.
    success();
    const published: HostListing = { ...d, status: 'published', instantBook: d.bookingApproval === 'instant', title: d.title.trim(), address: d.address.trim(), city: d.city.trim(), country: d.country.trim() };
    saveListing(published).then(async () => {
      // Push to the backend so guests on other devices find it. If the backend
      // is unreachable, it's queued and replayed automatically next time online.
      const r = await publishToBackend(published);
      if (!r.synced) {
        Alert.alert('Published — syncing soon', 'Your stay is live on your device. We’ll publish it to everyone automatically once you’re back online.', [{ text: 'OK' }]);
      }
      navigation.goBack();
    });
  };
  const saveExit = () => confirmAction({ title: 'Save & exit?', message: 'Your progress is kept as a draft.', confirmText: 'Save & exit', onConfirm: () => { saveListing({ ...d, status: 'draft' }).then(() => navigation.goBack()); } });

  const pickPhotos = async () => {
    light();
    // Web uses the browser file dialog and needs no media-library permission —
    // requesting it there returns "not granted" and silently blocks the picker.
    if (Platform.OS !== 'web') {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert('Permission needed', 'Allow photo access to add pictures.'); return; }
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.85 });
    if (res.canceled) return;
    setAiTagging(true);
    try {
      await Api.auth.ensureSession();
      const newUrls: string[] = [];
      const toClassify: { id: string; b64: string; mediaType: string }[] = [];
      for (const a of res.assets) {
        const b64 = await uriToBase64(a.uri);
        let url = a.uri; // fallback to local if upload fails
        if (b64) {
          try { const up = await Api.media.upload(b64, 'image/jpeg'); if (up?.url) url = up.url; } catch { /* keep local */ }
          toClassify.push({ id: url, b64, mediaType: 'image/jpeg' });
        }
        newUrls.push(url);
      }
      set({ images: [...d.images, ...newUrls] });
      // AI: auto-sort the new photos into rooms (kitchen/bedroom/pool/…).
      if (toClassify.length) {
        try {
          const r = await Api.ai.classifyPhotos(toClassify);
          setD((prev) => {
            const patch = { ...(prev.photoMeta || {}) };
            (r.results || []).forEach((res2: any) => { if (res2.room && res2.room !== 'other') patch[res2.id] = { ...(patch[res2.id] || {}), room: res2.room }; });
            return { ...prev, photoMeta: patch };
          });
        } catch { /* AI offline — manual tagging */ }
      }
    } finally {
      setAiTagging(false);
    }
  };

  // Read an image URI → base64 (works on web blob URIs and native file URIs).
  const uriToBase64 = async (uri: string): Promise<string | null> => {
    try {
      const r = await fetch(uri);
      const blob = await r.blob();
      return await new Promise((resolve) => {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result).split(',')[1] || null);
        fr.onerror = () => resolve(null);
        fr.readAsDataURL(blob);
      });
    } catch { return null; }
  };

  // Send new photos to the backend AI classifier and apply the room tags.

  // Per-photo room tag + caption (powers the guest "Photo tour").
  const setPhotoMeta = (uri: string, patch: { room?: string; caption?: string }) =>
    set({ photoMeta: { ...(d.photoMeta || {}), [uri]: { ...(d.photoMeta?.[uri] || {}), ...patch } } });
  const removePhoto = (uri: string, idx: number) => {
    const pm = { ...(d.photoMeta || {}) }; delete pm[uri];
    set({ images: d.images.filter((_, j) => j !== idx), photoMeta: pm });
  };

  const toggle = (key: 'amenities' | 'safety' | 'whoElse' | 'highlights' | 'vibes', v: string, max?: number) => {
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
                    <AmenityIcon name={t.icon} size={26} color={colors.textPrimary} />
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
                <TouchableOpacity key={k.id} style={[styles.optCard, sel && styles.optCardSel]} onPress={() => { medium(); set({ placeType: k.id, whoElse: k.id === 'entire' ? ['no_one'] : [] }); }} activeOpacity={0.85}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optTitle}>{k.label}</Text>
                    <Text style={styles.optSub}>{k.sub}</Text>
                  </View>
                  <AmenityIcon name={k.icon} size={24} color={colors.textPrimary} />
                </TouchableOpacity>
              );
            })}
          </View>
        );
      case 'location':
        return (
          <View style={styles.body}>
            <Text style={styles.h2}>Where’s your place located?</Text>
            <Text style={styles.lead}>Search an address, drag the pin, or use your current location. Only shared with guests after they’ve booked.</Text>

            {/* Google Places address search */}
            <View style={styles.addrSearchWrap}>
              <Ionicons name="search" size={18} color={colors.textSecondary} />
              <TextInput
                style={styles.addrSearchInput}
                value={addrQuery}
                onChangeText={(t) => { setAddrQuery(t); setAddrPicked(false); }}
                placeholder="Search address, building or area…"
                placeholderTextColor={colors.textTertiary}
                autoCorrect={false}
              />
              {addrSearching ? <ActivityIndicator size="small" color={colors.primary} />
                : addrQuery.length > 0 ? (
                  <TouchableOpacity onPress={() => { setAddrQuery(''); setAddrResults([]); setAddrPicked(false); }}>
                    <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
                  </TouchableOpacity>
                ) : null}
            </View>
            {addrResults.length > 0 && (
              <View style={styles.addrResults}>
                {addrResults.map((s) => (
                  <TouchableOpacity key={s.placeId} style={styles.addrResultRow} activeOpacity={0.8} onPress={() => pickAddress(s)}>
                    <Ionicons name="location-outline" size={16} color={colors.primary} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.addrResultTitle} numberOfLines={1}>{s.title}</Text>
                      {!!s.subtitle && <Text style={styles.addrResultSub} numberOfLines={1}>{s.subtitle}</Text>}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Google map — always shown; drag/tap the pin to set the exact spot */}
            <View style={{ marginTop: spacing.md }}>
              <LocationPickerMap
                key={mapKey}
                lat={d.latitude || location.latitude || 0}
                lng={d.longitude || location.longitude || 0}
                onChange={setPinAndAddress}
                height={230}
              />
            </View>

            <TouchableOpacity style={styles.pinBtn} onPress={() => {
              light(); refreshLocation(); setLocSaved(false);
              if (location.latitude && location.longitude) { setPinAndAddress(location.latitude, location.longitude); setMapKey((k) => k + 1); }
            }}>
              <Ionicons name="navigate" size={16} color={colors.primary} /><Text style={styles.pinText}>Use my current location</Text>
            </TouchableOpacity>

            {/* Lock in the pin's coordinates for the stay */}
            <TouchableOpacity
              activeOpacity={0.9}
              disabled={!d.latitude}
              onPress={async () => { if (!d.latitude || !d.longitude) return; success(); await setPinAndAddress(d.latitude, d.longitude); setLocSaved(true); }}
              style={{ marginTop: spacing.sm, opacity: d.latitude ? 1 : 0.5 }}
            >
              <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveLocBtn}>
                <Ionicons name={locSaved ? 'checkmark-circle' : 'bookmark'} size={16} color="#fff" />
                <Text style={styles.saveLocText}>{locSaved ? 'Location saved' : 'Save this location'}</Text>
              </LinearGradient>
            </TouchableOpacity>

            {!!d.latitude && (
              <View style={styles.addrPinned}>
                <Ionicons name={locSaved ? 'checkmark-circle' : 'location'} size={15} color={colors.primary} />
                <Text style={styles.addrPinnedText}>
                  {locSaved
                    ? `Saved — guests will see this pin (${d.latitude.toFixed(4)}, ${d.longitude!.toFixed(4)})`
                    : `Pinned (${d.latitude.toFixed(4)}, ${d.longitude!.toFixed(4)})`}
                </Text>
              </View>
            )}

            <Text style={styles.addrManualHint}>Address (auto-filled from the map — fine-tune anything):</Text>
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
                const pickWhoElse = () => {
                  medium();
                  const cur = d.whoElse || [];
                  if (w.id === 'no_one') {
                    set({ whoElse: sel ? [] : ['no_one'] }); // exclusive
                  } else {
                    const next = sel ? cur.filter((x) => x !== w.id) : [...cur.filter((x) => x !== 'no_one'), w.id];
                    set({ whoElse: next });
                  }
                };
                return (
                  <TouchableOpacity key={w.id} style={[styles.typeCard, sel && styles.typeCardSel]} onPress={pickWhoElse}>
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
                          <AmenityIcon name={a.icon} size={16} color={sel ? colors.primary : colors.textSecondary} />
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
      case 'vibe': {
        const sel = d.vibes ?? [];
        return (
          <View style={styles.body}>
            <Text style={styles.h2}>What vibe does your place match?</Text>
            <Text style={styles.h2sub}>Guests filter by these on the home screen — pick everything that fits so the right travellers find you.</Text>

            <Text style={styles.amenityCat}>Setting</Text>
            <View style={styles.chipWrap}>
              {SETTING_TAGS.map((t) => {
                const on = sel.includes(t.id);
                return (
                  <TouchableOpacity key={t.id} style={[styles.amChip, on && styles.amChipSel]} onPress={() => toggle('vibes', t.id)}>
                    <Ionicons name={t.icon as any} size={15} color={on ? colors.primary : colors.textSecondary} />
                    <Text style={[styles.amChipText, on && { color: colors.primary }]}>{t.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.amenityCat, { marginTop: spacing.lg }]}>Match your vibe</Text>
            <View style={styles.chipWrap}>
              {VIBE_TAGS.map((t) => {
                const on = sel.includes(t.id);
                return (
                  <TouchableOpacity key={t.id} style={[styles.amChip, on && styles.amChipSel]} onPress={() => toggle('vibes', t.id)}>
                    <Ionicons name={t.icon as any} size={15} color={on ? colors.primary : colors.textSecondary} />
                    <Text style={[styles.amChipText, on && { color: colors.primary }]}>{t.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );
      }
      case 'photos':
        return (
          <View style={styles.body}>
            <Text style={styles.h2}>Add some photos of your place</Text>
            <Text style={styles.lead}>At least {MIN_PHOTOS} photos. Our AI auto-sorts them by room — you can adjust the tags or add a caption.</Text>
            <TouchableOpacity style={styles.bigDashed} onPress={pickPhotos}>
              <Ionicons name="images-outline" size={20} color={colors.primary} /><Text style={styles.bigDashedText}>Add photos from your device</Text>
            </TouchableOpacity>
            {aiTagging && (
              <View style={styles.addrPinned}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.addrPinnedText}>Uploading & sorting your photos by room…</Text>
              </View>
            )}
            <Text style={[styles.lead, { color: d.images.length >= MIN_PHOTOS ? colors.success : colors.textTertiary }]}>{d.images.length}/{MIN_PHOTOS} added</Text>
            {d.images.map((uri, idx) => {
              const meta = d.photoMeta?.[uri] || {};
              return (
                <View key={uri + idx} style={styles.photoCard}>
                  <View style={styles.photoCardRow}>
                    <Image source={{ uri }} style={styles.photoThumb} contentFit="cover" />
                    <View style={{ flex: 1 }}>
                      <View style={styles.photoCardTop}>
                        <Text style={styles.photoCardIdx}>{idx === 0 ? 'Cover photo' : `Photo ${idx + 1}`}</Text>
                        <TouchableOpacity onPress={() => removePhoto(uri, idx)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <Ionicons name="trash-outline" size={18} color={colors.error} />
                        </TouchableOpacity>
                      </View>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.roomChips}>
                        {PHOTO_ROOMS.map((r) => {
                          const sel = meta.room === r.key;
                          return (
                            <TouchableOpacity key={r.key} style={[styles.roomChip, sel && styles.roomChipSel]} onPress={() => { medium(); setPhotoMeta(uri, { room: sel ? undefined : r.key }); }}>
                              <Text style={[styles.roomChipText, sel && styles.roomChipTextSel]}>{r.label}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  </View>
                  <TextInput
                    style={styles.captionInput}
                    value={meta.caption || ''}
                    onChangeText={(t) => setPhotoMeta(uri, { caption: t.slice(0, 120) })}
                    placeholder="Add a caption (optional) — e.g. “Sunny living room with smart TV”"
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>
              );
            })}
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

            {/* Guest-based pricing — price rises by a % per extra guest, up to max */}
            <View style={[styles.card, { marginTop: spacing.lg }]}>
              <Counter label={`Base price covers up to ${d.baseGuests || 1} guest${(d.baseGuests || 1) > 1 ? 's' : ''}`} value={d.baseGuests || 1} onChange={(v: number) => set({ baseGuests: Math.min(v, d.guests) })} min={1} />
              <View style={styles.guestFeeRow}>
                <Text style={styles.ruleLabel}>Each extra guest adds (% of base / night)</Text>
                <TextInput
                  style={styles.guestFeeInput}
                  value={d.extraGuestPct ? String(d.extraGuestPct) : ''}
                  onChangeText={(t) => set({ extraGuestPct: Math.min(100, Number(t.replace(/[^0-9]/g, '')) || 0) })}
                  keyboardType="number-pad" placeholder="0" placeholderTextColor={colors.textTertiary}
                />
              </View>
              <Text style={styles.lead}>
                Applies to guests beyond {d.baseGuests || 1}, up to your max of {d.guests}.
                {d.extraGuestPct ? ` e.g. ${(d.baseGuests || 1) + 1} guests ≈ ${currency.symbol}${Math.round(base * (1 + (d.extraGuestPct || 0) / 100)).toLocaleString()}, ${d.guests} guests ≈ ${currency.symbol}${Math.round(base * (1 + ((d.extraGuestPct || 0) / 100) * Math.max(0, d.guests - (d.baseGuests || 1)))).toLocaleString()} /night.` : ''}
              </Text>
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
      case 'rules': {
        const rule = (key: keyof typeof d.houseRules, label: string) => (
          <TouchableOpacity key={key} style={styles.ruleRow} onPress={() => { medium(); set({ houseRules: { ...d.houseRules, [key]: !d.houseRules[key] } }); }}>
            <Text style={styles.ruleLabel}>{label}</Text>
            <Ionicons name={d.houseRules[key] ? 'checkbox' : 'square-outline'} size={22} color={d.houseRules[key] ? colors.primary : colors.textTertiary} />
          </TouchableOpacity>
        );
        return (
          <View style={styles.body}>
            <Text style={styles.h2}>House rules</Text>
            <Text style={styles.lead}>Set what guests can and can’t do. (Optional)</Text>
            <View style={styles.card}>
              {rule('smoking', 'Smoking allowed')}
              {rule('pets', 'Pets allowed')}
              {rule('parties', 'Parties / events allowed')}
              {rule('extraGuests', 'Extra guests allowed')}
              {rule('quietHours', 'Quiet hours (10pm–7am)')}
            </View>
            <View style={styles.timeRow}>
              <View style={{ flex: 1 }}>{field('Check‑in time', d.checkInTime, (t) => set({ checkInTime: t }), '3:00 PM')}</View>
              <View style={{ flex: 1 }}>{field('Checkout time', d.checkOutTime, (t) => set({ checkOutTime: t }), '11:00 AM')}</View>
            </View>
          </View>
        );
      }
      case 'cancellation':
        return (
          <View style={styles.body}>
            <Text style={styles.h2}>Cancellation policy</Text>
            <Text style={styles.lead}>How flexible are you if a guest cancels? (Optional)</Text>
            {([
              ['Flexible', 'Full refund up to 24 hours before check‑in.'],
              ['Moderate', 'Full refund up to 5 days before check‑in.'],
              ['Strict', 'Full refund up to 14 days; 50% after.'],
            ] as const).map(([k, sub]) => (
              <TouchableOpacity key={k} style={[styles.optCard, d.cancellationPolicy === k && styles.optCardSel]} onPress={() => { medium(); set({ cancellationPolicy: k }); }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optTitle}>{k}</Text>
                  <Text style={styles.optSub}>{sub}</Text>
                </View>
                <Ionicons name={d.cancellationPolicy === k ? 'radio-button-on' : 'radio-button-off'} size={22} color={d.cancellationPolicy === k ? colors.primary : colors.textTertiary} />
              </TouchableOpacity>
            ))}
          </View>
        );
      case 'guide':
        return (
          <View style={styles.body}>
            <Text style={styles.h2}>Local guide for guests</Text>
            <Text style={styles.lead}>Recommend food, sights, things to do and getting around. (Optional)</Text>
            {/* existing entries */}
            {guide.map((g) => (
              <View key={g.id} style={styles.guideRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.guideTitle}>{GUIDE_CATEGORIES.find((c) => c.key === g.category)?.label} · {g.title}{g.area ? ` · ${g.area}` : ''}</Text>
                  {!!g.note && <Text style={styles.guideNote}>{g.note}</Text>}
                </View>
                <TouchableOpacity onPress={() => removeGuide(g.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="trash-outline" size={18} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))}
            {/* add new */}
            <Text style={styles.subHead}>Add a recommendation</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.roomChips}>
              {GUIDE_CATEGORIES.map((c) => {
                const sel = gCat === c.key;
                return (
                  <TouchableOpacity key={c.key} style={[styles.roomChip, sel && styles.roomChipSel]} onPress={() => { medium(); setGCat(c.key); }}>
                    <Text style={[styles.roomChipText, sel && styles.roomChipTextSel]}>{c.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            {field('Place name', gTitle, setGTitle, 'e.g. Sunrise Café')}
            {field('Note', gNote, setGNote, 'Why guests will love it')}
            {field('Distance (optional)', gArea, setGArea, 'e.g. 5 min walk')}
            <TouchableOpacity style={styles.pinBtn} onPress={addGuide} disabled={!gTitle.trim()}>
              <Ionicons name="add-circle-outline" size={16} color={colors.primary} /><Text style={styles.pinText}>Add to guide</Text>
            </TouchableOpacity>
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
      case 'final': {
        const whoLabels = (d.whoElse || []).map((wid) => WHO_ELSE_OPTIONS.find((w) => w.id === wid)?.label || wid);
        const pretty = (s: string) => String(s).replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        return (
          <View style={styles.body}>
            <Text style={styles.h2}>Review and publish</Text>
            <Text style={styles.lead}>Here’s everything on your listing. Tap Back to fix anything, then publish.</Text>
            <View style={styles.reviewCard}>
              {d.images[0] ? <Image source={{ uri: d.images[0] }} style={styles.reviewImg} contentFit="cover" /> : <View style={[styles.reviewImg, { backgroundColor: colors.backgroundSecondary }]} />}
              <View style={{ padding: spacing.base }}>
                <Text style={styles.reviewTitle}>{d.title || 'Your listing'}</Text>
                <Text style={styles.reviewMeta}>{[d.city, d.country].filter(Boolean).join(', ') || 'Location not set'}</Text>
                <Text style={styles.reviewMeta}>{d.type} · {d.guests} guests · {d.bedrooms} bd · {d.beds} beds · {d.bathrooms} ba</Text>
                <Text style={styles.reviewPrice}>{format(baseUSD)} / night · {d.images.length} photos · {d.amenities.length} amenities</Text>
              </View>
            </View>
            {/* Full details */}
            <View style={styles.reviewList}>
              {reviewRow('Place type', PLACE_KINDS.find((k) => k.id === d.placeType)?.label || '—')}
              {reviewRow('Address', [d.address, d.area, d.city, d.state, d.zipcode, d.country].filter(Boolean).join(', ') || '—')}
              {reviewRow('Pin', d.latitude ? `${d.latitude.toFixed(4)}, ${d.longitude!.toFixed(4)}` : 'Not set')}
              {reviewRow('Bathrooms', `${d.bathrooms} · ${d.bathroomKind || '—'}`)}
              {reviewRow('Who else', whoLabels.join(', ') || '—')}
              {reviewRow('Amenities', d.amenities.length ? `${d.amenities.length} selected` : 'None')}
              {reviewRow('Vibe', (d.vibes || []).map(pretty).join(', ') || '—')}
              {reviewRow('Highlights', (d.highlights || []).map(pretty).join(', ') || '—')}
              {reviewRow('Description', d.description?.trim() ? d.description.trim() : 'Not added')}
              {reviewRow('Booking', d.bookingApproval === 'instant' ? 'Instant Book' : 'Approve every request')}
              {reviewRow('Weekend price', d.weekendPrice ? format(listingUSD(d.weekendPrice, d.priceCurrency)) : 'Same as weekday')}
              {reviewRow('Cleaning fee', d.cleaningFee ? format(listingUSD(d.cleaningFee, d.priceCurrency)) : 'None')}
              {reviewRow('Check‑in / out', `${d.checkInTime} – ${d.checkOutTime}`)}
              {reviewRow('Cancellation', d.cancellationPolicy)}
            </View>
            <View style={styles.addrPinned}>
              <Ionicons name="rocket-outline" size={15} color={colors.primary} />
              <Text style={styles.addrPinnedText}>Publishing makes your listing live and searchable to guests.</Text>
            </View>
          </View>
        );
      }
      default:
        return null;
    }
  }

  function reviewRow(label: string, value: string) {
    return (
      <View key={label} style={styles.reviewRow}>
        <Text style={styles.reviewRowLabel}>{label}</Text>
        <Text style={styles.reviewRowValue} numberOfLines={3}>{value}</Text>
      </View>
    );
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
        <TouchableOpacity style={styles.topPill} onPress={() => { light(); Alert.alert(
          'Need a hand?',
          'Add at least 6 photos, drop your address pin on the map, set a price, then Publish. Tap “Save & exit” anytime to keep a draft.\n\nStill stuck? Email support@stayon.com and we’ll help you get listed.',
          [{ text: 'Got it' }],
        ); }}>
          <Text style={styles.topPillText}>Questions?</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={80}>
        <ScrollView ref={contentRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing['4xl'] }}>
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

        {/* Required hint when this step isn't complete yet */}
        {!!requiredHint && (
          <View style={styles.reqHint}>
            <Ionicons name="alert-circle-outline" size={14} color={colors.warning} />
            <Text style={styles.reqHintText}>{requiredHint}</Text>
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
    h2sub: { fontSize: fontSizes.base, color: colors.textSecondary, lineHeight: 21, marginBottom: spacing.md, ...fonts.regular },
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
    pinBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary, backgroundColor: colors.primarySubtle, marginTop: spacing.md, marginBottom: spacing.sm },
    pinText: { color: colors.primary, fontSize: fontSizes.base, ...fonts.semiBold },
    saveLocBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: spacing.md, borderRadius: borderRadius.lg },
    saveLocText: { color: '#fff', fontSize: fontSizes.base, ...fonts.bold },
    ruleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight },
    ruleLabel: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.medium },
    guestFeeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md, gap: spacing.md },
    guestFeeInput: { minWidth: 90, textAlign: 'right', borderWidth: 1, borderColor: colors.borderLight, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.semiBold },
    timeRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
    guideRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight },
    guideTitle: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.semiBold },
    guideNote: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 2, ...fonts.regular },
    addrSearchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: spacing.base, paddingVertical: spacing.sm, borderRadius: borderRadius.md, borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.card, marginBottom: spacing.sm },
    addrSearchInput: { flex: 1, fontSize: fontSizes.base, color: colors.textPrimary, paddingVertical: 2 },
    addrResults: { borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.card, marginBottom: spacing.sm, overflow: 'hidden' },
    addrResultRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.base, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight },
    addrResultTitle: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.semiBold },
    addrResultSub: { fontSize: fontSizes.sm, color: colors.textTertiary, marginTop: 1, ...fonts.regular },
    addrPinned: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: borderRadius.md, backgroundColor: colors.primarySubtle, marginBottom: spacing.sm },
    addrPinnedText: { flex: 1, fontSize: fontSizes.sm, color: colors.primary, ...fonts.semiBold },
    addrManualHint: { fontSize: fontSizes.sm, color: colors.textTertiary, marginBottom: spacing.sm, ...fonts.regular },
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
    // Per-photo room tag + caption cards
    photoCard: { borderWidth: 1, borderColor: colors.borderLight, borderRadius: borderRadius.lg, padding: spacing.sm, marginTop: spacing.md, backgroundColor: colors.surface },
    photoCardRow: { flexDirection: 'row', gap: spacing.md },
    photoThumb: { width: 84, height: 84, borderRadius: borderRadius.md, backgroundColor: colors.backgroundSecondary },
    photoCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
    photoCardIdx: { fontSize: fontSizes.sm, ...fonts.semiBold, color: colors.textSecondary },
    roomChips: { gap: 6, paddingRight: spacing.sm },
    roomChip: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.background },
    roomChipSel: { backgroundColor: colors.primary, borderColor: colors.primary },
    roomChipText: { fontSize: fontSizes.sm, ...fonts.medium, color: colors.textSecondary },
    roomChipTextSel: { color: '#fff', ...fonts.semiBold },
    captionInput: { marginTop: spacing.sm, borderWidth: 1, borderColor: colors.borderLight, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: fontSizes.sm, color: colors.textPrimary, backgroundColor: colors.background },
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
    reviewList: { marginTop: spacing.md, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.borderLight, overflow: 'hidden' },
    reviewRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, paddingHorizontal: spacing.base, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight },
    reviewRowLabel: { flex: 0.8, fontSize: fontSizes.sm, color: colors.textSecondary, ...fonts.medium },
    reviewRowValue: { flex: 1.4, fontSize: fontSizes.sm, color: colors.textPrimary, ...fonts.semiBold, textAlign: 'right' },
    reviewTitle: { fontSize: fontSizes.lg, color: colors.textPrimary, ...fonts.bold },
    reviewMeta: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 2, ...fonts.regular },
    reviewPrice: { fontSize: fontSizes.base, color: colors.textPrimary, marginTop: spacing.sm, ...fonts.semiBold },
    // progress + footer
    progress: { flexDirection: 'row', gap: 6, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
    segTrack: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.borderLight, overflow: 'hidden' },
    segFill: { height: 4, borderRadius: 2, backgroundColor: colors.primary },
    reqHint: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
    reqHintText: { flex: 1, fontSize: fontSizes.sm, color: colors.warning, ...fonts.medium },
    footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.borderLight, backgroundColor: colors.surface },
    backText: { fontSize: fontSizes.base, color: colors.textPrimary, textDecorationLine: 'underline', ...fonts.semiBold },
    nextBtn: { paddingVertical: spacing.md, paddingHorizontal: spacing.xl, borderRadius: borderRadius.md, alignItems: 'center' },
    nextText: { color: '#fff', fontSize: fontSizes.base, ...fonts.bold },
  });

export default ListingWizardScreen;
