import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useHaptics } from '../hooks/useHaptics';
import { fonts, fontSizes, spacing, borderRadius, letterSpacing } from '../constants';
import { withOpacity } from '../utils/color';
import { ScreenHeader } from '../components/common';
import { getGuestReviews, respondToReview, getHostToGuest, avgRating, type GuestReview } from '../data/hostReviews';
import { Api } from '../../api';
import { getReservations, type HostReservation } from '../data/reservations';
import { buildReviewIntel } from '../services/reviewInsights';

export function ReviewsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { light, success } = useHaptics();
  const styles = makeStyles(colors);
  const [reviews, setReviews] = useState<GuestReview[]>([]);
  const [toReview, setToReview] = useState<HostReservation[]>([]);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');

  const load = React.useCallback(() => {
    let active = true;
    (async () => {
      const [gr, res, h2g] = await Promise.all([getGuestReviews(), getReservations(), getHostToGuest()]);
      if (!active) return;
      setReviews(gr);
      // Prefer REAL backend reviews about this host's stays (cross-device).
      (async () => {
        try {
          await Api.auth.ensureSession();
          const r: any = await Api.reviews.forHost();
          const live = (r?.items || []).map((rv: any) => ({
            id: String(rv.id), guestName: rv.authorName || 'Guest', guestAvatar: `https://i.pravatar.cc/150?u=${rv.id}`,
            listingTitle: rv.listingTitle || 'Your stay', rating: rv.rating || 5, text: rv.text || '',
            date: rv.createdAt ? new Date(rv.createdAt).toLocaleDateString() : '', response: rv.response || undefined,
          }));
          if (active && live.length) setReviews(live);
        } catch { /* offline → local */ }
      })();
      const reviewed = new Set(h2g.map((r) => r.reservationId));
      setToReview(res.filter((r) => r.status === 'completed' && !reviewed.has(r.id)));
    })();
    return () => { active = false; };
  }, []);
  useFocusEffect(load);

  const avg = avgRating(reviews);
  const intel = buildReviewIntel(reviews);

  const submitResponse = async (id: string) => {
    if (!responseText.trim()) return;
    success();
    const text = responseText.trim();
    const next = await respondToReview(id, text);
    setReviews(next);
    setRespondingId(null);
    setResponseText('');
    // Mirror the reply to the backend so guests see it across devices.
    try { await Api.auth.ensureSession(); await Api.reviews.respond(id, text); } catch { /* offline — local saved */ }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Reviews" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['4xl'] }}>
        {/* Rating summary */}
        <View style={styles.summary}>
          <Ionicons name="star" size={26} color={colors.gold} />
          <Text style={styles.avg}>{avg ? avg.toFixed(2) : '—'}</Text>
          <Text style={styles.summarySub}>{reviews.length} review{reviews.length === 1 ? '' : 's'} from guests</Text>
        </View>

        {/* AI suggestions from these reviews */}
        <TouchableOpacity style={styles.suggestCta} activeOpacity={0.85} onPress={() => navigation.navigate('SmartSuggestions')}>
          <View style={styles.suggestIcon}><Ionicons name="bulb" size={18} color={colors.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.suggestTitle}>Get smart suggestions</Text>
            <Text style={styles.suggestSub}>AI reads these reviews and tells you what to fix, upgrade or highlight</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </TouchableOpacity>

        {/* What guests love */}
        {intel.loved.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>What guests love</Text>
            <View style={styles.lovedWrap}>
              {intel.loved.map((l) => (
                <View key={l.key} style={styles.lovedChip}>
                  <Ionicons name={l.icon as any} size={14} color={colors.primary} />
                  <Text style={styles.lovedText}>{l.label}</Text>
                  <View style={styles.lovedCount}><Text style={styles.lovedCountText}>{l.count}</Text></View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Needs attention */}
        {intel.attention.length > 0 && (
          <>
            <View style={styles.attnHead}>
              <Ionicons name="alert-circle" size={16} color={colors.warning} />
              <Text style={styles.sectionTitleInline}>Needs attention</Text>
              <View style={styles.attnBadge}><Text style={styles.attnBadgeText}>{intel.attention.length}</Text></View>
            </View>
            <Text style={styles.attnHint}>Low ratings or reviews without a reply — responding builds trust with future guests.</Text>
            {intel.attention.slice(0, 3).map((rv) => (
              <TouchableOpacity key={`attn-${rv.id}`} style={styles.attnCard} activeOpacity={0.85} onPress={() => { light(); setRespondingId(rv.id); }}>
                <View style={styles.attnRow}>
                  <Image source={{ uri: rv.guestAvatar }} style={styles.attnAvatar} contentFit="cover" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.guestName}>{rv.guestName}</Text>
                    <View style={styles.stars}>{Array.from({ length: 5 }).map((_, i) => <Ionicons key={i} name={i < rv.rating ? 'star' : 'star-outline'} size={12} color={colors.gold} />)}</View>
                  </View>
                  {!rv.response && <View style={styles.replyPill}><Text style={styles.replyPillText}>Reply</Text></View>}
                </View>
                <Text style={styles.attnText} numberOfLines={2}>“{rv.text}”</Text>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Guests to review */}
        {toReview.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Review your guests</Text>
            {toReview.map((r) => (
              <View key={r.id} style={styles.toReviewRow}>
                <Image source={{ uri: r.guestAvatar }} style={styles.avatar} contentFit="cover" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.guestName}>{r.guestName}</Text>
                  <Text style={styles.sub}>{r.listingTitle} · {r.checkOut}</Text>
                </View>
                <TouchableOpacity style={styles.reviewBtn} onPress={() => { light(); navigation.navigate('GuestReview', { id: r.id, guestName: r.guestName }); }}>
                  <Text style={styles.reviewBtnText}>Review</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

        {/* Reviews from guests */}
        <Text style={styles.sectionTitle}>From your guests</Text>
        {reviews.map((rv) => (
          <View key={rv.id} style={styles.card}>
            <View style={styles.cardHead}>
              <Image source={{ uri: rv.guestAvatar }} style={styles.avatar} contentFit="cover" />
              <View style={{ flex: 1 }}>
                <Text style={styles.guestName}>{rv.guestName}</Text>
                <Text style={styles.sub}>{rv.listingTitle} · {rv.date}</Text>
              </View>
              <View style={styles.stars}>
                {Array.from({ length: 5 }).map((_, i) => <Ionicons key={i} name={i < rv.rating ? 'star' : 'star-outline'} size={13} color={colors.gold} />)}
              </View>
            </View>
            <Text style={styles.reviewText}>{rv.text}</Text>

            {rv.response ? (
              <View style={styles.response}>
                <Text style={styles.responseLabel}>Your response</Text>
                <Text style={styles.responseText}>{rv.response}</Text>
              </View>
            ) : respondingId === rv.id ? (
              <View style={styles.respondBox}>
                <TextInput style={styles.respondInput} placeholder="Write a public response…" placeholderTextColor={colors.textTertiary} value={responseText} onChangeText={setResponseText} multiline />
                <View style={styles.respondActions}>
                  <TouchableOpacity onPress={() => { setRespondingId(null); setResponseText(''); }}><Text style={styles.cancel}>Cancel</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.sendBtn} onPress={() => submitResponse(rv.id)}><Text style={styles.sendText}>Post</Text></TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity onPress={() => { light(); setRespondingId(rv.id); }} style={styles.respondLink}>
                <Ionicons name="arrow-undo-outline" size={15} color={colors.primary} />
                <Text style={styles.respondLinkText}>Respond</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    summary: { alignItems: 'center', paddingVertical: spacing.lg, gap: 4 },
    suggestCta: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.base, borderRadius: borderRadius.lg, backgroundColor: colors.primarySubtle, marginBottom: spacing.md },
    suggestIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
    suggestTitle: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.bold },
    suggestSub: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 1, ...fonts.regular },
    avg: { fontSize: fontSizes['4xl'], color: colors.textPrimary, ...fonts.bold },
    summarySub: { fontSize: fontSizes.sm, color: colors.textSecondary, ...fonts.regular },
    sectionTitle: { fontSize: fontSizes.lg, letterSpacing: letterSpacing.snug, color: colors.textPrimary, marginTop: spacing.xl, marginBottom: spacing.sm, ...fonts.bold },
    lovedWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    lovedChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingLeft: spacing.md, paddingRight: 5, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.primarySubtle },
    lovedText: { fontSize: fontSizes.sm, color: colors.primary, ...fonts.semiBold },
    lovedCount: { minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
    lovedCountText: { fontSize: 10, color: '#fff', ...fonts.bold },
    attnHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.xl, marginBottom: spacing.xs },
    sectionTitleInline: { fontSize: fontSizes.lg, letterSpacing: letterSpacing.snug, color: colors.textPrimary, ...fonts.bold },
    attnBadge: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.warning },
    attnBadgeText: { fontSize: 11, color: '#fff', ...fonts.bold },
    attnHint: { fontSize: fontSizes.sm, color: colors.textTertiary, marginBottom: spacing.sm, ...fonts.regular },
    attnCard: { padding: spacing.base, borderRadius: borderRadius.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: withOpacity(colors.warning, 0.3), marginBottom: spacing.sm },
    attnRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    attnAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.backgroundSecondary },
    replyPill: { paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: 999, backgroundColor: withOpacity(colors.warning, 0.15) },
    replyPillText: { fontSize: fontSizes.xs, color: colors.warning, ...fonts.bold },
    attnText: { fontSize: fontSizes.sm, color: colors.textSecondary, fontStyle: 'italic', marginTop: spacing.sm, lineHeight: 19, ...fonts.regular },
    toReviewRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.base, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.card, marginBottom: spacing.sm },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.backgroundSecondary },
    guestName: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.bold },
    sub: { fontSize: fontSizes.sm, color: colors.textTertiary, marginTop: 1, ...fonts.regular },
    reviewBtn: { paddingHorizontal: spacing.base, paddingVertical: spacing.sm, borderRadius: 999, backgroundColor: withOpacity(colors.primary, 0.12) },
    reviewBtnText: { fontSize: fontSizes.sm, color: colors.primary, ...fonts.bold },
    card: { borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.card, padding: spacing.base, marginBottom: spacing.sm },
    cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    stars: { flexDirection: 'row', gap: 1 },
    reviewText: { fontSize: fontSizes.base, lineHeight: 21, color: colors.textPrimary, marginTop: spacing.sm, ...fonts.regular },
    respondLink: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: spacing.sm },
    respondLinkText: { fontSize: fontSizes.sm, color: colors.primary, ...fonts.semiBold },
    respondBox: { marginTop: spacing.sm },
    respondInput: { backgroundColor: colors.backgroundSecondary, borderRadius: borderRadius.md, padding: spacing.md, minHeight: 70, fontSize: fontSizes.base, color: colors.textPrimary, textAlignVertical: 'top' },
    respondActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: spacing.lg, marginTop: spacing.sm },
    cancel: { fontSize: fontSizes.sm, color: colors.textSecondary, ...fonts.semiBold },
    sendBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: 999, backgroundColor: colors.primary },
    sendText: { fontSize: fontSizes.sm, color: '#fff', ...fonts.bold },
    response: { marginTop: spacing.sm, padding: spacing.md, borderRadius: borderRadius.md, backgroundColor: colors.backgroundSecondary },
    responseLabel: { fontSize: fontSizes.xs, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5, ...fonts.bold },
    responseText: { fontSize: fontSizes.base, color: colors.textPrimary, marginTop: 4, lineHeight: 20, ...fonts.regular },
  });

export default ReviewsScreen;
