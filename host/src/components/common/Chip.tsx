import React from 'react';
import { Text, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, fonts, fontSizes, borderRadius } from '../../constants';
import { withOpacity } from '../../utils/color';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Render non-interactive (e.g. a tag/badge). */
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Pill chip used for filters, tags, and quick toggles. Single source of truth
 * for the ~28 inline chip styles scattered across search/filter components.
 */
export const Chip: React.FC<ChipProps> = ({ label, selected = false, onPress, icon, disabled, style }) => {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.8 : 1}
      onPress={onPress}
      disabled={disabled || !onPress}
      style={[styles.chip, selected && styles.chipSelected, style]}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={{ selected }}
    >
      {!!icon && (
        <Ionicons
          name={icon}
          size={14}
          color={selected ? colors.primary : colors.textSecondary}
          style={{ marginRight: 6 }}
        />
      )}
      <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const makeStyles = (colors: any) =>
  StyleSheet.create({
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.base,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.full,
      borderWidth: 1,
      borderColor: colors.borderLight,
      backgroundColor: colors.card,
    },
    chipSelected: {
      borderColor: colors.primary,
      backgroundColor: withOpacity(colors.primary, 0.1),
    },
    label: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      ...fonts.medium,
    },
    labelSelected: {
      color: colors.primary,
      ...fonts.semiBold,
    },
  });
