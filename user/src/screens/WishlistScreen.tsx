import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
  TextInput, Modal, useWindowDimensions, Animated, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { STAYON_GRADIENT } from '../components/GradientButton';
import { Skeleton } from '../components/common/SkeletonLoader';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useHaptics } from '../hooks/useHaptics';
import { confirmAction } from '../utils/confirm';
import {
  spacing, borderRadius, fontSizes, lineHeights, iconSizes,
} from '../constants';
import {
  WISHLISTS_STORAGE_KEY, SEED_WISHLISTS,
  WishlistCollection, WishlistStay,
} from '../data/wishlists';

const GRID_GAP = spacing.base;
const GRID_H_PADDING = spacing.base;

// ---- Pressable card with press-scale + haptic ------------------------------
function PressCard({
  children, onPress, style, onHaptic,
}: {
  children: React.ReactNode;
  onPress: () => void;
  style?: any;
  onHaptic?: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const animate = (to: number) =>
    Animated.spring(scale, { toValue: to, useNativeDriver: true, speed: 30, bounciness: 6 }).start();
  return (
    <Animated.View style={[style, { transform: [{ scale }] }]}>
      <TouchableOpacity
        activeOpacity={0.92}
        onPressIn={() => animate(0.96)}
        onPressOut={() => animate(1)}
        onPress={() => { onHaptic?.(); onPress(); }}
        style={{ flex: 1 }}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ---- Cover collage (2x2 of up to 4 stays, or single) -----------------------
function CoverCollage({ stays, colors }: { stays: WishlistStay[]; colors: any }) {
  const { width } = useWindowDimensions();
  const CARD_W = (width - GRID_H_PADDING * 2 - GRID_GAP) / 2;
  const styles = makeStyles(colors, CARD_W);
  const toUri = (img: any) => (typeof img === 'string' && img.length > 0 ? { uri: img } : undefined);
  if (!Array.isArray(stays) || stays.length === 0) {
    return (
      <View style={[styles.collage, styles.collageEmpty, { backgroundColor: colors.backgroundSecondary }]}>
        <Ionicons name="image-outline" size={iconSizes.lg} color={colors.textTertiary} />
      </View>
    );
  }
  if (stays.length === 1) {
    return (
      <Image source={toUri(stays[0]?.image)} style={styles.collage} contentFit="cover" transition={200} />
    );
  }
  const four = stays.slice(0, 4);
  // For 2 or 3 stays we still render a 2x2 grid; fill missing cells with a tinted block.
  return (
    <View style={[styles.collage, styles.collageGrid, { backgroundColor: colors.backgroundSecondary }]}>
      {[0, 1, 2, 3].map((i) => {
        const stay = four[i];
        return stay ? (
          <Image
            key={i}
            source={toUri(stay.image)}
            style={styles.collageCell}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View key={i} style={[styles.collageCell, { backgroundColor: colors.primarySubtle }]} />
        );
      })}
    </View>
  );
}

export function WishlistScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { format } = useCurrency();
  const openStay = (stay: WishlistStay, autoBook = false) => {
    haptics.light();
    navigation.navigate('PropertyDetails', {
      property: { id: stay.id, title: stay.title, location: stay.location, price: stay.price, rating: stay.rating, reviews: 0, images: [stay.image] },
      autoBook,
    });
  };
  const { width } = useWindowDimensions();
  const CARD_W = (width - GRID_H_PADDING * 2 - GRID_GAP) / 2;
  const haptics = useHaptics();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(colors, CARD_W);

  const [collections, setCollections] = useState<WishlistCollection[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');

  // ---- Load from AsyncStorage on mount (seed if empty) ---------------------
  useEffect(() => {
    let active = true;
    // Hold the skeleton for a brief minimum so it never flashes blank.
    const minDelay = new Promise<void>((r) => setTimeout(r, 600));
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(WISHLISTS_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as WishlistCollection[];
          // Normalize older/corrupt records: ensure every collection has an array `stays`.
          const normalized = Array.isArray(parsed)
            ? parsed.map((c) => ({ ...c, stays: Array.isArray(c?.stays) ? c.stays : [] }))
            : SEED_WISHLISTS;
          if (active) setCollections(normalized);
        } else if (active) {
          setCollections(SEED_WISHLISTS);
        }
      } catch {
        if (active) setCollections(SEED_WISHLISTS);
      } finally {
        await minDelay;
        if (active) setLoaded(true);
      }
    })();
    return () => { active = false; };
  }, []);

  // ---- Persist on change (after initial load) ------------------------------
  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(WISHLISTS_STORAGE_KEY, JSON.stringify(collections)).catch(() => {});
  }, [collections, loaded]);

  // ---- Re-read on focus so stays hearted elsewhere show up in "Saved" -------
  useFocusEffect(
    useCallback(() => {
      if (!loaded) return; // mount load handles the first time
      let active = true;
      AsyncStorage.getItem(WISHLISTS_STORAGE_KEY).then((raw) => {
        if (!active || !raw) return;
        try {
          const parsed = JSON.parse(raw) as WishlistCollection[];
          if (Array.isArray(parsed)) {
            setCollections(parsed.map((c) => ({ ...c, stays: Array.isArray(c?.stays) ? c.stays : [] })));
          }
        } catch {
          // ignore
        }
      });
      return () => { active = false; };
    }, [loaded])
  );

  const createCollection = useCallback(() => {
    const name = newName.trim();
    if (!name) return;
    haptics.success();
    setCollections((prev) => [
      { id: `wl_${Date.now()}`, name, stays: [] },
      ...prev,
    ]);
    setNewName('');
    setShowCreate(false);
  }, [newName, haptics]);

  const deleteCollection = useCallback((id: string) => {
    const col = collections.find((c) => c.id === id);
    confirmAction({
      title: 'Delete wishlist',
      message: `Delete "${col?.name ?? 'this wishlist'}"? This can't be undone.`,
      confirmText: 'Delete',
      destructive: true,
      onConfirm: () => {
        haptics.warning();
        setCollections((prev) => prev.filter((c) => c.id !== id));
        setSelectedCollectionId(null);
      },
    });
  }, [collections, haptics]);

  const removeStay = useCallback((collectionId: string, stayId: string) => {
    haptics.light();
    setCollections((prev) =>
      prev.map((c) =>
        c.id === collectionId ? { ...c, stays: c.stays.filter((s) => s.id !== stayId) } : c,
      ),
    );
  }, [haptics]);

  const selected = collections.find((c) => c.id === selectedCollectionId) ?? null;

  // ======================= DETAIL VIEW ====================================
  if (selected) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.detailHeader}>
          <TouchableOpacity
            onPress={() => { haptics.light(); setSelectedCollectionId(null); }}
            style={styles.iconBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={iconSizes.base} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.detailTitleWrap}>
            <Text style={styles.detailTitle} numberOfLines={1}>{selected.name}</Text>
            <Text style={styles.detailCount}>
              {selected.stays.length} {selected.stays.length === 1 ? 'saved' : 'saved'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => deleteCollection(selected.id)}
            style={styles.iconBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Delete wishlist"
          >
            <Ionicons name="trash-outline" size={iconSizes.sm + 2} color={colors.error} />
          </TouchableOpacity>
        </View>

        {selected.stays.length === 0 ? (
          <View style={styles.detailEmpty}>
            <Ionicons name="heart-outline" size={iconSizes.xl + 8} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>No stays saved yet</Text>
            <Text style={styles.emptySub}>
              Tap the heart on any stay while browsing to add it to this wishlist.
            </Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: GRID_H_PADDING, paddingBottom: insets.bottom + spacing.xl, gap: spacing.base }}
          >
            {selected.stays.map((stay) => (
              <View key={stay.id} style={styles.stayRow}>
                <TouchableOpacity style={styles.stayTap} activeOpacity={0.85} onPress={() => openStay(stay)}>
                  <Image
                    source={typeof stay.image === 'string' && stay.image.length > 0 ? { uri: stay.image } : undefined}
                    style={styles.stayImg}
                    contentFit="cover"
                    transition={200}
                  />
                  <View style={styles.stayInfo}>
                    <Text style={styles.stayTitle} numberOfLines={1}>{stay.title}</Text>
                    <Text style={styles.stayLocation} numberOfLines={1}>{stay.location}</Text>
                    <View style={styles.stayMetaRow}>
                      <Ionicons name="star" size={iconSizes.xs} color={colors.gold} />
                      <Text style={styles.stayRating}>{(typeof stay.rating === 'number' ? stay.rating : 0).toFixed(2)}</Text>
                    </View>
                    <Text style={styles.stayPrice}>
                      <Text style={styles.stayPriceBold}>{format(typeof stay.price === 'number' ? stay.price : 0)}</Text>
                      <Text style={styles.stayPriceUnit}> / night</Text>
                    </Text>
                  </View>
                </TouchableOpacity>
                <View style={styles.stayActions}>
                  <TouchableOpacity
                    style={styles.heartBtn}
                    onPress={() => removeStay(selected.id, stay.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel="Remove from wishlist"
                  >
                    <Ionicons name="heart" size={iconSizes.sm} color={colors.secondary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.bookBtn} onPress={() => openStay(stay, true)} activeOpacity={0.85}>
                    <Text style={styles.bookBtnText}>Book</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    );
  }

  // ======================= GRID / EMPTY VIEW ==============================
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Wishlists</Text>
        {collections.length > 0 && (
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.newBtnWrap}
            onPress={() => { haptics.light(); setShowCreate(true); }}
          >
            <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.newBtn}>
              <Ionicons name="add" size={iconSizes.sm} color="#fff" />
              <Text style={styles.newBtnText}>Create</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>

      {!loaded ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: GRID_H_PADDING,
            paddingTop: spacing.xs,
            paddingBottom: insets.bottom + spacing.xl,
          }}
        >
          <View style={styles.grid}>
            {Array.from({ length: 6 }).map((_, i) => (
              <View key={i} style={styles.cardWrap}>
                <Skeleton width="100%" height={CARD_W} borderRadius={borderRadius.lg} />
                <Skeleton width="70%" height={16} borderRadius={6} style={{ marginTop: spacing.sm }} />
                <Skeleton width="40%" height={13} borderRadius={6} style={{ marginTop: 6 }} />
              </View>
            ))}
          </View>
        </ScrollView>
      ) : collections.length === 0 ? (
        // ---- EMPTY STATE -----------------------------------------------
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconCircle, { backgroundColor: colors.primarySubtle }]}>
            <Ionicons name="heart-outline" size={iconSizes.xl} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>No wishlists yet</Text>
          <Text style={styles.emptySub}>
            Create wishlists to organize the stays you love and plan your next trip.
          </Text>
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.emptyCtaWrap}
            onPress={() => { haptics.light(); setShowCreate(true); }}
          >
            <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.emptyCta}>
              <Ionicons name="add" size={iconSizes.sm} color="#fff" />
              <Text style={styles.emptyCtaText}>Create your first wishlist</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        // ---- GRID ------------------------------------------------------
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: GRID_H_PADDING,
            paddingTop: spacing.xs,
            paddingBottom: insets.bottom + spacing.xl,
          }}
        >
          <View style={styles.grid}>
            {/* Create card */}
            <PressCard
              style={styles.cardWrap}
              onPress={() => setShowCreate(true)}
              onHaptic={haptics.light}
            >
              <View style={[styles.createCard, { borderColor: colors.border }]}>
                <View style={[styles.createIconCircle, { backgroundColor: colors.primarySubtle }]}>
                  <Ionicons name="add" size={iconSizes.base} color={colors.primary} />
                </View>
                <Text style={styles.createCardText}>Create wishlist</Text>
              </View>
            </PressCard>

            {collections.map((col) => (
              <PressCard
                key={col.id}
                style={styles.cardWrap}
                onPress={() => setSelectedCollectionId(col.id)}
                onHaptic={haptics.light}
              >
                <View style={styles.collectionCard}>
                  <CoverCollage stays={col.stays} colors={colors} />
                  <Text style={styles.colName} numberOfLines={1}>{col.name}</Text>
                  <Text style={styles.colCount}>
                    {col.stays.length} {col.stays.length === 1 ? 'saved' : 'saved'}
                  </Text>
                </View>
              </PressCard>
            ))}
          </View>
        </ScrollView>
      )}

      {/* ---- Create wishlist modal ------------------------------------- */}
      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + spacing.xl }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Create wishlist</Text>
            <Text style={styles.modalLabel}>Name</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Beach Vacation 2026"
              placeholderTextColor={colors.textTertiary}
              value={newName}
              onChangeText={setNewName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={createCollection}
              maxLength={40}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => { setNewName(''); setShowCreate(false); }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.9}
                style={[styles.modalCreateWrap, !newName.trim() && { opacity: 0.5 }]}
                onPress={createCollection}
                disabled={!newName.trim()}
              >
                <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.modalCreateBtn}>
                  <Text style={styles.modalCreateText}>Create</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function makeStyles(colors: any, CARD_W: number) {
  const cardShadow = Platform.select({
    ios: {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.5,
      shadowRadius: 10,
    },
    android: { elevation: 3 },
    web: { boxShadow: `0 4px 14px ${colors.cardShadow}` } as any,
  });

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    // Header
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: spacing.base, paddingVertical: spacing.md,
    },
    headerTitle: { fontSize: fontSizes['2xl'], lineHeight: lineHeights['2xl'], fontWeight: '800', color: colors.textPrimary },
    newBtnWrap: { borderRadius: borderRadius.full, overflow: 'hidden' },
    newBtn: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
      paddingHorizontal: spacing.base, paddingVertical: spacing.sm,
    },
    newBtnText: { color: '#fff', fontWeight: '700', fontSize: fontSizes.sm },

    // Grid
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP },
    cardWrap: { width: CARD_W },
    collectionCard: { width: '100%' },
    collage: {
      width: '100%', aspectRatio: 1,
      borderRadius: borderRadius.lg, overflow: 'hidden',
      ...cardShadow,
    },
    collageEmpty: { alignItems: 'center', justifyContent: 'center' },
    collageGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    collageCell: { width: '50%', height: '50%' },
    colName: {
      fontSize: fontSizes.base, fontWeight: '700', color: colors.textPrimary,
      marginTop: spacing.sm,
    },
    colCount: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 2 },

    // Create card
    createCard: {
      width: '100%', aspectRatio: 1,
      borderRadius: borderRadius.lg, borderWidth: 2, borderStyle: 'dashed',
      alignItems: 'center', justifyContent: 'center', gap: spacing.md,
      backgroundColor: colors.backgroundSecondary,
    },
    createIconCircle: {
      width: 56, height: 56, borderRadius: borderRadius.full,
      alignItems: 'center', justifyContent: 'center',
    },
    createCardText: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.textSecondary },

    // Detail header
    detailHeader: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: spacing.base, paddingVertical: spacing.md, gap: spacing.md,
    },
    iconBtn: { padding: spacing.xs },
    detailTitleWrap: { flex: 1 },
    detailTitle: { fontSize: fontSizes.xl, lineHeight: lineHeights.xl, fontWeight: '800', color: colors.textPrimary },
    detailCount: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 1 },

    // Stay row
    stayRow: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.card, borderRadius: borderRadius.lg,
      padding: spacing.sm, gap: spacing.md,
      ...cardShadow,
    },
    stayTap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    stayImg: { width: 96, height: 96, borderRadius: borderRadius.md, backgroundColor: colors.backgroundSecondary },
    stayInfo: { flex: 1, gap: 2 },
    stayActions: { alignItems: 'center', gap: spacing.sm },
    bookBtn: { paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: borderRadius.full, backgroundColor: colors.primary },
    bookBtnText: { fontSize: fontSizes.sm, fontWeight: '800', color: '#fff' },
    stayTitle: { fontSize: fontSizes.base, fontWeight: '700', color: colors.textPrimary },
    stayLocation: { fontSize: fontSizes.sm, color: colors.textSecondary },
    stayMetaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2 },
    stayRating: { fontSize: fontSizes.sm, fontWeight: '600', color: colors.textPrimary },
    stayPrice: { marginTop: spacing.xs },
    stayPriceBold: { fontSize: fontSizes.md, fontWeight: '800', color: colors.textPrimary },
    stayPriceUnit: { fontSize: fontSizes.sm, color: colors.textSecondary, fontWeight: '400' },
    heartBtn: {
      width: 38, height: 38, borderRadius: borderRadius.full,
      backgroundColor: colors.backgroundSecondary,
      alignItems: 'center', justifyContent: 'center',
    },

    // Empty states
    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing['3xl'] },
    emptyIconCircle: {
      width: 88, height: 88, borderRadius: borderRadius.full,
      alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg,
    },
    detailEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing['3xl'] },
    emptyTitle: {
      fontSize: fontSizes.xl, lineHeight: lineHeights.xl, fontWeight: '800',
      color: colors.textPrimary, marginTop: spacing.base, textAlign: 'center',
    },
    emptySub: {
      fontSize: fontSizes.base, lineHeight: lineHeights.lg, color: colors.textSecondary,
      textAlign: 'center', marginTop: spacing.sm,
    },
    emptyCtaWrap: { borderRadius: borderRadius.lg, overflow: 'hidden', marginTop: spacing.xl },
    emptyCta: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
      paddingHorizontal: spacing.xl, paddingVertical: spacing.base,
    },
    emptyCtaText: { color: '#fff', fontWeight: '800', fontSize: fontSizes.md },

    // Modal
    modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay },
    modalSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: borderRadius['2xl'], borderTopRightRadius: borderRadius['2xl'],
      paddingHorizontal: spacing.xl, paddingTop: spacing.md,
    },
    modalHandle: {
      width: 40, height: 4, borderRadius: borderRadius.full,
      backgroundColor: colors.borderLight, alignSelf: 'center', marginBottom: spacing.lg,
    },
    modalTitle: { fontSize: fontSizes.xl, fontWeight: '800', color: colors.textPrimary, marginBottom: spacing.lg },
    modalLabel: { fontSize: fontSizes.sm, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.sm },
    modalInput: {
      borderRadius: borderRadius.md, paddingHorizontal: spacing.base, paddingVertical: spacing.md,
      fontSize: fontSizes.base, borderWidth: 1, borderColor: colors.borderLight,
      backgroundColor: colors.backgroundSecondary, color: colors.textPrimary,
      marginBottom: spacing.xl,
    },
    modalActions: { flexDirection: 'row', gap: spacing.md },
    modalCancelBtn: {
      flex: 1, paddingVertical: spacing.base, borderRadius: borderRadius.lg,
      alignItems: 'center', borderWidth: 1, borderColor: colors.borderLight,
    },
    modalCancelText: { fontSize: fontSizes.base, fontWeight: '700', color: colors.textSecondary },
    modalCreateWrap: { flex: 1, borderRadius: borderRadius.lg, overflow: 'hidden' },
    modalCreateBtn: { paddingVertical: spacing.base, alignItems: 'center' },
    modalCreateText: { fontSize: fontSizes.base, fontWeight: '800', color: '#fff' },
  });
}
