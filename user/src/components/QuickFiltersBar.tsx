import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fontSizes, fonts, spacing, borderRadius } from '../constants';
import { useTheme } from '../contexts/ThemeContext';

interface QuickFilter {
  id: string;
  label: string;
  icon: string;
  active: boolean;
}

interface QuickFiltersBarProps {
  filters: QuickFilter[];
  onToggle: (filterId: string) => void;
}

export const QuickFiltersBar: React.FC<QuickFiltersBarProps> = ({
  filters,
  onToggle,
}) => {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {filters.map((filter) => (
        <TouchableOpacity
          key={filter.id}
          style={[
            styles.filterChip,
            filter.active && styles.filterChipActive,
          ]}
          onPress={() => onToggle(filter.id)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={filter.icon as any}
            size={16}
            color={filter.active ? colors.textInverse : colors.textSecondary}
          />
          <Text
            style={[
              styles.filterLabel,
              filter.active && styles.filterLabelActive,
            ]}
          >
            {filter.label}
          </Text>
          {filter.active && (
            <Ionicons
              name="checkmark-circle"
              size={16}
              color={colors.textInverse}
            />
          )}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

function makeStyles(colors: any) {
  return StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
    gap: spacing.xs,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  filterChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  filterLabel: {
    fontSize: fontSizes.sm,
    ...fonts.medium,
    color: colors.textSecondary,
  },
  filterLabelActive: {
    color: colors.textInverse,
    ...fonts.semiBold,
  },
  });
}
