import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useHaptics } from '../hooks/useHaptics';
import { fonts, fontSizes, spacing, borderRadius } from '../constants';
import { withOpacity } from '../utils/color';
import { ScreenHeader, EmptyState } from '../components/common';
import { getNotifs, markAllRead, notifIcon, type HostNotif } from '../data/notifications';
import { Api } from '../../api';

// Map a backend notification row → the host display shape.
function mapBackendHostNotif(n: any): HostNotif {
  const code = n?.payload?.code ? ` (${n.payload.code})` : '';
  const since = (() => {
    const ms = Date.now() - new Date(n.created_at || Date.now()).getTime();
    const m = Math.floor(ms / 60000); if (m < 1) return 'now'; if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60); if (h < 24) return `${h}h`; return `${Math.floor(h / 24)}d`;
  })();
  const t: string = n.type || '';
  const map: Record<string, Partial<HostNotif>> = {
    'booking.request': { type: 'request' as any, title: 'New booking request', body: `A guest requested to book${code}.`, route: 'ReservationsTab' },
    'booking.confirmed': { type: 'confirmed' as any, title: 'New booking', body: `You have a new booking${code}.`, route: 'ReservationsTab' },
    'review.new': { type: 'review' as any, title: 'New review', body: 'A guest left you a review.', route: 'Reviews' },
    'message.new': { type: 'message' as any, title: 'New message', body: 'You have a new message.', route: 'InboxTab' },
  };
  const d = map[t] || { type: 'reminder' as any, title: t || 'Update', body: 'You have a new update.' };
  return { id: String(n.id), type: d.type as any, title: d.title!, body: d.body!, time: since, read: !!n.read, route: (d as any).route };
}

export function NotificationCenterScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { light } = useHaptics();
  const styles = makeStyles(colors);
  const [notifs, setNotifs] = useState<HostNotif[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      (async () => {
        const local = await getNotifs();
        if (!active) return;
        setNotifs(local);
        try {
          await Api.auth.ensureSession();
          const r: any = await Api.notifications();
          const live = (r?.items || []).map(mapBackendHostNotif);
          if (active && live.length) setNotifs(live);
          Api.markNotificationsRead().catch(() => {});
        } catch { /* offline → keep local */ }
      })();
      return () => { active = false; };
    }, [])
  );

  const open = (n: HostNotif) => {
    light();
    if (!n.route) return;
    if (n.route.endsWith('Tab')) navigation.navigate('Main', { screen: n.route });
    else navigation.navigate(n.route);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title="Notifications"
        onBack={() => navigation.goBack()}
        rightActions={[{ icon: 'checkmark-done-outline', onPress: () => markAllRead().then(setNotifs), accessibilityLabel: 'Mark all read' }]}
      />
      {notifs.length === 0 ? (
        <EmptyState illustration="notifications" icon="notifications-outline" title="You’re all caught up" message="New requests, messages, payouts and reviews will appear here." />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: spacing.sm }}>
          {notifs.map((n) => (
            <TouchableOpacity key={n.id} style={[styles.row, !n.read && styles.unread]} activeOpacity={0.7} onPress={() => open(n)}>
              <View style={[styles.icon, { backgroundColor: withOpacity(colors.primary, 0.12) }]}>
                <Ionicons name={notifIcon(n.type) as any} size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.topRow}>
                  <Text style={styles.notifTitle} numberOfLines={1}>{n.title}</Text>
                  <Text style={styles.time}>{n.time}</Text>
                </View>
                <Text style={styles.body} numberOfLines={2}>{n.body}</Text>
              </View>
              {!n.read && <View style={styles.dot} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.base, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight },
    unread: { backgroundColor: withOpacity(colors.primary, 0.04) },
    icon: { width: 38, height: 38, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' },
    topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    notifTitle: { flex: 1, fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.semiBold },
    time: { fontSize: fontSizes.xs, color: colors.textTertiary, ...fonts.medium },
    body: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 2, lineHeight: 19, ...fonts.regular },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  });

export default NotificationCenterScreen;
