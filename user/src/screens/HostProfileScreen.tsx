// HostProfileScreen — a premium "meet your host" page.
// • A flip card (tap to turn) — front: host + stats + badges; back: an indigo
//   "Verified since" brand card.
// • Gyroscope tilt-parallax — tilt the phone and the inner layers shift.
// • Identity-verified row, the host's reviews, the stays they manage, and
//   report / block actions. Reviews + stays come from the backend host data.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Animated,
  Platform, useWindowDimensions, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { DeviceMotion } from 'expo-sensors';
import { useTheme } from '../contexts/ThemeContext';
import { fonts, spacing, borderRadius, fontSizes } from '../constants';
import { Api } from '../api';

const INDIGO: [string, string, string] = ['#6366F1', '#4F46E5', '#7C3AED'];

// Normalised left/right + up/down tilt (-1..1), from device motion (native) or
// the browser's orientation events (web). No-ops where unsupported.
function useTilt() {
  const tx = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const clamp = (v: number) => Math.max(-1, Math.min(1, v));
    if (Platform.OS === 'web') {
      const w: any = (globalThis as any).window;
      if (!w?.addEventListener) return;
      const handler = (e: any) => {
        tx.setValue(clamp((e.gamma || 0) / 40));   // left/right
        ty.setValue(clamp(((e.beta || 0) - 45) / 40)); // front/back
      };
      w.addEventListener('deviceorientation', handler, true);
      return () => w.removeEventListener('deviceorientation', handler, true);
    }
    let sub: any;
    try {
      DeviceMotion.setUpdateInterval(50);
      sub = DeviceMotion.addListener((d: any) => {
        const g = d?.rotation?.gamma ?? 0; // left/right (radians)
        const b = d?.rotation?.beta ?? 0;  // front/back
        tx.setValue(clamp(g / 0.8));
        ty.setValue(clamp(b / 0.8));
      });
    } catch { /* sensor unavailable */ }
    return () => sub?.remove?.();
  }, [tx, ty]);
  return { tx, ty };
}

export default function HostProfileScreen({ route, navigation }: any) {
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const styles = makeStyles(colors, isDark, width);
  const p = route?.params || {};

  const host = p.host || {};
  const name: string = host.name || 'Your host';
  const avatar: string | undefined = host.avatar;
  const bio: string = host.bio || 'Loves hosting & sharing the city';
  const isSuperhost: boolean = host.isSuperhost ?? true;
  const verifiedSince: string = host.verifiedSince || 'November 2025';
  const stats = p.stats || { reviews: 0, rating: 0, hostingLabel: 'New host' };

  const [reviews, setReviews] = useState<any[]>(p.reviews || []);
  const [stays, setStays] = useState<any[]>(p.stays || []);

  // Pull the host's real reviews + managed stays from the backend.
  useEffect(() => {
    if (!p.hostId) return;
    (async () => {
      try {
        const r = await Api.hosts.profile(p.hostId);
        if (Array.isArray(r?.reviews) && r.reviews.length) setReviews(r.reviews);
        if (Array.isArray(r?.stays) && r.stays.length) setStays(r.stays);
      } catch { /* keep whatever was passed in */ }
    })();
  }, [p.hostId]);

  // ---- flip ----
  const flip = useRef(new Animated.Value(0)).current;
  const [flipped, setFlipped] = useState(false);
  const toggleFlip = () => {
    Animated.spring(flip, { toValue: flipped ? 0 : 1, useNativeDriver: true, friction: 8, tension: 12 }).start();
    setFlipped(!flipped);
  };
  const frontRotate = flip.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backRotate = flip.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });
  const frontOpacity = flip.interpolate({ inputRange: [0, 0.5, 0.5, 1], outputRange: [1, 1, 0, 0] });
  const backOpacity = flip.interpolate({ inputRange: [0, 0.5, 0.5, 1], outputRange: [0, 0, 1, 1] });

  // ---- tilt parallax ----
  const { tx, ty } = useTilt();
  const layer = (depth: number) => ({
    transform: [
      { translateX: tx.interpolate({ inputRange: [-1, 1], outputRange: [-depth, depth] }) },
      { translateY: ty.interpolate({ inputRange: [-1, 1], outputRange: [-depth, depth] }) },
    ],
  });

  const Stat = ({ value, label, star }: { value: string; label: string; star?: boolean }) => (
    <View style={styles.statCell}>
      <View style={styles.statValueRow}>
        <Text style={styles.statValue}>{value}</Text>
        {star && <Ionicons name="star" size={15} color={colors.textPrimary} style={{ marginLeft: 2 }} />}
      </View>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
        <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing['4xl'] }}>
        {/* ---------- Flip card ---------- */}
        <Pressable onPress={toggleFlip} style={styles.cardWrap}>
          {/* FRONT */}
          <Animated.View style={[styles.card, styles.cardFront, { transform: [{ perspective: 1000 }, { rotateY: frontRotate }], opacity: frontOpacity }]}>
            <View style={styles.cardLeft}>
              <Animated.View style={layer(6)}>
                <View style={styles.avatarWrap}>
                  {avatar ? <Image source={{ uri: avatar }} style={styles.avatar} /> : <View style={[styles.avatar, styles.avatarFallback]}><Text style={styles.avatarInitial}>{name[0]}</Text></View>}
                  <View style={styles.verifiedDot}><Ionicons name="shield-checkmark" size={12} color="#fff" /></View>
                </View>
              </Animated.View>
              <Text style={styles.hostName} numberOfLines={1}>{name}</Text>
              {isSuperhost && (
                <View style={styles.superRow}>
                  <Ionicons name="ribbon" size={13} color={colors.primary} />
                  <Text style={styles.superText}>Superhost</Text>
                </View>
              )}
            </View>
            <View style={styles.cardRight}>
              <Stat value={String(stats.reviews ?? 0)} label="Reviews" />
              <View style={styles.statDivider} />
              <Stat value={stats.rating ? String(stats.rating) : 'New'} label="Rating" star={!!stats.rating} />
              <View style={styles.statDivider} />
              <Stat value={stats.hostingLabel || '—'} label="hosting" />
            </View>
          </Animated.View>

          {/* BACK — indigo brand card */}
          <Animated.View style={[styles.card, styles.cardBack, { transform: [{ perspective: 1000 }, { rotateY: backRotate }], opacity: backOpacity }]}>
            <LinearGradient colors={INDIGO} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            {/* parallax brand pattern */}
            <Animated.View style={[styles.patternLayer, layer(14)]} pointerEvents="none">
              {Array.from({ length: 18 }).map((_, i) => (
                <Ionicons key={i} name="sparkles-outline" size={26} color="rgba(255,255,255,0.12)" style={{ margin: 10 }} />
              ))}
            </Animated.View>
            <Animated.View style={layer(8)}>
              <Text style={styles.backName}>{name}</Text>
              <Text style={styles.backVerified}>Verified since {verifiedSince}</Text>
            </Animated.View>
            <Animated.View style={[styles.backBody, layer(4)]}>
              <Text style={styles.backTagline}>Trust is the cornerstone of StayOn — identity verification is part of how we build it.</Text>
              {avatar && <Image source={{ uri: avatar }} style={styles.backAvatar} />}
            </Animated.View>
          </Animated.View>
        </Pressable>

        {/* ---------- Identity verified ---------- */}
        <View style={styles.verifiedRow}>
          <Ionicons name="shield-checkmark-outline" size={22} color={colors.textPrimary} />
          <Text style={styles.verifiedText}>Identity verified</Text>
        </View>

        <View style={styles.divider} />

        {/* ---------- Reviews ---------- */}
        <Text style={styles.sectionTitle}>{name.split(' ')[0]}’s reviews</Text>
        {reviews.length === 0 ? (
          <Text style={styles.emptyNote}>No reviews yet — be the first after your stay.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
            {reviews.slice(0, 8).map((rv: any, i: number) => (
              <View key={i} style={styles.reviewCard}>
                <View style={styles.reviewHead}>
                  <View style={[styles.reviewAvatar, { backgroundColor: ['#DCFCE7', '#FCE7F3', '#E0E7FF', '#FEF3C7'][i % 4] }]}>
                    <Text style={styles.reviewInitial}>{(rv.author || rv.name || 'G')[0]}</Text>
                  </View>
                  <View>
                    <Text style={styles.reviewName}>{rv.author || rv.name || 'Guest'}</Text>
                    <View style={{ flexDirection: 'row' }}>
                      {[0, 1, 2, 3, 4].map((s) => <Ionicons key={s} name="star" size={10} color={colors.textPrimary} />)}
                    </View>
                  </View>
                </View>
                <Text style={styles.reviewText} numberOfLines={5}>{rv.text || rv.comment}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        <View style={styles.divider} />

        {/* ---------- Stays the host manages ---------- */}
        <Text style={styles.sectionTitle}>{name.split(' ')[0]}’s stays</Text>
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
          {stays.length === 0 ? (
            <Text style={styles.emptyNote}>No published stays yet.</Text>
          ) : stays.slice(0, 6).map((s: any, i: number) => (
            <TouchableOpacity key={s.id || i} style={styles.stayRow} activeOpacity={0.85}
              onPress={() => navigation.push('PropertyDetails', { property: { ...s, hostListingId: s.hostListingId || s.id } })}>
              <Image source={{ uri: s.image || (Array.isArray(s.images) ? (typeof s.images[0] === 'string' ? s.images[0] : s.images[0]?.url) : undefined) }} style={styles.stayImg} />
              <View style={{ flex: 1 }}>
                <Text style={styles.stayType}>{s.type || 'Stay'}</Text>
                <Text style={styles.stayTitle} numberOfLines={1}>{s.title}</Text>
                <View style={styles.stayMeta}>
                  <Ionicons name="star" size={12} color={colors.textPrimary} />
                  <Text style={styles.stayMetaText}>{s.rating || 'New'} · {s.reviews ?? 0} reviews</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.divider} />

        {/* ---------- Actions ---------- */}
        <TouchableOpacity style={styles.actionRow} activeOpacity={0.7}>
          <Ionicons name="flag-outline" size={20} color={colors.textSecondary} />
          <Text style={styles.actionText}>Report {name.split(' ')[0]}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionRow} activeOpacity={0.7}>
          <Ionicons name="ban-outline" size={20} color={colors.textSecondary} />
          <Text style={styles.actionText}>Block {name.split(' ')[0]}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: any, isDark: boolean, width: number) {
  const CARD_H = 200;
  return StyleSheet.create({
    container: { flex: 1 },
    backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.backgroundSecondary, marginLeft: spacing.lg, marginVertical: spacing.sm },
    cardWrap: { height: CARD_H, marginHorizontal: spacing.lg, marginTop: spacing.sm },
    card: {
      position: 'absolute', top: 0, left: 0, right: 0, height: CARD_H,
      borderRadius: 24, padding: spacing.lg, backfaceVisibility: 'hidden',
      shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 6,
      overflow: 'hidden',
    },
    cardFront: { backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center' },
    cardLeft: { flex: 1.2, alignItems: 'flex-start' },
    cardRight: { flex: 1, paddingLeft: spacing.md },
    avatarWrap: { width: 92, height: 92, marginBottom: spacing.sm },
    avatar: { width: 92, height: 92, borderRadius: 46, borderWidth: 3, borderColor: colors.surface },
    avatarFallback: { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    avatarInitial: { color: '#fff', fontSize: 34, ...fonts.bold },
    verifiedDot: { position: 'absolute', right: 2, bottom: 2, width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.surface },
    hostName: { fontSize: 24, ...fonts.bold, color: colors.textPrimary, letterSpacing: -0.5 },
    superRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    superText: { fontSize: fontSizes.sm, color: colors.textSecondary, ...fonts.medium },
    statCell: { paddingVertical: spacing.sm },
    statValueRow: { flexDirection: 'row', alignItems: 'center' },
    statValue: { fontSize: 19, ...fonts.bold, color: colors.textPrimary },
    statLabel: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 1 },
    statDivider: { height: 1, backgroundColor: colors.borderLight },
    flipHint: { position: 'absolute', right: spacing.md, bottom: spacing.sm, fontSize: 11, color: colors.textTertiary, ...fonts.medium },
    cardBack: { justifyContent: 'space-between' },
    patternLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row', flexWrap: 'wrap', opacity: 0.9 },
    backName: { color: '#fff', fontSize: 22, ...fonts.bold },
    backVerified: { color: 'rgba(255,255,255,0.92)', fontSize: fontSizes.base, ...fonts.semiBold, marginTop: 2 },
    backBody: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.md },
    backTagline: { flex: 1, color: 'rgba(255,255,255,0.9)', fontSize: fontSizes.sm, lineHeight: 18, ...fonts.medium },
    backAvatar: { width: 72, height: 90, borderRadius: 12 },
    verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
    verifiedText: { fontSize: fontSizes.lg, color: colors.textPrimary, ...fonts.semiBold, textDecorationLine: 'underline' },
    divider: { height: 1, backgroundColor: colors.borderLight, marginHorizontal: spacing.lg, marginVertical: spacing.sm },
    sectionTitle: { fontSize: 22, ...fonts.bold, color: colors.textPrimary, paddingHorizontal: spacing.lg, marginTop: spacing.md, marginBottom: spacing.md, letterSpacing: -0.4 },
    emptyNote: { fontSize: fontSizes.base, color: colors.textSecondary, paddingHorizontal: spacing.lg, ...fonts.regular },
    reviewCard: { width: width * 0.7, backgroundColor: colors.surface, borderRadius: 18, padding: spacing.lg, borderWidth: 1, borderColor: colors.borderLight },
    reviewHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
    reviewAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    reviewInitial: { fontSize: 16, ...fonts.bold, color: '#334155' },
    reviewName: { fontSize: fontSizes.base, ...fonts.semiBold, color: colors.textPrimary },
    reviewText: { fontSize: fontSizes.base, color: colors.textSecondary, lineHeight: 21, ...fonts.regular },
    stayRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', backgroundColor: colors.surface, borderRadius: 16, padding: spacing.sm, borderWidth: 1, borderColor: colors.borderLight },
    stayImg: { width: 84, height: 84, borderRadius: 12, backgroundColor: colors.backgroundSecondary },
    stayType: { fontSize: fontSizes.xs, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4, ...fonts.semiBold },
    stayTitle: { fontSize: fontSizes.lg, ...fonts.bold, color: colors.textPrimary, marginTop: 1 },
    stayMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    stayMetaText: { fontSize: fontSizes.sm, color: colors.textSecondary },
    actionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.base },
    actionText: { fontSize: fontSizes.lg, color: colors.textPrimary, ...fonts.medium },
  });
}
