import React from 'react';
import { Text, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useHaptics } from '../../hooks/useHaptics';
import { spacing, fonts, fontSizes, borderRadius } from '../../constants';

interface DashedButtonProps {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
}

/**
 * Dashed "add" affordance — used for Add card / Create wishlist / Add photos.
 * Replaces three near-identical inline implementations.
 */
export const DashedButton: React.FC<DashedButtonProps> = ({ label, onPress, icon = 'add', style }) => {
  const { colors } = useTheme();
  const { light } = useHaptics();
  const styles = makeStyles(colors);

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => {
        light();
        onPress();
      }}
      style={[styles.button, style]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={18} color={colors.primary} style={{ marginRight: spacing.sm }} />
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
};

const makeStyles = (colors: any) =>
  StyleSheet.create({
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.base,
      paddingHorizontal: spacing.lg,
      borderRadius: borderRadius.lg,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: colors.primary,
      backgroundColor: colors.primarySubtle,
    },
    label: {
      fontSize: fontSizes.base,
      color: colors.primary,
      ...fonts.semiBold,
    },
  });
