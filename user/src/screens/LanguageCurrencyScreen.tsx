import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { spacing } from '../constants';
import { CURRENCIES as CURRENCY_CONFIG } from '../utils/currency';
import { ScreenHeader, SettingsRow, SettingsSection } from '../components/common';

const STORAGE_KEY = '@stayon_locale';

const DEFAULT_LANGUAGE = 'English (US)';

const LANGUAGES = ['English (US)', 'English (UK)', 'French', 'Spanish', 'German', 'Italian'];

// Currencies offered in Settings. The active one is sourced from CurrencyContext
// so changing it here re-prices the whole app immediately.
const CURRENCY_OPTIONS: { code: string; label: string }[] = [
  { code: 'USD', label: 'US Dollar' },
  { code: 'INR', label: 'Indian Rupee' },
  { code: 'EUR', label: 'Euro' },
  { code: 'GBP', label: 'British Pound' },
  { code: 'AED', label: 'UAE Dirham' },
  { code: 'AUD', label: 'Australian Dollar' },
  { code: 'CAD', label: 'Canadian Dollar' },
  { code: 'SGD', label: 'Singapore Dollar' },
  { code: 'JPY', label: 'Japanese Yen' },
];

export function LanguageCurrencyScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { currencyCode, setCurrency } = useCurrency();
  const styles = makeStyles(colors);
  const [language, setLanguage] = useState<string>(DEFAULT_LANGUAGE);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed?.language) setLanguage(parsed.language);
        } catch {}
      }
    });
  }, []);

  const selectLanguage = (next: string) => {
    setLanguage(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ language: next })).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Language & currency" onBack={() => navigation.goBack()} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing['3xl'] }}>
        <SettingsSection title="Language">
          {LANGUAGES.map((lang) => (
            <SettingsRow
              key={lang}
              title={lang}
              selected={language === lang}
              rightType="none"
              onPress={() => selectLanguage(lang)}
            />
          ))}
        </SettingsSection>

        <SettingsSection
          title="Currency"
          footer="Prices across the app are shown in your selected currency. Stays are priced in USD and converted using current rates."
        >
          {CURRENCY_OPTIONS.map((c) => {
            const symbol = CURRENCY_CONFIG[c.code]?.symbol || '';
            return (
              <SettingsRow
                key={c.code}
                title={`${symbol ? `${symbol}  ` : ''}${c.code} · ${c.label}`}
                selected={currencyCode === c.code}
                rightType="none"
                onPress={() => setCurrency(c.code)}
              />
            );
          })}
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

export default LanguageCurrencyScreen;
