import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useHaptics } from '../hooks/useHaptics';
import { STAYON_GRADIENT } from '../components/GradientButton';
import { PropertyMapWeb } from '../components/PropertyMapWeb';
import { spacing, borderRadius, fontSizes, fonts } from '../constants';

// Conditional import — react-native-maps has limited web support
let MapView: any = null;
let Marker: any = null;
let PROVIDER_GOOGLE: any = null;
if (Platform.OS !== 'web') {
  const maps = require('react-native-maps');
  MapView = maps.default;
  Marker = maps.Marker;
  PROVIDER_GOOGLE = maps.PROVIDER_GOOGLE;
}

const REGIONS = [
  { id: '1', label: 'SE Asia', icon: 'leaf-outline', lat: 10, lng: 105, delta: 25 },
  { id: '2', label: 'Europe', icon: 'business-outline', lat: 48, lng: 10, delta: 20 },
  { id: '3', label: 'Americas', icon: 'flag-outline', lat: 20, lng: -90, delta: 40 },
  { id: '4', label: 'Middle East', icon: 'sunny-outline', lat: 24, lng: 54, delta: 20 },
  { id: '5', label: 'Caribbean', icon: 'umbrella-outline', lat: 18, lng: -68, delta: 15 },
  { id: '6', label: 'Africa', icon: 'earth-outline', lat: 0, lng: 25, delta: 40 },
];

const MOCK_PROPERTIES = [
  { id: '1', lat: 40.758, lng: -73.985, price: '$285', title: 'Manhattan Luxury Loft', rating: 4.97 },
  { id: '2', lat: 34.118, lng: -118.300, price: '$420', title: 'Hollywood Hills Villa', rating: 4.95 },
  { id: '3', lat: 25.782, lng: -80.130, price: '$175', title: 'Miami Beach House', rating: 4.88 },
  { id: '4', lat: 49.282, lng: -123.120, price: '$210', title: 'Vancouver Waterfront', rating: 4.92 },
  { id: '5', lat: 51.486, lng: -0.172, price: '$380', title: 'Chelsea Townhouse', rating: 4.93 },
  { id: '6', lat: 51.884, lng: -1.758, price: '$195', title: 'Cotswolds Cottage', rating: 4.97 },
  { id: '7', lat: 48.857, lng: 2.352, price: '$290', title: 'Le Marais Parisian Flat', rating: 4.96 },
  { id: '8', lat: 41.385, lng: 2.173, price: '$155', title: 'Barcelona Gothic Apt', rating: 4.89 },
  { id: '9', lat: 52.367, lng: 4.904, price: '$225', title: 'Amsterdam Canal House', rating: 4.94 },
  { id: '10', lat: 36.461, lng: 25.374, price: '$520', title: 'Santorini Cliffside Villa', rating: 4.99 },
];

export function GlobeExplorerScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const { selection, light } = useHaptics();
  const mapRef = useRef<any>(null);
  const [selectedProperty, setSelectedProperty] = useState<typeof MOCK_PROPERTIES[0] | null>(null);
  const [activeRegion, setActiveRegion] = useState<string | null>(null);
  const [showSearchHere, setShowSearchHere] = useState(false);

  const handleRegionPress = (region: typeof REGIONS[0]) => {
    selection();
    setActiveRegion(region.id);
    setShowSearchHere(false);
    mapRef.current?.animateToRegion(
      {
        latitude: region.lat,
        longitude: region.lng,
        latitudeDelta: region.delta,
        longitudeDelta: region.delta,
      },
      800
    );
  };

  const handleMarkerPress = (property: typeof MOCK_PROPERTIES[0]) => {
    light();
    setSelectedProperty(property);
  };

  const handleRegionChangeComplete = () => {
    setShowSearchHere(true);
  };

  const styles = makeStyles(colors);

  // Web: real interactive Leaflet world map with price pins
  if (Platform.OS === 'web' || !MapView) {
    const webPins = MOCK_PROPERTIES.map((p) => ({
      id: p.id, lat: p.lat, lng: p.lng, price: parseInt(String(p.price).replace(/[^0-9]/g, '')) || 0, title: p.title,
    }));
    return (
      <View style={styles.container}>
        <PropertyMapWeb
          pins={webPins}
          centerLat={20}
          centerLng={0}
          zoom={2}
          isDark={isDark}
          onPinPress={(id) => {
            const p = MOCK_PROPERTIES.find((x) => x.id === id);
            if (p) setSelectedProperty(p);
          }}
        />
        <SafeAreaView edges={['top']} style={styles.headerWrap} pointerEvents="box-none">
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Explore the World</Text>
            <View style={{ width: 36 }} />
          </View>
        </SafeAreaView>
        {selectedProperty && (
          <View style={styles.previewCard}>
            <View style={styles.previewImage} />
            <View style={styles.previewInfo}>
              <Text style={[styles.previewTitle, { color: colors.textPrimary }]} numberOfLines={1}>{selectedProperty.title}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Ionicons name="star" size={12} color={colors.gold} />
                <Text style={[styles.previewSub, { color: colors.textSecondary }]}>{selectedProperty.rating} · {selectedProperty.price}/night</Text>
              </View>
            </View>
            <TouchableOpacity activeOpacity={0.9} style={styles.viewBtnWrap} onPress={() => navigation.navigate('PropertyDetails', { propertyId: selectedProperty.id })}>
              <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.viewBtn}>
                <Text style={styles.viewBtnText}>View</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeCard} onPress={() => setSelectedProperty(null)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        mapType="satellite"
        initialRegion={{
          latitude: 20,
          longitude: 10,
          latitudeDelta: 80,
          longitudeDelta: 80,
        }}
        onRegionChangeComplete={handleRegionChangeComplete}
        showsUserLocation
        showsCompass={false}
        showsScale={false}
      >
        {MOCK_PROPERTIES.map((p) => (
          <Marker
            key={p.id}
            coordinate={{ latitude: p.lat, longitude: p.lng }}
            onPress={() => handleMarkerPress(p)}
          >
            <View style={[
              styles.priceBubble,
              selectedProperty?.id === p.id && styles.priceBubbleSelected
            ]}>
              <Text style={[
                styles.priceText,
                selectedProperty?.id === p.id && styles.priceTextSelected
              ]}>{p.price}</Text>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Header */}
      <SafeAreaView edges={['top']} style={styles.headerWrap}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
            <Ionicons name="arrow-back" size={20} color={colors.textInverse} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Explore the World</Text>
          <TouchableOpacity style={styles.searchBtn} hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
            <Ionicons name="search" size={20} color={colors.textInverse} />
          </TouchableOpacity>
        </View>

        {/* Region pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.regionScroll}
        >
          {REGIONS.map((r) => (
            <TouchableOpacity
              key={r.id}
              style={[styles.regionPill, activeRegion === r.id && styles.regionPillActive]}
              onPress={() => handleRegionPress(r)}
            >
              <Ionicons name={r.icon as any} size={14} color="#fff" />
              <Text style={[styles.regionLabel, activeRegion === r.id && styles.regionLabelActive]}>
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>

      {/* Search this area */}
      {showSearchHere && (
        <View style={styles.searchAreaWrap}>
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.searchAreaBtnWrap}
            onPress={() => { light(); setShowSearchHere(false); }}
          >
            <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.searchAreaBtn}>
              <Ionicons name="search" size={14} color={colors.textInverse} />
              <Text style={styles.searchAreaText}>Search this area</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom count */}
      <View style={styles.countWrap}>
        <Text style={styles.countText}>1,284 stays worldwide</Text>
      </View>

      {/* Property preview card */}
      {selectedProperty && (
        <View style={styles.previewCard}>
          <View style={styles.previewImage} />
          <View style={styles.previewInfo}>
            <Text style={[styles.previewTitle, { color: colors.textPrimary }]} numberOfLines={1}>
              {selectedProperty.title}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Ionicons name="star" size={12} color={colors.gold} />
              <Text style={[styles.previewSub, { color: colors.textSecondary }]}>
                {selectedProperty.rating} · {selectedProperty.price}/night
              </Text>
            </View>
          </View>
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.viewBtnWrap}
            onPress={() => navigation.navigate('PropertyDetails', { propertyId: selectedProperty.id })}
          >
            <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.viewBtn}>
              <Text style={styles.viewBtnText}>View</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeCard} onPress={() => setSelectedProperty(null)}>
            <Ionicons name="close" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    map: { flex: 1 },
    headerWrap: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      color: '#fff',
      fontSize: fontSizes.md,
      ...fonts.bold,
      textShadowColor: 'rgba(0,0,0,0.5)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },
    searchBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    regionScroll: {
      paddingHorizontal: spacing.lg,
      gap: spacing.sm,
      paddingBottom: spacing.xs,
    },
    regionPill: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.55)',
      borderRadius: borderRadius.xl,
      paddingHorizontal: spacing.md,
      paddingVertical: 7,
      gap: 5,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.15)',
    },
    regionPillActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    regionEmoji: { fontSize: 14 },
    regionLabel: { color: '#fff', fontSize: fontSizes.sm, ...fonts.semiBold },
    regionLabelActive: { color: '#fff' },
    searchAreaWrap: {
      position: 'absolute',
      top: 130,
      alignSelf: 'center',
    },
    searchAreaBtnWrap: {
      borderRadius: borderRadius.xl,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 5,
    },
    searchAreaBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: borderRadius.xl,
      paddingHorizontal: spacing.base,
      paddingVertical: spacing.sm,
      gap: 6,
    },
    searchAreaText: { color: '#fff', fontSize: fontSizes.sm, ...fonts.bold },
    countWrap: {
      position: 'absolute',
      bottom: 130,
      alignSelf: 'center',
      backgroundColor: 'rgba(0,0,0,0.55)',
      borderRadius: borderRadius.lg,
      paddingHorizontal: spacing.base,
      paddingVertical: 6,
    },
    countText: { color: '#fff', fontSize: fontSizes.sm, ...fonts.semiBold },
    previewCard: {
      position: 'absolute',
      bottom: spacing['2xl'],
      left: spacing.lg,
      right: spacing.lg,
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 8,
    },
    previewImage: {
      width: 60,
      height: 60,
      borderRadius: borderRadius.md,
      backgroundColor: colors.primaryUltraLight,
    },
    previewInfo: { flex: 1 },
    previewTitle: { fontSize: fontSizes.sm, ...fonts.bold, marginBottom: 3 },
    previewSub: { fontSize: fontSizes.sm },
    viewBtnWrap: {
      borderRadius: borderRadius.md,
      overflow: 'hidden',
    },
    viewBtn: {
      paddingHorizontal: spacing.base,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.md,
    },
    viewBtnText: { color: '#fff', ...fonts.bold, fontSize: fontSizes.sm },
    closeCard: {
      position: 'absolute',
      top: 8,
      right: 8,
    },
    priceBubble: {
      backgroundColor: '#fff',
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
    },
    priceBubbleSelected: {
      backgroundColor: '#0F172A',
    },
    priceText: {
      color: '#0F172A',
      fontSize: fontSizes.sm,
      ...fonts.bold,
    },
    priceTextSelected: {
      color: '#fff',
    },
  });
}
