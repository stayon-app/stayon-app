import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useHaptics } from '../hooks/useHaptics';
import { confirmAction } from '../utils/confirm';
import { fonts, fontSizes, spacing, borderRadius, letterSpacing } from '../constants';
import { withOpacity } from '../utils/color';
import { ScreenHeader } from '../components/common';
import { STAYON_GRADIENT } from '../components/GradientButton';
import { getReservations, type HostReservation } from '../data/reservations';
import { getListings, type HostListing } from '../data/listings';

const CHECKLIST = ['Cleaned & tidy', 'Fresh linens', 'Toiletries stocked', 'Wi‑Fi tested', 'Heating / AC set', 'Lights working'];

export function CheckInPrepScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const { light, success } = useHaptics();
  const styles = makeStyles(colors);
  const id = route?.params?.id;
  const [r, setR] = useState<HostReservation | null>(null);
  const [listing, setListing] = useState<HostListing | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [code, setCode] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      (async () => {
        const [res, ls] = await Promise.all([getReservations(), getListings()]);
        if (!active) return;
        const rv = res.find((x) => x.id === id) ?? null;
        setR(rv);
        setListing(ls.find((l) => l.id === rv?.listingId) ?? null);
      })();
      return () => { active = false; };
    }, [id])
  );

  const toggle = (k: string) => { light(); setDone((p) => { const n = new Set(p); n.has(k) ? n.delete(k) : n.add(k); return n; }); };
  const ready = done.size === CHECKLIST.length;

  const sendDetails = () => {
    confirmAction({
      title: 'Send check‑in details?', message: `We’ll message ${r?.guestName?.split(' ')[0] ?? 'your guest'} the address, access ${code ? 'code' : 'instructions'} and arrival time.`,
      confirmText: 'Send', onConfirm: () => { success(); navigation.goBack(); },
    });
  };

  if (!r) return <SafeAreaView style={styles.container} edges={['top']}><ScreenHeader title="Check‑in prep" onBack={() => navigation.goBack()} /></SafeAreaView>;

  const address = listing ? [listing.address, listing.area, listing.city, listing.state, listing.zipcode].filter(Boolean).join(', ') : r.listingTitle;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Check‑in prep" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['4xl'] }}>
        {/* Guest */}
        <View style={styles.guestRow}>
          <Image source={{ uri: r.guestAvatar }} style={styles.avatar} contentFit="cover" />
          <View style={{ flex: 1 }}>
            <Text style={styles.guest}>{r.guestName}</Text>
            <Text style={styles.sub}>Check‑in {r.checkIn} · {listing?.checkInTime ?? '3:00 PM'} · {r.guests} guests</Text>
          </View>
        </View>

        {/* Checklist */}
        <Text style={styles.sectionTitle}>Get the place ready</Text>
        <View style={styles.card}>
          {CHECKLIST.map((c, i) => (
            <TouchableOpacity key={c} style={[styles.checkRow, i < CHECKLIST.length - 1 && styles.divider]} onPress={() => toggle(c)}>
              <Ionicons name={done.has(c) ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={done.has(c) ? colors.success : colors.textTertiary} />
              <Text style={[styles.checkText, done.has(c) && styles.checkDone]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Access */}
        <Text style={styles.sectionTitle}>Access details</Text>
        <View style={styles.card}>
          <View style={styles.kv}><Ionicons name="location-outline" size={16} color={colors.primary} /><Text style={styles.kvText}>{address}</Text></View>
          <View style={[styles.kv, styles.divider2]}><Ionicons name="key-outline" size={16} color={colors.primary} /><Text style={styles.kvText}>Self check‑in · enter the code below</Text></View>
          <Text style={styles.label}>Smart‑lock / door code</Text>
          <TextInput style={styles.input} value={code} onChangeText={setCode} placeholder="e.g. 5847" placeholderTextColor={colors.textTertiary} keyboardType="number-pad" />
        </View>
        <Text style={styles.note}>The exact address is shared with the guest only after the booking is confirmed.</Text>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={0.9} disabled={!ready} onPress={sendDetails}>
          <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.send, !ready && { opacity: 0.5 }]}>
            <Ionicons name="paper-plane-outline" size={18} color="#fff" />
            <Text style={styles.sendText}>Send check‑in details</Text>
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
    kv: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: spacing.sm },
    divider2: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderLight },
    kvText: { flex: 1, fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.regular },
    label: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: spacing.md, marginBottom: 6, ...fonts.semiBold },
    input: { backgroundColor: colors.backgroundSecondary, borderRadius: borderRadius.md, paddingHorizontal: spacing.base, paddingVertical: spacing.md, fontSize: fontSizes.base, color: colors.textPrimary },
    note: { fontSize: fontSizes.sm, color: colors.textTertiary, marginTop: spacing.md, ...fonts.regular },
    footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.borderLight, backgroundColor: colors.surface },
    send: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: spacing.base, borderRadius: borderRadius.lg },
    sendText: { color: '#fff', fontSize: fontSizes.md, ...fonts.bold },
  });

export default CheckInPrepScreen;
