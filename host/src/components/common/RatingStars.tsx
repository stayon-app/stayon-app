import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { fonts, fontSizes } from '../../constants';

interface RatingStarsProps {
  rating: number;
  /** Number of reviews, rendered as "(123)" after the value when provided. */
  reviews?: number;
  /** Show a row of star glyphs instead of a single star + number. */
  showStars?: boolean;
  size?: number;
  /** Hide the numeric value (only the star glyph). */
  hideValue?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Consistent rating display. Default = one star + numeric value (card style);
 * `showStars` = a 5-star glyph row (review-summary style).
 */
export const RatingStars: React.FC<RatingStarsProps> = ({
  rating,
  reviews,
  showStars = false,
  size = 14,
  hideValue = false,
  style,
}) => {
  const { colors } = useTheme();
  const value = Number(rating) || 0;

  if (showStars) {
    const full = Math.floor(value);
    const half = value - full >= 0.5;
    return (
      <View style={[styles.row, style]}>
        {Array.from({ length: 5 }).map((_, i) => {
          const name = i < full ? 'star' : i === full && half ? 'star-half' : 'star-outline';
          return <Ionicons key={i} name={name as any} size={size} color={colors.gold} style={{ marginRight: 2 }} />;
        })}
        {!hideValue && (
          <Text style={[styles.value, { fontSize: size, color: colors.textPrimary, marginLeft: 4 }]}>
            {value.toFixed(2)}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.row, style]}>
      <Ionicons name="star" size={size} color={colors.textPrimary} />
      {!hideValue && (
        <Text style={[styles.value, { fontSize: size, color: colors.textPrimary, marginLeft: 4 }]}>
          {value.toFixed(2)}
          {reviews != null ? ` (${reviews})` : ''}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  value: {
    ...fonts.semiBold,
  },
});
