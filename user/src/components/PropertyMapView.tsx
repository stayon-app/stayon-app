import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts, spacing, borderRadius } from '../constants';
import { useTheme } from '../contexts/ThemeContext';
import { Property } from './PropertyCard';

// Apple Maps on iOS / Google Maps on Android via react-native-maps (native only).
let MapView: any = null;
let Marker: any = null;
let PROVIDER_GOOGLE: any = null;
if (Platform.OS !== 'web') {
  const maps = require('react-native-maps');
  MapView = maps.default;
  Marker = maps.Marker;
  PROVIDER_GOOGLE = maps.PROVIDER_GOOGLE;
}

export type MapType = 'standard' | 'satellite' | 'hybrid';

interface PropertyMapViewProps {
  properties: Property[];
  onPropertyPress: (property: Property) => void;
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  mapType?: MapType;            // standard | satellite | hybrid (Apple Maps on iOS)
  showsUserLocation?: boolean;
}

// Web fallback component - show message that maps are not available on web yet
export const PropertyMapView: React.FC<PropertyMapViewProps> = ({
  properties,
  onPropertyPress,
  initialRegion,
  mapType = 'standard',
  showsUserLocation = true,
}) => {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  if (Platform.OS === 'web') {
    return (
      <View style={styles.webFallbackContainer}>
        <Ionicons name="map-outline" size={64} color={colors.textTertiary} />
        <Text style={styles.webFallbackTitle}>Map View</Text>
        <Text style={styles.webFallbackText}>
          Interactive maps are available on iOS and Android apps.
        </Text>
        <Text style={styles.webFallbackSubtext}>
          Download the StayOn mobile app to explore properties on the map.
        </Text>
      </View>
    );
  }

  // Native platforms — real react-native-maps view (Apple Maps on iOS).
  if (!MapView) return null;

  const region =
    initialRegion ??
    (properties.length
      ? {
          latitude: (properties[0] as any).latitude ?? (properties[0] as any).lat ?? 39.5,
          longitude: (properties[0] as any).longitude ?? (properties[0] as any).lng ?? -98.35,
          latitudeDelta: 0.5,
          longitudeDelta: 0.5,
        }
      : { latitude: 39.5, longitude: -98.35, latitudeDelta: 30, longitudeDelta: 30 });

  return (
    <MapView
      style={styles.map}
      provider={PROVIDER_GOOGLE}
      initialRegion={region}
      mapType={mapType}
      showsUserLocation={showsUserLocation}
      showsMyLocationButton={false}
    >
      {properties.map((property) => {
        const latitude = (property as any).latitude ?? (property as any).lat;
        const longitude = (property as any).longitude ?? (property as any).lng;
        if (typeof latitude !== 'number' || typeof longitude !== 'number') return null;
        return (
          <Marker
            key={property.id}
            coordinate={{ latitude, longitude }}
            onPress={() => onPropertyPress(property)}
          />
        );
      })}
    </MapView>
  );
};

function makeStyles(colors: any) {
  return StyleSheet.create({
  map: { flex: 1, width: '100%', height: '100%' },
  webFallbackContainer: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  webFallbackTitle: {
    fontSize: 24,
    ...fonts.bold,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  webFallbackText: {
    fontSize: 16,
    ...fonts.medium,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  webFallbackSubtext: {
    fontSize: 14,
    ...fonts.regular,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  });
}
