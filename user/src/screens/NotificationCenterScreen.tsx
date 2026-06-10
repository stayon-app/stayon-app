import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useHaptics } from '../hooks/useHaptics';
import { Skeleton } from '../components/common/SkeletonLoader';
import { spacing, fontSizes, fonts, borderRadius } from '../constants';
import { Api } from '../api';

type NotifType = 'booking' | 'message' | 'payment' | 'offer' | 'review' | 'reminder';

interface Notification {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  time: string;
  read: boolean;
  action?: string;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  { id: '1', type: 'booking', title: 'Booking Confirmed!', body: 'Manhattan Luxury Loft — Jun 12–15. Your host Alex is ready to welcome you.', time: '2 min ago', read: false, action: 'View booking' },
  { id: '2', type: 'message', title: 'New message from Alex', body: '"Hi! Looking forward to hosting you. Let me know if you have any questions about check-in."', time: '15 min ago', read: false, action: 'Reply' },
  { id: '3', type: 'payment', title: 'Payment successful', body: '$892 charged to Visa •••• 4242 for your NYC stay. Receipt sent to your email.', time: '1 hour ago', read: false },
  { id: '4', type: 'reminder', title: 'Check-in tomorrow!', body: 'Hollywood Hills Villa check-in starts at 3:00 PM. Your access code will be sent soon.', time: '3 hours ago', read: true, action: 'View details' },
  { id: '5', type: 'offer', title: 'Flash Deal: 30% off Malibu', body: 'Malibu Beachfront Home just dropped to $346/night. Only 2 nights available!', time: '5 hours ago', read: true, action: 'View deal' },
  { id: '6', type: 'review', title: 'How was your stay?', body: 'You stayed at Chelsea Townhouse last week. Share your experience to help future travelers.', time: '2 days ago', read: true, action: 'Write review' },
  { id: '7', type: 'booking', title: 'Booking request sent', body: 'Your request to book Amsterdam Canal House (Aug 3–7) is pending host approval.', time: '3 days ago', read: true },
  { id: '8', type: 'offer', title: 'Price drop alert!', body: 'A property in your wishlist dropped by $45/night. Book before it fills up.', time: '4 days ago', read: true, action: 'View property' },
  { id: '9', type: 'reminder', title: 'Complete your profile', body: 'Add a profile photo and verify your ID to unlock instant booking on premium stays.', time: '1 week ago', read: true },
  { id: '10', type: 'review', title: 'Your review was published', body: 'Thanks for reviewing Vancouver Waterfront Condo! Your review helps the community.', time: '1 week ago', read: true },
];

const ICON_MAP: Record<NotifType, keyof typeof Ionicons.glyphMap> = {
  booking: 'checkmark-circle',
  message: 'chatbubble-ellipses',
  payment: 'wallet',
  offer: 'gift',
  review: 'star',
  reminder: 'time',
};

const COLOR_MAP: Record<NotifType, string> = {
  booking: '#0D9488',
  message: '#0EA5E9',
  payment: '#10B981',
  offer: '#F59E0B',
  review: '#FB7185',
  reminder: '#7C3AED',
};

// Map a backend notification row → the display shape.
function mapBackendNotif(n: any): Notification {
  const code = n?.payload?.code ? ` (${n.payload.code})` : '';
  const since = (() => {
    const ms = Date.now() - new Date(n.created_at || Date.now()).getTime();
    const m = Math.floor(ms / 60000); if (m < 1) return 'just now'; if (m < 60) return `${m} min ago`;
    const h = Math.floor(m / 60); if (h < 24) return `${h} hr ago`; return `${Math.floor(h / 24)} d ago`;
  })();
  const t: string = n.type || '';
  const map: Record<string, { type: NotifType; title: string; body: string }> = {
    'booking.confirmed': { type: 'booking', title: 'Booking confirmed!', body: `Your booking${code} is confirmed.` },
    'booking.request': { type: 'booking', title: 'New booking request', body: `A guest requested to book${code}.` },
    'booking.accept': { type: 'booking', title: 'Booking accepted', body: `Your stay${code} was accepted by the host.` },
    'booking.decline': { type: 'booking', title: 'Booking declined', body: `Your request${code} was declined.` },
    'booking.checkout': { type: 'reminder', title: 'Checkout complete', body: `Checkout recorded for${code}.` },
    'kyc.verified': { type: 'reminder', title: 'Identity verified', body: 'Your identity has been verified.' },
    'kyc.rejected': { type: 'reminder', title: 'Identity review', body: 'Your identity submission needs another look.' },
  };
  const d = map[t] || { type: (t.startsWith('message') ? 'message' : t.startsWith('review') ? 'review' : 'reminder') as NotifType, title: t || 'Update', body: 'You have a new update.' };
  return { id: String(n.id), type: d.type, title: d.title, body: d.body, time: since, read: !!n.read };
}

export function NotificationCenterScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { light } = useHaptics();
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [isLoading, setIsLoading] = useState(true);

  // Load REAL notifications from the backend; fall back to the demo list when
  // offline or when the account has none yet (so the screen is never blank).
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await Api.auth.ensureSession();
        const r: any = await Api.notifications();
        const items = (r?.items || []).map(mapBackendNotif);
        if (active && items.length) setNotifications(items);
        Api.markNotificationsRead().catch(() => {});
      } catch { /* offline → keep demo list */ }
      finally { if (active) setIsLoading(false); }
    })();
    const t = setTimeout(() => { if (active) setIsLoading(false); }, 800);
    return () => { active = false; clearTimeout(t); };
  }, []);

  const FILTERS = ['All', 'Unread', 'Bookings', 'Messages', 'Offers'];

  const filtered = notifications.filter((n) => {
    if (activeFilter === 'Unread') return !n.read;
    if (activeFilter === 'Bookings') return n.type === 'booking' || n.type === 'payment' || n.type === 'reminder';
    if (activeFilter === 'Messages') return n.type === 'message';
    if (activeFilter === 'Offers') return n.type === 'offer';
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllRead = () => {
    light();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const deleteNotif = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // Route a notification's action link to a sensible existing screen.
  const handleAction = (notif: Notification) => {
    light();
    markRead(notif.id);
    switch (notif.type) {
      case 'booking':
        navigation.navigate('Main', { screen: 'TripsTab' });
        break;
      case 'message':
        navigation.navigate('Chat', {
          hostId: 'host1',
          hostName: 'Alex Morgan',
          propertyId: 'prop1',
          propertyTitle: 'Manhattan Luxury Loft',
        });
        break;
      case 'reminder':
        // Profile-completion reminder has no action link; trip reminders go to Trips.
        navigation.navigate('Main', { screen: 'TripsTab' });
        break;
      case 'offer':
        navigation.navigate('Offers');
        break;
      case 'review':
        navigation.navigate('Main', { screen: 'TripsTab' });
        break;
      default:
        navigation.navigate('Main', { screen: 'TripsTab' });
    }
  };

  const styles = makeStyles(colors);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Notifications</Text>
          {unreadCount > 0 && (
            <Text style={[styles.unreadCount, { color: colors.textSecondary }]}>
              {unreadCount} unread
            </Text>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllRead} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={[styles.markAll, { color: colors.primary }]}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        contentContainerStyle={styles.filterScroll}
      >
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterChip,
              {
                backgroundColor: activeFilter === f ? colors.primary : colors.card,
                borderColor: activeFilter === f ? colors.primary : colors.borderLight,
              },
            ]}
            onPress={() => { light(); setActiveFilter(f); }}
            activeOpacity={0.85}
          >
            <Text style={[styles.filterText, { color: activeFilter === f ? '#fff' : colors.textSecondary }]}>
              {f}
              {f === 'Unread' && unreadCount > 0 ? ` (${unreadCount})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false}>
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={styles.skeletonCard}>
              <Skeleton width={40} height={40} borderRadius={20} />
              <View style={styles.skeletonContent}>
                <Skeleton width="55%" height={15} style={{ marginBottom: 8 }} />
                <Skeleton width="90%" height={13} style={{ marginBottom: 6 }} />
                <Skeleton width="40%" height={11} />
              </View>
            </View>
          ))
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="checkmark-done-circle-outline" size={60} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>You're all caught up</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              No notifications here right now. We'll let you know about bookings, messages, and offers.
            </Text>
          </View>
        ) : (
          filtered.map((notif) => (
            <TouchableOpacity
              key={notif.id}
              style={[
                styles.notifCard,
                { backgroundColor: notif.read ? colors.card : colors.primarySubtle, borderColor: colors.borderLight },
              ]}
              onPress={() => { markRead(notif.id); light(); }}
              activeOpacity={0.85}
            >
              <View style={[styles.iconWrap, { backgroundColor: (COLOR_MAP[notif.type] || colors.primary) + '20' }]}>
                <Ionicons
                  name={ICON_MAP[notif.type] || 'notifications'}
                  size={20}
                  color={COLOR_MAP[notif.type] || colors.primary}
                />
              </View>

              <View style={styles.notifContent}>
                <View style={styles.notifHeader}>
                  <Text style={[styles.notifTitle, { color: colors.textPrimary }]}>{String(notif.title ?? '')}</Text>
                  {!notif.read && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
                </View>
                <Text style={[styles.notifBody, { color: colors.textSecondary }]} numberOfLines={2}>
                  {String(notif.body ?? '')}
                </Text>
                <View style={styles.notifFooter}>
                  <Text style={[styles.notifTime, { color: colors.textTertiary }]}>{String(notif.time ?? '')}</Text>
                  {notif.action && (
                    <TouchableOpacity
                      onPress={() => handleAction(notif)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityRole="button"
                      accessibilityLabel={notif.action}
                    >
                      <Text style={[styles.notifAction, { color: colors.primary }]}>{notif.action} →</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => deleteNotif(notif.id)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel="Dismiss notification"
              >
                <Ionicons name="close" size={14} color={colors.textTertiary} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    },
    title: { fontSize: fontSizes['2xl'], ...fonts.bold, letterSpacing: -0.5 },
    unreadCount: { fontSize: fontSizes.xs, marginTop: 1 },
    markAll: { fontSize: fontSizes.sm, ...fonts.semiBold },
    filterBar: { flexGrow: 0, flexShrink: 0 },
    filterScroll: {
      paddingHorizontal: spacing.lg,
      paddingRight: spacing.lg,
      gap: spacing.sm,
      paddingBottom: spacing.md,
      alignItems: 'center',
    },
    filterChip: {
      paddingHorizontal: spacing.base,
      height: 36,
      borderRadius: borderRadius.full,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterText: { fontSize: fontSizes.sm, ...fonts.semiBold },
    notifCard: {
      flexDirection: 'row', alignItems: 'flex-start',
      marginHorizontal: spacing.lg, marginBottom: spacing.sm,
      borderRadius: borderRadius.lg, padding: 14, borderWidth: 1, gap: spacing.md,
    },
    iconWrap: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    notifContent: { flex: 1 },
    notifHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs },
    notifTitle: { fontSize: fontSizes.md, ...fonts.bold, flex: 1, paddingRight: spacing.sm },
    unreadDot: { width: 8, height: 8, borderRadius: 4 },
    notifBody: { fontSize: fontSizes.sm, lineHeight: 18, marginBottom: 6 },
    notifFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    notifTime: { fontSize: fontSizes.xs },
    notifAction: { fontSize: fontSizes.xs, ...fonts.bold },
    deleteBtn: { padding: spacing.xs },
    empty: { alignItems: 'center', paddingVertical: 80, paddingHorizontal: spacing['3xl'] },
    emptyTitle: { fontSize: fontSizes.lg, ...fonts.bold, marginTop: spacing.base },
    emptySub: { fontSize: fontSizes.base, textAlign: 'center', marginTop: spacing.sm, lineHeight: 20 },
    skeletonCard: {
      flexDirection: 'row', alignItems: 'flex-start',
      marginHorizontal: spacing.lg, marginBottom: spacing.sm,
      borderRadius: borderRadius.lg, padding: 14, gap: spacing.md,
      backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderLight,
    },
    skeletonContent: { flex: 1 },
  });
}
