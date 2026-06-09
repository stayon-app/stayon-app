import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { spacing } from '../constants';
import { ScreenHeader, SettingsRow, SettingsSection } from '../components/common';

const STORAGE_KEY = '@stayon_a11y';

type A11yState = {
  reduceMotion: boolean;
  largerText: boolean;
  highContrast: boolean;
  boldText: boolean;
  reduceTransparency: boolean;
};

const DEFAULTS: A11yState = {
  reduceMotion: false,
  largerText: false,
  highContrast: false,
  boldText: false,
  reduceTransparency: false,
};

export function AccessibilitySettingsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [state, setState] = useState<A11yState>(DEFAULTS);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved) {
        try { setState({ ...DEFAULTS, ...JSON.parse(saved) }); } catch {}
      }
    });
  }, []);

  const update = (key: keyof A11yState) => {
    setState((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const rows: { key: keyof A11yState; title: string; sub: string }[] = [
    { key: 'reduceMotion', title: 'Reduce motion', sub: 'Limit animations & effects' },
    { key: 'largerText', title: 'Larger text', sub: 'Increase font size' },
    { key: 'highContrast', title: 'High contrast', sub: 'Boost color contrast' },
    { key: 'boldText', title: 'Bold text', sub: 'Make text heavier' },
    { key: 'reduceTransparency', title: 'Reduce transparency', sub: 'Solid backgrounds' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Accessibility" onBack={() => navigation.goBack()} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing['3xl'] }}>
        <SettingsSection footer="Your accessibility preferences are saved on this device. Some options may also follow your system settings.">
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

export default AccessibilitySettingsScreen;
