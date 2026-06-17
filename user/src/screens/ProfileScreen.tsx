import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { fontSizes, fonts, spacing, borderRadius, lineHeights } from '../constants';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STAYON_GRADIENT } from '../components/GradientButton';
import { getListings } from '../host/data/listings';
import { Api } from '../api';
import { Reveal } from '../components/Reveal';
import { useAuth } from '../contexts';
import { useTheme } from '../contexts/ThemeContext';
import { useMode } from '../contexts/ModeContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AVATAR_KEY, AvatarPickerModal, resolveIdentity } from './ViewProfileScreen';

const COVER_KEY = '@stayon_cover';
const COVER_PRESETS = [
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&h=400&fit=crop',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=900&h=400&fit=crop',
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=900&h=400&fit=crop',
  'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=900&h=400&fit=crop',
];

export const ProfileScreen: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const { colors: themeColors } = useTheme();
  const { setMode } = useMode();
  const styles = makeStyles(themeColors);
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { displayName, subtitle, initials } = resolveIdentity(user?.name);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  // Has this user ever created a listing? Drives the "Become a host" promo vs a
  // simple "Switch to hosting" button.
  const [hasListings, setHasListings] = useState(false);

  // Reload on focus so an avatar chosen on ViewProfile reflects here too.
  useFocusEffect(
    React.useCallback(() => {
      AsyncStorage.getItem(AVATAR_KEY).then((v) => setAvatarUrl(v || null));
      AsyncStorage.getItem(COVER_KEY).then((v) => setCoverUrl(v || null));
      // Show "Become a host" until the user has ANY listing of their own (local
      // 'hl_…' of any status, OR a listing on the backend). Demo seeds ('hl1'/
      // 'hl2') don't count.
      (async () => {
        let has = false;
        try { const ls = await getListings(); has = ls.some((l) => l.id.startsWith('hl_')); } catch {}
        if (!has) { try { const r = await Api.listings.mine(); has = ((r?.items as any[]) || []).length > 0; } catch {} }
        setHasListings(has);
      })();
    }, [])
  );

  const chooseAvatar = async (url: string | null) => {
    setAvatarUrl(url);
    if (url) await AsyncStorage.setItem(AVATAR_KEY, url);
    else await AsyncStorage.removeItem(AVATAR_KEY);
    setPickerOpen(false);
  };

  // Tap the cover to cycle through scenic banner presets (no image-picker needed).
  const cycleCover = async () => {
    const idx = coverUrl ? COVER_PRESETS.indexOf(coverUrl) : -1;
    const next = COVER_PRESETS[(idx + 1) % COVER_PRESETS.length];
    setCoverUrl(next);
    await AsyncStorage.setItem(COVER_KEY, next);
  };

  if (!isAuthenticated) {
    const PERKS = [
      { icon: 'briefcase', label: 'Your trips', sub: 'Plan & track every stay', go: 'TripsTab' },
      { icon: 'heart', label: 'Wishlists', sub: 'Save places you love', go: 'Wishlist' },
      { icon: 'chatbubbles', label: 'Messages', sub: 'Chat with your hosts', go: 'Auth' },
      { icon: 'pricetag', label: '15% off', sub: 'Your first booking', go: 'Offers' },
    ];
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing['4xl'] }}>
          {/* Branded hero with a faint travel backdrop */}
          <View style={[styles.loHero, { paddingTop: insets.top + spacing.xl }]}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1000&q=80&auto=format&fit=crop' }}
              style={StyleSheet.absoluteFill as any}
              contentFit="cover"
            />
            <LinearGradient colors={['rgba(13,148,136,0.86)', 'rgba(99,102,241,0.92)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill as any} />
            <View style={styles.loHeroBadge}><Ionicons name="person" size={34} color="#fff" /></View>
            <Text style={styles.loHeroTitle}>Welcome to StayOn</Text>
            <Text style={styles.loHeroSub}>Log in to plan trips, save favourites and unlock member perks.</Text>
            <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.navigate('Auth')} style={styles.loHeroBtn}>
              <Text style={styles.loHeroBtnText}>Log in or sign up</Text>
              <Ionicons name="arrow-forward" size={18} color={themeColors.primary} />
            </TouchableOpacity>
          </View>

          {/* What you'll unlock */}
          <Text style={[styles.loSectionTitle, { color: themeColors.textPrimary }]}>What you’ll unlock</Text>
          <View style={styles.loPerksGrid}>
            {PERKS.map((p) => (
              <TouchableOpacity
                key={p.label}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('Auth')}
                style={[styles.loPerkCard, { backgroundColor: themeColors.card, borderColor: themeColors.borderLight }]}
              >
                <View style={[styles.loPerkIcon, { backgroundColor: themeColors.primarySubtle }]}>
                  <Ionicons name={p.icon as any} size={20} color={themeColors.primary} />
                </View>
                <Text style={[styles.loPerkLabel, { color: themeColors.textPrimary }]}>{p.label}</Text>
                <Text style={[styles.loPerkSub, { color: themeColors.textSecondary }]}>{p.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }


  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={[styles.header, { borderBottomColor: themeColors.borderLight, paddingTop: insets.top + spacing.sm }]}>
        <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>Profile</Text>
        <TouchableOpacity
          style={styles.headerIconBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={() => navigation.navigate('NotificationCenter')}
          accessibilityRole="button"
          accessibilityLabel="View notifications"
        >
          <Ionicons name="notifications-outline" size={24} color={themeColors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile identity card */}
        <Reveal delay={60}>
        <View style={[styles.idCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          {/* Cover banner */}
          <View style={styles.cover}>
            {coverUrl ? (
              <Image source={{ uri: coverUrl }} style={styles.coverFill} contentFit="cover" transition={200} />
            ) : (
              <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.coverFill} />
            )}
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.25)']} style={styles.coverFill} />
            <TouchableOpacity style={styles.coverEdit} onPress={cycleCover} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="Change cover photo">
              <Ionicons name="image-outline" size={14} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Avatar overlapping the cover */}
          <TouchableOpacity activeOpacity={0.85} onPress={() => setPickerOpen(true)} style={styles.avatarWrap} accessibilityRole="button" accessibilityLabel="Change profile photo">
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={[styles.avatar, { borderColor: themeColors.card }]} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, styles.avatarRing, { backgroundColor: themeColors.primaryUltraLight, borderColor: themeColors.card }]}>
                <Text style={[styles.avatarText, { color: themeColors.primary }]}>{initials}</Text>
              </View>
            )}
            <View style={[styles.avatarEditBadge, { backgroundColor: themeColors.primary, borderColor: themeColors.card }]}>
              <Ionicons name="camera" size={12} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={[styles.idName, { color: themeColors.textPrimary }]}>{displayName}</Text>
          <View style={styles.idVerifiedRow}>
            <Ionicons name="checkmark-circle" size={15} color={themeColors.primary} />
            <Text style={[styles.idVerifiedText, { color: themeColors.textSecondary }]}>Verified member{subtitle ? ` · ${subtitle}` : ''}</Text>
          </View>

          {/* Action pills — existing hosts get a quick "Switch to hosting"; new
              users get just Edit profile here and the inspiring promo below. */}
          <View style={styles.idPills}>
            <TouchableOpacity style={[styles.idPill, { borderColor: themeColors.border, flex: hasListings ? undefined : 1 }]} onPress={() => navigation.navigate('ViewProfile')} activeOpacity={0.85}>
              <Ionicons name="create-outline" size={15} color={themeColors.textPrimary} />
              <Text style={[styles.idPillText, { color: themeColors.textPrimary }]}>Edit profile</Text>
            </TouchableOpacity>
            {hasListings && (
              <TouchableOpacity onPress={() => setMode('host')} activeOpacity={0.9} style={{ flex: 1 }}>
                <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.idPillFilled}>
                  <Ionicons name="briefcase-outline" size={15} color="#fff" />
                  <Text style={styles.idPillFilledText}>Switch to hosting</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
          <View style={{ height: spacing.base }} />
        </View>
        </Reveal>

        {/* Quick access — 2×2 image tiles */}
        <Reveal delay={140}>
        <View style={styles.qaGrid}>
          {[
            { img: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=500&q=80&auto=format&fit=crop', label: 'Trips', sub: 'Upcoming & past', go: 'TripsTab' },
            { img: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=500&q=80&auto=format&fit=crop', label: 'Wishlists', sub: 'Saved places', go: 'Wishlist' },
            { img: 'https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?w=500&q=80&auto=format&fit=crop', label: 'Wallet', sub: 'Payments & credit', go: 'StayWallet' },
            { img: 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=500&q=80&auto=format&fit=crop', label: 'Offers', sub: 'Your discounts', go: 'Offers' },
          ].map((q) => (
            <TouchableOpacity
              key={q.label}
              activeOpacity={0.9}
              onPress={() => navigation.navigate(q.go)}
              style={styles.qaTile}
            >
              <Image source={{ uri: q.img }} style={StyleSheet.absoluteFill as any} contentFit="cover" transition={200} />
              <LinearGradient colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.78)']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill as any} />
              <View style={styles.qaContent}>
                <Text style={styles.qaLabel}>{q.label}</Text>
                <Text style={styles.qaSub}>{q.sub}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
        </Reveal>

        {/* Become a host — inspiring promo for users with no listing yet */}
        {!hasListings && (
        <Reveal delay={220}>
        <TouchableOpacity activeOpacity={0.92} onPress={() => setMode('host')} style={styles.becomeHost}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1000&q=80&auto=format&fit=crop' }}
            style={StyleSheet.absoluteFill as any}
            contentFit="cover"
            transition={200}
          />
          <LinearGradient colors={['rgba(13,148,136,0.55)', 'rgba(15,23,42,0.88)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill as any} />
          <View style={styles.becomeHostContent}>
            <View style={styles.becomeHostBadge}><Ionicons name="business" size={18} color="#fff" /></View>
            <Text style={styles.becomeHostTitle}>Become a host</Text>
            <Text style={styles.becomeHostSub}>Open your door and earn on your terms. List your place in minutes — and keep 100%, because StayOn charges hosts 0% fee.</Text>
            <View style={styles.becomeHostBtn}>
              <Text style={[styles.becomeHostBtnText, { color: themeColors.primary }]}>Get started</Text>
              <Ionicons name="arrow-forward" size={16} color={themeColors.primary} />
            </View>
          </View>
        </TouchableOpacity>
        </Reveal>
        )}

        {/* Settings — grouped clean rows */}
        <Reveal delay={300}>
        <Text style={[styles.menuGroupTitle, { color: themeColors.textSecondary }]}>Settings & more</Text>
        <View style={[styles.menuSection, { backgroundColor: themeColors.card, borderColor: themeColors.borderLight }]}>
          {[
            { icon: 'receipt-outline', title: 'Receipts', go: 'TripSpending' },
            { icon: 'settings-outline', title: 'Account settings', go: 'AccountSettings' },
            { icon: 'help-circle-outline', title: 'Get help', go: 'CustomerSupport' },
          ].map((item, index, arr) => (
            <TouchableOpacity
              key={item.title}
              style={[styles.menuItem, index < arr.length - 1 && { borderBottomColor: themeColors.borderLight, borderBottomWidth: 1 }]}
              onPress={() => navigation.navigate(item.go)}
            >
              <Ionicons name={item.icon as any} size={22} color={themeColors.textPrimary} />
              <Text style={[styles.menuTitle, { color: themeColors.textPrimary, flex: 1, marginLeft: 14 }]}>{item.title}</Text>
              <Ionicons name="chevron-forward" size={18} color={themeColors.textTertiary} />
            </TouchableOpacity>
          ))}
        </View>
        </Reveal>

        {/* Logout */}
        <Reveal delay={380}>
        <TouchableOpacity style={[styles.logoutButton, { borderColor: themeColors.borderLight }]} onPress={logout}>
          <Ionicons name="log-out-outline" size={20} color={themeColors.error} />
          <Text style={[styles.logoutText, { color: themeColors.error }]}>Log out</Text>
        </TouchableOpacity>
        </Reveal>

        <Text style={[styles.versionText, { color: themeColors.textTertiary }]}>StayOn v1.0.0</Text>
      </ScrollView>

      <AvatarPickerModal
        visible={pickerOpen}
        current={avatarUrl}
        initials={initials}
        onClose={() => setPickerOpen(false)}
        onChoose={chooseAvatar}
        colors={themeColors}
      />
    </View>
  );
};

function makeStyles(colors: any) {
  return StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: fontSizes['3xl'],
    ...fonts.bold,
    letterSpacing: -0.5,
  },
  headerIconBtn: {
    width: 44, height: 44, borderRadius: borderRadius.full,
    justifyContent: 'center', alignItems: 'center',
  },
  scrollView: { flex: 1 },
  content: { paddingBottom: spacing['4xl'], paddingHorizontal: spacing.lg },
  // Identity card
  idCard: {
    alignItems: 'center', borderRadius: borderRadius.xl, borderWidth: 1,
    overflow: 'hidden', marginTop: spacing.sm, marginBottom: spacing.lg,
  },
  cover: { width: '100%', height: 100 },
  coverFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  coverEdit: {
    position: 'absolute', top: spacing.sm, right: spacing.sm,
    width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  avatarWrap: { marginTop: -40, marginBottom: spacing.md },
  avatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, justifyContent: 'center', alignItems: 'center' },
  avatarRing: {},
  avatarText: { fontSize: fontSizes['3xl'], ...fonts.bold },
  avatarEditBadge: {
    position: 'absolute', bottom: spacing.md, right: -2,
    width: 24, height: 24, borderRadius: 12, borderWidth: 2,
    justifyContent: 'center', alignItems: 'center',
  },
  idName: { fontSize: fontSizes.xl, ...fonts.bold, letterSpacing: -0.5 },
  idSubtitle: { fontSize: fontSizes.sm, ...fonts.medium, marginTop: 2 },
  idVerifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  idVerifiedText: { fontSize: fontSizes.sm, ...fonts.medium },
  idPills: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, paddingHorizontal: spacing.lg, alignSelf: 'stretch' },
  idPill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: spacing.sm, paddingHorizontal: spacing.base, borderRadius: borderRadius.full, borderWidth: 1.5 },
  idPillText: { fontSize: fontSizes.sm, ...fonts.bold },
  idPillFilled: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: spacing.sm, paddingHorizontal: spacing.base, borderRadius: borderRadius.full },
  idPillFilledText: { fontSize: fontSizes.sm, color: '#fff', ...fonts.bold },
  // Quick-access tiles
  qaGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.md, marginBottom: spacing.lg },
  qaTile: { width: '47%', height: 118, borderRadius: borderRadius.lg, overflow: 'hidden', justifyContent: 'flex-end', backgroundColor: colors.backgroundSecondary },
  qaContent: { padding: spacing.base },
  qaLabel: { fontSize: fontSizes.md, color: '#fff', ...fonts.bold },
  qaSub: { fontSize: fontSizes.sm, color: 'rgba(255,255,255,0.9)', marginTop: 1, ...fonts.regular },
  menuGroupTitle: { fontSize: fontSizes.sm, ...fonts.semiBold, marginBottom: spacing.sm, marginLeft: spacing.xs },
  // Become a host promo
  becomeHost: { borderRadius: borderRadius.xl, overflow: 'hidden', marginBottom: spacing.lg, minHeight: 188, justifyContent: 'flex-end' },
  becomeHostContent: { padding: spacing.lg },
  becomeHostBadge: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  becomeHostTitle: { fontSize: 22, ...fonts.bold, color: '#fff', letterSpacing: -0.3 },
  becomeHostSub: { fontSize: fontSizes.sm, color: 'rgba(255,255,255,0.92)', lineHeight: 20, marginTop: 4, marginBottom: spacing.md },
  becomeHostBtn: { flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 6, backgroundColor: '#fff', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.full },
  becomeHostBtnText: { fontSize: fontSizes.base, ...fonts.bold },
  tierPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: 14, marginTop: spacing.sm },
  tierPillText: { fontSize: fontSizes.xs, ...fonts.bold },
  // Feature cards
  featureRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  featureCard: { flex: 1, borderRadius: borderRadius.lg, borderWidth: 1, overflow: 'hidden', paddingBottom: spacing.md },
  featureImg: { width: '100%', height: 96 },
  featureLabel: { fontSize: fontSizes.base, ...fonts.bold, paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  newBadge: {
    position: 'absolute', top: 8, right: 8, zIndex: 2, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4 },
      android: { elevation: 3 },
      web: { boxShadow: '0 2px 6px rgba(0,0,0,0.18)' } as any,
    }),
  },
  newBadgeText: { color: '#222222', fontSize: 10, fontWeight: '800' },
  // Host card
  hostCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: borderRadius.lg, borderWidth: 1, padding: spacing.md, marginBottom: spacing.lg },
  hostImg: { width: 64, height: 64, borderRadius: borderRadius.md },
  hostTitle: { fontSize: fontSizes.md, ...fonts.bold },
  hostSub: { fontSize: fontSizes.sm, marginTop: 2, lineHeight: lineHeights.sm },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xl,
    marginHorizontal: spacing.base,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.base,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSizes['2xl'],
    ...fonts.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: fontSizes.sm,
    ...fonts.regular,
    color: colors.textSecondary,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.divider,
    marginHorizontal: spacing.base,
  },
  coinsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  coinsLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  coinsEmoji: { fontSize: 24 },
  coinsTitle: { fontSize: fontSizes.base, ...fonts.bold },
  coinsSub: { fontSize: fontSizes.xs, marginTop: 2 },
  menuSection: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: fontSizes.base,
    ...fonts.semiBold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: fontSizes.sm,
    ...fonts.regular,
    color: colors.textSecondary,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.base,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.error,
    marginBottom: spacing.lg,
  },
  logoutText: {
    fontSize: fontSizes.md,
    ...fonts.semiBold,
    color: colors.error,
    marginLeft: spacing.sm,
  },
  versionText: {
    fontSize: fontSizes.xs,
    ...fonts.regular,
    color: colors.textTertiary,
    textAlign: 'center',
    marginBottom: spacing.base,
  },
  authAvatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    ...Platform.select({
      ios: { shadowColor: '#0D9488', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.4, shadowRadius: 20 },
      android: { elevation: 10 },
      default: { boxShadow: '0 10px 24px rgba(13,148,136,0.4)' } as any,
    }),
  },
  authPrompt: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  authPromptTitle: {
    fontSize: fontSizes['2xl'],
    ...fonts.bold,
    color: colors.textPrimary,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  authPromptText: {
    fontSize: fontSizes.base,
    ...fonts.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  authButton: {
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.base,
    borderRadius: borderRadius.lg,
  },
  authButtonText: {
    fontSize: fontSizes.base,
    ...fonts.semiBold,
    color: '#FFFFFF',
  },
  // ── Logged-out profile (branded) ──
  loHero: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['2xl'],
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
    alignItems: 'flex-start',
  },
  loHeroBadge: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.base,
  },
  loHeroTitle: { fontSize: 28, ...fonts.bold, color: '#fff', letterSpacing: -0.5 },
  loHeroSub: { fontSize: fontSizes.base, color: 'rgba(255,255,255,0.92)', lineHeight: 22, marginTop: 6, marginBottom: spacing.lg, maxWidth: 320 },
  loHeroBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', paddingHorizontal: spacing.xl, paddingVertical: spacing.base,
    borderRadius: borderRadius.lg,
  },
  loHeroBtnText: { fontSize: fontSizes.md, ...fonts.bold, color: '#111' },
  loSectionTitle: { fontSize: fontSizes.lg, ...fonts.bold, marginTop: spacing.xl, marginBottom: spacing.md, paddingHorizontal: spacing.lg },
  loPerksGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, paddingHorizontal: spacing.lg },
  loPerkCard: {
    width: '47%', borderRadius: borderRadius.lg, borderWidth: 1,
    padding: spacing.base, gap: 4,
  },
  loPerkIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  loPerkLabel: { fontSize: fontSizes.base, ...fonts.bold },
  loPerkSub: { fontSize: fontSizes.sm, ...fonts.regular },
  });
}
