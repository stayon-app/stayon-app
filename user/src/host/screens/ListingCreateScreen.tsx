import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useHaptics } from '../hooks/useHaptics';
import { ScreenHeader } from '../components/common';
import { ListingForm } from '../components/ListingForm';
import { newDraft, saveListing, type HostListing } from '../data/listings';

export function ListingCreateScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { success } = useHaptics();

  const submit = async (listing: HostListing, status: HostListing['status']) => {
    success();
    await saveListing({
      ...listing,
      status,
      title: listing.title.trim(),
      address: listing.address.trim(),
      city: listing.city.trim(),
      country: listing.country.trim(),
    });
    navigation.goBack();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader title="Create a stay" onBack={() => navigation.goBack()} />
      <ListingForm initial={newDraft()} mode="create" onSubmit={submit} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ container: { flex: 1 } });

export default ListingCreateScreen;
