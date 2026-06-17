import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, Modal, FlatList,
  KeyboardAvoidingView, Platform, Pressable, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useAuth } from '../contexts/AuthContext';
import { useHaptics } from '../hooks/useHaptics';
import { fonts, fontSizes, spacing, borderRadius, letterSpacing } from '../constants';
import { COUNTRIES, DEFAULT_COUNTRY, flagImageUrl, type Country } from '../constants/countries';
import { STAYON_GRADIENT } from '../components/GradientButton';
import { CURRENCIES, getCurrencyByCountry } from '../utils/currency';

export function HostLoginScreen() {
  const { colors } = useTheme();
  const { setCurrencyByDialCode } = useCurrency();
  const { loginWithPhone } = useAuth();
  const { light, success } = useHaptics();
  const styles = makeStyles(colors);

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [country, setCountry] = useState<Country>(
    COUNTRIES.find((c) => c.code === DEFAULT_COUNTRY.code) ?? DEFAULT_COUNTRY
  );
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const otpRef = useRef<TextInput>(null);

  const currencyForCountry = getCurrencyByCountry(country.code);

  const continueToOtp = () => {
    if (phone.replace(/\D/g, '').length < 6) return;
    light();
    setStep('otp');
    setTimeout(() => otpRef.current?.focus(), 200);
  };

  const verify = async () => {
    if (otp.length < 4) return;
    success();
    // Country drives the currency & number/date formats across the app.
    setCurrencyByDialCode(country.dialCode);
    await loginWithPhone(phone, country.dialCode, country.code);
  };

  const filtered = search.trim()
    ? COUNTRIES.filter((c) =>
        c.name.toLowerCase().includes(search.trim().toLowerCase()) ||
        c.dialCode.includes(search.trim()))
    : COUNTRIES;

  return (
    <View style={styles.root}>
      <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollBody}>
          {/* Brand */}
          <View style={styles.brandWrap}>
            <Text style={styles.brand}>StayOn <Text style={styles.brandPill}>HOST</Text></Text>
            <Text style={styles.tagline}>Sign in to manage your listings, calendar and earnings.</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            {step === 'phone' ? (
              <>
                <Text style={styles.cardTitle}>Enter your phone number</Text>
                <Text style={styles.cardSub}>We’ll text you a code to confirm it’s you.</Text>

                <View style={styles.phoneRow}>
                  <TouchableOpacity style={styles.countryBtn} onPress={() => { light(); setPickerOpen(true); }}>
                    <Image source={{ uri: flagImageUrl(country.code) }} style={styles.flagImg} contentFit="cover" />
                    <Text style={styles.dial}>{country.dialCode}</Text>
                    <Ionicons name="chevron-down" size={15} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <TextInput
                    style={styles.phoneInput}
                    value={phone}
                    onChangeText={(t) => setPhone(t.replace(/[^\d]/g, ''))}
                    placeholder="Phone number"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="phone-pad"
                    maxLength={15}
                    autoFocus
                  />
                </View>

                <View style={styles.curNote}>
                  <Ionicons name="cash-outline" size={14} color={colors.primary} />
                  <Text style={styles.curNoteText}>
                    Prices and dates will show in {country.name} format · {currencyForCountry.code} {currencyForCountry.symbol}
                  </Text>
                </View>

                <TouchableOpacity activeOpacity={0.9} onPress={continueToOtp} disabled={phone.replace(/\D/g, '').length < 6}>
                  <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.cta, phone.replace(/\D/g, '').length < 6 && { opacity: 0.5 }]}>
                    <Text style={styles.ctaText}>Continue</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity style={styles.backRow} onPress={() => { light(); setStep('phone'); setOtp(''); }}>
                  <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
                  <Text style={styles.backText}>Change number</Text>
                </TouchableOpacity>
                <Text style={styles.cardTitle}>Enter the code</Text>
                <Text style={styles.cardSub}>Sent to {country.dialCode} {phone}</Text>

                <Pressable style={styles.otpRow} onPress={() => otpRef.current?.focus()}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <View key={i} style={[styles.otpBox, otp.length === i && styles.otpBoxActive]}>
                      <Text style={styles.otpDigit}>{otp[i] ?? ''}</Text>
                    </View>
                  ))}
                </Pressable>
                <TextInput
                  ref={otpRef}
                  style={styles.hiddenInput}
                  value={otp}
                  onChangeText={(t) => setOtp(t.replace(/[^\d]/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                  caretHidden
                />

                <TouchableOpacity activeOpacity={0.9} onPress={verify} disabled={otp.length < 4}>
                  <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.cta, otp.length < 4 && { opacity: 0.5 }]}>
                    <Text style={styles.ctaText}>Verify & continue</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <Text style={styles.resend}>Didn’t get it? <Text style={styles.resendLink}>Resend code</Text></Text>
              </>
            )}
          </View>

          <Text style={styles.legal}>By continuing you agree to StayOn’s Host Terms and Privacy Policy.</Text>
        </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Country picker */}
      <Modal visible={pickerOpen} animationType="slide" transparent onRequestClose={() => setPickerOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Select your country</Text>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={18} color={colors.textTertiary} />
              <TextInput style={styles.searchInput} value={search} onChangeText={setSearch} placeholder="Search country or code" placeholderTextColor={colors.textTertiary} />
            </View>
            <FlatList
              data={filtered}
              keyExtractor={(c) => c.code}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const cur = CURRENCIES[getCurrencyByCountry(item.code).code];
                return (
                  <TouchableOpacity style={styles.countryRow} onPress={() => { light(); setCountry(item); setPickerOpen(false); setSearch(''); }}>
                    <Image source={{ uri: flagImageUrl(item.code) }} style={styles.rowFlagImg} contentFit="cover" />
                    <Text style={styles.rowName}>{item.name}</Text>
                    <Text style={styles.rowDial}>{item.dialCode}</Text>
                    <Text style={styles.rowCur}>{cur?.symbol}</Text>
                    {country.code === item.code && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                  </TouchableOpacity>
                );
              }}
            />
            <TouchableOpacity style={styles.modalClose} onPress={() => { setPickerOpen(false); setSearch(''); }}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    root: { flex: 1, width: '100%', backgroundColor: '#0D9488' },
    safe: { flex: 1, width: '100%', paddingHorizontal: spacing.lg },
    scrollBody: { flexGrow: 1, justifyContent: 'center', paddingVertical: spacing.xl },
    brandWrap: { marginBottom: spacing.xl },
    brand: { fontSize: fontSizes['3xl'], color: '#fff', ...fonts.bold },
    brandPill: { fontSize: fontSizes.sm, letterSpacing: 3, color: '#E9D5FF', ...fonts.bold },
    tagline: { fontSize: fontSizes.base, color: 'rgba(255,255,255,0.9)', marginTop: spacing.sm, lineHeight: 22, ...fonts.regular },
    card: { backgroundColor: colors.card, borderRadius: borderRadius.xl, padding: spacing.xl },
    cardTitle: { fontSize: fontSizes.xl, letterSpacing: letterSpacing.tight, color: colors.textPrimary, ...fonts.bold },
    cardSub: { fontSize: fontSizes.base, color: colors.textSecondary, marginTop: 4, marginBottom: spacing.lg, ...fonts.regular },
    phoneRow: { flexDirection: 'row', gap: spacing.sm },
    countryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.base, height: 52, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.backgroundSecondary },
    flagImg: { width: 26, height: 19, borderRadius: 3, backgroundColor: colors.borderLight },
    dial: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.semiBold },
    phoneInput: { flex: 1, height: 52, paddingHorizontal: spacing.base, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.borderLight, fontSize: fontSizes.md, color: colors.textPrimary, backgroundColor: colors.backgroundSecondary },
    curNote: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md, marginBottom: spacing.lg },
    curNoteText: { flex: 1, fontSize: fontSizes.sm, color: colors.textSecondary, ...fonts.medium },
    cta: { height: 52, borderRadius: borderRadius.lg, alignItems: 'center', justifyContent: 'center' },
    ctaText: { color: '#fff', fontSize: fontSizes.md, ...fonts.bold },
    backRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: spacing.md, alignSelf: 'flex-start' },
    backText: { fontSize: fontSizes.sm, color: colors.textSecondary, ...fonts.semiBold },
    otpRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: spacing.lg },
    otpBox: { width: 46, height: 56, borderRadius: borderRadius.md, borderWidth: 1.5, borderColor: colors.borderLight, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.backgroundSecondary },
    otpBoxActive: { borderColor: colors.primary },
    otpDigit: { fontSize: fontSizes.xl, color: colors.textPrimary, ...fonts.bold },
    hiddenInput: { position: 'absolute', opacity: 0, height: 1, width: 1 },
    resend: { fontSize: fontSizes.sm, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.base, ...fonts.regular },
    resendLink: { color: colors.primary, ...fonts.bold },
    legal: { fontSize: fontSizes.xs, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: spacing.xl, lineHeight: 17, ...fonts.regular },
    // Picker modal
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl, maxHeight: '82%' },
    modalHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderLight, marginBottom: spacing.md },
    modalTitle: { fontSize: fontSizes.lg, color: colors.textPrimary, marginBottom: spacing.md, ...fonts.bold },
    searchBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderLight, borderRadius: borderRadius.md, paddingHorizontal: spacing.base, height: 44, marginBottom: spacing.sm },
    searchInput: { flex: 1, fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.regular },
    countryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight },
    rowFlagImg: { width: 30, height: 22, borderRadius: 3, backgroundColor: colors.borderLight },
    rowName: { flex: 1, fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.medium },
    rowDial: { fontSize: fontSizes.sm, color: colors.textSecondary, ...fonts.semiBold },
    rowCur: { width: 24, textAlign: 'center', fontSize: fontSizes.sm, color: colors.textTertiary, ...fonts.semiBold },
    modalClose: { alignItems: 'center', paddingVertical: spacing.md, marginTop: spacing.sm },
    modalCloseText: { fontSize: fontSizes.base, color: colors.primary, ...fonts.bold },
  });

export default HostLoginScreen;
