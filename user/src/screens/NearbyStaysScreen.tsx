import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useHaptics } from '../hooks/useHaptics';
import { useLocationDetection } from '../hooks/useLocationDetection';
import { PropertyCard, Property } from '../components/PropertyCard';
import { PropertyCardSkeleton } from '../components/common/SkeletonLoader';
import { BOT_STAYS, botStayToProperty } from '../data/stays';
import { sortByDistance } from '../utils/distance';
import { spacing, fonts } from '../constants';

interface NearbyStaysScreenProps {
  navigation: any;
}

export const NearbyStaysScreen: React.FC<NearbyStaysScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const { light } = useHaptics();
  const { location, loading, permissionDenied, refreshLocation } = useLocationDetection();
  const styles = makeStyles(colors);

  // Every stay, ranked by distance from the user's live location.
  const stays = useMemo(() => {
    const ranked = sortByDistance(
      BOT_STAYS,
      { latitude: location.latitude, longitude: location.longitude },
      (s) => ({ latitude: s.latitude, longitude: s.longitude }),
    );
    return ranked.map((s) => ({
      ...botStayToProperty(s),
      distanceLabel: s.distanceLabel,
    })) as Property[];
  }, [location.latitude, location.longitude]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => { light(); navigation.goBack(); }}
          hitSlop={{ top: 11, bottom: 11, left: 11, right: 11 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Stays near you</Text>
        <TouchableOpacity
          onPress={() => { light(); refreshLocation(); }}
          hitSlop={{ top: 11, bottom: 11, left: 11, right: 11 }}
        >
          <Ionicons name="refresh" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.locationBar}
        activeOpacity={0.7}
        onPress={() => { light(); refreshLocation(); }}
      >
        <Ionicons name="location-sharp" size={15} color={colors.primary} />
        <Text style={styles.locationText} numberOfLines={1}>
          {loading
            ? 'Finding your location…'
            : permissionDenied
            ? 'Location off — tap to enable for accurate results'
            : `Showing stays closest to ${location.formattedAddress}`}
        </Text>
        {loading && <ActivityIndicator size="small" color={colors.primary} />}
      </TouchableOpacity>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {loading ? (
          <View style={styles.list}>
            <PropertyCardSkeleton />
            <PropertyCardSkeleton />
            <PropertyCardSkeleton />
          </View>
        ) : (
          <View style={styles.list}>
            {stays.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                onPress={() => navigation.navigate('PropertyDetails', { property })}
                onFavoritePress={() => {}}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const makeStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    headerTitle: {
      fontSize: 18,
      ...fonts.bold,
      color: colors.textPrimary,
    },
    locationBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginHorizontal: spacing.lg,
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: 12,
      backgroundColor: colors.primary + '12',
    },
    locationText: {
      flex: 1,
      fontSize: 13,
      ...fonts.medium,
      color: colors.textSecondary,
    },
    scrollContent: {
      paddingBottom: spacing['4xl'],
    },
    list: {
      paddingHorizontal: spacing.lg,
      gap: spacing.lg,
    },
  });
