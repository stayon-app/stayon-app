import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useHaptics } from '../hooks/useHaptics';
import { confirmAction } from '../utils/confirm';
import { fonts, fontSizes, spacing, borderRadius, letterSpacing } from '../constants';
import { withOpacity } from '../utils/color';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenHeader } from '../components/common';
import { StatusBadge } from '../components/StatusBadge';
import { STAYON_GRADIENT } from '../components/GradientButton';
import { getListings, saveListing, deleteListing, listingUSD, AMENITY_OPTIONS, type HostListing } from '../data/listings';

export function ListingDetailsScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const { format } = useCurrency();
  const { light, success } = useHaptics();
  const styles = makeStyles(colors);
  const id = route?.params?.id;
  const [listing, setListing] = useState<HostListing | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      getListings().then((all) => { if (active) setListing(all.find((l) => l.id === id) ?? null); });
      return () => { active = false; };
    }, [id])
  );

  if (!listing) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScreenHeader title="Stay" onBack={() => navigation.goBack()} />
      </SafeAreaView>
    );
  }

  const toggleStatus = async () => {
    success();
    const next = { ...listing, status: (listing.status === 'published' ? 'snoozed' : 'published') as HostListing['status'] };
    setListing(next);
    await saveListing(next);
  };

  const remove = () => {
    confirmAction({
      title: 'Delete listing?',
      message: 'This removes the listing. Existing reservations are not affected.',
      confirmText: 'Delete',
      destructive: true,
      onConfirm: async () => { await deleteListing(listing.id); navigation.goBack(); },
    });
  };

  const amenityLabel = (aid: string) => AMENITY_OPTIONS.find((a) => a.id === aid)?.label ?? aid;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title="Stay"
        onBack={() => navigation.goBack()}
        rightActions={[
          { icon: 'create-outline', onPress: () => navigation.navigate('ListingEdit', { id: listing.id }), accessibilityLabel: 'Edit stay' },
          { icon: 'trash-outline', onPress: remove, tint: colors.error, accessibilityLabel: 'Delete stay' },
        ]}
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing['4xl'] }}>
        {listing.images[0] ? (
          <Image source={{ uri: listing.images[0] }} style={styles.hero} contentFit="cover" transition={200} />
        ) : (
          <View style={[styles.hero, styles.heroEmpty]}><Ionicons name="image-outline" size={30} color={colors.textTertiary} /></View>
        )}

        <View style={styles.body}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <StatusBadge status={listing.status} />
            {!!listing.rating && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="star" size={14} color={colors.textPrimary} />
                <Text style={styles.rating}>{listing.rating.toFixed(2)} · {listing.reviewCount} reviews</Text>
              </View>
            )}
          </View>
          <Text style={styles.title}>{listing.title}</Text>
          <Text style={styles.meta}>{[listing.city, listing.country].filter(Boolean).join(', ')}</Text>
          <Text style={styles.meta2}>{listing.type} · {listing.guests} guests · {listing.bedrooms} bd · {listing.beds} beds · {listing.bathrooms} ba</Text>

          {!!listing.description && <Text style={styles.desc}>{listing.description}</Text>}

          {/* Pricing */}
          <Text style={styles.section}>Pricing</Text>
          <View style={styles.kvRow}><Text style={styles.k}>Nightly</Text><Text style={styles.v}>{format(listingUSD(listing.price, listing.priceCurrency))}</Text></View>
          {!!listing.weekendPrice && <View style={styles.kvRow}><Text style={styles.k}>Weekend</Text><Text style={styles.v}>{format(listingUSD(listing.weekendPrice, listing.priceCurrency))}</Text></View>}
          {!!listing.cleaningFee && <View style={styles.kvRow}><Text style={styles.k}>Cleaning fee</Text><Text style={styles.v}>{format(listingUSD(listing.cleaningFee, listing.priceCurrency))}</Text></View>}
          <View style={styles.kvRow}><Text style={styles.k}>Min nights</Text><Text style={styles.v}>{listing.minNights}</Text></View>
          <View style={styles.kvRow}><Text style={styles.k}>Instant book</Text><Text style={styles.v}>{listing.instantBook ? 'On' : 'Off'}</Text></View>

          {/* Manage shortcuts */}
          <Text style={styles.section}>Manage this stay</Text>
          <TouchableOpacity style={styles.manageRow} activeOpacity={0.85} onPress={() => { light(); navigation.navigate('ListingEdit', { id: listing.id }); }}>
            <View style={[styles.manageIcon, { backgroundColor: colors.primarySubtle }]}><Ionicons name="create-outline" size={20} color={colors.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.manageTitle}>Edit stay details</Text>
              <Text style={styles.manageSub}>Photos, price, amenities, rules — everything except the address</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.manageRow} activeOpacity={0.85} onPress={() => { light(); navigation.navigate('CalendarTab' as never); }}>
            <View style={[styles.manageIcon, { backgroundColor: colors.primarySubtle }]}><Ionicons name="calendar-outline" size={20} color={colors.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.manageTitle}>Calendar & pricing</Text>
              <Text style={styles.manageSub}>Block dates and set per‑night prices</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.manageRow} activeOpacity={0.85} onPress={() => { light(); navigation.navigate('SmartPricing', { id: listing.id }); }}>
            <View style={[styles.manageIcon, { backgroundColor: colors.primarySubtle }]}><Ionicons name="flash-outline" size={20} color={colors.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.manageTitle}>Smart Pricing</Text>
              <Text style={styles.manageSub}>Get an optimized rate by demand & season</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.manageRow} activeOpacity={0.85} onPress={() => { light(); navigation.navigate('BookingSettings', { id: listing.id }); }}>
            <View style={[styles.manageIcon, { backgroundColor: colors.primarySubtle }]}><Ionicons name="options-outline" size={20} color={colors.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.manageTitle}>Booking & availability</Text>
              <Text style={styles.manageSub}>Trip length, notice, prep time, window, discounts</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.manageRow} activeOpacity={0.85} onPress={() => { light(); navigation.navigate('Guidebook', { id: listing.id }); }}>
            <View style={[styles.manageIcon, { backgroundColor: colors.primarySubtle }]}><Ionicons name="map-outline" size={20} color={colors.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.manageTitle}>Stay guidebook</Text>
              <Text style={styles.manageSub}>Local recommendations guests will see</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </TouchableOpacity>

          {/* Amenities */}
          {listing.amenities.length > 0 && (
            <>
              <Text style={styles.section}>Amenities</Text>
              <View style={styles.amenityWrap}>
                {listing.amenities.map((a) => (
                  <View key={a} style={styles.amenity}>
                    <Ionicons name="checkmark-circle" size={15} color={colors.primary} />
                    <Text style={styles.amenityText}>{amenityLabel(a)}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={[styles.snooze, { borderColor: colors.borderLight }]} onPress={toggleStatus}>
          <Ionicons name={listing.status === 'published' ? 'pause' : 'play'} size={16} color={colors.textSecondary} />
          <Text style={styles.snoozeText}>{listing.status === 'published' ? 'Snooze' : 'Publish'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={0.9} onPress={() => { light(); navigation.navigate('ListingEdit', { id: listing.id }); }}>
          <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.editBtn}>
            <Ionicons name="create-outline" size={16} color="#fff" />
            <Text style={styles.editText}>Edit stay details</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    hero: { width: '100%', height: 240 },
    heroEmpty: { backgroundColor: colors.backgroundSecondary, alignItems: 'center', justifyContent: 'center' },
    body: { padding: spacing.lg },
    rating: { fontSize: fontSizes.sm, color: colors.textPrimary, ...fonts.semiBold },
    title: { fontSize: fontSizes['2xl'], letterSpacing: letterSpacing.tight, color: colors.textPrimary, marginTop: spacing.sm, ...fonts.bold },
    meta: { fontSize: fontSizes.base, color: colors.textSecondary, marginTop: 4, ...fonts.regular },
    meta2: { fontSize: fontSizes.sm, color: colors.textTertiary, marginTop: 2, ...fonts.regular },
    desc: { fontSize: fontSizes.base, lineHeight: 22, color: colors.textPrimary, marginTop: spacing.base, ...fonts.regular },
    section: { fontSize: fontSizes.lg, letterSpacing: letterSpacing.snug, color: colors.textPrimary, marginTop: spacing.xl, marginBottom: spacing.sm, ...fonts.bold },
    kvRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight },
    k: { fontSize: fontSizes.base, color: colors.textSecondary, ...fonts.regular },
    v: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.semiBold },
    amenityWrap: { gap: spacing.sm },
    amenity: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    amenityText: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.regular },
    footer: { flexDirection: 'row', gap: spacing.md, padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.borderLight, backgroundColor: colors.surface },
    snooze: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: spacing.base, paddingHorizontal: spacing.lg, borderRadius: borderRadius.lg, borderWidth: 1 },
    snoozeText: { fontSize: fontSizes.base, color: colors.textSecondary, ...fonts.semiBold },
    editBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: spacing.base, borderRadius: borderRadius.lg },
    editText: { fontSize: fontSizes.base, color: '#fff', ...fonts.bold },
    manageRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight },
    manageIcon: { width: 40, height: 40, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' },
    manageTitle: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.semiBold },
    manageSub: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 1, ...fonts.regular },
  });

export default ListingDetailsScreen;
