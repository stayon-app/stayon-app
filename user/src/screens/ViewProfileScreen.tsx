import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts';
import { spacing, borderRadius, fontSizes, fonts } from '../constants';

// This is the PUBLIC profile a host sees when reviewing a booking request.
const VERIFICATIONS = [
  { id: 'email', label: 'Email address', icon: 'mail', verified: true },
  { id: 'phone', label: 'Phone number', icon: 'call', verified: true },
  { id: 'id', label: 'Government ID', icon: 'card', verified: false },
];

const HOST_REVIEWS = [
  {
    id: '1', host: 'Alex Morgan', property: 'Manhattan Luxury Loft',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop',
    date: 'May 2026', rating: 5,
    text: 'Wonderful guest! Left the place spotless and communicated clearly throughout. Welcome back anytime.',
  },
  {
    id: '2', host: 'Sarah Chen', property: 'Malibu Beachfront Villa',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop',
    date: 'Apr 2026', rating: 5,
    text: 'Respectful, friendly and followed all house rules. A model guest — highly recommend to other hosts.',
  },
  {
    id: '3', host: 'James Wilson', property: 'Chelsea Townhouse',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop',
    date: 'Mar 2026', rating: 4,
    text: 'Great communication and an easy check-out. Would happily host again.',
  },
];

// Shared avatar config (read by ProfileScreen too, same AsyncStorage key).
export const AVATAR_KEY = '@stayon_avatar';
export const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=200&h=200&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=200&h=200&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=200&h=200&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop&crop=faces',
];

// Shared cover/background config (a banner photo behind the avatar).
export const COVER_KEY = '@stayon_cover';
export const PRESET_COVERS = [
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&h=360&fit=crop',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=900&h=360&fit=crop',
  'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=900&h=360&fit=crop',
  'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=900&h=360&fit=crop',
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=900&h=360&fit=crop',
  'https://images.unsplash.com/photo-1518684079-3c830dcef090?w=900&h=360&fit=crop',
];
export const DEFAULT_COVER = PRESET_COVERS[0];

// Derive a friendly display name + the phone/raw value as subtitle.
// If the stored name is just digits (a phone number), don't use it for initials.
export function resolveIdentity(rawName?: string) {
  const value = (rawName || '').trim();
  const isPhone = value.length > 0 && /^[\d\s()+-]+$/.test(value) && /\d/.test(value);
  const displayName = !value ? 'Guest' : isPhone ? 'Guest' : value;
  const subtitle = isPhone ? value : undefined;
  const initials = (displayName.split(/\s+/).map((w) => (w ? w[0] : '')).join('').slice(0, 2).toUpperCase()) || 'G';
  return { displayName, subtitle, initials, isPhone };
}

export function ViewProfileScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const styles = makeStyles(colors);

  const { displayName, subtitle, initials } = resolveIdentity(user?.name);
  const verifiedCount = VERIFICATIONS.filter((v) => v.verified).length;
  const avgRating = (HOST_REVIEWS.reduce((s, r) => s + r.rating, 0) / HOST_REVIEWS.length).toFixed(1);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string>(DEFAULT_COVER);
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(AVATAR_KEY).then((v) => { if (v) setAvatarUrl(v); });
    AsyncStorage.getItem(COVER_KEY).then((v) => { if (v) setCoverUrl(v); });
  }, []);

  const chooseAvatar = async (url: string | null) => {
    setAvatarUrl(url);
    if (url) await AsyncStorage.setItem(AVATAR_KEY, url);
    else await AsyncStorage.removeItem(AVATAR_KEY);
    setPickerOpen(false);
  };

  const chooseCover = async (url: string) => {
    setCoverUrl(url);
    await AsyncStorage.setItem(COVER_KEY, url);
    setCoverPickerOpen(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 11, bottom: 11, left: 11, right: 11 }}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Profile</Text>
        <TouchableOpacity onPress={() => navigation.navigate('PersonalInfo')}>
          <Text style={[styles.editLink, { color: colors.primary }]}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Identity card with cover banner */}
        <View style={[styles.idCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Cover / background image */}
          <View style={styles.cover}>
            <Image source={{ uri: coverUrl }} style={styles.coverImg} contentFit="cover" transition={250} />
            <LinearGradient colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.35)']} style={styles.coverShade} />
            <TouchableOpacity
              style={styles.coverEdit}
              onPress={() => setCoverPickerOpen(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="camera" size={14} color="#fff" />
              <Text style={styles.coverEditText}>Edit cover</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.idBody}>
            <TouchableOpacity activeOpacity={0.85} onPress={() => setPickerOpen(true)} style={styles.avatarWrap}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={[styles.avatar, { borderColor: colors.card }]} contentFit="cover" />
              ) : (
                <LinearGradient colors={[colors.primary, colors.primaryLight]} style={[styles.avatar, { borderColor: colors.card }]}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </LinearGradient>
              )}
              <View style={[styles.editAvatarBadge, { backgroundColor: colors.primary, borderColor: colors.card }]}>
                <Ionicons name="camera" size={13} color="#fff" />
              </View>
            </TouchableOpacity>
            <Text style={[styles.name, { color: colors.textPrimary }]}>{displayName}</Text>
            {subtitle ? (
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
            ) : null}
            <Text style={[styles.joined, { color: colors.textSecondary }]}>Guest · Joined 2026</Text>

            <View style={styles.statRow}>
            <View style={styles.stat}>
              <Text style={[styles.statNum, { color: colors.textPrimary }]}>{HOST_REVIEWS.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Reviews</Text>
            </View>
            <View style={[styles.statLine, { backgroundColor: colors.borderLight }]} />
            <View style={styles.stat}>
              <Text style={[styles.statNum, { color: colors.textPrimary }]}>{avgRating}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Rating</Text>
            </View>
            <View style={[styles.statLine, { backgroundColor: colors.borderLight }]} />
            <View style={styles.stat}>
              <Text style={[styles.statNum, { color: colors.textPrimary }]}>12</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Trips</Text>
            </View>
            </View>
          </View>
        </View>

        {/* Verified info */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {displayName.split(' ')[0]}'s confirmed information
          </Text>
          {VERIFICATIONS.map((v) => (
            <View key={v.id} style={styles.verifyRow}>
              <Ionicons
                name={v.verified ? 'checkmark-circle' : v.icon as any}
                size={20}
                color={v.verified ? colors.success : colors.textTertiary}
              />
              <Text style={[styles.verifyLabel, { color: v.verified ? colors.textPrimary : colors.textSecondary }]}>
                {v.verified ? `${v.label} confirmed` : `${v.label} not added`}
              </Text>
            </View>
          ))}
          {verifiedCount < VERIFICATIONS.length && (
            <TouchableOpacity
              style={[styles.verifyBtn, { borderColor: colors.primary }]}
              onPress={() => navigation.navigate('IdentityVerification')}
            >
              <Ionicons name="shield-checkmark-outline" size={16} color={colors.primary} />
              <Text style={[styles.verifyBtnText, { color: colors.primary }]}>Complete verification</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>About</Text>
          <View style={[styles.aboutCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
            <Ionicons name="create-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.aboutPlaceholder, { color: colors.textSecondary }]}>
              Tell hosts about yourself — your travel style, what you love, and what makes you a great guest.
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('PersonalInfo')}>
              <Text style={[styles.aboutAdd, { color: colors.primary }]}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Reviews from hosts (two-way reviews) */}
        <View style={styles.section}>
          <View style={styles.reviewHeader}>
            <Ionicons name="star" size={18} color={colors.gold} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: 0 }]}>
              {avgRating} · {HOST_REVIEWS.length} reviews from hosts
            </Text>
          </View>
          {HOST_REVIEWS.map((r) => (
            <View key={r.id} style={[styles.reviewCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
              <View style={styles.reviewTop}>
                <Image source={{ uri: r.avatar }} style={styles.reviewAvatar} contentFit="cover" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.reviewHost, { color: colors.textPrimary }]}>{r.host}</Text>
                  <Text style={[styles.reviewMeta, { color: colors.textSecondary }]}>{r.property} · {r.date}</Text>
                </View>
                <View style={styles.reviewStars}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Ionicons key={s} name={s <= r.rating ? 'star' : 'star-outline'} size={12} color={colors.gold} />
                  ))}
                </View>
              </View>
              <Text style={[styles.reviewText, { color: colors.textSecondary }]}>{r.text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Avatar picker modal */}
      <AvatarPickerModal
        visible={pickerOpen}
        current={avatarUrl}
        initials={initials}
        onClose={() => setPickerOpen(false)}
        onChoose={chooseAvatar}
        colors={colors}
      />

      {/* Cover picker modal */}
      <Modal visible={coverPickerOpen} transparent animationType="slide" onRequestClose={() => setCoverPickerOpen(false)}>
        <View style={styles.coverModalBackdrop}>
          <View style={[styles.coverModalSheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.coverModalHandle, { backgroundColor: colors.borderLight }]} />
            <Text style={[styles.coverModalTitle, { color: colors.textPrimary }]}>Choose a cover photo</Text>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.lg }}>
              {PRESET_COVERS.map((url) => {
                const active = url === coverUrl;
                return (
                  <TouchableOpacity
                    key={url}
                    activeOpacity={0.9}
                    onPress={() => chooseCover(url)}
                    style={[styles.coverOption, { borderColor: active ? colors.primary : 'transparent' }]}
                  >
                    <Image source={{ uri: url }} style={styles.coverOptionImg} contentFit="cover" />
                    {active && (
                      <View style={[styles.coverCheck, { backgroundColor: colors.primary }]}>
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Reusable picker modal — exported so ProfileScreen can reuse it.
export function AvatarPickerModal({
  visible, current, initials, onClose, onChoose, colors,
}: {
  visible: boolean;
  current: string | null;
  initials: string;
  onClose: () => void;
  onChoose: (url: string | null) => void;
  colors: any;
}) {
  const s = makeStyles(colors);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} style={s.modalBackdrop} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={[s.modalSheet, { backgroundColor: colors.card }]}>
          <View style={s.modalHandleRow}>
            <Text style={[s.modalTitle, { color: colors.textPrimary }]}>Choose your avatar</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={s.avatarGrid}>
            {/* Colored initial default */}
            <TouchableOpacity onPress={() => onChoose(null)} activeOpacity={0.85}>
              <LinearGradient
                colors={[colors.primary, colors.primaryLight]}
                style={[s.gridAvatar, current === null && s.gridAvatarSelected]}
              >
                <Text style={s.gridInitial}>{initials}</Text>
              </LinearGradient>
            </TouchableOpacity>

            {PRESET_AVATARS.map((url) => (
              <TouchableOpacity key={url} onPress={() => onChoose(url)} activeOpacity={0.85}>
                <Image
                  source={{ uri: url }}
                  style={[s.gridAvatar, current === url && s.gridAvatarSelected]}
                  contentFit="cover"
                />
                {current === url && (
                  <View style={[s.gridCheck, { backgroundColor: colors.primary, borderColor: colors.card }]}>
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
    headerTitle: { fontSize: fontSizes.lg, ...fonts.bold },
    editLink: { fontSize: fontSizes.base, ...fonts.semiBold },
    idCard: { margin: spacing.lg, borderRadius: borderRadius.xl, borderWidth: 1, overflow: 'hidden' },
    cover: { width: '100%', height: 120 },
    coverImg: { width: '100%', height: '100%' },
    coverShade: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    coverEdit: {
      position: 'absolute', top: spacing.md, right: spacing.md,
      flexDirection: 'row', alignItems: 'center', gap: 5,
      backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: borderRadius.full,
    },
    coverEditText: { color: '#fff', fontSize: fontSizes.xs, ...fonts.semiBold },
    idBody: { alignItems: 'center', paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },
    avatarWrap: { marginTop: -48 },
    avatar: { width: 92, height: 92, borderRadius: 46, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md, borderWidth: 4 },
    avatarText: { color: '#fff', fontSize: 34, ...fonts.bold },
    editAvatarBadge: {
      position: 'absolute', bottom: spacing.md + 2, right: -2,
      width: 26, height: 26, borderRadius: 13, borderWidth: 2,
      justifyContent: 'center', alignItems: 'center',
    },
    // Cover picker modal
    coverModalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    coverModalSheet: { borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, padding: spacing.lg, maxHeight: '80%' },
    coverModalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
    coverModalTitle: { fontSize: fontSizes.lg, ...fonts.bold, marginBottom: spacing.base },
    coverOption: { height: 110, borderRadius: borderRadius.lg, overflow: 'hidden', borderWidth: 2 },
    coverOptionImg: { width: '100%', height: '100%' },
    coverCheck: { position: 'absolute', top: spacing.sm, right: spacing.sm, width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    name: { fontSize: fontSizes['2xl'], ...fonts.bold, letterSpacing: -0.5 },
    subtitle: { fontSize: fontSizes.sm, marginTop: 2, ...fonts.medium },
    joined: { fontSize: fontSizes.sm, marginTop: 2 },
    statRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.base, width: '100%' },
    stat: { flex: 1, alignItems: 'center' },
    statNum: { fontSize: fontSizes.xl, ...fonts.bold },
    statLabel: { fontSize: fontSizes.sm, marginTop: 2 },
    statLine: { width: 1, height: 32 },
    section: { paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
    sectionTitle: { fontSize: fontSizes.lg, ...fonts.bold, marginBottom: spacing.base },
    verifyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
    verifyLabel: { fontSize: fontSizes.base },
    verifyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: spacing.md, paddingVertical: spacing.md, borderRadius: borderRadius.md, borderWidth: 1.5 },
    verifyBtnText: { fontSize: fontSizes.sm, ...fonts.semiBold },
    aboutCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.base, borderRadius: borderRadius.lg, borderWidth: 1 },
    aboutPlaceholder: { flex: 1, fontSize: fontSizes.sm, lineHeight: 18 },
    aboutAdd: { fontSize: fontSizes.sm, ...fonts.bold },
    reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.base },
    reviewCard: { borderRadius: borderRadius.lg, borderWidth: 1, padding: spacing.base, marginBottom: spacing.sm },
    reviewTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
    reviewAvatar: { width: 40, height: 40, borderRadius: 20 },
    reviewHost: { fontSize: fontSizes.sm, ...fonts.bold },
    reviewMeta: { fontSize: fontSizes.sm, marginTop: 1 },
    reviewStars: { flexDirection: 'row', gap: 1 },
    reviewText: { fontSize: fontSizes.sm, lineHeight: 19 },
    // Avatar picker modal
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    modalSheet: {
      borderTopLeftRadius: borderRadius['2xl'], borderTopRightRadius: borderRadius['2xl'],
      paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing['2xl'],
    },
    modalHandleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
    modalTitle: { fontSize: fontSizes.lg, ...fonts.bold },
    avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.base, justifyContent: 'center' },
    gridAvatar: { width: 68, height: 68, borderRadius: 34, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
    gridAvatarSelected: { borderColor: colors.primary },
    gridInitial: { color: '#fff', fontSize: 26, ...fonts.bold },
    gridCheck: {
      position: 'absolute', bottom: 0, right: 0, width: 22, height: 22, borderRadius: 11,
      borderWidth: 2, justifyContent: 'center', alignItems: 'center',
    },
  });
}

export default ViewProfileScreen;
