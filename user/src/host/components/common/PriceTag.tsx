import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { fonts, fontSizes } from '../../constants';

interface PriceTagProps {
  /** Amount in USD (the authoring currency); rendered via useCurrency().format. */
  amountUSD: number;
  /** Unit suffix, e.g. "night", "person". Omit for a bare price. */
  unit?: string;
  size?: 'sm' | 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
  valueStyle?: StyleProp<TextStyle>;
}

const SIZES = {
  sm: { value: fontSizes.base, unit: fontSizes.xs },
  md: { value: fontSizes.lg, unit: fontSizes.sm },
  lg: { value: fontSizes['2xl'], unit: fontSizes.base },
};

/**
 * Currency-aware price display: bold value + muted "/ unit" suffix.
 * Single source of truth replacing the inline `$XXX / night` markup in cards.
 */
export const PriceTag: React.FC<PriceTagProps> = ({ amountUSD, unit, size = 'md', style, valueStyle }) => {
  const { colors } = useTheme();
  const { format } = useCurrency();
  const s = SIZES[size];

  return (
    <View style={[styles.row, style]}>
      <Text style={[styles.value, { fontSize: s.value, color: colors.textPrimary }, valueStyle]}>
        {format(Number(amountUSD) || 0)}
      </Text>
      {!!unit && (
        <Text style={[styles.unit, { fontSize: s.unit, color: colors.textSecondary }]}> / {unit}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  value: {
    ...fonts.bold,
  },
  unit: {
    ...fonts.regular,
  },
});
