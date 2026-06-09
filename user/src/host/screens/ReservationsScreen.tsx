import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useHaptics } from '../hooks/useHaptics';
import { fonts, fontSizes, spacing, letterSpacing } from '../constants';
import { withOpacity } from '../utils/color';
import { EmptyState } from '../components/common';
import { ReservationCard } from '../components/ReservationCard';
import { confirmAction } from '../utils/confirm';
import { getReservations, setReservationStatus, reservationsByTab, type HostReservation } from '../data/reservations';
import { Api } from '../../api';

type Tab = 'requests' | 'upcoming' | 'completed' | 'cancelled';
const TABS: { key: Tab; label: string }[] = [
  { key: 'requests', label: 'Requests' },
  { key: 'upcoming', label: 'Confirmed' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const EMPTY: Record<Tab, { icon: any; illo: any; title: string; msg: string }> = {
  requests: { icon: 'hand-left-outline', illo: 'reservations', title: 'No requests yet', msg: 'Booking requests that need your approval will appear here.' },
  upcoming: { icon: 'calendar-outline', illo: 'reservations', title: 'No confirmed stays', msg: 'Confirmed and instant bookings will show up here to manage.' },
  completed: { icon: 'checkmark-done-outline', illo: 'reviews', title: 'No completed stays', msg: 'Past stays will be listed here once guests check out.' },
  cancelled: { icon: 'close-circle-outline', illo: 'generic', title: 'No cancellations', msg: 'Cancelled reservations will appear here.' },
};

export function ReservationsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { selection, success } = useHaptics();
  const styles = makeStyles(colors);
  const [tab, setTab] = useState<Tab>('requests');
  const [all, setAll] = useState<HostReservation[]>([]);

  const accept = async (r: HostReservation) => {
    success();
    setAll(await setReservationStatus(r.id, 'confirmed'));
    try { await Api.auth.ensureSession(); await Api.reservations.actByCode(r.code, 'accept'); } catch {}
  };
  const decline = (r: HostReservation) => confirmAction({
    title: 'Decline request?', message: 'The guest will be notified and not charged.', confirmText: 'Decline', destructive: true,
    onConfirm: async () => {
      setAll(await setReservationStatus(r.id, 'cancelled'));
      try { await Api.auth.ensureSession(); await Api.reservations.actByCode(r.code, 'decline'); } catch {}
    },
  });

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      getReservations().then((r) => { if (active) setAll(r); });
      return () => { active = false; };
    }, [])
  );

  const count = (t: Tab) => reservationsByTab(all, t).length;
  const list = reservationsByTab(all, tab);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Reservations</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabs}>
        {TABS.map((t) => {
          const active = tab === t.key;
          const c = count(t.key);
          return (
            <TouchableOpacity key={t.key} style={[styles.tab, active && styles.tabActive]} onPress={() => { selection(); setTab(t.key); }}>
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
              {c > 0 && (
                <View style={[styles.badge, active && { backgroundColor: colors.primary }]}>
                  <Text style={[styles.badgeText, active && { color: '#fff' }]}>{c}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {list.length === 0 ? (
        <EmptyState illustration={EMPTY[tab].illo} icon={EMPTY[tab].icon} title={EMPTY[tab].title} message={EMPTY[tab].msg} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['4xl'] }}>
          {list.map((r) => (
            <ReservationCard
              key={r.id}
              reservation={r}
              onPress={() => navigation.navigate('ReservationDetail', { id: r.id })}
              onAccept={() => accept(r)}
              onDecline={() => decline(r)}
              onMessage={() => navigation.navigate('Main', { screen: 'InboxTab' })}
              onManage={() => navigation.navigate(r.status === 'completed' ? 'GuestReview' : 'CheckInPrep', { id: r.id, guestName: r.guestName })}
            />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm },
    title: { fontSize: fontSizes['2xl'], letterSpacing: letterSpacing.tight, color: colors.textPrimary, ...fonts.bold },
    tabsScroll: { flexGrow: 0, flexShrink: 0 },
    tabs: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, alignItems: 'center' },
    tab: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 34, paddingHorizontal: spacing.md, borderRadius: 17, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderLight },
    tabActive: { backgroundColor: withOpacity(colors.primary, 0.12), borderColor: colors.primary },
    tabText: { fontSize: fontSizes.sm, color: colors.textSecondary, ...fonts.semiBold },
    tabTextActive: { color: colors.primary },
    badge: { minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.backgroundSecondary },
    badgeText: { fontSize: 10, color: colors.textSecondary, ...fonts.bold },
  });

export default ReservationsScreen;
