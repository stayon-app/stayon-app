import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { fonts, fontSizes, spacing, borderRadius, letterSpacing } from '../constants';
import { withOpacity } from '../utils/color';

interface StatCardProps {
  label: string;
  value: string;
  icon?: keyof typeof Ionicons.glyphMap;
  /** e.g. "+12%" — coloured by `trendUp`. */
  trend?: string;
  trendUp?: boolean;
  /** Tint for the icon chip (defaults to brand primary). */
  tint?: string;
  style?: StyleProp<ViewStyle>;
}

/** A labelled metric: big number + optional icon chip and trend pill. */
export const StatCard: React.FC<StatCardProps> = ({ label, value, icon, trend, trendUp, tint, style }) => {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const c = tint || colors.primary;

  return (
    <View style={[styles.card, style]}>
      <View style={styles.top}>
        {!!icon && (
          <View style={[styles.iconChip, { backgroundColor: withOpacity(c, 0.12) }]}>
            <Ionicons name={icon} size={16} color={c} />
          </View>
        )}
        {!!trend && (
          <View style={[styles.trend, { backgroundColor: withOpacity(trendUp ? colors.success : colors.error, 0.12) }]}>
            <Ionicons name={trendUp ? 'arrow-up' : 'arrow-down'} size={11} color={trendUp ? colors.success : colors.error} />
            <Text style={[styles.trendText, { color: trendUp ? colors.success : colors.error }]}>{trend}</Text>
          </View>
        )}
      </View>
      <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={styles.label} numberOfLines={1}>{label}</Text>
    </View>
  );
};

const makeStyles = (colors: any) =>
  StyleSheet.create({
    card: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.borderLight,
      padding: spacing.base,
      minHeight: 104,
      justifyContent: 'space-between',
    },
    top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    iconChip: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    trend: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999 },
    trendText: { fontSize: 11, ...fonts.bold },
    value: { fontSize: fontSizes['2xl'], letterSpacing: letterSpacing.tight, color: colors.textPrimary, marginTop: spacing.sm, ...fonts.bold },
    label: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 2, ...fonts.medium },
  });
