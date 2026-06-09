import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, useWindowDimensions,
  NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { fontSizes, fonts, spacing, borderRadius } from '../constants';
import { useTheme } from '../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHaptics } from '../hooks/useHaptics';
import { getThingToDo, type ThingToDo } from '../data/thingsToDo';

const HIT = { top: 8, bottom: 8, left: 8, right: 8 };

export const ActivityDetailsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const styles = makeStyles(colors);

  const params: any = route.params || {};
  // Prefer the full item passed from the list; fall back to an id lookup.
  const item: ThingToDo =
    params.activity ??
    getThingToDo(String(params.activityId ?? 'td-world-1')) ??
    getThingToDo('td-world-1')!;

  const gallery = item.gallery?.length ? item.gallery : [item.image];
  const [page, setPage] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    setPage(Math.round(e.nativeEvent.contentOffset.x / width));

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing['4xl'] }}>
        {/* Image gallery */}
        <View style={{ height: 320 }}>
          <ScrollView ref={scrollRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onScroll}>
            {gallery.map((uri, i) => (
              <Image key={i} source={{ uri }} style={{ width, height: 320 }} resizeMode="cover" />
            ))}
          </ScrollView>
          <LinearGradient colors={['rgba(0,0,0,0.35)', 'transparent', 'transparent']} style={styles.topScrim} pointerEvents="none" />
          <TouchableOpacity style={[styles.backBtn, { top: insets.top + spacing.sm }]} onPress={() => navigation.goBack()} hitSlop={HIT}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          {gallery.length > 1 && (
            <View style={styles.dots}>
              {gallery.map((_, i) => <View key={i} style={[styles.dot, i === page && styles.dotOn]} />)}
            </View>
          )}
          <View style={styles.catBadge}><Text style={styles.catText}>{item.category}</Text></View>
        </View>

        <View style={styles.body}>
          {/* Title + location */}
          <Text style={styles.title}>{item.title}</Text>
          <View style={styles.locRow}>
            <Ionicons name="location-outline" size={15} color={colors.textSecondary} />
            <Text style={styles.loc}>{item.area || item.location}</Text>
          </View>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={15} color={colors.gold} />
            <Text style={styles.rating}>{item.rating.toFixed(1)}</Text>
            <Text style={styles.ratingSub}>· {item.reviewCount} traveller reviews</Text>
          </View>

          {/* Info chips */}
          <View style={styles.infoRow}>
            <Info icon="time-outline" label="Best time" value={item.bestTime} colors={colors} />
            <Info icon="hourglass-outline" label="Duration" value={item.duration} colors={colors} />
          </View>

          {/* Not-a-booking note */}
          <View style={styles.note}>
            <Ionicons name="compass-outline" size={16} color={colors.primary} />
            <Text style={styles.noteText}>Just inspiration — this isn’t a booking. There’s no host or payment; explore it on your own, your way.</Text>
          </View>

          {/* About */}
          <Text style={styles.section}>About this</Text>
          <Text style={styles.desc}>{item.description}</Text>

          {/* What you'll do */}
          <Text style={styles.section}>What you’ll do</Text>
          {item.highlights.map((h, i) => (
            <View key={i} style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText}>{h}</Text>
            </View>
          ))}

          {/* What to carry */}
          <Text style={styles.section}>What to carry</Text>
          <View style={styles.chipWrap}>
            {item.whatToCarry.map((w, i) => (
              <View key={i} style={styles.chip}><Ionicons name="checkmark" size={13} color={colors.primary} /><Text style={styles.chipText}>{w}</Text></View>
            ))}
          </View>

          {/* Tips */}
          <Text style={styles.section}>Good to know</Text>
          {item.tips.map((t, i) => (
            <View key={i} style={styles.tipRow}>
              <Ionicons name="bulb-outline" size={15} color={colors.gold} />
              <Text style={styles.tipText}>{t}</Text>
            </View>
          ))}

          {/* Where */}
          <Text style={styles.section}>Where</Text>
          <View style={styles.whereCard}>
            <View style={styles.whereRow}><Text style={styles.whereK}>Area</Text><Text style={styles.whereV}>{item.area}</Text></View>
            <View style={styles.whereRow}><Text style={styles.whereK}>Address</Text><Text style={styles.whereV} numberOfLines={2}>{item.address}</Text></View>
            <View style={[styles.whereRow, { borderBottomWidth: 0 }]}><Text style={styles.whereK}>City</Text><Text style={styles.whereV}>{item.location}</Text></View>
          </View>

          {/* Reviews */}
          <View style={styles.section2}>
            <Text style={styles.section}>Traveller reviews</Text>
            <View style={styles.reviewScore}><Ionicons name="star" size={14} color={colors.gold} /><Text style={styles.reviewScoreText}>{item.rating.toFixed(1)}</Text></View>
          </View>
          {item.reviews.map((r, i) => (
            <View key={i} style={styles.reviewCard}>
              <View style={styles.reviewHead}>
                <Image source={{ uri: r.avatar }} style={styles.reviewAvatar} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.reviewName}>{r.name}</Text>
                  <View style={styles.reviewStars}>
                    {[1, 2, 3, 4, 5].map((n) => <Ionicons key={n} name={r.rating >= n ? 'star' : 'star-outline'} size={11} color={colors.gold} />)}
                    <Text style={styles.reviewDate}> · {r.date}</Text>
                  </View>
                </View>
              </View>
              <Text style={styles.reviewText}>{r.text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const Info = ({ icon, label, value, colors }: any) => {
  const styles = makeStyles(colors);
  return (
    <View style={styles.info}>
      <Ionicons name={icon} size={17} color={colors.primary} />
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
};

const makeStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    topScrim: { position: 'absolute', top: 0, left: 0, right: 0, height: 110 },
    backBtn: { position: 'absolute', left: spacing.lg, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
    dots: { position: 'absolute', bottom: spacing.lg, alignSelf: 'center', flexDirection: 'row', gap: 6 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
    dotOn: { width: 18, backgroundColor: '#fff' },
    catBadge: { position: 'absolute', bottom: spacing.lg, left: spacing.lg, backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: 999 },
    catText: { color: '#fff', fontSize: fontSizes.xs, ...fonts.bold },
    body: { padding: spacing.lg },
    title: { fontSize: fontSizes['2xl'], color: colors.textPrimary, ...fonts.bold },
    locRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.xs },
    loc: { fontSize: fontSizes.base, color: colors.textSecondary, ...fonts.regular },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm },
    rating: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.bold },
    ratingSub: { fontSize: fontSizes.sm, color: colors.textTertiary, ...fonts.regular },
    infoRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
    info: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.base, borderRadius: borderRadius.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderLight },
    infoLabel: { fontSize: fontSizes.xs, color: colors.textTertiary, ...fonts.medium },
    infoValue: { fontSize: fontSizes.sm, color: colors.textPrimary, ...fonts.semiBold },
    note: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: spacing.lg, padding: spacing.base, borderRadius: borderRadius.lg, backgroundColor: colors.primaryUltraLight },
    noteText: { flex: 1, fontSize: fontSizes.sm, color: colors.textPrimary, lineHeight: 19, ...fonts.medium },
    section: { fontSize: fontSizes.lg, color: colors.textPrimary, marginTop: spacing.xl, marginBottom: spacing.sm, ...fonts.bold },
    section2: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    reviewScore: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.xl, marginBottom: spacing.sm },
    reviewScoreText: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.bold },
    desc: { fontSize: fontSizes.base, lineHeight: 23, color: colors.textPrimary, ...fonts.regular },
    bulletRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm, alignItems: 'flex-start' },
    bulletDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginTop: 8 },
    bulletText: { flex: 1, fontSize: fontSizes.base, color: colors.textPrimary, lineHeight: 22, ...fonts.regular },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 999, backgroundColor: colors.primaryUltraLight },
    chipText: { fontSize: fontSizes.sm, color: colors.textPrimary, ...fonts.medium },
    tipRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginBottom: spacing.sm },
    tipText: { flex: 1, fontSize: fontSizes.base, color: colors.textSecondary, lineHeight: 21, ...fonts.regular },
    whereCard: { borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.card, paddingHorizontal: spacing.base },
    whereRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight },
    whereK: { fontSize: fontSizes.base, color: colors.textSecondary, ...fonts.regular },
    whereV: { flex: 1, textAlign: 'right', fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.semiBold },
    reviewCard: { borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.card, padding: spacing.base, marginBottom: spacing.sm },
    reviewHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
    reviewAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.backgroundSecondary },
    reviewName: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.semiBold },
    reviewStars: { flexDirection: 'row', alignItems: 'center', gap: 1, marginTop: 2 },
    reviewDate: { fontSize: fontSizes.xs, color: colors.textTertiary, ...fonts.regular },
    reviewText: { fontSize: fontSizes.base, lineHeight: 21, color: colors.textPrimary, ...fonts.regular },
  });

export default ActivityDetailsScreen;
