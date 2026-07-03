import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useHaptics } from '../hooks/useHaptics';
import { confirmAction } from '../utils/confirm';
import { fonts, fontSizes, spacing, borderRadius, letterSpacing } from '../constants';
import { ScreenHeader } from '../components/common';
import { STAYON_GRADIENT } from '../components/GradientButton';
import { getReservations, setReservationStatus, type HostReservation } from '../data/reservations';
import { addDamage } from '../data/maintenance';

const CHECKLIST = ['Keys / access returned', 'Property inspected', 'No items left behind', 'Appliances off & secure'];

export function CheckoutScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const { light, success } = useHaptics();
  const styles = makeStyles(colors);
  const id = route?.params?.id;
  const [r, setR] = useState<HostReservation | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [reportOpen, setReportOpen] = useState(false);
  const [note, setNote] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      (async () => {
        const res = await getReservations();
        if (active) setR(res.find((x) => x.id === id) ?? null);
      })();
      return () => { active = false; };
    }, [id])
  );

  const toggle = (k: string) => { light(); setDone((p) => { const n = new Set(p); n.has(k) ? n.delete(k) : n.add(k); return n; }); };

  const addPhotos = async () => {
    light();
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.85 });
    if (!res.canceled) setPhotos((p) => [...p, ...res.assets.map((a) => a.uri)].slice(0, 6));
  };

  const ready = done.size === CHECKLIST.length;

  const complete = () => {
    const hasReport = reportOpen && (note.trim().length > 0 || photos.length > 0);
    confirmAction({
      title: 'Complete checkout?',
      message: hasReport
        ? 'A damage report will be attached to this reservation and the booking marked completed.'
        : 'This booking will be marked completed. You can leave a guest review next.',
      confirmText: 'Complete checkout',
      onConfirm: async () => {
        success();
        if (hasReport && r) {
          await addDamage({ reservationId: r.id, guestName: r.guestName, listingTitle: r.listingTitle, note: note.trim(), photos });
        }
        await setReservationStatus(id, 'completed');
        navigation.goBack();
      },
    });
  };

  if (!r) return <SafeAreaView style={styles.container} edges={['top']}><ScreenHeader title="Checkout" onBack={() => navigation.goBack()} /></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Checkout" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['4xl'] }}>
        <View style={styles.guestRow}>
          <Image source={{ uri: r.guestAvatar }} style={styles.avatar} contentFit="cover" />
          <View style={{ flex: 1 }}>
            <Text style={styles.guest}>{r.guestName}</Text>
            <Text style={styles.sub}>Checking out {r.checkOut} · {r.listingTitle}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Checkout checklist</Text>
        <View style={styles.card}>
          {CHECKLIST.map((c, i) => (
            <TouchableOpacity key={c} style={[styles.checkRow, i < CHECKLIST.length - 1 && styles.divider]} onPress={() => toggle(c)}>
              <Ionicons name={done.has(c) ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={done.has(c) ? colors.success : colors.textTertiary} />
              <Text style={[styles.checkText, done.has(c) && styles.checkDone]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Damage report (optional) */}
        <TouchableOpacity style={styles.reportToggle} activeOpacity={0.8} onPress={() => { light(); setReportOpen((o) => !o); }}>
          <Ionicons name="alert-circle-outline" size={20} color={colors.warning} />
          <View style={{ flex: 1 }}>
            <Text style={styles.reportTitle}>Report damage</Text>
            <Text style={styles.reportSub}>Optional — only if something needs attention</Text>
          </View>
          <Ionicons name={reportOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textTertiary} />
        </TouchableOpacity>

        {reportOpen && (
          <View style={styles.reportBody}>
            <TextInput style={styles.input} placeholder="Describe what you found…" placeholderTextColor={colors.textTertiary} value={note} onChangeText={setNote} multiline textAlignVertical="top" />
            <View style={styles.photoGrid}>
              {photos.map((uri) => (
                <View key={uri} style={styles.photoWrap}>
                  <Image source={{ uri }} style={styles.photo} contentFit="cover" />
                  <TouchableOpacity style={styles.photoX} onPress={() => { light(); setPhotos((p) => p.filter((x) => x !== uri)); }}>
                    <Ionicons name="close" size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
              {photos.length < 6 && (
                <TouchableOpacity style={styles.addPhoto} onPress={addPhotos}>
                  <Ionicons name="camera-outline" size={22} color={colors.textSecondary} />
                  <Text style={styles.addPhotoText}>Add photo</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.note}>StayOn takes 0% — any agreed reimbursement is settled directly between you and the guest.</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={0.9} disabled={!ready} onPress={complete}>
          <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.send, !ready && { opacity: 0.5 }]}>
            <Ionicons name="checkmark-done-outline" size={18} color="#fff" />
            <Text style={styles.sendText}>Complete checkout</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    guestRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.backgroundSecondary },
    guest: { fontSize: fontSizes.lg, letterSpacing: letterSpacing.snug, color: colors.textPrimary, ...fonts.bold },
    sub: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 2, ...fonts.regular },
    sectionTitle: { fontSize: fontSizes.lg, letterSpacing: letterSpacing.snug, color: colors.textPrimary, marginTop: spacing.xl, marginBottom: spacing.sm, ...fonts.bold },
    card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderLight, borderRadius: borderRadius.lg, padding: spacing.base },
    checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
    divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight },
    checkText: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.medium },
    checkDone: { color: colors.textSecondary, textDecorationLine: 'line-through' },
    reportToggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.lg, padding: spacing.base, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderLight, borderRadius: borderRadius.lg },
    reportTitle: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.semiBold },
    reportSub: { fontSize: fontSizes.xs, color: colors.textTertiary, marginTop: 1, ...fonts.regular },
    reportBody: { marginTop: spacing.md },
    input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderLight, borderRadius: borderRadius.md, padding: spacing.base, minHeight: 90, fontSize: fontSizes.base, color: colors.textPrimary },
    photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
    photoWrap: { width: 88, height: 88, borderRadius: borderRadius.md, overflow: 'hidden' },
    photo: { width: '100%', height: '100%', backgroundColor: colors.backgroundSecondary },
    photoX: { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
    addPhoto: { width: 88, height: 88, borderRadius: borderRadius.md, borderWidth: 1.5, borderColor: colors.borderLight, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 2 },
    addPhotoText: { fontSize: fontSizes.xs, color: colors.textSecondary, ...fonts.medium },
    note: { fontSize: fontSizes.sm, color: colors.textTertiary, marginTop: spacing.md, ...fonts.regular },
    footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.borderLight, backgroundColor: colors.surface },
    send: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: spacing.base, borderRadius: borderRadius.lg },
    sendText: { color: '#fff', fontSize: fontSizes.md, ...fonts.bold },
  });

export default CheckoutScreen;
