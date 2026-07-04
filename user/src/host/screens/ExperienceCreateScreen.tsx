import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useHaptics } from '../hooks/useHaptics';
import { spacing, borderRadius, fonts } from '../constants';
import { ScreenHeader } from '../components/common';
import { STAYON_GRADIENT } from '../components/GradientButton';
import {
  EXPERIENCE_CATEGORIES, BookingType, Experience,
  saveExperience, screenContent, newExperienceId, getExperience,
} from '../../data/experiences';
import { policySummary, type CancellationTier } from '../../data/cancellationPolicy';
import { getHostProfile } from '../data/hostProfile';

export function ExperienceCreateScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const { light, medium } = useHaptics();
  const s = makeStyles(colors);

  const editId: string | undefined = route?.params?.id;
  const [existingId, setExistingId] = useState<string | undefined>(editId);
  const [createdAt, setCreatedAt] = useState<number | undefined>(undefined);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(EXPERIENCE_CATEGORIES[0].id);
  const [images, setImages] = useState<string[]>([]);
  const [location, setLocation] = useState('');
  const [dateLabel, setDateLabel] = useState('');
  const [durationLabel, setDurationLabel] = useState('');
  const [price, setPrice] = useState('');
  const [capacity, setCapacity] = useState('10');
  const [bookingType, setBookingType] = useState<BookingType>('both');
  const [included, setIncluded] = useState('');
  const [rules, setRules] = useState('');
  const [cancellationPolicy, setCancellationPolicy] = useState<CancellationTier>('Moderate');
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);

  // Prefill when editing an existing experience.
  useEffect(() => {
    if (!editId) return;
    getExperience(editId).then((e) => {
      if (!e) return;
      setExistingId(e.id); setCreatedAt(e.createdAt);
      setTitle(e.title); setDescription(e.description); setCategory(e.category);
      setImages(e.images); setLocation(e.location); setDateLabel(e.dateLabel || '');
      setDurationLabel(e.durationLabel || ''); setPrice(String(e.pricePerPerson || ''));
      setCapacity(String(e.capacity || '')); setBookingType(e.bookingType);
      setIncluded(e.included || ''); setRules(e.rules || '');
      setCancellationPolicy(e.cancellationPolicy || 'Moderate'); setAgreed(true);
    });
  }, [editId]);

  const pickImage = async () => {
    light();
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.8,
    });
    if (!res.canceled) setImages((prev) => [...prev, ...res.assets.map((a) => a.uri)].slice(0, 8));
  };

  const publish = async (status: 'draft' | 'published') => {
    if (!title.trim()) return Alert.alert('Add a title', 'Give your experience a name.');
    if (!description.trim()) return Alert.alert('Add a description', 'Tell guests what your experience is about.');
    const priceNum = Number(price);
    const capNum = Number(capacity);
    if (status === 'published') {
      if (!priceNum || priceNum <= 0) return Alert.alert('Set a price', 'Add a price per person.');
      if (!capNum || capNum <= 0) return Alert.alert('Set capacity', 'How many people can join?');
      if (!agreed) return Alert.alert('Confirm the rules', 'Please confirm your experience is legal, safe and appropriate.');
    }
    // Content moderation — block disallowed content.
    const check = screenContent(title, description, included);
    if (!check.ok) return Alert.alert('Not allowed', check.reason);

    setSaving(true);
    const profile = await getHostProfile().catch(() => null);
    const exp: Experience = {
      id: existingId || newExperienceId(),
      title: title.trim(),
      description: description.trim(),
      category,
      images: images.length ? images : ['https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&h=900&fit=crop&q=80'],
      location: location.trim(),
      dateLabel: dateLabel.trim() || undefined,
      durationLabel: durationLabel.trim() || undefined,
      pricePerPerson: priceNum || 0,
      capacity: capNum || 0,
      bookingType,
      included: included.trim() || undefined,
      rules: rules.trim() || undefined,
      cancellationPolicy,
      hostName: profile?.name || 'StayOn Host',
      status,
      createdAt: createdAt || Date.now(),
    };
    try {
      await saveExperience(exp);
      medium();
      Alert.alert(status === 'published' ? 'Published 🎉' : 'Saved as draft', status === 'published' ? 'Your experience is now live for guests.' : 'You can publish it any time.');
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader title="New experience" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['4xl'] }}>
        {/* Cover images */}
        <Text style={s.label}>Photos</Text>
        <View style={s.imageRow}>
          {images.map((uri, i) => (
            <View key={i} style={s.thumbWrap}>
              <Image source={{ uri }} style={s.thumb} />
              <TouchableOpacity style={s.thumbX} onPress={() => setImages(images.filter((_, j) => j !== i))}>
                <Ionicons name="close" size={14} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={s.addImage} onPress={pickImage} accessibilityLabel="Add photos">
            <Ionicons name="camera-outline" size={22} color={colors.primary} />
            <Text style={s.addImageText}>Add</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.label}>Title</Text>
        {input(s, title, setTitle, 'e.g. Rooftop Live Music Night', colors)}

        <Text style={s.label}>Category</Text>
        <View style={s.chipWrap}>
          {EXPERIENCE_CATEGORIES.map((c) => {
            const sel = category === c.id;
            return (
              <TouchableOpacity key={c.id} onPress={() => { light(); setCategory(c.id); }}
                style={[s.chip, sel && { backgroundColor: colors.primarySubtle, borderColor: colors.primary }]}>
                <Ionicons name={c.icon as any} size={14} color={sel ? colors.primary : colors.textSecondary} />
                <Text style={[s.chipText, { color: sel ? colors.primary : colors.textSecondary }]}>{c.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={s.label}>Description</Text>
        {input(s, description, setDescription, 'What will guests do and experience?', colors, true)}

        <Text style={s.label}>Location</Text>
        {input(s, location, setLocation, 'City / venue', colors)}

        <View style={s.row2}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>When</Text>
            {input(s, dateLabel, setDateLabel, 'Sat, Jul 12 · 7 PM', colors)}
          </View>
          <View style={{ width: spacing.md }} />
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Duration</Text>
            {input(s, durationLabel, setDurationLabel, '2 hours', colors)}
          </View>
        </View>

        <View style={s.row2}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Price / person (USD)</Text>
            {input(s, price, setPrice, '25', colors, false, 'numeric')}
          </View>
          <View style={{ width: spacing.md }} />
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Capacity (max people)</Text>
            {input(s, capacity, setCapacity, '10', colors, false, 'numeric')}
          </View>
        </View>

        <Text style={s.label}>Who can book?</Text>
        <View style={s.chipWrap}>
          {([['individual', 'Individuals'], ['group', 'Groups'], ['both', 'Both']] as [BookingType, string][]).map(([v, lbl]) => {
            const sel = bookingType === v;
            return (
              <TouchableOpacity key={v} onPress={() => { light(); setBookingType(v); }}
                style={[s.chip, sel && { backgroundColor: colors.primarySubtle, borderColor: colors.primary }]}>
                <Text style={[s.chipText, { color: sel ? colors.primary : colors.textSecondary }]}>{lbl}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={s.label}>What's included (optional)</Text>
        {input(s, included, setIncluded, 'e.g. Entry, one drink, seating', colors, true)}

        <Text style={s.label}>Rules & guidelines (optional)</Text>
        {input(s, rules, setRules, 'e.g. 18+ only, arrive 15 min early, no outside food', colors, true)}

        <Text style={s.label}>Cancellation policy</Text>
        <View style={s.chipWrap}>
          {(['Flexible', 'Moderate', 'Strict'] as CancellationTier[]).map((p) => {
            const sel = cancellationPolicy === p;
            return (
              <TouchableOpacity key={p} onPress={() => { light(); setCancellationPolicy(p); }}
                style={[s.chip, sel && { backgroundColor: colors.primarySubtle, borderColor: colors.primary }]}>
                <Text style={[s.chipText, { color: sel ? colors.primary : colors.textSecondary }]}>{p}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={s.policyHint}>{policySummary(cancellationPolicy)}</Text>

        {/* Content agreement */}
        <TouchableOpacity style={s.agreeRow} onPress={() => { light(); setAgreed(!agreed); }} activeOpacity={0.8}>
          <View style={[s.checkbox, { borderColor: agreed ? colors.primary : colors.textTertiary, backgroundColor: agreed ? colors.primary : 'transparent' }]}>
            {agreed && <Ionicons name="checkmark" size={14} color="#fff" />}
          </View>
          <Text style={s.agreeText}>
            I confirm this experience is legal, safe and appropriate — no drugs, weapons, or illegal/confidential activities.
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={[s.footer, { borderTopColor: colors.borderLight, backgroundColor: colors.background }]}>
        <TouchableOpacity style={s.draftBtn} onPress={() => publish('draft')} disabled={saving}>
          <Text style={[s.draftText, { color: colors.textPrimary }]}>Save draft</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ flex: 1 }} onPress={() => publish('published')} disabled={saving} activeOpacity={0.9}>
          <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.publishBtn}>
            <Text style={s.publishText}>{saving ? 'Saving…' : 'Publish'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function input(
  s: any, value: string, onChange: (t: string) => void, placeholder: string,
  colors: any, multiline = false, keyboardType: any = 'default',
) {
  return (
    <TextInput
      style={[s.input, multiline && s.inputMultiline]}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={colors.textTertiary}
      multiline={multiline}
      keyboardType={keyboardType}
    />
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1 },
    label: { fontSize: 14, ...fonts.semiBold, color: colors.textPrimary, marginTop: spacing.lg, marginBottom: spacing.xs },
    input: {
      backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderLight, borderRadius: borderRadius.lg,
      paddingHorizontal: spacing.base, paddingVertical: spacing.md, fontSize: 15, color: colors.textPrimary, ...fonts.regular,
    },
    inputMultiline: { minHeight: 90, textAlignVertical: 'top' },
    row2: { flexDirection: 'row' },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    chip: {
      flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
      borderRadius: 999, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.card,
    },
    chipText: { fontSize: 13, ...fonts.medium },
    policyHint: { fontSize: 13, ...fonts.regular, color: colors.textSecondary, marginTop: spacing.xs },
    imageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    thumbWrap: { width: 84, height: 84, borderRadius: borderRadius.lg, overflow: 'hidden' },
    thumb: { width: '100%', height: '100%' },
    thumbX: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 10, padding: 2 },
    addImage: {
      width: 84, height: 84, borderRadius: borderRadius.lg, borderWidth: 1.5, borderStyle: 'dashed',
      borderColor: colors.primary, alignItems: 'center', justifyContent: 'center', gap: 2,
    },
    addImageText: { fontSize: 12, ...fonts.medium, color: colors.primary },
    agreeRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl, alignItems: 'flex-start' },
    checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
    agreeText: { flex: 1, fontSize: 13, ...fonts.regular, color: colors.textSecondary, lineHeight: 19 },
    footer: { flexDirection: 'row', gap: spacing.md, padding: spacing.lg, borderTopWidth: 1 },
    draftBtn: { paddingHorizontal: spacing.lg, justifyContent: 'center', borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.borderLight },
    draftText: { fontSize: 15, ...fonts.semiBold },
    publishBtn: { paddingVertical: spacing.md + 2, borderRadius: borderRadius.lg, alignItems: 'center' },
    publishText: { fontSize: 16, ...fonts.bold, color: '#fff' },
  });
}

export default ExperienceCreateScreen;
