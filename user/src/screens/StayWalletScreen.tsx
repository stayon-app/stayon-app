import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform,
} from 'react-native';
import { confirmAction } from '../utils/confirm';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useHaptics } from '../hooks/useHaptics';
import { spacing, borderRadius, fontSizes, fonts } from '../constants';
import { STAYON_GRADIENT } from '../components/GradientButton';
import { getPasses, removePass, WalletPass } from '../data/wallet';
import { openDirections, addToCalendar } from '../utils/tripActions';
import dayjs from 'dayjs';

export const StayWalletScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors } = useTheme();
  const { light, medium, warning } = useHaptics();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(colors);
  const [passes, setPasses] = useState<WalletPass[]>([]);

  const load = useCallback(() => { getPasses().then(setPasses); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleDirections = (p: WalletPass) => {
    light();
    openDirections({ latitude: p.latitude, longitude: p.longitude, label: p.location });
  };

  const handleCalendar = (p: WalletPass) => {
    light();
    const start = dayjs(p.checkIn, 'MMM D, YYYY');
    const s = start.isValid() ? start.hour(15).minute(0).toDate() : new Date();
    const e = start.isValid() ? start.hour(16).minute(0).toDate() : new Date(Date.now() + 3600000);
    addToCalendar({
      title: `Stay at ${p.propertyTitle}`,
      location: p.location,
      details: `Check-in ${p.checkIn} · Confirmation ${p.confirmationCode}`,
      start: s, end: e,
    });
  };

  const handleRemove = (p: WalletPass) => {
    warning();
    confirmAction({
      title: 'Remove pass',
      message: `Remove ${p.propertyTitle} from your wallet?`,
      confirmText: 'Remove',
      destructive: true,
      onConfirm: () => removePass(p.id).then(setPasses),
    });
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trip Wallet</Text>
        <View style={styles.headerBtn} />
      </View>

      {passes.length === 0 ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.primarySubtle }]}>
            <Ionicons name="wallet-outline" size={40} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>No passes yet</Text>
          <Text style={styles.emptySub}>Confirmed bookings appear here as passes — with directions, calendar and check-in details.</Text>
          <TouchableOpacity activeOpacity={0.9} onPress={() => { light(); navigation.navigate('Main', { screen: 'ExploreTab' }); }} style={styles.emptyCta}>
            <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.emptyCtaInner}>
              <Text style={styles.emptyCtaText}>Find a stay</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl, gap: spacing.lg }} showsVerticalScrollIndicator={false}>
          {passes.map((p) => (
            <View key={p.id} style={styles.pass}>
              {/* Banner */}
              <View style={styles.passBanner}>
                {typeof p.image === 'string' && p.image.length > 0 ? (
                  <Image source={{ uri: p.image }} style={styles.passImg} contentFit="cover" transition={200} />
                ) : (
                  <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.passImg} />
                )}
                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.65)']} style={styles.passShade} />
                <View style={[styles.statusBadge, { backgroundColor: p.status === 'confirmed' ? colors.success : colors.warning }]}>
                  <Ionicons name={p.status === 'confirmed' ? 'checkmark-circle' : 'time'} size={13} color="#fff" />
                  <Text style={styles.statusText}>{p.status === 'confirmed' ? 'Confirmed' : 'Pending'}</Text>
                </View>
                <View style={styles.passBannerText}>
                  <Text style={styles.passTitle} numberOfLines={1}>{p.propertyTitle}</Text>
                  <View style={styles.passLocRow}>
                    <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.9)" />
                    <Text style={styles.passLoc} numberOfLines={1}>{p.location}</Text>
                  </View>
                </View>
              </View>

              {/* Detail strip */}
              <View style={styles.passBody}>
                <View style={styles.passRow}>
                  <View style={styles.passCell}>
                    <Text style={styles.passLabel}>Check-in</Text>
                    <Text style={styles.passValue}>{p.checkIn}</Text>
                  </View>
                  <Ionicons name="airplane" size={16} color={colors.textTertiary} style={{ transform: [{ rotate: '0deg' }] }} />
                  <View style={[styles.passCell, { alignItems: 'flex-end' }]}>
                    <Text style={styles.passLabel}>Check-out</Text>
                    <Text style={styles.passValue}>{p.checkOut}</Text>
                  </View>
                </View>

                <View style={styles.dashed} />

                <View style={styles.passRow}>
                  <View style={styles.passCell}>
                    <Text style={styles.passLabel}>Confirmation</Text>
                    <Text style={[styles.passValue, styles.code]}>{p.confirmationCode}</Text>
                  </View>
                  <View style={[styles.passCell, { alignItems: 'center' }]}>
                    <Text style={styles.passLabel}>Guests</Text>
                    <Text style={styles.passValue}>{p.guests}</Text>
                  </View>
                  <View style={[styles.passCell, { alignItems: 'flex-end' }]}>
                    <Text style={styles.passLabel}>Total</Text>
                    <Text style={[styles.passValue, { color: colors.primary }]}>${(typeof p.total === 'number' ? p.total : 0).toLocaleString()}</Text>
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.action} onPress={() => handleDirections(p)} activeOpacity={0.85}>
                    <Ionicons name="navigate" size={17} color={colors.primary} />
                    <Text style={styles.actionText}>Directions</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.action} onPress={() => handleCalendar(p)} activeOpacity={0.85}>
                    <Ionicons name="calendar-outline" size={17} color={colors.primary} />
                    <Text style={styles.actionText}>Calendar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.action} onPress={() => handleRemove(p)} activeOpacity={0.85}>
                    <Ionicons name="trash-outline" size={17} color={colors.error} />
                    <Text style={[styles.actionText, { color: colors.error }]}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

function makeStyles(colors: any) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: spacing.lg, paddingBottom: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight,
    },
    headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: fontSizes['2xl'], ...fonts.bold, color: colors.textPrimary, letterSpacing: -0.5 },

    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing['2xl'] },
    emptyIcon: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
    emptyTitle: { fontSize: fontSizes.xl, ...fonts.bold, color: colors.textPrimary, marginBottom: spacing.sm },
    emptySub: { fontSize: fontSizes.base, lineHeight: 21, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xl },
    emptyCta: { borderRadius: borderRadius.lg, overflow: 'hidden' },
    emptyCtaInner: { paddingVertical: spacing.md, paddingHorizontal: spacing['2xl'] },
    emptyCtaText: { color: '#fff', fontSize: fontSizes.md, ...fonts.bold },

    pass: {
      borderRadius: borderRadius.lg + 4, backgroundColor: colors.card, overflow: 'hidden',
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 14 },
        android: { elevation: 5 },
        web: { boxShadow: '0 6px 18px rgba(0,0,0,0.12)' } as any,
      }),
    },
    passBanner: { height: 130, justifyContent: 'flex-end' },
    passImg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
    passShade: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    statusBadge: {
      position: 'absolute', top: spacing.md, left: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: borderRadius.full,
    },
    statusText: { color: '#fff', fontSize: fontSizes.xs, ...fonts.bold },
    passBannerText: { padding: spacing.base },
    passTitle: { color: '#fff', fontSize: fontSizes.lg, ...fonts.bold, letterSpacing: -0.3 },
    passLocRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    passLoc: { color: 'rgba(255,255,255,0.9)', fontSize: fontSizes.sm, ...fonts.medium },

    passBody: { padding: spacing.base, gap: spacing.md },
    passRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    passCell: { flex: 1 },
    passLabel: { fontSize: fontSizes.xs, color: colors.textTertiary, ...fonts.medium, marginBottom: 2 },
    passValue: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.semiBold },
    code: { letterSpacing: 1.5 },
    dashed: { height: 1, borderTopWidth: 1, borderStyle: 'dashed', borderColor: colors.borderLight },

    actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
    action: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      paddingVertical: spacing.md, borderRadius: borderRadius.md, backgroundColor: colors.primarySubtle,
    },
    actionText: { fontSize: fontSizes.sm, ...fonts.semiBold, color: colors.primary },
  });
}

export default StayWalletScreen;
