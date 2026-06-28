import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { fonts, fontSizes, spacing, borderRadius, letterSpacing } from '../constants';
import { StatusBadge } from './StatusBadge';
import { listingUSD, type HostListing } from '../data/listings';

interface Props {
  listing: HostListing;
  onPress?: () => void;
}

/** Host view of a property — large photo card with title & price floating over it. */
export const ListingCard: React.FC<Props> = ({ listing, onPress }) => {
  const { colors } = useTheme();
  const { format } = useCurrency();
  const styles = makeStyles(colors);

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.92} onPress={onPress}>
      <View style={styles.imageWrap}>
        {listing.images[0] ? (
          <Image source={{ uri: listing.images[0] }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.imagePlaceholder]}>
            <Ionicons name="image-outline" size={28} color={colors.textTertiary} />
          </View>
        )}
        <LinearGradient colors={['rgba(15,23,42,0.05)', 'rgba(15,23,42,0.35)', 'rgba(15,23,42,0.88)']} style={StyleSheet.absoluteFill} />

        {/* Top row: status + rating */}
        <View style={styles.topRow}>
          <StatusBadge status={listing.status} />
          {!!listing.rating && (
            <View style={styles.rating}>
              <Ionicons name="star" size={12} color="#fff" />
              <Text style={styles.ratingText}>{listing.rating.toFixed(2)}</Text>
            </View>
          )}
        </View>

        {/* Floating title + price */}
        <View style={styles.float}>
          <Text style={styles.title} numberOfLines={1}>{listing.title || 'Untitled listing'}</Text>
          <Text style={styles.meta} numberOfLines={1}>
            {[listing.city, listing.country].filter(Boolean).join(', ') || 'Location not set'} · {listing.type}
          </Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{format(listingUSD(listing.price, listing.priceCurrency))}<Text style={styles.priceUnit}> / night</Text></Text>
            {listing.instantBook && (
              <View style={styles.instant}>
                <Ionicons name="flash" size={11} color="#fff" />
                <Text style={styles.instantText}>Instant</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Compact info strip */}
      <View style={styles.body}>
        <Text style={styles.body2} numberOfLines={1}>
          {listing.guests} guests · {listing.bedrooms} bd · {listing.beds} beds · {listing.bathrooms} ba
        </Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
      </View>
    </TouchableOpacity>
  );
};

const makeStyles = (colors: any) =>
  StyleSheet.create({
    card: { backgroundColor: colors.card, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.borderLight, overflow: 'hidden', marginBottom: spacing.base },
    imageWrap: { position: 'relative', height: 210, backgroundColor: colors.backgroundSecondary, justifyContent: 'flex-end' },
    imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
    topRow: { position: 'absolute', top: spacing.sm, left: spacing.sm, right: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    rating: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: 999 },
    ratingText: { fontSize: fontSizes.xs, color: '#fff', ...fonts.bold },
    float: { padding: spacing.base, gap: 2 },
    title: { fontSize: fontSizes.lg, letterSpacing: letterSpacing.snug, color: '#fff', ...fonts.bold },
    meta: { fontSize: fontSizes.sm, color: 'rgba(255,255,255,0.88)', ...fonts.regular },
    priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xs },
    price: { fontSize: fontSizes.md, color: '#fff', ...fonts.bold },
    priceUnit: { fontSize: fontSizes.sm, color: 'rgba(255,255,255,0.85)', ...fonts.regular },
    instant: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: 999 },
    instantText: { fontSize: fontSizes.xs, color: '#fff', ...fonts.semiBold },
    body: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.base, paddingVertical: spacing.md },
    body2: { fontSize: fontSizes.sm, color: colors.textSecondary, ...fonts.medium },
  });
