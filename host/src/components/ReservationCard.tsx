import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { fonts, fontSizes, spacing, borderRadius, letterSpacing, shadows } from '../constants';
import { withOpacity } from '../utils/color';
import { StatusBadge } from './StatusBadge';
import { STAYON_GRADIENT } from './GradientButton';
import type { HostReservation } from '../data/reservations';

interface Props {
  reservation: HostReservation;
  onPress?: () => void;
  onAccept?: () => void;
  onDecline?: () => void;
  onMessage?: () => void;
  onManage?: () => void;   // check-in prep / checkout / review
}

const STEPS = ['Requested', 'Confirmed', 'Checked in', 'Checked out'];

export const ReservationCard: React.FC<Props> = ({ reservation: r, onPress, onAccept, onDecline, onMessage, onManage }) => {
  const { colors } = useTheme();
  const { format } = useCurrency();
  const styles = makeStyles(colors);

  const stepIndex = r.status === 'pending' ? 0 : r.status === 'confirmed' ? 1 : r.status === 'completed' ? 3 : -1;
  const cancelled = r.status === 'cancelled';

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.92} onPress={onPress}>
      {/* Header */}
      <View style={styles.top}>
        <Image source={{ uri: r.guestAvatar }} style={styles.avatar} contentFit="cover" />
        <View style={{ flex: 1 }}>
          <View style={styles.row}>
            <Text style={styles.guest} numberOfLines={1}>{r.guestName}</Text>
            <StatusBadge status={r.status} />
          </View>
          <Text style={styles.listing} numberOfLines={1}>{r.listingTitle}</Text>
        </View>
      </View>

      {/* Trip facts */}
      <View style={styles.facts}>
        <Fact icon="calendar-outline" label="Dates" value={`${r.checkIn.replace(/,\s*\d{4}/, '')} – ${r.checkOut.replace(/,\s*\d{4}/, '')}`} colors={colors} />
        <View style={styles.factDivider} />
        <Fact icon="moon-outline" label="Nights" value={String(r.nights)} colors={colors} />
        <View style={styles.factDivider} />
        <Fact icon="people-outline" label="Guests" value={String(r.guests)} colors={colors} />
      </View>

      {/* Status timeline */}
      {!cancelled ? (
        <View style={styles.timeline}>
          {STEPS.map((label, i) => {
            const done = i <= stepIndex;
            const current = i === stepIndex;
            return (
              <React.Fragment key={label}>
                {i > 0 && <View style={[styles.tlBar, i <= stepIndex && { backgroundColor: colors.primary }]} />}
                <View style={styles.tlStep}>
                  <View style={[styles.tlDot, done && styles.tlDotDone, current && styles.tlDotCurrent]}>
                    {done && <Ionicons name="checkmark" size={9} color="#fff" />}
                  </View>
                  <Text style={[styles.tlLabel, done && { color: colors.textPrimary, ...fonts.semiBold }]} numberOfLines={1}>{label}</Text>
                </View>
              </React.Fragment>
            );
          })}
        </View>
      ) : (
        <View style={styles.cancelledRow}>
          <Ionicons name="close-circle" size={15} color={colors.error} />
          <Text style={styles.cancelledText}>Cancelled — the guest was not charged.</Text>
        </View>
      )}

      {/* Footer: payout + actions */}
      <View style={styles.footer}>
        <View>
          <Text style={styles.payout}>{format(r.payout)}</Text>
          <Text style={styles.payoutLabel}>your payout · 0% fee</Text>
        </View>
        <View style={styles.actions}>
          {r.status === 'pending' && (
            <>
              {onDecline && (
                <TouchableOpacity style={styles.declineBtn} onPress={onDecline}>
                  <Text style={styles.declineText}>Decline</Text>
                </TouchableOpacity>
              )}
              {onAccept && (
                <TouchableOpacity activeOpacity={0.9} onPress={onAccept}>
                  <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryBtn}>
                    <Text style={styles.primaryText}>Accept</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </>
          )}
          {r.status === 'confirmed' && (
            <>
              {onMessage && (
                <TouchableOpacity style={styles.ghostBtn} onPress={onMessage}>
                  <Ionicons name="chatbubble-outline" size={16} color={colors.primary} />
                </TouchableOpacity>
              )}
              {onManage && (
                <TouchableOpacity style={styles.outlineBtn} onPress={onManage}>
                  <Text style={styles.outlineText}>Prep check‑in</Text>
                </TouchableOpacity>
              )}
            </>
          )}
          {r.status === 'completed' && onManage && (
            <TouchableOpacity style={styles.outlineBtn} onPress={onManage}>
              <Ionicons name="star-outline" size={15} color={colors.primary} />
              <Text style={styles.outlineText}>Review</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const Fact = ({ icon, label, value, colors }: any) => (
  <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
    <Ionicons name={icon} size={14} color={colors.textTertiary} />
    <Text style={{ fontSize: fontSizes.sm, color: colors.textPrimary, ...fonts.bold }} numberOfLines={1}>{value}</Text>
    <Text style={{ fontSize: 10, color: colors.textTertiary, ...fonts.medium }}>{label}</Text>
  </View>
);

const makeStyles = (colors: any) =>
  StyleSheet.create({
    card: { backgroundColor: colors.card, borderRadius: borderRadius.xl, padding: spacing.base, marginBottom: spacing.md, ...shadows.card },
    top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.backgroundSecondary },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    guest: { flex: 1, fontSize: fontSizes.md, letterSpacing: letterSpacing.snug, color: colors.textPrimary, ...fonts.bold },
    listing: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 2, ...fonts.regular },
    facts: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.base, paddingVertical: spacing.md, borderRadius: borderRadius.md, backgroundColor: colors.backgroundSecondary },
    factDivider: { width: StyleSheet.hairlineWidth, height: 30, backgroundColor: colors.borderLight },
    timeline: { flexDirection: 'row', alignItems: 'flex-start', marginTop: spacing.base, paddingHorizontal: 2 },
    tlStep: { alignItems: 'center', gap: 4, width: 58 },
    tlBar: { flex: 1, height: 2, backgroundColor: colors.borderLight, marginTop: 7 },
    tlDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: colors.borderLight, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
    tlDotDone: { backgroundColor: colors.primary, borderColor: colors.primary },
    tlDotCurrent: { backgroundColor: colors.primary, borderColor: colors.primary, transform: [{ scale: 1.12 }] },
    tlLabel: { fontSize: 10, color: colors.textTertiary, textAlign: 'center', ...fonts.medium },
    cancelledRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.base, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: borderRadius.md, backgroundColor: withOpacity(colors.error, 0.08) },
    cancelledText: { flex: 1, fontSize: fontSizes.sm, color: colors.error, ...fonts.semiBold },
    footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.base, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderLight },
    payout: { fontSize: fontSizes.md, color: colors.textPrimary, ...fonts.bold },
    payoutLabel: { fontSize: fontSizes.xs, color: colors.textTertiary, marginTop: 1, ...fonts.regular },
    actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    declineBtn: { paddingHorizontal: spacing.base, paddingVertical: spacing.sm, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.borderLight },
    declineText: { fontSize: fontSizes.sm, color: colors.textSecondary, ...fonts.bold },
    primaryBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.md },
    primaryText: { fontSize: fontSizes.sm, color: '#fff', ...fonts.bold },
    ghostBtn: { width: 38, height: 38, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySubtle },
    outlineBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: spacing.base, paddingVertical: spacing.sm, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.primary },
    outlineText: { fontSize: fontSizes.sm, color: colors.primary, ...fonts.bold },
  });

export default ReservationCard;
