import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useHaptics } from '../hooks/useHaptics';
import { ScreenHeader } from '../components/common';
import { ListingForm } from '../components/ListingForm';
import { getListings, saveListing, type HostListing } from '../data/listings';

export function ListingEditScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const { success } = useHaptics();
  const id = route?.params?.id;
  const [listing, setListing] = useState<HostListing | null>(null);

  useEffect(() => {
    let active = true;
    getListings().then((all) => { if (active) setListing(all.find((l) => l.id === id) ?? null); });
    return () => { active = false; };
  }, [id]);

  const submit = async (updated: HostListing, status: HostListing['status']) => {
    success();
    await saveListing({ ...updated, status });
    navigation.goBack();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader title="Edit listing" onBack={() => navigation.goBack()} />
      {listing && <ListingForm initial={listing} mode="edit" onSubmit={submit} />}
      {!listing && <View style={{ flex: 1 }} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ container: { flex: 1 } });

export default ListingEditScreen;
