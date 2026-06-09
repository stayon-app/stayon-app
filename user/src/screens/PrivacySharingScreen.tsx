import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { spacing } from '../constants';
import { ScreenHeader, SettingsRow, SettingsSection } from '../components/common';

const STORAGE_KEY = '@stayon_privacy';

type PrivacyState = {
  profileVisibility: boolean;
  showTrips: boolean;
  dataSharing: boolean;
  personalizedAds: boolean;
  readReceipts: boolean;
};

const DEFAULTS: PrivacyState = {
  profileVisibility: true,
  showTrips: true,
  dataSharing: true,
  personalizedAds: false,
  readReceipts: true,
};

export function PrivacySharingScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [state, setState] = useState<PrivacyState>(DEFAULTS);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved) {
        try { setState({ ...DEFAULTS, ...JSON.parse(saved) }); } catch {}
      }
    });
  }, []);

  const update = (key: keyof PrivacyState) => {
    setState((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const rows: { key: keyof PrivacyState; title: string; sub: string }[] = [
    { key: 'profileVisibility', title: 'Profile visibility', sub: 'Let others find your profile' },
    { key: 'showTrips', title: 'Show trips on profile', sub: 'Display past stays publicly' },
    { key: 'dataSharing', title: 'Data sharing for personalization', sub: 'Tailor recommendations' },
    { key: 'personalizedAds', title: 'Personalized ads', sub: 'Use activity for ads' },
    { key: 'readReceipts', title: 'Read receipts', sub: 'Show when you read messages' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Privacy & sharing" onBack={() => navigation.goBack()} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing['3xl'] }}>
        <SettingsSection footer="You control what you share. Changes apply instantly.">
          {rows.map((r) => (
            <SettingsRow
              key={r.key}
              title={r.title}
              subtitle={r.sub}
              rightType="switch"
              switchValue={state[r.key]}
              onSwitchChange={() => update(r.key)}
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

export default PrivacySharingScreen;
