import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { fonts, fontSizes, spacing, borderRadius } from '../constants';
import { withOpacity } from '../utils/color';

/**
 * StayOn's headline reminder: 0% charges anywhere. Drop on any money / pricing
 * / settings screen so hosts always see they keep 100%.
 */
export const FeeReminder: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <View style={[styles.banner, compact && styles.compact]}>
      <View style={styles.iconWrap}><Ionicons name="pricetag" size={compact ? 14 : 16} color={colors.primary} /></View>
      <Text style={styles.text}>
        {compact
          ? 'StayOn is 0% fee — you keep 100%.'
          : 'StayOn charges 0% — no platform fee, no guest fee, no host commission. You keep 100% of your rate and cleaning; only taxes pass through.'}
      </Text>
    </View>
  );
};

const makeStyles = (colors: any) =>
  StyleSheet.create({
    banner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.base, borderRadius: borderRadius.lg, backgroundColor: colors.primarySubtle, borderWidth: 1, borderColor: withOpacity(colors.primary, 0.2) },
    compact: { padding: spacing.md },
    iconWrap: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
    text: { flex: 1, fontSize: fontSizes.sm, color: colors.textPrimary, lineHeight: 18, ...fonts.medium },
  });

export default FeeReminder;
