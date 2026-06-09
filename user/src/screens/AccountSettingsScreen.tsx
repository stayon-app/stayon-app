import React, { useState } from 'react';
import { Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { spacing, fontSizes, fonts } from '../constants';
import { ScreenHeader, SettingsRow, SettingsSection } from '../components/common';

const LOCALE_KEY = '@stayon_locale';

export function AccountSettingsScreen({ navigation }: any) {
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = makeStyles(colors);
  const [locale, setLocale] = useState<{ language: string; currency: string }>({ language: 'English (US)', currency: 'USD' });

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      AsyncStorage.getItem(LOCALE_KEY).then((saved) => {
        if (active && saved) {
          try {
            const parsed = JSON.parse(saved);
            setLocale({ language: parsed.language ?? 'English (US)', currency: parsed.currency ?? 'USD' });
          } catch {}
        }
      });
      return () => { active = false; };
    }, [])
  );

  const rows: { icon: any; title: string; sub: string; go: string | null }[] = [
    { icon: 'person-outline', title: 'Personal information', sub: 'Name, email, phone, address', go: 'PersonalInfo' },
    { icon: 'shield-checkmark-outline', title: 'Identity verification', sub: 'Verify ID, phone & email', go: 'IdentityVerification' },
    { icon: 'lock-closed-outline', title: 'Login & security', sub: 'Password & two-factor auth', go: null },
    { icon: 'card-outline', title: 'Payments & payouts', sub: 'Cards, Apple Pay, PayPal', go: 'PaymentMethods' },
    { icon: 'notifications-outline', title: 'Notifications', sub: 'How we reach you', go: 'NotificationSettings' },
    { icon: 'globe-outline', title: 'Language & currency', sub: `${locale.language} · ${locale.currency}`, go: 'LanguageCurrency' },
    { icon: 'eye-off-outline', title: 'Privacy & sharing', sub: 'Data, profile visibility', go: 'PrivacySharing' },
    { icon: 'accessibility-outline', title: 'Accessibility', sub: 'Adjust your experience', go: 'AccessibilitySettings' },
    { icon: 'leaf-outline', title: 'Carbon offset', sub: 'Eco-friendly travel', go: 'CustomerSupport' },
    { icon: 'receipt-outline', title: 'Taxes', sub: 'Tax info & documents', go: 'CustomerSupport' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Account Settings" onBack={() => navigation.goBack()} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing['3xl'] }}>
        <SettingsSection>
          {rows.map((r) => (
            <SettingsRow
              key={r.title}
              icon={r.icon}
              title={r.title}
              subtitle={r.sub}
              onPress={() => r.go && navigation.navigate(r.go)}
            />
          ))}
        </SettingsSection>

        <SettingsSection title="Appearance">
          <SettingsRow
            icon={isDark ? 'moon' : 'sunny-outline'}
            title="Dark mode"
            subtitle={isDark ? 'On' : 'Off'}
            rightType="switch"
            switchValue={isDark}
            onSwitchChange={toggleTheme}
          />
        </SettingsSection>

        <Text style={styles.version}>StayOn v1.0.0 (1)</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    version: { textAlign: 'center', fontSize: fontSizes.xs, marginTop: spacing.xl, color: colors.textTertiary, ...fonts.regular },
  });
}

export default AccountSettingsScreen;
