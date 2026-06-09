import React, { useState, useEffect } from 'react';
import {
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  ImageSourcePropType,
  ViewStyle,
  ImageStyle,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing } from '../../constants/spacing';

interface ProgressiveImageProps {
  source: ImageSourcePropType | { uri: string };
  style?: ImageStyle;
  containerStyle?: ViewStyle;
  blurRadius?: number;
  fadeDuration?: number;
  showLoadingIndicator?: boolean;
  onLoad?: () => void;
  onError?: () => void;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
}

/**
 * ProgressiveImage Component
 * 
 * Features:
 * - Blur placeholder while loading
 * - Smooth fade-in when loaded
 * - Error state with retry button
 * - Loading shimmer effect
 * - Optimized for performance
 * 
 * Usage:
 * <ProgressiveImage
 *   source={{ uri: 'https://example.com/image.jpg' }}
 *   style={{ width: 300, height: 200 }}
 *   blurRadius={5}
 * />
 */
export const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
  source,
  style,
  containerStyle,
  blurRadius = 10,
  fadeDuration = 300,
  showLoadingIndicator = true,
  onLoad,
  onError,
  resizeMode = 'cover',
}) => {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [shouldRetry, setShouldRetry] = useState(0);
  
  const imageOpacity = useState(new Animated.Value(0))[0];
  const placeholderOpacity = useState(new Animated.Value(1))[0];
  const shimmerAnimation = useState(new Animated.Value(0))[0];

  useEffect(() => {
    // Start shimmer animation
    if (isLoading && !hasError) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnimation, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(shimmerAnimation, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [isLoading, hasError, shimmerAnimation]);

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);

    // Fade in the main image and fade out placeholder
    Animated.parallel([
      Animated.timing(imageOpacity, {
        toValue: 1,
        duration: fadeDuration,
        useNativeDriver: true,
      }),
      Animated.timing(placeholderOpacity, {
        toValue: 0,
        duration: fadeDuration,
        useNativeDriver: true,
      }),
    ]).start();

    onLoad?.();
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
    shimmerAnimation.stopAnimation();
    onError?.();
  };

  const handleRetry = () => {
    setHasError(false);
    setIsLoading(true);
    setShouldRetry(prev => prev + 1);
    
    // Reset animations
    imageOpacity.setValue(0);
    placeholderOpacity.setValue(1);
  };

  const shimmerTranslate = shimmerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-300, 300],
  });

  if (hasError) {
    return (
      <View style={[styles.container, containerStyle, style]}>
        <View style={styles.errorContainer}>
          <Ionicons name="image-outline" size={48} color={colors.textTertiary} />
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={handleRetry}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, containerStyle, style]}>
      {/* Placeholder with blur */}
      <Animated.View 
        style={[
          styles.placeholder,
          { opacity: placeholderOpacity }
        ]}
      >
        <View style={[styles.placeholderBackground, style]} />
        
        {/* Shimmer effect */}
        {isLoading && (
          <Animated.View
            style={[
              styles.shimmer,
              {
                transform: [{ translateX: shimmerTranslate }],
              },
            ]}
          />
        )}
      </Animated.View>

      {/* Main image */}
      <Animated.Image
        key={`image-${shouldRetry}`}
        source={source}
        style={[
          style,
          styles.image,
          { opacity: imageOpacity },
        ]}
        onLoad={handleImageLoad}
        onError={handleImageError}
        resizeMode={resizeMode}
      />

      {/* Loading indicator */}
      {isLoading && showLoadingIndicator && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} size="small" />
        </View>
      )}
    </View>
  );
};

function makeStyles(colors: any) {
  return StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: colors.backgroundSecondary,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  placeholderBackground: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.backgroundTertiary,
  },
  shimmer: {
    ...StyleSheet.absoluteFill,
    width: 300,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    transform: [{ skewX: '-20deg' }],
  },
  loadingContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
  },
  retryButton: {
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)' }
      : {}),
  },
  });
}

export default ProgressiveImage;
