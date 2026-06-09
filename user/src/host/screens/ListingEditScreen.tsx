import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useHaptics } from '../hooks/useHaptics';
import { ScreenHeader } from '../components/common';
import { ListingForm } from '../components/ListingForm';
import { getListings, saveListing, type HostListing } from '../data/listings';
import { uploadListingImages, toBackendListing } from '../data/listingSync';
import { getHostProfile } from '../data/hostProfile';
import { Api } from '../../api';

export function ListingEditScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const { success } = useHaptics();
  const id = route?.params?.id;
  const [listing, setListing] = useState<HostListing | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    getListings().then((all) => { if (active) setListing(all.find((l) => l.id === id) ?? null); });
    return () => { active = false; };
  }, [id]);

  const submit = async (updated: HostListing, status: HostListing['status']) => {
    setSaving(true);
    // Upload any NEW local photos to the cloud → permanent URLs (fixes blank
    // images), then persist locally and push the update to the backend.
    const richImages = await uploadListingImages(updated.images, updated.photoMeta);
    const next: HostListing = { ...updated, status, images: richImages.map((i) => i.url) as any };
    await saveListing(next);
    if (next.remoteId) {
      try {
        await Api.auth.ensureSession();
        const prof = await getHostProfile();
        await Api.listings.update(next.remoteId, { ...toBackendListing(next, richImages, prof.languages || []), publish: status === 'published' });
      } catch { /* offline — local save still applied */ }
    }
    success();
    setSaving(false);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader title="Edit stay" onBack={() => navigation.goBack()} />
      {listing && <ListingForm initial={listing} mode="edit" onSubmit={submit} />}
      {!listing && <View style={{ flex: 1 }} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ container: { flex: 1 } });

export default ListingEditScreen;
