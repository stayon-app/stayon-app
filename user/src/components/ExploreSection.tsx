import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fontSizes, fonts, spacing } from '../constants';
import { useTheme } from '../contexts/ThemeContext';
import { PropertyCardLarge } from './PropertyCardLarge';
import { PropertyCardSkeleton } from './common/SkeletonLoader';
import { SeeAllCard } from './SeeAllCard';
import * as animUtils from '../utils/animations';

const FALLBACK_SEE_ALL_IMAGE =
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&h=800&fit=crop';

interface Property {
  id: string;
  images?: string[];
  title: string;
  location: string;
  price: number;
  rating: number;
  reviews?: number;
  isGuestFavourite?: boolean;
  isFavorite?: boolean;
}

interface ExploreSectionProps {
  title: string;
  properties: Property[];
  onSeeAll?: () => void;
  onPropertyPress: (property: Property) => void;
  onFavoriteToggle?: (id: string) => void;
  isLoading?: boolean;
  error?: string;
  onRetry?: () => void;
}

// Separate component for animated card to avoid hooks in renderItem
const AnimatedPropertyCard: React.FC<{
  property: Property;
  index: number;
  onPress: () => void;
  onFavoriteToggle?: (id: string) => void;
}> = ({ property, index, onPress, onFavoriteToggle }) => {
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    const delay = index * 100; // Stagger animation
    setTimeout(() => {
      Animated.parallel([
        animUtils.fadeIn(cardOpacity, 300),
        animUtils.slideIn(cardTranslateY, 20, 0, 300),
      ]).start();
    }, delay);
  }, []);

  return (
    <Animated.View
      style={{
        opacity: cardOpacity,
        transform: [{ translateY: cardTranslateY }],
      }}
    >
      <PropertyCardLarge
        property={property}
        onPress={onPress}
        onFavoriteToggle={onFavoriteToggle}
      />
    </Animated.View>
  );
};

export const ExploreSection: React.FC<ExploreSectionProps> = ({
  title,
  properties,
  onSeeAll,
  onPropertyPress,
  onFavoriteToggle,
  isLoading = false,
  error,
  onRetry,
}) => {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const data = Array.isArray(properties) ? properties : [];
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(10)).current;
  const arrowRotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Section title entrance animation
    Animated.parallel([
      animUtils.fadeIn(titleOpacity, 400),
      animUtils.slideIn(titleTranslateY, 10, 0, 400),
    ]).start();
  }, []);

  // Arrow bounce animation on hover (web) / continuous subtle pulse
  useEffect(() => {
    animUtils.pulse(arrowRotation, 1.1, 2000).start();
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.container}>
        <Animated.View 
          style={[
            styles.header,
            {
              opacity: titleOpacity,
              transform: [{ translateY: titleTranslateY }],
            },
          ]}
        >
          <Text style={styles.title}>{title}</Text>
        </Animated.View>
        <View style={styles.skeletonContainer}>
          <PropertyCardSkeleton />
          <PropertyCardSkeleton />
        </View>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.container}>
        <Animated.View 
          style={[
            styles.header,
            {
              opacity: titleOpacity,
              transform: [{ translateY: titleTranslateY }],
            },
          ]}
        >
          <Text style={styles.title}>{title}</Text>
        </Animated.View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textTertiary} />
          <Text style={styles.errorText}>{error}</Text>
          {onRetry && (
            <TouchableOpacity onPress={onRetry} style={styles.retryButton}>
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <View style={styles.container}>
        <Animated.View 
          style={[
            styles.header,
            {
              opacity: titleOpacity,
              transform: [{ translateY: titleTranslateY }],
            },
          ]}
        >
          <Text style={styles.title}>{title}</Text>
        </Animated.View>
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={48} color={colors.textTertiary} />
          <Text style={styles.emptyText}>No properties available</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Section Header with animation */}
      <Animated.View 
        style={[
          styles.header,
          {
            opacity: titleOpacity,
            transform: [{ translateY: titleTranslateY }],
          },
        ]}
      >
        <Text style={styles.title}>{title}</Text>
      </Animated.View>

      {/* Property List with stagger animation — ends with an image "See all" card */}
      <FlatList
        data={data}
        renderItem={({ item, index }) => (
          <AnimatedPropertyCard
            property={item}
            index={index}
            onPress={() => onPropertyPress(item)}
            onFavoriteToggle={onFavoriteToggle}
          />
        )}
        keyExtractor={(item, index) => String(item?.id ?? index)}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListFooterComponent={
          onSeeAll ? (
            <SeeAllCard
              image={data[data.length - 1]?.images?.[0] || FALLBACK_SEE_ALL_IMAGE}
              width={170}
              height={360}
              radius={16}
              onPress={onSeeAll}
              style={styles.seeAllFooter}
            />
          ) : null
        }
      />
    </View>
  );
};

function makeStyles(colors: any) {
  return StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 18,
    ...fonts.bold,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  seeAllFooter: {
    marginLeft: spacing.sm,
    alignSelf: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.base,
  },
  skeletonContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.base,
    gap: spacing.sm,
  },
  emptyContainer: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    ...fonts.regular,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  errorContainer: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    ...fonts.regular,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 14,
    ...fonts.semiBold,
    color: '#FFFFFF',
  },
  });
}
