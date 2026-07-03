import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useHaptics } from '../../hooks/useHaptics';
import { spacing, fonts, fontSizes, letterSpacing } from '../../constants';

export interface ScreenHeaderAction {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  accessibilityLabel?: string;
  tint?: string;
}

interface ScreenHeaderProps {
  title?: string;
  subtitle?: string;
  /** Show the back chevron (default true). */
  showBack?: boolean;
  onBack?: () => void;
  /** Right-side action button(s). */
  rightActions?: ScreenHeaderAction[];
  /** Center the title instead of left-aligning (default true). */
  centerTitle?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Consistent top header for stack screens — back chevron + title + optional
 * right actions. Replaces the bespoke header re-implemented across 10+ screens.
 */
export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  subtitle,
  showBack = true,
  onBack,
  rightActions = [],
  centerTitle = true,
  style,
}) => {
  const { colors } = useTheme();
  const { light } = useHaptics();
  const styles = makeStyles(colors);

  const handleBack = () => {
    light();
    onBack?.();
  };

  return (
    <View style={[styles.header, style]}>
      <View style={styles.side}>
        {showBack && (
          <TouchableOpacity
            onPress={handleBack}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.titleWrap, centerTitle ? styles.titleCenter : styles.titleLeft]}>
        {!!title && (
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        )}
        {!!subtitle && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>

      <View style={[styles.side, styles.sideRight]}>
        {rightActions.map((action, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => {
              light();
              action.onPress();
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel={action.accessibilityLabel}
            style={i > 0 ? { marginLeft: spacing.base } : undefined}
          >
            <Ionicons name={action.icon} size={22} color={action.tint || colors.textPrimary} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const makeStyles = (colors: any) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      minHeight: 52,
    },
    side: {
      minWidth: 40,
      justifyContent: 'center',
    },
    sideRight: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
    },
    titleWrap: {
      flex: 1,
    },
    titleCenter: {
      alignItems: 'center',
    },
    titleLeft: {
      alignItems: 'flex-start',
      paddingLeft: spacing.xs,
    },
    title: {
      fontSize: fontSizes.lg,
      letterSpacing: letterSpacing.snug,
      color: colors.textPrimary,
      ...fonts.bold,
    },
    subtitle: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      marginTop: 1,
      ...fonts.regular,
    },
  });
