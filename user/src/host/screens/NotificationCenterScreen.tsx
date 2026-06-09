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

export function NotificationCenterScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { light } = useHaptics();
  const styles = makeStyles(colors);
  const [notifs, setNotifs] = useState<HostNotif[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      getNotifs().then((n) => { if (active) setNotifs(n); });
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
