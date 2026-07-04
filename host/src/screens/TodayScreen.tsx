import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useHaptics } from '../hooks/useHaptics';
import { fonts, fontSizes, spacing, borderRadius, letterSpacing, shadows } from '../constants';
import { withOpacity } from '../utils/color';
import { STAYON_GRADIENT } from '../components/GradientButton';
import { getReservations, type HostReservation } from '../data/reservations';
import { getHostProfile, firstName } from '../data/hostProfile';
import { getGuestReviews, avgRating, type GuestReview } from '../data/hostReviews';
import { getListings, listingUSD, type HostListing } from '../data/listings';
import { ALL_ARTICLES } from '../data/resources';
import { buildInsights } from '../services/insights';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const stock = (id: string) => `https://images.unsplash.com/${id}?w=1000&q=80&auto=format&fit=crop`;
const STOCK_HOME = stock('photo-1502672260266-1c1ef2d93688');
const SCRIM = ['rgba(15,23,42,0.05)', 'rgba(15,23,42,0.35)', 'rgba(15,23,42,0.9)'] as const;

function parseDate(s: string): Date | null {
  const m = MONTHS.findIndex((x) => s.startsWith(x));
  const dm = s.match(/\b(\d{1,2}),/);
  const ym = s.match(/(\d{4})/);
  if (m < 0 || !dm || !ym) return null;
  return new Date(Number(ym[1]), m, Number(dm[1]));
}
function relativeLabel(d: Date): { label: string; days: number } {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const t = new Date(d); t.setHours(0, 0, 0, 0);
  const days = Math.round((t.getTime() - now.getTime()) / 86400000);
  let label: string;
  if (days < 0) label = `${MONTHS[d.getMonth()]} ${d.getDate()}`;
  else if (days === 0) label = 'Today';
  else if (days === 1) label = 'Tomorrow';
  else if (days < 7) label = `In ${days} days`;
  else label = `${MONTHS[d.getMonth()]} ${d.getDate()}`;
  return { label, days };
}

export function TodayScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { format, currency } = useCurrency();
  const { light } = useHaptics();
  const styles = makeStyles(colors);

  const [res, setRes] = useState<HostReservation[]>([]);
  const [profile, setProfile] = useState<{ name: string; avatar?: string }>({ name: 'host' });
  const [reviews, setReviews] = useState<GuestReview[]>([]);
  const [listings, setListings] = useState<HostListing[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      getHostProfile().then((p) => { if (active) setProfile({ name: p.name, avatar: p.avatar }); });
      getReservations().then((all) => { if (active) setRes(all); });
      getGuestReviews().then((r) => { if (active) setReviews(r); });
      getListings().then((l) => { if (active) setListings(l); });
      return () => { active = false; };
    }, [])
  );

  const hostName = firstName(profile.name);
  const now = new Date();
  const earningRes = res.filter((r) => r.status === 'confirmed' || r.status === 'completed');
  const inMonth = (r: HostReservation, off: number) => {
    const d = parseDate(r.checkIn); if (!d) return false;
    const ref = new Date(now.getFullYear(), now.getMonth() + off, 1);
    return d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear();
  };
  const thisMonth = earningRes.filter((r) => inMonth(r, 0));
  const lastMonth = earningRes.filter((r) => inMonth(r, -1));
  const monthEarnings = thisMonth.reduce((s, r) => s + r.payout, 0);
  const lastEarnings = lastMonth.reduce((s, r) => s + r.payout, 0);
  const trendPct = lastEarnings > 0 ? Math.round(((monthEarnings - lastEarnings) / lastEarnings) * 100) : null;

  const upcoming = res.filter((r) => r.status === 'confirmed').length;
  const pending = res.filter((r) => r.status === 'pending').length;
  const occupancy = Math.min(99, 40 + upcoming * 12);
  const rating = avgRating(reviews);
  const latestReview = reviews[0];
  const insight = buildInsights(res, listings, reviews)[0];

  const heroListing = listings.find((l) => l.status === 'published') ?? listings[0];
  const heroImg = heroListing?.images?.[0] ?? STOCK_HOME;

  const nextCheckIn = res
    .filter((r) => r.status === 'confirmed')
    .map((r) => ({ r, d: parseDate(r.checkIn) }))
    .filter((x) => x.d)
    .sort((a, b) => a.d!.getTime() - b.d!.getTime())[0];

  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  let todayStr: string;
  try { todayStr = now.toLocaleDateString(currency.locale, { weekday: 'short', month: 'short', day: 'numeric' }); }
  catch { todayStr = `${MONTHS[now.getMonth()]} ${now.getDate()}`; }

  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
  const tip = ALL_ARTICLES[dayOfYear % ALL_ARTICLES.length];

  const TOOLS = [
    { icon: 'home', label: 'Listings', route: 'Listings' },
    { icon: 'calendar', label: 'Calendar', route: 'CalendarTab', tab: true },
    { icon: 'clipboard', label: 'Reservations', route: 'ReservationsTab', tab: true, badge: pending },
    { icon: 'stats-chart', label: 'Earnings', route: 'Earnings' },
    { icon: 'chatbubbles', label: 'Inbox', route: 'InboxTab', tab: true },
    { icon: 'star', label: 'Reviews', route: 'Reviews' },
    { icon: 'trending-up', label: 'Trends', route: 'Trends' },
    { icon: 'wallet', label: 'Payouts', route: 'Payouts' },
    { icon: 'construct', label: 'Maintenance', route: 'Maintenance' },
    { icon: 'shield-checkmark', label: 'Safety', route: 'Safety' },
    { icon: 'book', label: 'Resources', route: 'Resources' },
    { icon: 'sparkles', label: 'Assistant', route: 'HostAssistant' },
    { icon: 'add-circle', label: 'New listing', route: 'ListingCreate' },
  ];
  const goTool = (t: any) => { light(); t.tab ? navigation.navigate(t.route) : navigation.navigate(t.route); };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing['4xl'] }}>
        {/* Greeting */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>{todayStr.toUpperCase()}</Text>
            <Text style={styles.title}>{greeting}, {hostName}</Text>
          </View>
          <TouchableOpacity style={styles.bell} onPress={() => { light(); navigation.navigate('NotificationCenter'); }}>
            <Ionicons name="notifications-outline" size={20} color={colors.textPrimary} />
            {pending > 0 && <View style={styles.bellDot} />}
          </TouchableOpacity>
          <TouchableOpacity style={styles.avatarWrap} onPress={() => { light(); navigation.navigate('ProfileTab' as never); }}>
            {profile.avatar ? (
              <Image source={{ uri: profile.avatar }} style={styles.headAvatar} contentFit="cover" />
            ) : (
              <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.headAvatar}>
                <Text style={styles.headAvatarTxt}>{(profile.name || 'H').trim().charAt(0).toUpperCase()}</Text>
              </LinearGradient>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Hero: your place (or create first) ── */}
        {heroListing ? (
          <TouchableOpacity style={styles.heroCard} activeOpacity={0.92} onPress={() => { light(); navigation.navigate('ListingDetails', { id: heroListing.id }); }}>
            <Image source={{ uri: heroImg }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
            <LinearGradient colors={SCRIM} style={StyleSheet.absoluteFill} />
            <View style={styles.heroTopRow}>
              <View style={styles.glassPill}><Ionicons name="home" size={12} color="#fff" /><Text style={styles.glassText}>Your place</Text></View>
              {rating > 0 && <View style={styles.glassPill}><Ionicons name="star" size={12} color="#fff" /><Text style={styles.glassText}>{rating.toFixed(2)}</Text></View>}
            </View>
            <View style={styles.heroBottom}>
              <Text style={styles.heroTitle} numberOfLines={1}>{heroListing.title || 'Your listing'}</Text>
              <Text style={styles.heroSub} numberOfLines={1}>{[heroListing.city, heroListing.country].filter(Boolean).join(', ') || 'Tap to manage'}</Text>
              <View style={styles.heroRow}>
                <Text style={styles.heroPrice}>{format(listingUSD(heroListing.price, heroListing.priceCurrency))}<Text style={styles.heroPriceUnit}> / night</Text></Text>
                <View style={styles.manageBtn}><Text style={styles.manageText}>Manage</Text><Ionicons name="chevron-forward" size={14} color="#fff" /></View>
              </View>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.heroCard} activeOpacity={0.92} onPress={() => { light(); navigation.navigate('ListingCreate'); }}>
            <Image source={{ uri: STOCK_HOME }} style={StyleSheet.absoluteFill} contentFit="cover" />
            <LinearGradient colors={SCRIM} style={StyleSheet.absoluteFill} />
            <View style={styles.heroBottom}>
              <Text style={styles.heroTitle}>List your first place</Text>
              <Text style={styles.heroSub}>You’re minutes from your first booking.</Text>
              <View style={[styles.manageBtn, { alignSelf: 'flex-start', marginTop: spacing.sm }]}><Ionicons name="add" size={15} color="#fff" /><Text style={styles.manageText}>Start listing</Text></View>
            </View>
          </TouchableOpacity>
        )}

        {/* ── Earnings strip ── */}
        <TouchableOpacity activeOpacity={0.92} onPress={() => { light(); navigation.navigate('Earnings'); }}>
          <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.earnCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.earnLabel}>{MONTHS[now.getMonth()]} earnings · 0% fee</Text>
              <Text style={styles.earnValue}>{format(monthEarnings)}</Text>
              <Text style={styles.earnSub}>
                {trendPct !== null ? `${trendPct >= 0 ? '▲' : '▼'} ${Math.abs(trendPct)}% vs last month` : `${thisMonth.length} booking${thisMonth.length === 1 ? '' : 's'} this month`}
              </Text>
            </View>
            <View style={styles.earnArrow}><Ionicons name="arrow-forward" size={18} color="#fff" /></View>
          </LinearGradient>
        </TouchableOpacity>

        {/* ── Glance stats ── */}
        <View style={styles.glanceRow}>
          <Glance icon="bar-chart" tint={colors.primary} value={`${occupancy}%`} label="Occupancy" colors={colors} />
          <Glance icon="calendar" tint={colors.info} value={String(upcoming)} label="Upcoming" colors={colors} />
          <Glance icon="time" tint={colors.warning} value={String(pending)} label="Requests" colors={colors} />
        </View>

        {/* ── Smart insight ── */}
        {insight && (
          <TouchableOpacity
            style={[styles.insightCard, { borderLeftColor: insight.tone === 'action' ? colors.warning : insight.tone === 'opportunity' ? colors.primary : colors.success }]}
            activeOpacity={insight.route ? 0.85 : 1}
            onPress={() => { if (!insight.route) return; light(); insight.params ? navigation.navigate(insight.route, insight.params) : navigation.navigate(insight.route as never); }}
          >
            <View style={[styles.insightIcon, { backgroundColor: withOpacity(insight.tone === 'action' ? colors.warning : colors.primary, 0.14) }]}>
              <Ionicons name={insight.icon as any} size={18} color={insight.tone === 'action' ? colors.warning : colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.insightTopRow}><Text style={styles.insightKicker}>SMART TIP</Text></View>
              <Text style={styles.insightTitle}>{insight.title}</Text>
              <Text style={styles.insightBody} numberOfLines={2}>{insight.body}</Text>
            </View>
            {insight.route && <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
          </TouchableOpacity>
        )}

        {/* ── Next check-in (photo card) ── */}
        {nextCheckIn && (
          <>
            <SectionTitle title="Next check‑in" action="All" onAction={() => { light(); navigation.navigate('ReservationsTab' as never); }} styles={styles} />
            <TouchableOpacity style={styles.guestCard} activeOpacity={0.92} onPress={() => { light(); navigation.navigate('CheckInPrep', { id: nextCheckIn.r.id }); }}>
              <Image source={{ uri: nextCheckIn.r.image }} style={StyleSheet.absoluteFill} contentFit="cover" />
              <LinearGradient colors={SCRIM} style={StyleSheet.absoluteFill} />
              <View style={styles.guestPillTop}>
                <Text style={styles.guestPillText}>{relativeLabel(nextCheckIn.d!).label}</Text>
              </View>
              <View style={styles.guestBottom}>
                <Image source={{ uri: nextCheckIn.r.guestAvatar }} style={styles.guestAvatar} contentFit="cover" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.guestName}>{nextCheckIn.r.guestName}</Text>
                  <Text style={styles.guestMeta}>{nextCheckIn.r.checkIn} · {nextCheckIn.r.nights}n · {nextCheckIn.r.guests} guests</Text>
                </View>
                <View style={styles.prepBtn}><Text style={styles.prepText}>Prep</Text></View>
              </View>
            </TouchableOpacity>
          </>
        )}

        {/* ── All tools ── */}
        <SectionTitle title="Your tools" styles={styles} />
        <View style={styles.toolsGrid}>
          {TOOLS.map((t) => (
            <TouchableOpacity key={t.label} style={styles.tool} activeOpacity={0.8} onPress={() => goTool(t)}>
              <View style={styles.toolIconWrap}>
                <Ionicons name={t.icon as any} size={22} color={colors.primary} />
                {!!t.badge && t.badge > 0 && <View style={styles.toolBadge}><Text style={styles.toolBadgeText}>{t.badge}</Text></View>}
              </View>
              <Text style={styles.toolLabel} numberOfLines={1}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Latest review ── */}
        {latestReview && (
          <>
            <SectionTitle title="Latest review" action="All" onAction={() => { light(); navigation.navigate('Reviews'); }} styles={styles} />
            <TouchableOpacity style={styles.reviewCard} activeOpacity={0.9} onPress={() => { light(); navigation.navigate('Reviews'); }}>
              <View style={styles.reviewTop}>
                <Image source={{ uri: latestReview.guestAvatar }} style={styles.reviewAvatar} contentFit="cover" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.reviewName}>{latestReview.guestName}</Text>
                  <View style={styles.reviewStars}>
                    {[1, 2, 3, 4, 5].map((n) => <Ionicons key={n} name={latestReview.rating >= n ? 'star' : 'star-outline'} size={12} color={colors.gold} />)}
                    <Text style={styles.reviewDate}> · {latestReview.date}</Text>
                  </View>
                </View>
              </View>
              <Text style={styles.reviewText} numberOfLines={3}>“{latestReview.text}”</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── Hosting tip (photo card) ── */}
        {tip && (
          <>
            <SectionTitle title="Host like a pro" action="More" onAction={() => { light(); navigation.navigate('Resources'); }} styles={styles} />
            <TouchableOpacity style={styles.tipCard} activeOpacity={0.92} onPress={() => { light(); navigation.navigate('Resources'); }}>
              <Image source={{ uri: tip.categoryImage }} style={StyleSheet.absoluteFill} contentFit="cover" />
              <LinearGradient colors={SCRIM} style={StyleSheet.absoluteFill} />
              <View style={styles.tipBottom}>
                <Text style={styles.tipKicker}>{tip.read.toUpperCase()}</Text>
                <Text style={styles.tipTitle} numberOfLines={2}>{tip.title}</Text>
              </View>
            </TouchableOpacity>
          </>
        )}

        {/* Assistant */}
        <TouchableOpacity style={styles.assistant} activeOpacity={0.9} onPress={() => { light(); navigation.navigate('HostAssistant'); }}>
          <View style={[styles.assistantIcon, { backgroundColor: withOpacity(colors.primary, 0.14) }]}>
            <Ionicons name="sparkles" size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.assistantTitle}>Ask the Assistant</Text>
            <Text style={styles.assistantSub}>“How much did I earn this month?”</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const Glance = ({ icon, tint, value, label, colors }: any) => {
  const styles = makeStyles(colors);
  return (
    <View style={styles.glance}>
      <View style={[styles.glanceIcon, { backgroundColor: withOpacity(tint, 0.14) }]}><Ionicons name={icon} size={15} color={tint} /></View>
      <Text style={styles.glanceVal}>{value}</Text>
      <Text style={styles.glanceLabel}>{label}</Text>
    </View>
  );
};

const SectionTitle = ({ title, action, onAction, styles }: any) => (
  <View style={styles.sectionHead}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {action && <TouchableOpacity onPress={onAction}><Text style={styles.seeAll}>{action}</Text></TouchableOpacity>}
  </View>
);

const makeStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.base },
    eyebrow: { fontSize: fontSizes.xs, letterSpacing: 1.5, textTransform: 'uppercase', color: colors.primary, ...fonts.bold },
    title: { fontSize: fontSizes['3xl'], letterSpacing: letterSpacing.tight, color: colors.textPrimary, marginTop: 2, ...fonts.bold },
    bell: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, ...shadows.card },
    bellDot: { position: 'absolute', top: 10, right: 11, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.error },
    avatarWrap: { width: 42, height: 42, borderRadius: 21, overflow: 'hidden' },
    headAvatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.backgroundSecondary },
    headAvatarTxt: { color: '#fff', fontSize: fontSizes.lg, ...fonts.bold },

    heroCard: { height: 230, marginHorizontal: spacing.lg, borderRadius: borderRadius.xl, overflow: 'hidden', backgroundColor: colors.backgroundSecondary, justifyContent: 'space-between', ...shadows.raised },
    heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', padding: spacing.base },
    glassPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.32)', paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 999 },
    glassText: { color: '#fff', fontSize: fontSizes.xs, ...fonts.bold },
    heroBottom: { padding: spacing.lg },
    heroTitle: { color: '#fff', fontSize: fontSizes['2xl'], letterSpacing: letterSpacing.tight, ...fonts.bold },
    heroSub: { color: 'rgba(255,255,255,0.9)', fontSize: fontSizes.sm, marginTop: 2, ...fonts.regular },
    heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md },
    heroPrice: { color: '#fff', fontSize: fontSizes.lg, ...fonts.bold },
    heroPriceUnit: { fontSize: fontSizes.sm, color: 'rgba(255,255,255,0.85)', ...fonts.regular },
    manageBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: spacing.base, paddingVertical: spacing.sm, borderRadius: 999 },
    manageText: { color: '#fff', fontSize: fontSizes.sm, ...fonts.bold },

    earnCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.lg, marginTop: spacing.md, padding: spacing.lg, borderRadius: borderRadius.xl, ...shadows.raised },
    earnLabel: { color: 'rgba(255,255,255,0.85)', fontSize: fontSizes.sm, ...fonts.medium },
    earnValue: { color: '#fff', fontSize: fontSizes['4xl'], letterSpacing: letterSpacing.tight, marginTop: 2, ...fonts.bold },
    earnSub: { color: 'rgba(255,255,255,0.9)', fontSize: fontSizes.sm, marginTop: 2, ...fonts.semiBold },
    earnArrow: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },

    glanceRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, marginTop: spacing.md },
    glance: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: spacing.base, borderRadius: borderRadius.lg, backgroundColor: colors.card, ...shadows.card },
    glanceIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
    glanceVal: { fontSize: fontSizes.lg, color: colors.textPrimary, ...fonts.bold },
    glanceLabel: { fontSize: fontSizes.xs, color: colors.textSecondary, ...fonts.medium },

    insightCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginHorizontal: spacing.lg, marginTop: spacing.md, padding: spacing.base, borderRadius: borderRadius.lg, backgroundColor: colors.card, borderLeftWidth: 4, ...shadows.card },
    insightIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    insightTopRow: { flexDirection: 'row' },
    insightKicker: { fontSize: 9, letterSpacing: 1, color: colors.primary, ...fonts.bold },
    insightTitle: { fontSize: fontSizes.base, color: colors.textPrimary, marginTop: 1, ...fonts.bold },
    insightBody: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 2, lineHeight: 18, ...fonts.regular },

    sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: spacing.lg, marginTop: spacing.xl, marginBottom: spacing.sm },
    sectionTitle: { fontSize: fontSizes.xl, letterSpacing: letterSpacing.snug, color: colors.textPrimary, ...fonts.bold },
    seeAll: { fontSize: fontSizes.sm, color: colors.primary, ...fonts.semiBold },

    guestCard: { height: 150, marginHorizontal: spacing.lg, borderRadius: borderRadius.xl, overflow: 'hidden', backgroundColor: colors.backgroundSecondary, justifyContent: 'space-between', ...shadows.card },
    guestPillTop: { alignSelf: 'flex-start', margin: spacing.base, backgroundColor: 'rgba(0,0,0,0.32)', paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 999 },
    guestPillText: { color: '#fff', fontSize: fontSizes.xs, ...fonts.bold },
    guestBottom: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.base },
    guestAvatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: 'rgba(255,255,255,0.8)', backgroundColor: colors.backgroundSecondary },
    guestName: { color: '#fff', fontSize: fontSizes.md, ...fonts.bold },
    guestMeta: { color: 'rgba(255,255,255,0.9)', fontSize: fontSizes.sm, marginTop: 1, ...fonts.regular },
    prepBtn: { backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: spacing.base, paddingVertical: spacing.sm, borderRadius: 999 },
    prepText: { color: '#fff', fontSize: fontSizes.sm, ...fonts.bold },

    toolsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.lg, gap: spacing.sm },
    tool: { width: '22%', alignItems: 'center', gap: 6, paddingVertical: spacing.md, borderRadius: borderRadius.lg, backgroundColor: colors.card, ...shadows.card },
    toolIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySubtle },
    toolBadge: { position: 'absolute', top: -2, right: -2, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 4, backgroundColor: colors.warning, alignItems: 'center', justifyContent: 'center' },
    toolBadgeText: { color: '#fff', fontSize: 9, ...fonts.bold },
    toolLabel: { fontSize: 11, color: colors.textSecondary, ...fonts.semiBold },

    reviewCard: { marginHorizontal: spacing.lg, padding: spacing.base, borderRadius: borderRadius.lg, backgroundColor: colors.card, ...shadows.card },
    reviewTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
    reviewAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.backgroundSecondary },
    reviewName: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.semiBold },
    reviewStars: { flexDirection: 'row', alignItems: 'center', gap: 1, marginTop: 2 },
    reviewDate: { fontSize: fontSizes.xs, color: colors.textTertiary, ...fonts.regular },
    reviewText: { fontSize: fontSizes.base, color: colors.textSecondary, lineHeight: 21, fontStyle: 'italic', ...fonts.regular },

    tipCard: { height: 150, marginHorizontal: spacing.lg, borderRadius: borderRadius.xl, overflow: 'hidden', backgroundColor: colors.backgroundSecondary, justifyContent: 'flex-end', ...shadows.card },
    tipBottom: { padding: spacing.lg },
    tipKicker: { color: '#E9D5FF', fontSize: 10, letterSpacing: 1, ...fonts.bold },
    tipTitle: { color: '#fff', fontSize: fontSizes.lg, marginTop: 2, ...fonts.bold },

    assistant: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginHorizontal: spacing.lg, marginTop: spacing.lg, padding: spacing.base, borderRadius: borderRadius.lg, backgroundColor: colors.primarySubtle, borderWidth: 1, borderColor: withOpacity(colors.primary, 0.2) },
    assistantIcon: { width: 38, height: 38, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' },
    assistantTitle: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.semiBold },
    assistantSub: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 2, ...fonts.regular },
  });

export default TodayScreen;
