import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useHaptics } from '../hooks/useHaptics';
import { spacing, borderRadius } from '../constants';
import { ScreenHeader, EmptyState } from '../components/common';
import { ListingCard } from '../components/ListingCard';
import { getListings, type HostListing } from '../data/listings';
import { STAYON_GRADIENT } from '../components/GradientButton';
import { LinearGradient } from 'expo-linear-gradient';

export function ListingsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { light } = useHaptics();
  const [listings, setListings] = useState<HostListing[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      getListings().then((l) => { if (active) setListings(l); });
      return () => { active = false; };
    }, [])
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader
        title="Your listings"
        onBack={() => navigation.goBack()}
        rightActions={[{ icon: 'add', onPress: () => navigation.navigate('ListingCreate'), accessibilityLabel: 'Add listing' }]}
      />
      {listings.length === 0 ? (
        <EmptyState
          illustration="listings"
          icon="home-outline"
          title="List your first place"
          message="Add a property to start welcoming guests on StayOn."
          actionLabel="Create a listing"
          onAction={() => navigation.navigate('ListingCreate')}
        />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['4xl'] }}>
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} onPress={() => navigation.navigate('ListingDetails', { id: l.id })} />
          ))}
        </ScrollView>
      )}

      {listings.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.9}
          onPress={() => { light(); navigation.navigate('ListingCreate'); }}
          accessibilityRole="button"
          accessibilityLabel="Create a listing"
        >
          <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fabInner}>
            <Ionicons name="add" size={26} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  fab: { position: 'absolute', right: spacing.lg, bottom: spacing.xl, borderRadius: 30, overflow: 'hidden', elevation: 6 },
  fabInner: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
});

export default ListingsScreen;
