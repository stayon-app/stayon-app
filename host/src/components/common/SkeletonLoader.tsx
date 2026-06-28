import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
}

/**
 * Base Skeleton Component
 * Shows an animated shimmer placeholder
 */
export const Skeleton: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = 20,
  borderRadius = spacing.xs,
  style,
}) => {
  const shimmerAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
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
    );
    loop.start();
    return () => loop.stop();
  }, [shimmerAnimation]);

  const shimmerTranslate = shimmerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-300, 300],
  });

  const shimmerOpacity = shimmerAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 0.6, 0.3],
  });

  return (
    <View
      style={[
        styles.skeleton,
        {
          width: width as any,
          height: height as any,
          borderRadius,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.shimmer,
          {
            opacity: shimmerOpacity,
            transform: [{ translateX: shimmerTranslate }],
          },
        ]}
      />
    </View>
  );
};

/**
 * Property Card Skeleton
 * Matches PropertyCardLarge dimensions
 */
export const PropertyCardSkeleton: React.FC = () => {
  return (
    <View style={cardStyles.container}>
      {/* Image */}
      <Skeleton width={280} height={200} borderRadius={spacing.md} />
      
      {/* Content */}
      <View style={cardStyles.content}>
        {/* Title */}
        <Skeleton width="80%" height={18} style={{ marginBottom: spacing.xs }} />
        
        {/* Location */}
        <Skeleton width="60%" height={14} style={{ marginBottom: spacing.sm }} />
        
        {/* Price and Rating Row */}
        <View style={cardStyles.row}>
          <Skeleton width={80} height={16} />
          <Skeleton width={60} height={16} />
        </View>
      </View>
    </View>
  );
};

/**
 * List Item Skeleton
 * For simple list items
 */
export const ListItemSkeleton: React.FC = () => {
  return (
    <View style={listStyles.container}>
      <Skeleton width={60} height={60} borderRadius={spacing.sm} />
      <View style={listStyles.content}>
        <Skeleton width="70%" height={16} style={{ marginBottom: spacing.xs }} />
        <Skeleton width="50%" height={14} />
      </View>
    </View>
  );
};

/**
 * Text Block Skeleton
 * For paragraphs of text
 */
interface TextSkeletonProps {
  lines?: number;
}

export const TextSkeleton: React.FC<TextSkeletonProps> = ({ lines = 3 }) => {
  return (
    <View>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          width={index === lines - 1 ? '60%' : '100%'}
          height={14}
          style={{ marginBottom: spacing.xs }}
        />
      ))}
    </View>
  );
};

/**
 * Image Skeleton
 * Simple image placeholder
 */
interface ImageSkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
}

export const ImageSkeleton: React.FC<ImageSkeletonProps> = ({
  width = '100%',
  height = 200,
  borderRadius = spacing.md,
}) => {
  return <Skeleton width={width} height={height} borderRadius={borderRadius} />;
};

/**
 * Explore Section Skeleton
 * Shows multiple property cards in a row
 */
export const ExploreSectionSkeleton: React.FC = () => {
  return (
    <View style={sectionStyles.container}>
      {/* Section Header */}
      <View style={sectionStyles.header}>
        <Skeleton width={200} height={24} />
        <Skeleton width={60} height={16} />
      </View>
      
      {/* Cards */}
      <View style={sectionStyles.cards}>
        <PropertyCardSkeleton />
        <PropertyCardSkeleton />
      </View>
    </View>
  );
};

/**
 * Grid Skeleton
 * For grid layouts
 */
interface GridSkeletonProps {
  columns?: number;
  rows?: number;
  itemHeight?: number;
  gap?: number;
}

export const GridSkeleton: React.FC<GridSkeletonProps> = ({
  columns = 2,
  rows = 3,
  itemHeight = 120,
  gap = spacing.md,
}) => {
  return (
    <View style={{ gap }}>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <View key={rowIndex} style={{ flexDirection: 'row', gap }}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <View key={colIndex} style={{ flex: 1 }}>
              <Skeleton height={itemHeight} borderRadius={spacing.md} />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: colors.backgroundTertiary,
    overflow: 'hidden',
  },
  shimmer: {
    width: 300,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    transform: [{ skewX: '-20deg' }],
  },
});

const cardStyles = StyleSheet.create({
  container: {
    width: 280,
    marginRight: spacing.md,
  },
  content: {
    paddingTop: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

const listStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.md,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
});

const sectionStyles = StyleSheet.create({
  container: {
    marginBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  cards: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
  },
});

export default Skeleton;
