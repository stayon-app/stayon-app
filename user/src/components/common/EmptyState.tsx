import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { useHaptics } from '../../hooks/useHaptics';
import { STAYON_GRADIENT } from '../GradientButton';
import { spacing, fonts, fontSizes, lineHeights, borderRadius, letterSpacing } from '../../constants';
import { withOpacity } from '../../utils/color';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  /** Primary call-to-action (gradient button). */
  actionLabel?: string;
  onAction?: () => void;
  /** Secondary, lower-emphasis action (text link). */
  secondaryLabel?: string;
  onSecondary?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Premium empty state: soft gradient icon halo + title + supportive copy + CTA.
 * Use anywhere a list/section can be empty (Trips, Messages, Wishlist, search).
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  style,
}) => {
  const { colors } = useTheme();
  const { light } = useHaptics();
  const styles = makeStyles(colors);

  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconHalo}>
        <View style={styles.iconCircle}>
          <Ionicons name={icon} size={32} color={colors.primary} />
        </View>
      </View>

      <Text style={styles.title}>{title}</Text>
      {!!message && <Text style={styles.message}>{message}</Text>}

      {!!actionLabel && (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            light();
            onAction?.();
          }}
          style={styles.ctaWrap}
        >
          <LinearGradient
            colors={STAYON_GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.cta}
          >
            <Text style={styles.ctaText}>{actionLabel}</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}

      {!!secondaryLabel && (
        <TouchableOpacity
          onPress={() => {
            light();
            onSecondary?.();
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.secondary}>{secondaryLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const makeStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing['3xl'],
    },
    iconHalo: {
      width: 96,
      height: 96,
      borderRadius: 48,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: withOpacity(colors.primary, 0.08),
      marginBottom: spacing.lg,
    },
    iconCircle: {
      width: 68,
      height: 68,
      borderRadius: 34,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: withOpacity(colors.primary, 0.12),
    },
    title: {
      fontSize: fontSizes.xl,
      letterSpacing: letterSpacing.tight,
      color: colors.textPrimary,
      textAlign: 'center',
      ...fonts.bold,
    },
    message: {
      fontSize: fontSizes.base,
      lineHeight: lineHeights.md,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: spacing.sm,
      maxWidth: 300,
      ...fonts.regular,
    },
    ctaWrap: {
      marginTop: spacing.xl,
      borderRadius: borderRadius.full,
      overflow: 'hidden',
    },
    cta: {
      paddingHorizontal: spacing['2xl'],
      paddingVertical: spacing.md,
      borderRadius: borderRadius.full,
    },
    ctaText: {
      fontSize: fontSizes.base,
      color: '#fff',
      ...fonts.bold,
    },
    secondary: {
      marginTop: spacing.base,
      fontSize: fontSizes.sm,
      color: colors.primary,
      ...fonts.semiBold,
    },
  });
