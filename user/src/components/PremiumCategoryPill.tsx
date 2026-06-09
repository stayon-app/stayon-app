import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, spacing, borderRadius } from '../constants';
import { useTheme } from '../contexts/ThemeContext';
import { STAYON_GRADIENT } from './GradientButton';

interface PremiumCategoryPillProps {
  id: string;
  name: string;
  image: string;
  isSelected: boolean;
  onPress: () => void;
  gradient?: string[];
}

export const PremiumCategoryPill: React.FC<PremiumCategoryPillProps> = ({
  name,
  image,
  isSelected,
  onPress,
  gradient = ['#0D9488', '#6366F1'],
}) => {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={styles.container}
    >
      {isSelected ? (
        <LinearGradient
          colors={gradient as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.selectedContainer}
        >
          <View style={styles.imageContainer}>
            <Image source={{ uri: typeof image === 'string' ? image : (image as any)?.uri }} style={styles.image} resizeMode="cover" />
            <View style={styles.overlay} />
          </View>
          <Text style={styles.selectedText}>{name ?? ''}</Text>
        </LinearGradient>
      ) : (
        <LinearGradient
          colors={STAYON_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.unselectedRing}
        >
          <View style={styles.unselectedContainer}>
            <View style={styles.imageContainer}>
              <Image source={{ uri: typeof image === 'string' ? image : (image as any)?.uri }} style={styles.image} resizeMode="cover" />
              <View style={styles.lightOverlay} />
            </View>
            <Text style={styles.unselectedText}>{name ?? ''}</Text>
          </View>
        </LinearGradient>
      )}
    </TouchableOpacity>
  );
};

function makeStyles(colors: any) {
  return StyleSheet.create({
  container: {
    marginRight: spacing.sm,
  },
  selectedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 4,
    paddingRight: spacing.md,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  unselectedRing: {
    borderRadius: borderRadius.full,
    padding: 1.5,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  unselectedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 4,
    paddingRight: spacing.md,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    gap: spacing.xs,
  },
  imageContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    backgroundColor: colors.backgroundSecondary,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  lightOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  selectedText: {
    fontSize: 14,
    ...fonts.semiBold,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  unselectedText: {
    fontSize: 14,
    ...fonts.medium,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  });
}
