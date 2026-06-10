import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Api } from '../../api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useHaptics } from '../hooks/useHaptics';
import { fonts, fontSizes, spacing, borderRadius, letterSpacing } from '../constants';
import { withOpacity } from '../utils/color';
import { ScreenHeader } from '../components/common';
import { STAYON_GRADIENT } from '../components/GradientButton';
import { getIdentity, saveIdentity, type Identity } from '../data/account';

const ID_TYPES: { key: Identity['idType']; label: string; icon: any }[] = [
  { key: 'passport', label: 'Passport', icon: 'airplane-outline' },
  { key: 'driving_license', label: 'Driving licence', icon: 'car-outline' },
  { key: 'national_id', label: 'National ID', icon: 'id-card-outline' },
];

export function IdentityVerificationScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { light, success } = useHaptics();
  const styles = makeStyles(colors);

  const [ident, setIdent] = useState<Identity | null>(null);
  const [legalName, setLegalName] = useState('');
  const [dob, setDob] = useState('');
  const [country, setCountry] = useState('');
  const [idType, setIdType] = useState<Identity['idType']>('');
  const [idNumber, setIdNumber] = useState('');
  const [docFront, setDocFront] = useState<string | null>(null);
  const [docBack, setDocBack] = useState<string | null>(null);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      getIdentity().then((i) => {
        if (!active) return;
        setIdent(i);
        if (i.status !== 'unverified') {
          setLegalName(i.legalName); setDob(i.dob); setCountry(i.country); setIdType(i.idType); setIdNumber(i.idLast4);
        }
      });
      return () => { active = false; };
    }, [])
  );

  const pickDoc = async (which: 'front' | 'back' | 'selfie') => {
    light();
    // Selfie → camera (front-facing); ID docs → gallery.
    if (which === 'selfie') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { Alert.alert('Camera needed', 'Allow camera access to take a verification selfie.'); return; }
      const res = await ImagePicker.launchCameraAsync({ cameraType: ImagePicker.CameraType.front, quality: 0.85 });
      if (!res.canceled) setSelfie(res.assets[0].uri);
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (!res.canceled) (which === 'front' ? setDocFront : setDocBack)(res.assets[0].uri);
  };

  // Upload a local image to Supabase Storage → permanent URL (for the Ops review card).
  const uploadOne = async (uri: string | null): Promise<string | null> => {
    if (!uri) return null;
    if (/^https?:/.test(uri)) return uri;
    try {
      const r = await fetch(uri); const blob = await r.blob();
      const b64: string = await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1] || ''); fr.onerror = () => res(''); fr.readAsDataURL(blob); });
      if (!b64) return null;
      const up = await Api.media.upload(b64, 'image/jpeg');
      return up?.url || null;
    } catch { return null; }
  };

  const locked = ident?.status === 'verified' || ident?.status === 'pending';
  const needsBack = idType !== 'passport';
  const canSubmit = legalName.trim().length > 2 && dob.trim().length >= 8 && country.trim() && idType && idNumber.trim().length >= 4 && docFront && (!needsBack || docBack);

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    // Submit to the backend FIRST — it enforces one person = one identity and
    // rejects an ID already linked to another account.
    try {
      await Api.auth.ensureSession();
      // Upload the ID photos + selfie to cloud storage, then submit with the URLs
      // so the Ops reviewer can visually verify the person.
      const [docFrontUrl, docBackUrl, selfieUrl] = await Promise.all([uploadOne(docFront), uploadOne(docBack), uploadOne(selfie)]);
      await Api.identity.submit({ legalName: legalName.trim(), idType, idNumber: idNumber.trim(), dob: dob.trim(), docFront: docFrontUrl, docBack: docBackUrl, selfie: selfieUrl });
    } catch (e: any) {
      setSubmitting(false);
      if (e?.code === 'IDENTITY_IN_USE') {
        Alert.alert('This ID is already in use', 'This government ID is already linked to another StayOn account. One person can hold only one account — you can’t verify the same ID on a second number.');
        return;
      }
      // network/other error — fall through to local save so the host isn't blocked offline
    }
    success();
    const next = await saveIdentity({
      status: 'pending', legalName: legalName.trim(), dob: dob.trim(), country: country.trim(),
      idType, idLast4: idNumber.trim().slice(-4), submittedAt: 'just now',
    });
    setIdent(next);
    setSubmitting(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Identity & verification" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['4xl'] }}>

        {/* Status banner */}
        {locked && (
          <View style={[styles.banner, ident?.status === 'verified' ? styles.bannerOk : styles.bannerPending]}>
            <Ionicons name={ident?.status === 'verified' ? 'shield-checkmark' : 'time-outline'} size={22} color={ident?.status === 'verified' ? colors.success : colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>{ident?.status === 'verified' ? 'Identity verified' : 'Verification in review'}</Text>
              <Text style={styles.bannerSub}>
                {ident?.status === 'verified'
                  ? 'Your legal identity is confirmed and locked. To change it, contact support.'
                  : 'We’re reviewing your documents. This usually takes a few minutes to 24 hours.'}
              </Text>
            </View>
          </View>
        )}

        {!locked && (
          <Text style={styles.lead}>Verify your identity once to start hosting. Your legal name and documents are encrypted and can’t be edited afterwards — only your public profile stays editable.</Text>
        )}

        {/* Legal name */}
        <Text style={styles.label}>Legal name (as on your ID)</Text>
        <TextInput style={[styles.input, locked && styles.inputLocked]} value={legalName} onChangeText={setLegalName} editable={!locked} placeholder="Full legal name" placeholderTextColor={colors.textTertiary} />

        <Text style={styles.label}>Date of birth</Text>
        <TextInput style={[styles.input, locked && styles.inputLocked]} value={dob} onChangeText={setDob} editable={!locked} placeholder="YYYY‑MM‑DD" placeholderTextColor={colors.textTertiary} />

        <Text style={styles.label}>Country of residence</Text>
        <TextInput style={[styles.input, locked && styles.inputLocked]} value={country} onChangeText={setCountry} editable={!locked} placeholder="e.g. India" placeholderTextColor={colors.textTertiary} />

        {/* ID type */}
        <Text style={styles.label}>Document type</Text>
        <View style={styles.typeRow}>
          {ID_TYPES.map((t) => {
            const active = idType === t.key;
            return (
              <TouchableOpacity key={t.key} disabled={locked} style={[styles.typeCard, active && styles.typeCardActive, locked && { opacity: 0.6 }]} onPress={() => { light(); setIdType(t.key); }}>
                <Ionicons name={t.icon} size={22} color={active ? colors.primary : colors.textSecondary} />
                <Text style={[styles.typeLabel, active && { color: colors.primary }]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Document number</Text>
        <TextInput style={[styles.input, locked && styles.inputLocked]} value={idNumber} onChangeText={setIdNumber} editable={!locked} placeholder={locked ? `•••• ${ident?.idLast4}` : 'Document number'} placeholderTextColor={colors.textTertiary} autoCapitalize="characters" />

        {/* Document upload */}
        {!locked && (
          <>
            <Text style={styles.label}>Upload document</Text>
            <View style={styles.docRow}>
              <TouchableOpacity style={styles.docCard} onPress={() => pickDoc('front')}>
                {docFront ? <Ionicons name="checkmark-circle" size={26} color={colors.success} /> : <Ionicons name="camera-outline" size={26} color={colors.textSecondary} />}
                <Text style={styles.docText}>{docFront ? 'Front added' : 'Front side'}</Text>
              </TouchableOpacity>
              {needsBack && (
                <TouchableOpacity style={styles.docCard} onPress={() => pickDoc('back')}>
                  {docBack ? <Ionicons name="checkmark-circle" size={26} color={colors.success} /> : <Ionicons name="camera-outline" size={26} color={colors.textSecondary} />}
                  <Text style={styles.docText}>{docBack ? 'Back added' : 'Back side'}</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.label}>Selfie (face the camera)</Text>
            <TouchableOpacity style={styles.docCard} onPress={() => pickDoc('selfie')}>
              {selfie ? <Ionicons name="checkmark-circle" size={26} color={colors.success} /> : <Ionicons name="happy-outline" size={26} color={colors.textSecondary} />}
              <Text style={styles.docText}>{selfie ? 'Selfie added' : 'Add a selfie'}</Text>
            </TouchableOpacity>
            <View style={styles.privacy}>
              <Ionicons name="lock-closed-outline" size={14} color={colors.textTertiary} />
              <Text style={styles.privacyText}>Your documents are encrypted and only used for verification. StayOn never shares them with guests.</Text>
            </View>
          </>
        )}
      </ScrollView>

      {!locked && (
        <View style={styles.footer}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={0.9} disabled={!canSubmit || submitting} onPress={submit}>
            <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.submit, (!canSubmit || submitting) && { opacity: 0.5 }]}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#fff" />
              <Text style={styles.submitText}>{submitting ? 'Submitting…' : 'Submit for verification'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    banner: { flexDirection: 'row', gap: spacing.md, padding: spacing.base, borderRadius: borderRadius.lg, borderWidth: 1, marginBottom: spacing.lg },
    bannerOk: { backgroundColor: colors.primarySubtle, borderColor: withOpacity(colors.success, 0.3) },
    bannerPending: { backgroundColor: colors.goldLight, borderColor: withOpacity(colors.warning, 0.3) },
    bannerTitle: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.bold },
    bannerSub: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 2, lineHeight: 19, ...fonts.regular },
    lead: { fontSize: fontSizes.base, color: colors.textSecondary, lineHeight: 22, marginBottom: spacing.md, ...fonts.regular },
    label: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: spacing.lg, marginBottom: 6, ...fonts.semiBold },
    input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderLight, borderRadius: borderRadius.md, paddingHorizontal: spacing.base, paddingVertical: spacing.md, fontSize: fontSizes.base, color: colors.textPrimary },
    inputLocked: { backgroundColor: colors.backgroundSecondary, color: colors.textSecondary },
    typeRow: { flexDirection: 'row', gap: spacing.sm },
    typeCard: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: spacing.base, borderRadius: borderRadius.md, borderWidth: 1.5, borderColor: colors.borderLight, backgroundColor: colors.card },
    typeCardActive: { borderColor: colors.primary, backgroundColor: colors.primarySubtle },
    typeLabel: { fontSize: fontSizes.xs, color: colors.textSecondary, textAlign: 'center', ...fonts.semiBold },
    docRow: { flexDirection: 'row', gap: spacing.sm },
    docCard: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, height: 96, borderRadius: borderRadius.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.borderLight, backgroundColor: colors.card },
    docText: { fontSize: fontSizes.sm, color: colors.textSecondary, ...fonts.medium },
    privacy: { flexDirection: 'row', gap: 6, marginTop: spacing.md, alignItems: 'flex-start' },
    privacyText: { flex: 1, fontSize: fontSizes.xs, color: colors.textTertiary, lineHeight: 17, ...fonts.regular },
    footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.borderLight, backgroundColor: colors.surface },
    submit: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: spacing.base, borderRadius: borderRadius.lg },
    submitText: { color: '#fff', fontSize: fontSizes.md, ...fonts.bold },
  });

export default IdentityVerificationScreen;
