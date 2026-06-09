import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useHaptics } from '../../hooks/useHaptics';
import { spacing, fonts, fontSizes, borderRadius, letterSpacing } from '../../constants';
import { withOpacity } from '../../utils/color';

/* ------------------------------- SettingsSection ------------------------------- */

interface SettingsSectionProps {
  title?: string;
  children: React.ReactNode;
  /** Footer helper text under the card. */
  footer?: string;
  style?: StyleProp<ViewStyle>;
}

/** Grouped, card-wrapped settings rows with an uppercase section label. */
export const SettingsSection: React.FC<SettingsSectionProps> = ({ title, children, footer, style }) => {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const items = React.Children.toArray(children).filter(Boolean);

  return (
    <View style={[styles.section, style]}>
      {!!title && <Text style={styles.sectionTitle}>{title}</Text>}
      <View style={styles.card}>
        {items.map((child, i) => (
          <View key={i}>
            {i > 0 && <View style={styles.divider} />}
            {child}
          </View>
        ))}
      </View>
      {!!footer && <Text style={styles.footer}>{footer}</Text>}
    </View>
  );
};

/* --------------------------------- SettingsRow --------------------------------- */

interface SettingsRowProps {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Tint for the icon chip (defaults to brand primary). */
  iconColor?: string;
  onPress?: () => void;
  /** Right accessory. 'chevron' (default when onPress), 'switch', 'value', or 'none'. */
  rightType?: 'chevron' | 'switch' | 'value' | 'none';
  /** Value text shown on the right when rightType='value'. */
  value?: string;
  /** Switch state when rightType='switch'. */
  switchValue?: boolean;
  onSwitchChange?: (v: boolean) => void;
  /** Render the title in a destructive color. */
  destructive?: boolean;
  /** Show a selected check on the right (for radio-style lists). */
  selected?: boolean;
}

/**
 * One settings/menu row: optional icon chip, title + subtitle, and a right
 * accessory (chevron / switch / value / check). Single source of truth across
 * the ~10 settings screens that previously hand-rolled this.
 */
export const SettingsRow: React.FC<SettingsRowProps> = ({
  title,
  subtitle,
  icon,
  iconColor,
  onPress,
  rightType,
  value,
  switchValue,
  onSwitchChange,
  destructive,
  selected,
}) => {
  const { colors } = useTheme();
  const { light, selection } = useHaptics();
  const styles = makeStyles(colors);

  const tint = destructive ? colors.error : iconColor || colors.primary;
  const right = rightType ?? (onPress ? 'chevron' : 'none');

  const content = (
    <View style={styles.row}>
      {!!icon && (
        <View style={[styles.iconChip, { backgroundColor: withOpacity(tint, 0.12) }]}>
          <Ionicons name={icon} size={18} color={tint} />
        </View>
      )}
      <View style={styles.texts}>
        <Text style={[styles.title, destructive && { color: colors.error }]} numberOfLines={1}>
          {title}
        </Text>
        {!!subtitle && (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        )}
      </View>

      {right === 'value' && !!value && (
        <Text style={styles.value} numberOfLines={1}>
          {value}
        </Text>
      )}
      {selected && <Ionicons name="checkmark" size={20} color={colors.primary} style={{ marginLeft: spacing.sm }} />}
      {right === 'switch' && (
        <Switch
          value={!!switchValue}
          onValueChange={(v) => {
            selection();
            onSwitchChange?.(v);
          }}
          trackColor={{ false: colors.borderLight, true: withOpacity(colors.primary, 0.5) }}
          thumbColor={switchValue ? colors.primary : '#f4f4f5'}
          ios_backgroundColor={colors.borderLight}
        />
      )}
      {right === 'chevron' && (
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} style={{ marginLeft: spacing.sm }} />
      )}
    </View>
  );

  if (!onPress) return content;

  return (
    <TouchableOpacity
      activeOpacity={0.6}
      onPress={() => {
        right === 'switch' ? selection() : light();
        onPress();
      }}
      accessibilityRole="button"
    >
      {content}
    </TouchableOpacity>
  );
};

const makeStyles = (colors: any) =>
  StyleSheet.create({
    section: {
      marginTop: spacing.xl,
      paddingHorizontal: spacing.lg,
    },
    sectionTitle: {
      fontSize: fontSizes.xs,
      letterSpacing: letterSpacing.wide,
      textTransform: 'uppercase',
      color: colors.textTertiary,
      marginBottom: spacing.sm,
      marginLeft: spacing.xs,
      ...fonts.bold,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.borderLight,
      overflow: 'hidden',
    },
    footer: {
      fontSize: fontSizes.xs,
      color: colors.textTertiary,
      marginTop: spacing.sm,
      marginLeft: spacing.xs,
      ...fonts.regular,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.base,
      paddingVertical: spacing.md,
      minHeight: 56,
    },
    iconChip: {
      width: 36,
      height: 36,
      borderRadius: borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
    },
    texts: {
      flex: 1,
    },
    title: {
      fontSize: fontSizes.base,
      color: colors.textPrimary,
      ...fonts.semiBold,
    },
    subtitle: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      marginTop: 2,
      ...fonts.regular,
    },
    value: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      maxWidth: 140,
      ...fonts.medium,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.borderLight,
      marginLeft: spacing.base,
    },
  });
