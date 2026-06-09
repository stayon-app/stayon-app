import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useHaptics } from '../hooks/useHaptics';
import { fonts, fontSizes, spacing, borderRadius, letterSpacing } from '../constants';
import { withOpacity } from '../utils/color';
import { Image } from 'expo-image';
import { ScreenHeader } from '../components/common';
import { CURRENCIES } from '../utils/currency';
import { flagImageUrl } from '../constants/countries';

// Common currencies surfaced first; the rest follow alphabetically.
const PRIORITY = ['USD', 'INR', 'GBP', 'EUR', 'AED', 'QAR', 'CAD', 'AUD', 'SGD', 'JPY'];

// Currency → representative ISO country code (for the flag image).
const CURRENCY_COUNTRY: Record<string, string> = {
  USD: 'us', INR: 'in', EUR: 'eu', GBP: 'gb', AED: 'ae', QAR: 'qa', JPY: 'jp', AUD: 'au',
  CAD: 'ca', CHF: 'ch', CNY: 'cn', SGD: 'sg', THB: 'th', MXN: 'mx', BRL: 'br',
  ZAR: 'za', TRY: 'tr', KRW: 'kr', IDR: 'id', MYR: 'my', NZD: 'nz',
};

function timeAgo(ts: number | null): string {
  if (!ts) return 'using built‑in rates';
  const mins = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (mins < 1) return 'updated just now';
  if (mins < 60) return `updated ${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `updated ${hrs} hr${hrs > 1 ? 's' : ''} ago`;
  const days = Math.round(hrs / 24);
  return `updated ${days} day${days > 1 ? 's' : ''} ago`;
}

export function CurrencyScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { currencyCode, setCurrency, ratesUpdatedAt, ratesLoading, refreshRates } = useCurrency();
  const { selection, light } = useHaptics();
  const styles = makeStyles(colors);

  const codes = Object.keys(CURRENCIES);
  const ordered = [
    ...PRIORITY.filter((c) => codes.includes(c)),
    ...codes.filter((c) => !PRIORITY.includes(c)).sort(),
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Currency" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['4xl'] }}>
        <View style={styles.banner}>
          <Ionicons name="globe-outline" size={18} color={colors.primary} />
          <Text style={styles.bannerText}>
            Price your listings in your own currency. Guests always see prices converted to theirs automatically — a guest in India sees ₹, a guest in the US sees $.
          </Text>
        </View>

        {/* Live FX status */}
        <TouchableOpacity style={styles.fxRow} activeOpacity={0.8} onPress={() => { light(); refreshRates(); }} disabled={ratesLoading}>
          <View style={[styles.fxDot, { backgroundColor: ratesUpdatedAt ? colors.success : colors.warning }]} />
          <Text style={styles.fxText}>Live exchange rates · {ratesLoading ? 'refreshing…' : timeAgo(ratesUpdatedAt)}</Text>
          <Ionicons name="refresh" size={16} color={colors.primary} />
        </TouchableOpacity>

        <Text style={styles.section}>Your hosting currency</Text>
        <View style={styles.card}>
          {ordered.map((code, i) => {
            const c = CURRENCIES[code];
            const active = currencyCode === code;
            return (
              <TouchableOpacity
                key={code}
                style={[styles.row, i < ordered.length - 1 && styles.divider]}
                onPress={() => { selection(); setCurrency(code); }}
              >
                <View style={[styles.symbolWrap, active && { backgroundColor: colors.primarySubtle }]}>
                  <Image source={{ uri: flagImageUrl(CURRENCY_COUNTRY[code] || 'us') }} style={styles.flagImg} contentFit="cover" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{c.name}</Text>
                  <Text style={styles.code}>{c.code} · {c.symbol}</Text>
                </View>
                {active && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    banner: { flexDirection: 'row', gap: spacing.md, padding: spacing.base, borderRadius: borderRadius.lg, backgroundColor: colors.primarySubtle, borderWidth: 1, borderColor: withOpacity(colors.primary, 0.2), marginBottom: spacing.lg },
    bannerText: { flex: 1, fontSize: fontSizes.sm, color: colors.textPrimary, lineHeight: 20, ...fonts.regular },
    fxRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md, paddingHorizontal: spacing.base, borderRadius: borderRadius.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderLight, marginBottom: spacing.lg },
    fxDot: { width: 8, height: 8, borderRadius: 4 },
    fxText: { flex: 1, fontSize: fontSizes.sm, color: colors.textSecondary, ...fonts.medium },
    section: { fontSize: fontSizes.sm, color: colors.textSecondary, marginBottom: spacing.sm, ...fonts.semiBold },
    card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderLight, borderRadius: borderRadius.lg, paddingHorizontal: spacing.base },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
    divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight },
    symbolWrap: { width: 40, height: 40, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.backgroundSecondary },
    flagImg: { width: 28, height: 20, borderRadius: 3, backgroundColor: colors.borderLight },
    name: { fontSize: fontSizes.base, color: colors.textPrimary, ...fonts.semiBold },
    code: { fontSize: fontSizes.sm, color: colors.textTertiary, marginTop: 1, ...fonts.regular },
  });

export default CurrencyScreen;
