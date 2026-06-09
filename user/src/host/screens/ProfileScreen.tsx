import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useAuth } from '../contexts/AuthContext';
import { useMode } from '../../contexts/ModeContext';
import { useHaptics } from '../hooks/useHaptics';
import { confirmAction } from '../utils/confirm';
import { fonts, fontSizes, spacing, borderRadius, letterSpacing, shadows } from '../constants';
import { flagImageUrl, COUNTRIES } from '../constants/countries';
import { STAYON_GRADIENT } from '../components/GradientButton';
import { SettingsRow, SettingsSection } from '../components/common';
import { getHostProfile } from '../data/hostProfile';
import { getGuestReviews, avgRating } from '../data/hostReviews';
import { getListings } from '../data/listings';
import { getIdentity } from '../data/account';

export function ProfileScreen({ navigation }: any) {
  const { colors, isDark, toggleTheme } = useTheme();
  const { currency } = useCurrency();
  const { logout, user } = useAuth();
  const { setMode } = useMode();
  const { light } = useHaptics();
  const styles = makeStyles(colors);

  const [name, setName] = useState('Your host profile');
  const [avatar, setAvatar] = useState<string | undefined>();
  const [rating, setRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [listingCount, setListingCount] = useState(0);
  const [verified, setVerified] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      getHostProfile().then((p) => { if (active) { setName(p.name); setAvatar(p.avatar); } });
      getGuestReviews().then((r) => { if (active) { setRating(avgRating(r)); setReviewCount(r.length); } });
      getListings().then((l) => { if (active) setListingCount(l.length); });
      getIdentity().then((i) => { if (active) setVerified(i.status === 'verified'); });
      return () => { active = false; };
    }, [])
  );

  const onLogout = () => confirmAction({
    title: 'Log out?', message: 'You’ll need to sign in again with your phone number.',
    confirmText: 'Log out', destructive: true, onConfirm: () => { logout(); },
  });

  const switchToGuest = () => { light(); confirmAction({
    title: 'Switch to travelling?', message: 'Open the StayOn guest experience to search and book stays. You can switch back to hosting anytime.',
    confirmText: 'Switch', onConfirm: () => setMode('guest'),
  }); };

  const go = (route: string) => () => navigation.navigate(route);
  const country = COUNTRIES.find((c) => c.code === user?.countryCode);
  const stats = [
    { label: rating > 0 ? 'Rating' : 'New', value: rating > 0 ? rating.toFixed(2) : '—', icon: 'star' as const },
    { label: reviewCount === 1 ? 'Review' : 'Reviews', value: String(reviewCount) },
    { label: listingCount === 1 ? 'Stay' : 'Stays', value: String(listingCount) },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing['4xl'] }}>
        <View style={styles.headTitleRow}>
          <Text style={styles.headTitle}>Profile</Text>
        </View>

        {/* Premium identity card */}
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatar} contentFit="cover" />
            ) : (
              <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
                <Text style={styles.avatarInitial}>{(name || 'H').trim().charAt(0).toUpperCase()}</Text>
              </LinearGradient>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>{name}</Text>
              <View style={styles.subRow}>
                {country && <Image source={{ uri: flagImageUrl(country.code) }} style={styles.flag} contentFit="cover" />}
                <Text style={styles.sub} numberOfLines={1}>
                  {user?.phone ? `${user.dialCode ?? ''} ${user.phone}` : 'StayOn host'}
                </Text>
              </View>
              <View style={[styles.verifyChip, { backgroundColor: verified ? colors.primarySubtle : colors.goldLight }]}>
                <Ionicons name={verified ? 'shield-checkmark' : 'shield-half'} size={12} color={verified ? colors.primary : colors.goldDark} />
                <Text style={[styles.verifyText, { color: verified ? colors.primary : colors.goldDark }]}>
                  {verified ? 'Verified host' : 'Finish verification'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.statRow}>
            {stats.map((s, i) => (
              <React.Fragment key={s.label}>
                {i > 0 && <View style={styles.statDivider} />}
                <View style={styles.stat}>
                  <View style={styles.statValRow}>
                    {s.icon && <Ionicons name={s.icon} size={14} color={colors.gold} />}
                    <Text style={styles.statVal}>{s.value}</Text>
                  </View>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>

          <TouchableOpacity style={styles.editBtn} activeOpacity={0.85} onPress={() => { light(); navigation.navigate('Listings'); }}>
            <Ionicons name="home-outline" size={16} color={colors.primary} />
            <Text style={styles.editText}>Manage your stays</Text>
          </TouchableOpacity>
        </View>

        <SettingsSection title="Hosting">
          <SettingsRow icon="home-outline" title="Your stays" subtitle="Create & manage your stays" onPress={go('Listings')} />
          <SettingsRow icon="stats-chart-outline" title="Earnings & analytics" subtitle="Revenue, payouts, occupancy" onPress={go('Earnings')} />
          <SettingsRow icon="star-outline" title="Reviews" subtitle="From your guests" onPress={go('Reviews')} />
          <SettingsRow icon="sparkles-outline" title="Host Assistant" subtitle="Ask about your numbers" onPress={go('HostAssistant')} />
        </SettingsSection>

        <SettingsSection title="Your content">
          <SettingsRow icon="person-circle-outline" title="Public profile" subtitle="What guests see — about, languages" onPress={go('PublicProfile')} />
          <SettingsRow icon="videocam-outline" title="Post a vlog / reel" subtitle="Property tours for the StayReels feed" onPress={go('HostReel')} />
          <SettingsRow icon="newspaper-outline" title="Hosting stories" subtitle="Write tips & neighbourhood guides" onPress={go('HostStories')} />
          <SettingsRow icon="map-outline" title="Stay guidebooks" subtitle="Local recommendations for guests" onPress={go('Guidebook')} />
        </SettingsSection>

        <SettingsSection title="Grow your hosting">
          <SettingsRow icon="rocket-outline" title="Get your first booking" subtitle="Setup checklist, promo & rank tips" onPress={go('FirstBooking')} />
          <SettingsRow icon="flash-outline" title="Smart Pricing" subtitle="Optimize rates by demand & season" onPress={go('SmartPricing')} />
          <SettingsRow icon="gift-outline" title="Refer a host" subtitle="Invite hosts, grow together" onPress={go('Refer')} />
          <SettingsRow icon="shield-checkmark-outline" title="StayOn Cover" subtitle="Protection included with every booking" onPress={go('Cover')} />
        </SettingsSection>

        <SettingsSection title="Insights & operations">
          <SettingsRow icon="bulb-outline" title="Smart suggestions" subtitle="AI advice from your reviews & numbers" onPress={go('SmartSuggestions')} />
          <SettingsRow icon="trending-up-outline" title="Trends" subtitle="Occupancy, ADR, repeat guests" onPress={go('Trends')} />
          <SettingsRow icon="wallet-outline" title="Payouts & earnings" subtitle="Day-wise & month-wise breakdown" onPress={go('Payouts')} />
          <SettingsRow icon="construct-outline" title="Maintenance & damages" subtitle="Tasks and damage reports" onPress={go('Maintenance')} />
          <SettingsRow icon="shield-checkmark-outline" title="Safety & security" subtitle="Devices, access, emergency contacts" onPress={go('Safety')} />
        </SettingsSection>

        <SettingsSection title="Account">
          <SettingsRow icon="shield-checkmark-outline" title="Identity & verification" onPress={go('IdentityVerification')} />
          <SettingsRow icon="card-outline" title="Payout method" onPress={go('PayoutSetup')} />
          <SettingsRow icon="cash-outline" title="Currency" subtitle={`Price in ${currency.code} · guests see their own`} onPress={go('Currency')} />
          <SettingsRow icon="moon-outline" title="Dark mode" rightType="switch" switchValue={isDark} onSwitchChange={toggleTheme} />
          <SettingsRow icon="book-outline" title="Hosting resources" subtitle="Guides to host like a pro" onPress={go('Resources')} />
          <SettingsRow icon="help-circle-outline" title="Help & support" onPress={go('Support')} />
        </SettingsSection>

        <SettingsSection title="">
          <SettingsRow icon="log-out-outline" title="Log out" destructive onPress={onLogout} />
        </SettingsSection>

        {/* Switch to the guest (travelling) experience */}
        <TouchableOpacity activeOpacity={0.9} onPress={switchToGuest} style={styles.switchWrap}>
          <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.switchPill}>
            <Ionicons name="swap-horizontal" size={18} color="#fff" />
            <Text style={styles.switchText}>Switch to travelling</Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.version}>StayOn Host v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    headTitleRow: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm },
    headTitle: { fontSize: fontSizes['3xl'], letterSpacing: letterSpacing.tight, color: colors.textPrimary, ...fonts.bold },
    hero: { marginHorizontal: spacing.lg, padding: spacing.lg, borderRadius: borderRadius.xl, backgroundColor: colors.card, ...shadows.raised },
    heroTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    avatar: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.backgroundSecondary },
    avatarInitial: { color: '#fff', fontSize: fontSizes['2xl'], ...fonts.bold },
    name: { fontSize: fontSizes.xl, letterSpacing: letterSpacing.snug, color: colors.textPrimary, ...fonts.bold },
    subRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
    flag: { width: 18, height: 13, borderRadius: 2, backgroundColor: colors.borderLight },
    sub: { fontSize: fontSizes.sm, color: colors.textSecondary, ...fonts.regular },
    verifyChip: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginTop: spacing.sm, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 999 },
    verifyText: { fontSize: fontSizes.xs, ...fonts.bold },
    statRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.lg, paddingTop: spacing.base, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderLight },
    statDivider: { width: StyleSheet.hairlineWidth, height: 28, backgroundColor: colors.borderLight },
    stat: { flex: 1, alignItems: 'center', gap: 2 },
    statValRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    statVal: { fontSize: fontSizes.lg, color: colors.textPrimary, ...fonts.bold },
    statLabel: { fontSize: fontSizes.xs, color: colors.textSecondary, ...fonts.medium },
    editBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: spacing.base, paddingVertical: spacing.md, borderRadius: borderRadius.md, backgroundColor: colors.primarySubtle },
    editText: { fontSize: fontSizes.base, color: colors.primary, ...fonts.bold },
    switchWrap: { alignSelf: 'center', marginTop: spacing.xl, borderRadius: borderRadius.full, overflow: 'hidden' },
    switchPill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: borderRadius.full },
    switchText: { fontSize: fontSizes.base, color: '#fff', ...fonts.bold },
    version: { textAlign: 'center', fontSize: fontSizes.xs, color: colors.textTertiary, marginTop: spacing.lg, ...fonts.regular },
  });

export default ProfileScreen;
