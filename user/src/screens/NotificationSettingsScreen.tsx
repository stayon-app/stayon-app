import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { spacing } from '../constants';
import { ScreenHeader, SettingsRow, SettingsSection } from '../components/common';

const STORAGE_KEY = '@stayon_notif_prefs';

type NotifState = {
  push: boolean;
  email: boolean;
  sms: boolean;
  bookingUpdates: boolean;
  messages: boolean;
  promotions: boolean;
  priceAlerts: boolean;
};

const DEFAULTS: NotifState = {
  push: true,
  email: true,
  sms: false,
  bookingUpdates: true,
  messages: true,
  promotions: false,
  priceAlerts: true,
};

export function NotificationSettingsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [state, setState] = useState<NotifState>(DEFAULTS);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved) {
        try { setState({ ...DEFAULTS, ...JSON.parse(saved) }); } catch {}
      }
    });
  }, []);

  const update = (key: keyof NotifState) => {
    setState((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const channels: { key: keyof NotifState; title: string; sub: string }[] = [
    { key: 'push', title: 'Push notifications', sub: 'Alerts on this device' },
    { key: 'email', title: 'Email', sub: 'Updates to your inbox' },
    { key: 'sms', title: 'SMS', sub: 'Text messages' },
  ];

  const categories: { key: keyof NotifState; title: string; sub: string }[] = [
    { key: 'bookingUpdates', title: 'Booking updates', sub: 'Confirmations & reminders' },
    { key: 'messages', title: 'Messages', sub: 'Host & guest replies' },
    { key: 'promotions', title: 'Promotions', sub: 'Deals & offers' },
    { key: 'priceAlerts', title: 'Price alerts', sub: 'Drops on saved stays' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Notifications" onBack={() => navigation.goBack()} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing['3xl'] }}>
        <SettingsSection title="Channels">
          {channels.map((c) => (
            <SettingsRow
              key={c.key}
              title={c.title}
              subtitle={c.sub}
              rightType="switch"
              switchValue={state[c.key]}
              onSwitchChange={() => update(c.key)}
            />
          ))}
        </SettingsSection>

        <SettingsSection title="Categories">
          {categories.map((c) => (
            <SettingsRow
              key={c.key}
              title={c.title}
              subtitle={c.sub}
              rightType="switch"
              switchValue={state[c.key]}
              onSwitchChange={() => update(c.key)}
            />
          ))}
        </SettingsSection>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
  });
}

export default NotificationSettingsScreen;
