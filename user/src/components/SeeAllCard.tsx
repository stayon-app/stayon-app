import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { fonts } from '../constants';

interface SeeAllCardProps {
  /** Background image shown behind the "See all" label. */
  image: string;
  onPress: () => void;
  label?: string;
  width: number;
  /** Omit to let the card stretch to the height of its sibling cards. */
  height?: number;
  radius?: number;
  /** Smaller arrow + label for short/narrow carousels (e.g. vibe chips). */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Image end-card that closes a horizontal carousel. Replaces a top-right
 * "See all" text link — the user swipes to the end and taps the image.
 */
export const SeeAllCard: React.FC<SeeAllCardProps> = ({
  image,
  onPress,
  label = 'See all',
  width,
  height,
  radius = 16,
  compact = false,
  style,
}) => {
  const { colors } = useTheme();
  const circleSize = compact ? 34 : 52;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={[styles.card, { width, height, borderRadius: radius }, style]}
    >
      <Image source={{ uri: image }} style={styles.img} resizeMode="cover" />
      <LinearGradient
        colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0.72)']}
        style={styles.overlay}
      >
        <View
          style={[
            styles.circle,
            { width: circleSize, height: circleSize, borderRadius: circleSize / 2 },
          ]}
        >
          <Ionicons name="arrow-forward" size={compact ? 18 : 24} color={colors.primary} />
        </View>
        <Text style={[styles.label, compact && styles.labelCompact]}>{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  img: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 12,
  },
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  label: {
    color: '#fff',
    fontSize: 15,
    ...fonts.bold,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  labelCompact: {
    fontSize: 12,
  },
});
