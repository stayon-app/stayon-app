import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { fonts, spacing, borderRadius } from '../constants';
import { useTheme } from '../contexts/ThemeContext';

interface FloatingActionButtonProps {
  onMapPress: () => void;
  onFilterPress: () => void;
  showMapButton?: boolean;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onMapPress,
  onFilterPress,
  showMapButton = true,
}) => {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 40,
      useNativeDriver: true,
    }).start();

    // Subtle bounce animation loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      {/* Map Button */}
      {showMapButton && (
        <TouchableOpacity
          onPress={onMapPress}
          activeOpacity={0.8}
          style={styles.secondaryButton}
        >
          <LinearGradient
            colors={['#6366F1', '#4F46E5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.buttonGradient}
          >
            <Ionicons name="globe-outline" size={24} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* Filter Button with pulse */}
      <Animated.View
        style={{
          transform: [{ scale: bounceAnim }],
        }}
      >
        <TouchableOpacity
          onPress={onFilterPress}
          activeOpacity={0.8}
          style={styles.mainButton}
        >
          <LinearGradient
            colors={[colors.primary, '#0D9488']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.mainButtonGradient}
          >
            <Ionicons name="options" size={24} color="#FFFFFF" />
            <Text style={styles.buttonText}>Filters</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
};

function makeStyles(colors: any) {
  return StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    right: spacing.lg,
    alignItems: 'flex-end',
    gap: spacing.sm,
    zIndex: 100,
  },
  secondaryButton: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  mainButton: {
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  buttonGradient: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  buttonText: {
    fontSize: 16,
    ...fonts.semiBold,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  });
}
